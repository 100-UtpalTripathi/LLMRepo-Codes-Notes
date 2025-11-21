// ES6 Module Imports
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Step 1: Initialize Gemini AI with FREE TIER MODEL
const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxOutputTokens: 2048,
});

// Step 2: Define Tools: Restaurant Menu Tool
const getMenuTool = new DynamicStructuredTool({
  name: "getMenu",
  description: "Returns the menu for the given category (breakfast, lunch, or dinner).",
  schema: z.object({
    category: z.string().describe("Type of meal. Example: breakfast, lunch, dinner"),
  }),
  func: async ({ category }) => {
    const menus = {
      breakfast: "Upma, Poha, Noodles, Fried Rice, Fruit Salad",
      lunch: "Paneer Butter Masala, Dal Fry, Jeera Rice, Roti",
      dinner: "Paneer Biryani, Raita, Salad, Gulab Jamun",
    };
    return menus[category.toLowerCase()] || "No menu found for that category.";
  },
});

// Bind the tool to the model
const modelWithTools = model.bindTools([getMenuTool]);

// Helper function to process tool calls
async function processToolCalls(toolCalls) {
  const results = [];
  for (const toolCall of toolCalls) {
    if (toolCall.name === "getMenu") {
      const result = await getMenuTool.func(toolCall.args);
      results.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: toolCall.name,
        content: result,
      });
    }
  }
  return results;
}

// API endpoint to handle user queries
app.post("/api/chat", async (req, res) => {
  try {
    const { input } = req.body; // Changed from 'message' to 'input' to match frontend
    
    if (!input) {
      return res.status(400).json({ error: "Input is required" });
    }

    // Create conversation messages
    const messages = [
      {
        role: "system",
        content: "You are a helpful restaurant assistant. Use the getMenu tool when users ask about breakfast, lunch, or dinner menus.",
      },
      {
        role: "user",
        content: input,
      },
    ];

    // First AI call - check if tool is needed
    let response = await modelWithTools.invoke(messages);

    // If AI wants to use tools, process them
    if (response.tool_calls && response.tool_calls.length > 0) {
      // Process tool calls
      const toolResults = await processToolCalls(response.tool_calls);
      
      // Add AI response and tool results to messages
      messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.tool_calls,
      });
      
      // Add tool results
      toolResults.forEach(result => messages.push(result));
      
      // Get final response from AI
      response = await modelWithTools.invoke(messages);
    }

    res.json({
      output: response.content, // Changed from 'response' to 'output' to match frontend
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
});

// Home page route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Using Gemini model: gemini-2.5-flash`);
  console.log(`📝 Open browser at: http://localhost:${PORT}`);
});
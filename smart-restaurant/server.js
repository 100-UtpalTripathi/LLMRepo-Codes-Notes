// ES6 Module Imports
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Step 1: Initialize Gemini AI with FREE TIER MODEL
const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "models/gemini-2.5-flash", // Using Gemini 2.5 Flash model
  temperature: 0.7,
  maxOutputTokens: 2048,
});


// Step 2: Define Tools: Restaurant Menu Tool
// Create a tool that returns menu items based on meal category
const getMenuTool = new DynamicStructuredTool({
  // Tool name - this is how the AI will identify and call this tool
  name: "getMenu",
  
  // Description - tells the AI when and how to use this tool
  // The AI reads this to decide if this tool is appropriate for the user's question
  description: "Returns the final answer for today's menu for the given category (breakfast, lunch, or dinner). Use this tool to answer the user's menu question directly.",
  
  // Schema - defines the input structure and validation using Zod
  // This ensures the AI provides data in the correct format
  schema: z.object({
    // Define 'category' as a required string parameter
    category: z.string().describe("Type of food. Example: breakfast, lunch, dinner"),
  }),
  
  // func - the actual function that gets executed when the tool is called
  // This is an async function that receives the validated input
  func: async ({ category }) => {
    // Define the restaurant's menu as an object
    // Each key (breakfast, lunch, dinner) maps to a string of menu items
    const menus = {
      breakfast: "Upma, Poha, Noodles, Fried Rice, Fruit Salad",
      lunch: "Paneer Butter Masala, Dal Fry, Jeera Rice, Roti",
      dinner: "Paneer Biryani, Raita, Salad, Gulab Jamun",
    };
    
    // Return the menu for the requested category (converted to lowercase for matching)
    // If category doesn't exist, return error message using || (OR operator)
    return menus[category.toLowerCase()] || "No menu found for that category.";
  },
});


// Step 3: Define Prompt Template, which guides the agent's behavior
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful restaurant assistant that uses tools when needed!"],
  ["human", "{input}"],
  ["ai", "{agent_scratchpad}"],
]);


// Step 4: Create the agent with the language model, tools, and prompt
const agent = await createToolCallingAgent({
  llm: model,              // The Gemini AI model we initialized earlier
  tools: [getMenuTool],    // Array of tools the agent can use
  prompt: prompt           // The prompt template that guides agent behavior
});



// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Using Gemini model: gemini-2.5-flash (FREE TIER)`);
});
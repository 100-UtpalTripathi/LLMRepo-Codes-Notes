import ollama from "ollama";

const response = await ollama.chat({
  model: "qwen2:1.5b",
  messages: [
    { role: "user", content: "Explain gravity in one sentence." }
  ]
});

console.log("\n🧠 RESPONSE:\n", response.message.content);

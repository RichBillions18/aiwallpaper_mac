import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  const client = new OpenAI({
    // apiKey: process.env["OPENAI_API_KEY"],
    apiKey: process.env.apiKey,
    baseURL: process.env.baseURL,
  });

  return client;
}

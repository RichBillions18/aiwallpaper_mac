/**
 * 【第6阶段 · OpenAI 客户端】【第8阶段 · 环境变量】service/openai.ts
 *
 * 职责：创建「AI 电话机」，供 gen-wallpaper 调 DALL·E 生图。
 * 密钥只放在服务端环境变量，不能写进 "use client" 组件（否则会暴露给浏览器）。
 *
 * 环境变量：apiKey、baseURL — 写在 .env，Vercel 部署时配同名变量。
 */
import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  const client = new OpenAI({
    // apiKey: process.env["OPENAI_API_KEY"],
    apiKey: process.env.apiKey,
    baseURL: process.env.baseURL,
  });

  return client;
}

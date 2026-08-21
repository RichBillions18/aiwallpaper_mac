/**
 * 【第8阶段 · Next 项目配置】next.config.ts
 *
 * 常用命令见 package.json：
 *   pnpm dev    → 开发（热更新）
 *   pnpm build  → 生产构建（Vercel 部署也会执行这步）
 *   pnpm start  → 本地跑 build 产物，模拟线上
 *   pnpm lint   → ESLint 检查
 *
 * 部署前建议本地先 pnpm build，通过再 push。
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 扩展配置放这里，如 images.domains 允许外链图片域名 */
};

export default nextConfig;

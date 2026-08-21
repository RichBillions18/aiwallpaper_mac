/**
 * 【第8阶段 · Next 项目配置】next.config.ts
 *
 * 常用命令见 package.json：
 *   pnpm dev    → 开发（热更新）
 *   pnpm build  → 生产构建（Vercel 部署也会执行这步）
 *   pnpm start  → 本地跑 build 产物，模拟线上
 *   pnpm lint   → ESLint 检查
 *
 * images.remotePatterns：用 next/image 加载外部图片必须先允许域名，
 * 否则页面会直接报错。这里覆盖三类来源：
 *   S3 / CloudFront   壁纸原图
 *   Clerk             用户头像
 *   NEXT_PUBLIC_IMAGE_HOST  自定义 CDN 或自建域名（可选，写在 .env）
 *
 * 部署前建议本地先 pnpm build，通过再 push。
 */
import type { NextConfig } from "next";

const imageHosts = [
  "**.amazonaws.com", // S3：bucket.s3.region.amazonaws.com
  "**.cloudfront.net", // 如果之后在 S3 前面挂了 CDN
  "img.clerk.com", // Clerk 头像
  "images.clerk.dev", // Clerk 旧版头像域名
  process.env.NEXT_PUBLIC_IMAGE_HOST,
].filter((host): host is string => Boolean(host));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    /*
     * ★ 关掉服务端图片优化，改成浏览器直连 S3。
     *
     * 原因：/_next/image 是「Next 服务器先把原图拉回来再压缩」，
     * 这一步回源有 7 秒硬超时。本机到 S3（ap-southeast-1）只有 50~60KB/s，
     * 连几百 KB 的图都可能超过 7 秒，结果就是 /_next/image 返回 500。
     * 浏览器直连没有这个超时，图片只是慢一点，不会整张失败。
     *
     * 体积改用「上传时就压好」来控制（见 lib/s3.ts）：
     * 原图转 WebP + 额外存一张 640px 缩略图，列表只加载缩略图。
     *
     * 以后在 S3 前面挂了 CloudFront（回源变快），把这行删掉就能重新启用优化。
     */
    unoptimized: true,
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;

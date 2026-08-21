/**
 * 【第2阶段 · 中间件】【第5阶段 · 会话门卫】【第8阶段 · 部署】middleware.ts
 *
 * 请求进 page / API 之前先经过这里，像一层「门卫」。
 *
 * clerkMiddleware：读取 Clerk Cookie，校验 / 刷新会话，为 API 里 currentUser() 打基础。
 * 不决定页面未登录 UI（那是 page.tsx 的事）。
 *
 * 【第8阶段】部署到 Vercel 后，Clerk 控制台需把线上域名加入允许列表，否则 Cookie / 登录跳转异常。
 */
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // 一般页面和 /api 都会匹配；静态文件（.png 等）和 _next 内部资源跳过
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

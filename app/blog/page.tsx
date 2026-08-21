/**
 * 【第2阶段 · 路由 /blog】【第5阶段 · 前端登录】app/blog/page.tsx
 *
 * app/blog/page.tsx → 网址 /blog
 * 下方链接 /blog/detail 对应 app/blog/detail/page.tsx（静态路由，路径写死）
 *
 * 【第5阶段】和首页一样用 useUser + RedirectToSignIn（强制登录）。
 */
"use client";

import { useUser, RedirectToSignIn } from "@clerk/nextjs";

export default function BlogPage() {
  // 【第5阶段】和首页同一套：isLoaded → isSignedIn → 再渲染内容
  const { isSignedIn, isLoaded } = useUser();

  // Clerk 还在读登录状态，先 Loading，避免闪一下又跳登录
  if (!isLoaded) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // 未登录 → 跳转到 Clerk 托管登录页
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Blog</h1>
        {/* href 路径 = app 文件夹路径：/blog/detail → app/blog/detail/page.tsx */}
        <a
          href="/blog/detail"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          点击查看博客详情
        </a>
      </div>
    </div>
  );
}

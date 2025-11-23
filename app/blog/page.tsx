"use client";

import { useUser, SignInButton } from "@clerk/nextjs";

export default function BlogPage() {
  const { isSignedIn, isLoaded } = useUser();

  // 显示加载状态
  if (!isLoaded) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // 如果用户未登录，显示登录界面
  if (!isSignedIn) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Blog</h1>
          <p className="text-gray-600 mb-6">Please sign in to read our blog posts</p>
          <SignInButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Blog</h1>
        <a href="/blog/detail" className="text-blue-600 hover:text-blue-800 underline">
          点击查看博客详情
        </a>
      </div>
    </div>
  );
}
/**
 * 【第1阶段 · 首页】【第2阶段 · 路由 /】【第5阶段 · 前端登录】app/page.tsx
 *
 * 文件路径 app/page.tsx → 网址 /
 *
 * 请求路径：middleware → layout.tsx → 本文件（客户端组件）
 *
 * 数据流复习：
 *   1. 登录后 → useEffect 自动拉历史壁纸 → 存入 wallpapers
 *   2. wallpapers 通过 props 传给 <Wallpapers />
 *   3. 用户在 <Input /> 生成新壁纸 → 调用 setWallpapers 更新列表 → 页面自动刷新
 *   4. 登录后同时 fetchCredits → leftCredits 传给 Header / Input
 *   5. 生成成功后 onCreditsChange 刷新积分
 *
 * 【第5阶段】前端登录三种状态：
 *   !isLoaded     → Loading（Clerk 还在读 Cookie）
 *   !isSignedIn   → RedirectToSignIn（强制跳登录页）
 *   已登录        → 渲染完整首页，再拉壁纸和积分
 *
 * 注意：这里只是「体验层」鉴权。真正安全靠 API 里的 currentUser()
 * （前端判断可以被绕过，后端必须再查一遍）
 */
"use client"; // 客户端组件：用了 hooks / 用户交互，必须在浏览器运行（见 pay-success 页对比）

import Header from "@/components/header";
import Hero from "@/components/hero";
import Input from "@/components/input";
import Wallpapers from "@/components/wallpapers";
import Footer from "@/components/footer";
import { Wallpaper } from "@/types/wallpaper";
import { useCallback, useEffect, useState } from "react";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";

export default function Home() {
  // useState：组件的「状态」，数据变了页面会自动重新渲染
  // wallpapers 是整个首页的壁纸列表，存在父组件里，再传给子组件展示
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  // 剩余积分；初始 null 表示尚未拉取。传给 Header 时用 ?? 0（null/undefined 则显示 0）
  const [leftCredits, setLeftCredits] = useState<number | null>(null);

  // 【第5阶段】useUser：只能在客户端组件里用
  // isLoaded = Clerk 是否读完登录状态；isSignedIn = 是否已登录
  const { isSignedIn, isLoaded } = useUser();

  // 【第3阶段】GET API：不带 method/body，对应 app/api/get-wallpapers/route.ts
  const fetchWallpapers = async function () {
    const result = await fetch("/api/get-wallpapers");
    const { data } = await result.json(); // 成功时 code=0，列表在 data 里

    if (data) {
      setWallpapers(data); // 更新 state → React 重新渲染 → 壁纸列表组件收到新数据
    }
  };

  // useCallback：把函数包一层，避免 useEffect 每次渲染都重复执行（进阶用法，先知道用途即可）
  // fetch 同源会自动带上 Clerk Cookie，后端 currentUser() 才能认出是谁
  const fetchCredits = useCallback(async () => {
    const response = await fetch("/api/get-user-info", {
      method: "POST",
    });
    const { data } = await response.json();

    if (data?.credits) {
      setLeftCredits(data.credits.left_credits);
    }

    console.log("积分加载完成:", data.credits.left_credits);
  }, []);

  // useEffect：在「某个时机」自动执行副作用（这里：用户登录成功后拉数据）
  // 依赖数组 [isSignedIn, fetchCredits]：只有这些值变化时才重新执行
  // 未登录不请求，避免无效 API 调用
  useEffect(() => {
    if (isSignedIn) {
      fetchWallpapers();
      fetchCredits();
    }
  }, [isSignedIn, fetchCredits]);

  // 【第5阶段】先等 isLoaded，避免登录状态还没读完就误判成「未登录」
  if (!isLoaded) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // 【第5阶段】强制登录策略：未登录直接跳 Clerk 登录页（对比 blog 页可看不同策略）
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // 已登录 → 渲染完整首页
  return (
    <div className="w-screen h-screen">
      {/* Header 模式 A：父组件传入 credits，不再重复请求 API（见 header/index.tsx） */}
      <Header credits={leftCredits ?? 0} />
      <Hero />
      <Input
        setWallpapers={setWallpapers}
        leftCredits={leftCredits}
        onCreditsChange={fetchCredits}
      />
      <Wallpapers wallpapers={wallpapers} />
      <Footer />
    </div>
  );
}

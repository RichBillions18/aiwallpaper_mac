"use client";

import Header from "@/components/header";
import Hero from "@/components/hero";
import Input from "@/components/input";
import Wallpapers from "@/components/wallpapers";
import Footer from "@/components/footer";
import { Wallpaper } from "@/types/wallpaper";
import { useEffect, useState } from "react";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";

export default function Home() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const { isSignedIn, isLoaded } = useUser();

  const fetchWallpapers = async function () {
    // 前端请求后端数据并解析响应内容
    const result = await fetch("/api/get-wallpapers");
    const { data } = await result.json();

    if (data) {
      setWallpapers(data);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchWallpapers();
    }
  }, [isSignedIn]);

  // 显示加载状态
  if (!isLoaded) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // 未登录时跳转到 Clerk 托管登录页
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="w-screen h-screen">
      <Header />
      <Hero />
      <Input setWallpapers={setWallpapers} />
      <Wallpapers wallpapers={wallpapers} />
      <Footer />
    </div>
  );
}

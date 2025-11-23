"use client";

import Footer from "@/components/footer";
import Header from "@/components/header";
import Hero from "@/components/hero";
import Input from "@/components/input";
import Wallpapers from "@/components/wallpapers";
import { Wallpaper } from "@/types/wallpaper";
import { useEffect, useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const { isSignedIn, isLoaded } = useUser();

  const fetchWallpapers = async function () {
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

  // 如果用户未登录，显示登录界面
  if (!isSignedIn) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            AI Wallpaper Generator
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to access the wallpaper generator
          </p>
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
    <div className="w-screen h-screen">
      <Header />
      <Hero />
      <Input setWallpapers={setWallpapers} />
      <Wallpapers wallpapers={wallpapers} />
      <Footer />
    </div>
  );
}

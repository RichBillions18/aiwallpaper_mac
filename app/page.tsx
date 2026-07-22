"use client";

import Header from "@/components/header";
import Hero from "@/components/hero";
import Input from "@/components/input";
import Wallpapers from "@/components/wallpapers";
import Footer from "@/components/footer";
import { Wallpaper } from "@/types/wallpaper";
import { useCallback, useEffect, useState } from "react";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";

export default function Home() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [leftCredits, setLeftCredits] = useState<number | null>(null);
  const { isSignedIn, isLoaded } = useUser();

  const fetchWallpapers = async function () {
    const result = await fetch("/api/get-wallpapers");
    const { data } = await result.json();

    if (data) {
      setWallpapers(data);
    }
  };

  const fetchCredits = useCallback(async () => {
    const response = await fetch("/api/get-user-info", {
      method: "POST",
    });
    const { data } = await response.json();

    if (data?.credits) {
      setLeftCredits(data.credits.left_credits);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchWallpapers();
      fetchCredits();
    }
  }, [isSignedIn, fetchCredits]);

  if (!isLoaded) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="w-screen h-screen">
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

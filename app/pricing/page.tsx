"use client";

import { useEffect, useState } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import Pricing from "@/components/pricing";
import { Wallpaper } from "@/types/wallpaper";

export default function Home() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);

  const fetchWallpapers = async function () {
    const result = await fetch("/api/get-wallpapers");
    const { data } = await result.json();

    if (data) {
      setWallpapers(data);
    }
  };

  useEffect(() => {
    fetchWallpapers();
  }, []);

  return (
    <div className="w-screen h-screen">
      <Header />

      <Pricing />

      <Footer />
    </div>
  );
}

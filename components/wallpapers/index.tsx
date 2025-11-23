"use client";

import { Wallpaper } from "@/types/wallpaper";
import WallpaperList from "./WallpaperList";

interface Props {
  wallpapers: Wallpaper[];
}
export default function ({ wallpapers }: Props) {
  return (
    <section className="max-w-6xl mx-auto">
      <WallpaperList wallpapers={wallpapers} />
    </section>
  );
}

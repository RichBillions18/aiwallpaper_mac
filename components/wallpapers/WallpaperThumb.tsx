/**
 * 【列表缩略图】优先加载 thumbs/ 下的小图，失败则回退原图
 *
 * 为什么需要回退：
 *   缩略图地址是按约定从原图地址推出来的（不在数据库存列），
 *   换过 S3 桶之前的老记录没有对应的缩略图文件，会 404。
 *   这时候退回原图，图还能显示，只是慢一点。
 */
"use client";

import { getThumbUrl } from "@/lib/wallpaper-options";
import Image from "next/image";
import { useState } from "react";

interface Props {
  src: string; // 原图地址
  alt: string;
}

export default function WallpaperThumb({ src, alt }: Props) {
  const [useOriginal, setUseOriginal] = useState(false);

  return (
    <Image
      src={useOriginal ? src : getThumbUrl(src)}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-contain"
      onError={() => setUseOriginal(true)}
    />
  );
}

/**
 * 【第1阶段 · 第2课】Wallpapers 组件 —— Props 传递的中间层
 *
 * 本组件本身不做复杂逻辑，只做一件事：
 *   从父组件 (page.tsx) 接收数据和回调，再传给 WallpaperList 去渲染。
 *
 * 组件树：
 *   Home (有 wallpapers 数据、负责请求)
 *     └── Wallpapers (接收 props，往下传)
 *           └── WallpaperList (用 map 渲染每一张壁纸)
 */
"use client";

import { Wallpaper } from "@/types/wallpaper";
import WallpaperList from "./WallpaperList";

// interface：定义 props 的类型，编辑器会提示有哪些字段
interface Props {
  wallpapers: Wallpaper[];
  page: number;
  total: number;
  pageSize: number;
  loading?: boolean;
  generating?: boolean;
  error?: string;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
}

export default function Wallpapers({
  wallpapers,
  page,
  total,
  pageSize,
  loading,
  generating,
  error,
  onRetry,
  onPageChange,
}: Props) {
  return (
    <section className="max-w-6xl mx-auto">
      <WallpaperList
        wallpapers={wallpapers}
        page={page}
        total={total}
        pageSize={pageSize}
        loading={loading}
        generating={generating}
        error={error}
        onRetry={onRetry}
        onPageChange={onPageChange}
      />
    </section>
  );
}

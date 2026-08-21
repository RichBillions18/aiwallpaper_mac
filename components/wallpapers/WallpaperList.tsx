/**
 * 【第1阶段 · 第2课】WallpaperList —— 用 map 渲染壁纸列表
 *
 * 核心概念：
 *   - map：把数组每一项变成一段 JSX（9 张壁纸 → 9 个卡片）
 *   - key：React 要求列表每一项有唯一标识（这里用 wallpaper.id）
 *   - Link：点击卡片进入 /wallpaper/[id] 详情页
 *
 * 图片为什么用 next/image 而不是 <img>：
 *   · 默认懒加载，首屏只加载看得见的几张
 *   · 用 fill + 固定比例容器，图片没加载完也不会撑动布局
 *   · 需要在 next.config.ts 里允许图片域名，否则会报错
 *
 * 列表加载的是 thumbs/ 下的缩略图（几十 KB），不是几百 KB 的原图，见 WallpaperThumb。
 */
"use client";

import { Wallpaper } from "@/types/wallpaper";
import { getSizeOptionBySize } from "@/lib/wallpaper-options";
import WallpaperThumb from "./WallpaperThumb";
import Image from "next/image";
import Link from "next/link";

interface Props {
  wallpapers: Wallpaper[];
  page: number;
  total: number;
  pageSize: number;
  loading?: boolean;
  generating?: boolean; // 正在生成新图 → 顶部插一个占位卡片
  error?: string; // 加载失败提示（网络抖动时后端会返回 code!=0）
  onRetry?: () => void;
  onPageChange: (page: number) => void;
}

/** 占位卡片：加载中和生成中共用，避免页面「空一大块」 */
function SkeletonCard({ label }: { label?: string }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-md bg-gray-100 p-4 sm:p-6">
      <div className="mb-3 flex items-center">
        <div className="mr-3 h-8 w-8 animate-pulse rounded-full bg-gray-300" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-300" />
      </div>
      <div className="flex aspect-[4/3] w-full animate-pulse items-center justify-center rounded-md bg-gray-300">
        {label && <span className="text-sm text-gray-600">{label}</span>}
      </div>
      <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-gray-300" />
    </div>
  );
}

export default function WallpaperList({
  wallpapers,
  page,
  total,
  pageSize,
  loading = false,
  generating = false,
  error = "",
  onRetry,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;
  const showEmpty =
    !loading && !generating && !error && wallpapers.length === 0;

  return (
    <section>
      <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20">
        <div className="mb-8 text-center md:mb-12 ">
          <h2 className="text-3xl font-bold md:text-5xl text-primary">
            我的壁纸
          </h2>
          {/* total：当前用户全部未删除壁纸数，不是本页条数 */}
          <p className="mt-4 text-gray-500 text-base">
            一共 {total} 条由 AI 生成的壁纸
            {total > 0 ? `，第 ${page} / ${totalPages} 页` : ""}
          </p>
        </div>

        {/* 失败提示放在列表上方：已加载的图还在，点重试即可重新拉当前页 */}
        {error && (
          <div className="mb-8 flex flex-col items-center gap-3 rounded-md bg-red-50 py-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                {loading ? "重试中…" : "重试"}
              </button>
            )}
          </div>
        )}

        {showEmpty ? (
          <div className="mb-12 py-16 text-center text-gray-500">
            还没有生成过壁纸，试试在上方输入描述吧
          </div>
        ) : (
          <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mb-16 md:grid-cols-3 md:gap-4 ">
            {/* 生成中的占位卡片放最前面，新图出来后会替换掉它 */}
            {generating && <SkeletonCard label="AI 正在作画…" />}

            {/* 首次加载还没有数据时，先铺几个骨架 */}
            {loading && wallpapers.length === 0 && !generating && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* map 遍历数组，每个 wallpaper 渲染一个卡片 */}
            {wallpapers.map((wallpaper: Wallpaper) => {
              const sizeOption = getSizeOptionBySize(wallpaper.img_size);
              const href = wallpaper.id ? `/wallpaper/${wallpaper.id}` : "";

              return (
                <div
                  key={wallpaper.id ?? wallpaper.img_url}
                  className={`mx-auto w-full max-w-md ${
                    loading ? "opacity-60" : ""
                  }`}
                >
                  <Link
                    href={href}
                    className="block cursor-pointer rounded-md bg-gray-100 p-4 text-black transition hover:shadow-lg sm:p-6"
                  >
                    <div className="mb-3 flex w-full items-center justify-between">
                      <div className="flex items-center">
                        {wallpaper.user_avatar && (
                          <Image
                            src={wallpaper.user_avatar}
                            alt=""
                            width={32}
                            height={32}
                            className="mr-3 inline-block h-8 w-8 rounded-full object-cover"
                          />
                        )}
                        <h6 className="text-sm font-bold">
                          {wallpaper.user_nickname}
                        </h6>
                      </div>
                      <span className="text-xs text-gray-500">
                        {sizeOption.label} · {wallpaper.img_size}
                      </span>
                    </div>

                    {/*
                      固定 4:3 的容器 + object-contain：
                      桌面图和手机图混排时行高一致，又不会把图片裁掉
                    */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-gray-200">
                      <WallpaperThumb
                        src={wallpaper.img_url}
                        alt={wallpaper.img_description || "AI 壁纸"}
                      />
                    </div>

                    {/* img_description：用户输入的壁纸描述 */}
                    <div className="mt-4 line-clamp-2 text-sm text-gray-700">
                      {wallpaper.img_description}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {total > 0 && (
          <div className="w-full flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => onPageChange(page - 1)}
              className="bg-amber-500 px-6 py-3 text-center font-semibold text-white rounded-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => onPageChange(page + 1)}
              className="bg-amber-500 px-6 py-3 text-center font-semibold text-white rounded-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

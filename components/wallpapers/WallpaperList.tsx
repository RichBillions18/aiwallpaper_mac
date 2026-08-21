/**
 * 【第1阶段 · 第2课】WallpaperList —— 用 map 渲染壁纸列表
 *
 * 核心概念：
 *   - map：把数组每一项变成一段 JSX（3 张壁纸 → 3 个卡片）
 *   - key：React 要求列表每一项有唯一标识，方便区分哪一项变了（这里用 wallpaper.id）
 *   - 花括号 {}：在 JSX 里写 JavaScript 表达式，比如 {wallpaper.img_url}
 *
 * 复习：数据从 page.tsx → Wallpapers → 这里，全程通过 props 传递，本组件不自己存列表。
 */
"use client";

import { Wallpaper } from "@/types/wallpaper";

interface Props {
  wallpapers: Wallpaper[];
}

export default function ({ wallpapers }: Props) {
  return (
    <section>
      <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20">
        <div className="mb-8 text-center md:mb-12 ">
          <h2 className="text-3xl font-bold md:text-5xl text-primary">
            全部壁纸
          </h2>
          {/* wallpapers.length：数组长度，显示一共有多少张 */}
          <p className="mt-4 text-gray-500 text-base">
            一共 {wallpapers.length} 条由 AI 生成的壁纸
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mb-16 md:grid-cols-3 md:gap-4 ">
          {/* map 遍历数组，每个 wallpaper 渲染一个卡片 */}
          {wallpapers &&
            wallpapers.map((wallpaper: Wallpaper, idx: number) => {
              return (
                // key 必须唯一，React 靠它追踪列表变化
                <div
                  key={wallpaper.id}
                  className="mx-auto w-full max-w-md gap-4 rounded-md bg-gray-100 p-8 text-black sm:px-4 sm:py-8"
                >
                  <div className="mb-3 flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={wallpaper.user_avatar}
                        alt=""
                        className="mr-4 inline-block h-8 w-8 rounded-full"
                      />
                      <h6 className="text-base font-bold">
                        {wallpaper.user_nickname}
                      </h6>
                    </div>
                    <a
                      href="javascript:void(0);"
                      className="inline-block max-w-full text-black"
                    >
                      <span>{wallpaper.img_size}</span>
                    </a>
                  </div>
                  {/* img_url：壁纸图片地址，来自后端 API 返回的数据 */}
                  <img
                    src={wallpaper.img_url}
                    alt=""
                    className="inline-block h-60 w-full rounded-md object-cover"
                  />
                  <div className="flex w-full flex-col items-start gap-5 p-0">
                    {/* img_description：用户输入的壁纸描述 */}
                    <div>{wallpaper.img_description}</div>
                    <div className="h-px w-full bg-gray-300"></div>
                    <div className="flex">
                      <img
                        src="https://assets.website-files.com/6458c625291a94a195e6cf3a/647e390253503e4d887918ea_Star%201.svg"
                        alt=""
                        className="mr-1.5 inline-block w-4 flex-none"
                      />
                      <img
                        src="https://assets.website-files.com/6458c625291a94a195e6cf3a/647e390253503e4d887918ea_Star%201.svg"
                        alt=""
                        className="mr-1.5 inline-block w-4 flex-none"
                      />
                      <img
                        src="https://assets.website-files.com/6458c625291a94a195e6cf3a/647e390253503e4d887918ea_Star%201.svg"
                        alt=""
                        className="mr-1.5 inline-block w-4 flex-none"
                      />
                      <img
                        src="https://assets.website-files.com/6458c625291a94a195e6cf3a/647e390253503e4d887918ea_Star%201.svg"
                        alt=""
                        className="mr-1.5 inline-block w-4 flex-none"
                      />
                      <img
                        src="https://assets.website-files.com/6458c625291a94a195e6cf3a/647e390253503e4d887918ea_Star%201.svg"
                        alt=""
                        className="mr-1.5 inline-block w-4 flex-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="w-full flex justify-center">
          <a
            href="javascript:void(0);"
            className="bg-amber-500 px-6 py-3 text-center font-semibold text-white rounded-md"
          >
            查看更多
          </a>
        </div>
      </div>
    </section>
  );
}

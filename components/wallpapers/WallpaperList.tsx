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
          <p className="mt-4 text-gray-500 text-base">
            一共 100 条由 AI 生成的壁纸
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mb-16 md:grid-cols-3 md:gap-4 ">
          {wallpapers &&
            wallpapers.map((wallpaper: Wallpaper, idx: number) => {
              return (
                <div
                  key={wallpaper.created_at}
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
                  <img
                    src={wallpaper.img_url}
                    alt=""
                    className="inline-block h-60 w-full rounded-md object-cover"
                  />
                  <div className="flex w-full flex-col items-start gap-5 p-0">
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

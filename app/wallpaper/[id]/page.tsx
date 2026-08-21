/**
 * 【第2阶段 · 动态路由 /wallpaper/[id]】壁纸详情页
 *
 * 文件路径 app/wallpaper/[id]/page.tsx → 网址 /wallpaper/123
 * 和 pay-success/[session_id] 一样：URL 里的数字就是 params.id
 *
 * 服务端组件：直接查库，不经过 API。未登录跳登录页；不是自己的图按 404 处理。
 * 「下载原图」是普通链接，不需要 JS，所以整页都不用 "use client"。
 */
import Footer from "@/components/footer";
import Header from "@/components/header";
import { getWallpaperById } from "@/models/wallpaper";
import { getSizeOptionBySize } from "@/lib/wallpaper-options";
import { getCurrentUserInfo } from "@/service/auth";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function WallpaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wallpaperId = Number.parseInt(id, 10);
  if (!Number.isFinite(wallpaperId) || wallpaperId <= 0) {
    notFound();
  }

  const { redirectToSignIn } = await auth();
  const user = await getCurrentUserInfo();
  if (!user) {
    return redirectToSignIn();
  }

  const wallpaper = await getWallpaperById(wallpaperId);
  if (!wallpaper || wallpaper.user_email !== user.email) {
    notFound();
  }

  const createdAt = wallpaper.created_at
    ? new Date(wallpaper.created_at).toLocaleString("zh-CN")
    : "";

  // 详情页按真实比例展示：从 img_size 拆出宽高交给 next/image
  const sizeOption = getSizeOptionBySize(wallpaper.img_size);
  const [width, height] = sizeOption.size.split("x").map(Number);

  return (
    <div className="w-screen min-h-screen">
      <Header />
      <section className="mx-auto w-full max-w-5xl px-5 py-10 md:px-10">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-gray-500 hover:text-primary"
        >
          ← 返回首页
        </Link>

        <div className="rounded-md bg-gray-100 p-6 text-black sm:p-8">
          <div className="mb-4 flex w-full items-center justify-between">
            <div className="flex items-center">
              <Image
                src={user.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="mr-4 inline-block h-10 w-10 rounded-full object-cover"
              />
              <h6 className="text-base font-bold">{user.nickname || "我"}</h6>
            </div>
            <span className="text-sm text-gray-600">
              {sizeOption.label} · {wallpaper.img_size}
            </span>
          </div>

          {/* priority：详情页主图是首屏内容，不做懒加载 */}
          <Image
            src={wallpaper.img_url}
            alt={wallpaper.img_description || "AI 壁纸"}
            width={width}
            height={height}
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
            className="mx-auto mb-6 h-auto max-h-[70vh] w-auto rounded-md"
          />

          <h1 className="mb-3 text-2xl font-bold text-primary">
            {wallpaper.img_description || "未填写描述"}
          </h1>
          <div className="mb-6 space-y-1 text-sm text-gray-600">
            {createdAt && <p>生成时间：{createdAt}</p>}
            {wallpaper.llm_name && <p>模型：{wallpaper.llm_name}</p>}
          </div>

          {/* 下载头由 /api/download-wallpaper 设置，浏览器才会「保存文件」 */}
          <a
            href={`/api/download-wallpaper?id=${wallpaperId}`}
            className="inline-block rounded-md bg-amber-500 px-5 py-2.5 font-semibold text-white transition hover:bg-amber-600"
          >
            下载原图
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}

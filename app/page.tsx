/**
 * 【第1阶段 · 首页】【第2阶段 · 路由 /】【第5阶段 · 前端登录】app/page.tsx
 *
 * 文件路径 app/page.tsx → 网址 /
 *
 * 请求路径：middleware → layout.tsx → 本文件（客户端组件）
 *
 * 数据流复习：
 *   1. 登录后 → useEffect 按 URL 里的 ?page= 拉当前用户壁纸 → 存入 wallpapers
 *   2. wallpapers 通过 props 传给 <Wallpapers />
 *   3. 用户在 <Input /> 生成新壁纸 → 回到第 1 页并重新拉取列表
 *   4. 登录后同时 fetchCredits → leftCredits 传给 Header / Input
 *
 * 页码放 URL 而不是只放 state：刷新、分享链接、浏览器前进后退都能回到同一页。
 * 用了 useSearchParams 就要包一层 Suspense，这是 App Router 的要求。
 *
 * 【第5阶段】前端登录三种状态：
 *   !isLoaded     → Loading（Clerk 还在读 Cookie）
 *   !isSignedIn   → RedirectToSignIn（强制跳登录页）
 *   已登录        → 渲染完整首页，再拉壁纸和积分
 *
 * 注意：这里只是「体验层」鉴权。真正安全靠 API 里的 currentUser()
 * （前端判断可以被绕过，后端必须再查一遍）
 */
"use client"; // 客户端组件：用了 hooks / 用户交互，必须在浏览器运行（见 pay-success 页对比）

import Header from "@/components/header";
import Hero from "@/components/hero";
import Input from "@/components/input";
import Wallpapers from "@/components/wallpapers";
import Footer from "@/components/footer";
import { Wallpaper } from "@/types/wallpaper";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";

const PAGE_SIZE = 9; // 每页固定 9 张，配合三列网格

function PageLoading() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>
  );
}

function HomeContent() {
  // useState：组件的「状态」，数据变了页面会自动重新渲染
  // wallpapers 是整个首页的壁纸列表，存在父组件里，再传给子组件展示
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [generating, setGenerating] = useState(false);
  // 剩余积分；初始 null 表示尚未拉取。传给 Header 时用 ?? 0（null/undefined 则显示 0）
  const [leftCredits, setLeftCredits] = useState<number | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // 页码唯一来源是 URL：?page=2。非法值一律当第 1 页
  const pageParam = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  // 【第5阶段】useUser：只能在客户端组件里用
  // isLoaded = Clerk 是否读完登录状态；isSignedIn = 是否已登录
  const { isSignedIn, isLoaded } = useUser();

  // 【第3阶段】GET API：不带 method/body，对应 app/api/get-wallpapers/route.ts
  const fetchWallpapers = useCallback(async function (pageNum: number) {
    setListLoading(true);
    setListError("");
    try {
      const result = await fetch(
        `/api/get-wallpapers?page=${pageNum}&limit=${PAGE_SIZE}`,
      );
      const { code, message, data } = await result.json(); // 成功时 code=0，列表在 data.list 里

      // 外部服务偶发抖动时后端会返回 code!=0，这时保留原列表并提示重试，
      // 不要把已经显示的壁纸清空（那样看起来像「图全没了」）
      if (code !== 0 || !data) {
        setListError(message || "加载失败，请重试");
        return;
      }

      setWallpapers(data.list ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setListError("网络错误，请重试");
    } finally {
      setListLoading(false);
    }
  }, []);

  // useCallback：把函数包一层，避免 useEffect 每次渲染都重复执行（进阶用法，先知道用途即可）
  // fetch 同源会自动带上 Clerk Cookie，后端 currentUser() 才能认出是谁
  const fetchCredits = useCallback(async () => {
    const response = await fetch("/api/get-user-info", {
      method: "POST",
    });
    const { data } = await response.json();

    if (data?.credits) {
      setLeftCredits(data.credits.left_credits);
    }
  }, []);

  // useEffect：在「某个时机」自动执行副作用（这里：用户登录成功后拉数据）
  // 未登录不请求，避免无效 API 调用
  useEffect(() => {
    if (isSignedIn) {
      fetchCredits();
    }
  }, [isSignedIn, fetchCredits]);

  // 页码变化（含浏览器后退）会重新拉当前页
  useEffect(() => {
    if (isSignedIn) {
      fetchWallpapers(page);
    }
  }, [isSignedIn, fetchWallpapers, page]);

  const goToPage = (nextPage: number) => {
    // 写进 URL：刷新和分享都能回到这一页
    router.push(nextPage <= 1 ? "/" : `/?page=${nextPage}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGenerated = () => {
    // 新图在第 1 页顶部：已经在第 1 页就直接重拉，否则跳回第 1 页（由上面的 effect 触发）
    if (page === 1) {
      fetchWallpapers(1);
    } else {
      goToPage(1);
    }
  };

  // 【第5阶段】先等 isLoaded，避免登录状态还没读完就误判成「未登录」
  if (!isLoaded) {
    return <PageLoading />;
  }

  // 【第5阶段】强制登录策略：未登录直接跳 Clerk 登录页（对比 blog 页可看不同策略）
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // 已登录 → 渲染完整首页
  return (
    <div className="w-screen min-h-screen">
      {/* Header 模式 A：父组件传入 credits，不再重复请求 API（见 header/index.tsx） */}
      <Header credits={leftCredits ?? 0} />
      <Hero />
      <Input
        leftCredits={leftCredits}
        onCreditsChange={fetchCredits}
        onGenerated={handleGenerated}
        onGeneratingChange={setGenerating}
      />
      <Wallpapers
        wallpapers={wallpapers}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        loading={listLoading}
        generating={generating}
        error={listError}
        onRetry={() => fetchWallpapers(page)}
        onPageChange={goToPage}
      />
      <Footer />
    </div>
  );
}

export default function Home() {
  // useSearchParams 需要 Suspense 边界，否则构建时会报错
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent />
    </Suspense>
  );
}

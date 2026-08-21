/**
 * Header 组件 —— 顶部导航栏
 *   1. 显示 Logo、付费链接
 *   2. 显示用户剩余积分 (credits)
 *   3. 【第5阶段】显示 Clerk UserButton（头像 / 账号 / 登出）
 *
 * ── 积分数据从哪来？（两种模式）──────────────────────────────
 *
 *   模式 A：父组件传入 credits（首页 page.tsx 就是这样用的）
 *     <Header credits={leftCredits ?? 0} />
 *     → Header 直接显示父组件给的数字，不再自己请求 API
 *     → 好处：首页已经在 page.tsx 里 fetch 过积分了，避免重复请求
 *
 *   模式 B：父组件不传 credits（定价页 pricing/page.tsx 就是这样用的）
 *     <Header />
 *     → Header 自己用 useEffect + fetch 去拉 /api/get-user-info
 *
 * ── React 核心概念复习 ───────────────────────────────────────
 *
 *   useState   → 存组件内部的数据，setXxx 更新后页面自动重绘
 *   useEffect  → 组件「挂载到页面后」自动执行的副作用（如发网络请求）
 *   props      → 父组件传给子组件的参数（这里是 credits?）
 *
 * 【第5阶段】UserButton 依赖 layout 里的 ClerkProvider；
 * 退出后 Cookie 清除，页面再访问会变成未登录。
 */
"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";

/** 父组件可选传入积分；传了就用传的，没传 Header 自己 fetch */
interface Props {
  credits?: number;
}

export default function ({ credits: creditsFromParent }: Props) {
  // creditsFromParent：父组件 prop 重命名，与内部 credits state 区分（模式 A / B）
  const [credits, setCredits] = useState(0); // 模式 B 时由 fetch 写入

  // 父组件明确传了值（含 0）就用传的，否则用自己 fetch 的；不用 !x 是因为 0 合法
  const displayCredits =
    creditsFromParent !== undefined ? creditsFromParent : credits;

  /** 向 /api/get-user-info 发 POST（第3阶段：POST 也可以不带 body） */
  const fetchUserInfo = async () => {
    const response = await fetch("/api/get-user-info", {
      method: "POST", // 后端 route 只实现了 POST
    });
    const { data } = await response.json();

    console.log("userinfo", data);

    // API 返回结构：{ data: { credits: { left_credits: number } } }
    if (data && data.credits) {
      setCredits(data.credits.left_credits); // 写入 state → 触发重渲染 → 页面更新
    }
  };

  /**
   * 组件第一次出现在页面上时执行一次 fetchUserInfo
   *
   * 依赖 [creditsFromParent]：
   *   - 如果父组件后来传了 credits，effect 会重新跑，但里面会直接 return 跳过请求
   *   - 如果父组件一直没传，就只会在挂载时请求一次
   */
  useEffect(() => {
    if (creditsFromParent !== undefined) {
      return; // 父组件已提供积分，不需要重复请求
    }
    fetchUserInfo();
  }, [creditsFromParent]);

  return (
    <header>
      <div className="h-auto w-screen">
        <nav className="font-inter mx-auto h-auto w-full max-w-[1600px] lg:relative lg:top-0">
          {/* 横向布局：Logo | 付费 | (空白占位) | 积分 | 用户头像 */}
          <div className="flex flex-row items-center px-6 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-4 xl:px-20">
            {/* Logo，点击回首页 */}
            <a
              href="/"
              className="flex-1 text-xl font-medium flex items-center"
            >
              <span className="font-bold text-primary text-2xl">
                AI Wallpaper
              </span>
            </a>

            <a href="/pricing">付费</a>

            {/* flex-1 空白 div：把后面的积分和头像推到右侧 */}
            <div className="flex-1"></div>

            {/* 积分 ≤ 0 时用琥珀色提醒用户去充值 */}
            <p
              className={
                displayCredits <= 0 ? "text-amber-600 font-medium" : undefined
              }
            >
              credits: {displayCredits}
            </p>

            {/* 【第5阶段】UserButton：头像下拉（账号、登出）；登出后默认回首页 / */}
            <div className="flex flex-row items-center lg:flex lg:flex-row lg:space-x-3 lg:space-y-0">
              <div className="hidden md:block mr-8">
                <UserButton />
              </div>
            </div>

            {/* 移动端占位链接（目前 href="#" 暂无实际功能） */}
            <a href="#" className="absolute right-5 lg:hidden"></a>
          </div>
        </nav>
      </div>
    </header>
  );
}

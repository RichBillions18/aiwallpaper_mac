/**
 * 【第1阶段】Input 组件 —— 用户输入 + 调用 API 生成壁纸
 * 【第3阶段】前端调 POST API 的完整示例
 *
 * 核心概念：
 *   - useState：存输入框文字 (description) 和 loading 状态
 *   - 受控组件：输入框的 value 绑定 state，onChange 更新 state
 *   - fetch POST：method + Content-Type + JSON.stringify(body) 三者要配套
 *   - 响应处理：看 code 和 message，不能只看 data（失败时没有 data）
 *   - props：从父组件接收 setWallpapers，生成成功后直接更新父组件的列表
 *
 * 生成成功后这行最关键：
 *   setWallpapers((wallpapers) => [data, ...wallpapers])
 *   → 新壁纸插到数组最前面 → 页面列表顶部立刻出现新图
 */
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dispatch, SetStateAction, useState } from "react";
import { Wallpaper } from "@/types/wallpaper";
import { useRouter } from "next/navigation";

// Props 类型：父组件传进来的「参数」
interface Props {
  setWallpapers: Dispatch<SetStateAction<Wallpaper[]>>; // 父组件的 setState 函数
  leftCredits?: number | null; // 剩余积分（可选）
  onCreditsChange?: () => void; // 生成成功后刷新积分的回调（可选）
}

export default function ({
  setWallpapers,
  leftCredits = null,
  onCreditsChange,
}: Props) {
  // useState 语法：const [当前值, 修改函数] = useState(初始值)
  const [description, setDescription] = useState(""); // 输入框里的文字
  const [loading, setLoading] = useState(false); // 是否正在生成中
  const router = useRouter(); // Next.js 路由跳转（积分不足时跳付费页）

  const hasNoCredits = leftCredits !== null && leftCredits <= 0;

  const handleInsufficientCredits = () => {
    const goToPricing = confirm("积分不足，是否前往付费页面购买？");
    if (goToPricing) {
      router.push("/pricing");
    }
  };

  // 核心：向后端请求生成壁纸
  const generateWallpaper = async function () {
    const params = {
      description: description,
    };

    setLoading(true); // 开始 loading，按钮变「生成中」且不可点
    try {
      // fetch 三步：发请求 → 等响应 → 解析 JSON
      // 【第5阶段】body 只传 description；身份靠浏览器自动附带的 Cookie，不要自己传 email
      const result = await fetch("/api/gen-wallpaper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // 告诉后端：body 是 JSON 格式
        },
        body: JSON.stringify(params), // 把 JS 对象转成 JSON 字符串发送
      });
      const { code, message, data } = await result.json();

      // code === 0 表示成功
      if (code === 0 && data) {
        console.log("new wallpaper: ", data);
        // 用函数式更新：基于旧列表，把新壁纸插到最前面
        setWallpapers((wallpapers: Wallpaper[]) => [data, ...wallpapers]);
        onCreditsChange?.(); // ?. 表示：如果传了回调才调用
        return;
      }

      if (code === -1) {
        handleInsufficientCredits();
        return;
      }

      // 【第5阶段】API 用 currentUser() 发现未登录时返回 -2（前端拦不住直接调 API 的人）
      if (code === -2) {
        alert(message || "请先登录");
        return;
      }

      if (code === 400) {
        alert(message || "壁纸描述无效或过长");
        return;
      }

      alert(message || "生成失败，请稍后重试");
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setLoading(false); // 无论成功失败，都结束 loading
    }
  };

  // 点击「生成壁纸」按钮时触发
  const handleSubmit = async function () {
    if (!description.trim()) {
      alert("壁纸描述不能为空");
      return;
    }

    if (hasNoCredits) {
      handleInsufficientCredits();
      return;
    }

    await generateWallpaper();
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center gap-2">
      <div className="w-full flex items-center">
        {/* 受控组件：value 绑定 state，用户输入 → onChange → 更新 state → 输入框显示新文字 */}
        <Input
          type="text"
          placeholder="请描述你要生成的壁纸"
          value={description}
          disabled={loading || hasNoCredits}
          onChange={(e) => setDescription(e.target.value)}
        />
        {/* 三元表达式：loading 时显示「生成中」，否则根据积分显示不同文字 */}
        <Button
          className="ml-4"
          onClick={handleSubmit}
          disabled={loading || hasNoCredits}
        >
          {loading ? "生成中" : hasNoCredits ? "积分不足" : "生成壁纸"}
        </Button>
      </div>
      {hasNoCredits && (
        <p className="text-sm text-amber-600">
          积分已用完，请{" "}
          <a href="/pricing" className="underline font-medium">
            前往购买
          </a>
        </p>
      )}
    </div>
  );
}

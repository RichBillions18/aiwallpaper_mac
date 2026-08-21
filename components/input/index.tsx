/**
 * 【第1阶段】Input 组件 —— 用户输入 + 调用 API 生成壁纸
 * 【第3阶段】前端调 POST API 的完整示例
 *
 * 核心概念：
 *   - useState：存输入框文字、尺寸、风格标签、loading 状态
 *   - 受控组件：输入框的 value 绑定 state，onChange 更新 state
 *   - fetch POST：method + Content-Type + JSON.stringify(body) 三者要配套
 *   - 响应处理：看 code 和 message，不能只看 data（失败时没有 data）
 *   - props：生成成功后通知父组件刷新列表和积分
 *
 * 等待体验（生成一次要十几秒，不能只把按钮变灰）：
 *   · 进度条 + 已等待秒数 + 预计耗时
 *   · submittingRef 兜底防重复提交（比 disabled 更可靠，双击也拦得住）
 *   · 成功才清空输入框；失败保留描述，用户不用重新打一遍
 */
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DEFAULT_SIZE_ID,
  EXAMPLE_PROMPTS,
  MAX_STYLE_TAGS,
  STYLE_TAGS,
  WALLPAPER_SIZES,
  WallpaperSizeId,
} from "@/lib/wallpaper-options";
import { MAX_DESCRIPTION_LENGTH, checkDescription } from "@/lib/prompt-filter";

// 经验值：DALL·E 3 出图 + 传 S3 大概 15~30 秒，用来给进度条一个参照
const ESTIMATED_SECONDS = 25;

// Props 类型：父组件传进来的「参数」
interface Props {
  leftCredits?: number | null; // 剩余积分（可选）
  onCreditsChange?: () => void; // 生成成功后刷新积分的回调（可选）
  onGenerated?: () => void; // 生成成功后刷新列表（回到第 1 页）
  onGeneratingChange?: (generating: boolean) => void; // 让列表显示占位骨架
}

export default function WallpaperInput({
  leftCredits = null,
  onCreditsChange,
  onGenerated,
  onGeneratingChange,
}: Props) {
  // useState 语法：const [当前值, 修改函数] = useState(初始值)
  const [description, setDescription] = useState(""); // 输入框里的文字
  const [sizeId, setSizeId] = useState<WallpaperSizeId>(DEFAULT_SIZE_ID);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // 是否正在生成中
  const [elapsed, setElapsed] = useState(0); // 已等待秒数
  const [error, setError] = useState(""); // 页内错误提示，比 alert 温和
  const submittingRef = useRef(false); // 防止双击重复发请求
  const router = useRouter(); // Next.js 路由跳转（积分不足时跳付费页）

  const hasNoCredits = leftCredits !== null && leftCredits <= 0;
  const disabled = loading || hasNoCredits;

  // loading 期间每秒 +1，让用户知道「在动，没卡死」
  useEffect(() => {
    if (!loading) {
      return;
    }
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer); // 组件卸载 / loading 结束时清理定时器
  }, [loading]);

  const handleInsufficientCredits = () => {
    const goToPricing = confirm("积分不足，是否前往付费页面购买？");
    if (goToPricing) {
      router.push("/pricing");
    }
  };

  const toggleTag = (id: string) => {
    setTags((current) => {
      if (current.includes(id)) {
        return current.filter((tag) => tag !== id);
      }
      if (current.length >= MAX_STYLE_TAGS) {
        return current; // 超过上限就不再加，风格太多会互相打架
      }
      return [...current, id];
    });
  };

  // 核心：向后端请求生成壁纸
  const generateWallpaper = async function () {
    // body 里只传选项 id，真实尺寸和提示词由后端拼（前端传的不作数）
    const params = {
      description: description.trim(),
      size: sizeId,
      tags: tags,
    };

    setLoading(true);
    onGeneratingChange?.(true);
    setElapsed(0);
    setError("");

    try {
      // fetch 三步：发请求 → 等响应 → 解析 JSON
      // 【第5阶段】身份靠浏览器自动附带的 Cookie，不要自己传 email
      const result = await fetch("/api/gen-wallpaper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // 告诉后端：body 是 JSON 格式
        },
        body: JSON.stringify(params), // 把 JS 对象转成 JSON 字符串发送
      });
      const { code, message } = await result.json();

      // code === 0 表示成功
      if (code === 0) {
        setDescription(""); // 只有成功才清空，失败时保留让用户改
        onGenerated?.(); // 让父组件回到第 1 页并重新拉列表
        onCreditsChange?.(); // ?. 表示：如果传了回调才调用
        return;
      }

      if (code === -1) {
        handleInsufficientCredits();
        return;
      }

      // 【第5阶段】API 用 currentUser() 发现未登录时返回 -2
      if (code === -2) {
        setError(message || "请先登录");
        return;
      }

      setError(message || "生成失败，请稍后重试");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      onGeneratingChange?.(false);
      submittingRef.current = false;
    }
  };

  // 点击「生成壁纸」按钮时触发
  const handleSubmit = async function () {
    if (submittingRef.current) {
      return; // 上一次还没回来，直接忽略
    }

    // 和后端同一个校验函数：长度、空白、敏感词，能省一次网络往返
    const checked = checkDescription(description);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }

    if (hasNoCredits) {
      handleInsufficientCredits();
      return;
    }

    submittingRef.current = true;
    await generateWallpaper();
  };

  // 进度条百分比：按预计耗时估算，最多停在 95%，等真返回再消失
  const progress = Math.min(95, Math.round((elapsed / ESTIMATED_SECONDS) * 100));

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 px-5">
      <div className="w-full flex items-center">
        {/* 受控组件：value 绑定 state，用户输入 → onChange → 更新 state → 输入框显示新文字 */}
        <Input
          type="text"
          placeholder="请描述你要生成的壁纸"
          value={description}
          disabled={disabled}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />
        {/* 三元表达式：loading 时显示「生成中」，否则根据积分显示不同文字 */}
        <Button className="ml-4 shrink-0" onClick={handleSubmit} disabled={disabled}>
          {loading ? "生成中…" : hasNoCredits ? "积分不足" : "生成壁纸"}
        </Button>
      </div>

      {/* 尺寸：决定 DALL·E 出图比例，也决定壁纸能不能直接用在手机上 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 mr-1">尺寸</span>
        {WALLPAPER_SIZES.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => setSizeId(option.id)}
            className={`rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
              sizeId === option.id
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            {option.label}
            <span className="ml-1 text-xs text-gray-400">{option.hint}</span>
          </button>
        ))}
      </div>

      {/* 风格标签：点选后由后端追加进提示词，最多 3 个 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 mr-1">风格</span>
        {STYLE_TAGS.map((tag) => {
          const active = tags.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full border px-3 py-1 text-sm transition disabled:opacity-50 ${
                active
                  ? "border-amber-500 bg-amber-500 text-white"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
        <span className="text-xs text-gray-400">
          可选 {tags.length}/{MAX_STYLE_TAGS}
        </span>
      </div>

      {/* 示例：点一下直接填进输入框，解决「不知道写什么」 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-gray-500">试试</span>
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            disabled={disabled}
            onClick={() => {
              setDescription(example);
              setError("");
            }}
            className="text-gray-500 underline decoration-dotted hover:text-amber-600 disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      {/* 生成中：进度条 + 秒数，避免用户以为页面卡住而反复点击 */}
      {loading && (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            AI 正在作画，已等待 {elapsed} 秒（通常 {ESTIMATED_SECONDS} 秒左右，
            请不要刷新页面）
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {hasNoCredits && (
        <p className="text-sm text-amber-600">
          积分已用完，请{" "}
          <Link href="/pricing" className="underline font-medium">
            前往购买
          </Link>
        </p>
      )}
    </div>
  );
}

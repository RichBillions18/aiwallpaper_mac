"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dispatch, SetStateAction, useState } from "react";
import { Wallpaper } from "@/types/wallpaper";
import { useRouter } from "next/navigation";

interface Props {
  setWallpapers: Dispatch<SetStateAction<Wallpaper[]>>;
  leftCredits?: number | null;
  onCreditsChange?: () => void;
}

export default function ({
  setWallpapers,
  leftCredits = null,
  onCreditsChange,
}: Props) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const hasNoCredits = leftCredits !== null && leftCredits <= 0;

  const handleInsufficientCredits = () => {
    const goToPricing = confirm(
      "积分不足，是否前往付费页面购买？"
    );
    if (goToPricing) {
      router.push("/pricing");
    }
  };

  const generateWallpaper = async function () {
    const params = {
      description: description,
    };

    setLoading(true);
    try {
      const result = await fetch("/api/gen-wallpaper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      const { code, message, data } = await result.json();

      if (code === 0 && data) {
        console.log("new wallpaper: ", data);
        setWallpapers((wallpapers: Wallpaper[]) => [data, ...wallpapers]);
        onCreditsChange?.();
        return;
      }

      if (code === -1) {
        handleInsufficientCredits();
        return;
      }

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
      setLoading(false);
    }
  };

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
        <Input
          type="text"
          placeholder="请描述你要生成的壁纸"
          value={description}
          disabled={loading || hasNoCredits}
          onChange={(e) => setDescription(e.target.value)}
        />
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

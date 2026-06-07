"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dispatch, SetStateAction, useState } from "react";
import { Wallpaper } from "@/types/wallpaper";

interface Props {
  setWallpapers: Dispatch<SetStateAction<Wallpaper[]>>;
}

export default function ({ setWallpapers }: Props) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // 生成壁纸
  const generateWallpaper = async function () {
    const params = {
      description: description,
    };

    setLoading(true);
    // 第一步：等快递送到门口（拿到响应头和状态）
    const result = await fetch("/api/gen-wallpaper", {
      method: "POST",
      body: JSON.stringify(params),
    });
    // 第二步：打开快递盒，把里面的 JSON 字符串转成 JS 对象
    const { data } = await result.json();
    setLoading(false);

    if (data) {
      console.log("new wallpaper: ", data);
      setWallpapers((wallpapers: Wallpaper[]) => [data, ...wallpapers]);
    }
  };

  // 提交处理（表单验证）
  const handleSubmit = async function () {
    console.log("current:", description);
    if (!description) {
      alert("壁纸描述不能为空");
      return;
    }

    await generateWallpaper();
  };

  return (
    <div className="max-w-xl mx-auto flex items-center">
      <Input
        type="text"
        placeholder="请描述你要生成的壁纸"
        value={description}
        disabled={loading}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button className="ml-4" onClick={handleSubmit} disabled={loading}>
        {loading ? "生成中" : "生成壁纸"}
      </Button>
    </div>
  );
}

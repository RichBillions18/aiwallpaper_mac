/**
 * 【生成选项白名单】lib/wallpaper-options.ts
 *
 * 前端要渲染尺寸按钮和风格标签，后端要校验参数，两边引用同一份常量，
 * 就不会出现「前端能选、后端不认」的情况。
 *
 * 安全约定：后端只接受 id，再用 id 反查真实参数。
 * 绝不能把前端传来的 size 字符串直接交给 OpenAI（同 checkout 不信前端金额）。
 */

export type WallpaperSizeId = "desktop" | "mobile" | "square";

/** DALL·E 3 只支持这三种尺寸，4:3 之类的比例需要后期裁剪，这里先不提供 */
export type DalleImageSize = "1792x1024" | "1024x1792" | "1024x1024";

export interface WallpaperSizeOption {
  id: WallpaperSizeId;
  label: string;
  hint: string;
  size: DalleImageSize; // 同时写入数据库 img_size
  device: string; // 拼进提示词，告诉模型这是什么设备的壁纸
  aspectClass: string; // 列表/详情占位用的 Tailwind 宽高比
}

export const WALLPAPER_SIZES: WallpaperSizeOption[] = [
  {
    id: "desktop",
    label: "桌面",
    hint: "16:9 · 1792×1024",
    size: "1792x1024",
    device: "widescreen desktop computer",
    aspectClass: "aspect-video",
  },
  {
    id: "mobile",
    label: "手机",
    hint: "9:16 · 1024×1792",
    size: "1024x1792",
    device: "vertical mobile phone",
    aspectClass: "aspect-[9/16]",
  },
  {
    id: "square",
    label: "方形",
    hint: "1:1 · 1024×1024",
    size: "1024x1024",
    device: "square tablet and social",
    aspectClass: "aspect-square",
  },
];

export const DEFAULT_SIZE_ID: WallpaperSizeId = "desktop";

/** 按 id 取尺寸；传了非法值就回落到默认桌面尺寸 */
export function getSizeOption(id?: unknown): WallpaperSizeOption {
  const matched = WALLPAPER_SIZES.find((option) => option.id === id);
  return matched ?? WALLPAPER_SIZES[0];
}

/** 按数据库里的 img_size 反查，用于详情页决定图片宽高比 */
export function getSizeOptionBySize(size?: string): WallpaperSizeOption {
  const matched = WALLPAPER_SIZES.find((option) => option.size === size);
  return matched ?? WALLPAPER_SIZES[0];
}

export interface StyleTag {
  id: string;
  label: string;
  prompt: string; // 追加到提示词里的英文描述，模型对英文风格词更敏感
}

export const STYLE_TAGS: StyleTag[] = [
  { id: "landscape", label: "风景", prompt: "natural landscape, golden hour light" },
  { id: "cyberpunk", label: "赛博朋克", prompt: "cyberpunk city, neon lights, rainy night" },
  { id: "minimal", label: "极简", prompt: "minimalist, clean shapes, lots of negative space" },
  { id: "anime", label: "二次元", prompt: "anime illustration, cel shading, vivid colors" },
  { id: "abstract", label: "抽象", prompt: "abstract gradient, fluid shapes" },
  { id: "space", label: "星空", prompt: "deep space, nebula, starry sky" },
  { id: "watercolor", label: "水彩", prompt: "watercolor painting, soft brush texture" },
  { id: "pixel", label: "像素", prompt: "pixel art, 16-bit retro game style" },
];

/** 最多允许叠加几个风格，太多会让提示词互相冲突 */
export const MAX_STYLE_TAGS = 3;

/** 过滤掉前端传来的非法 id，并限制数量 */
export function getStyleTags(ids?: unknown): StyleTag[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const selected: StyleTag[] = [];
  ids.forEach((id) => {
    const matched = STYLE_TAGS.find((tag) => tag.id === id);
    if (matched && !selected.includes(matched)) {
      selected.push(matched);
    }
  });

  return selected.slice(0, MAX_STYLE_TAGS);
}

/** 输入框下方的示例，点一下就填进去，降低「不知道写什么」的门槛 */
export const EXAMPLE_PROMPTS: string[] = [
  "雪山之上的极光，湖面倒影",
  "雨夜的东京街头，霓虹招牌",
  "宇航员坐在月球上看地球",
  "一只橘猫睡在洒满阳光的窗台",
  "水墨风格的江南水乡清晨",
  "抽象流体渐变，蓝紫配色",
];

/**
 * 由原图地址推出缩略图地址（约定式，不需要在数据库里多存一列）
 *   .../wallpapers/123-abc.webp → .../wallpapers/thumbs/123-abc.webp
 *
 * 列表用缩略图（几十 KB），详情页才用原图（几百 KB）。
 * 老数据可能没有缩略图，前端要做加载失败回退，见 WallpaperThumb 组件。
 */
export const THUMB_DIR = "thumbs";

export function getThumbUrl(imgUrl: string): string {
  const index = imgUrl.lastIndexOf("/");
  if (index < 0) {
    return imgUrl;
  }

  return `${imgUrl.slice(0, index)}/${THUMB_DIR}${imgUrl.slice(index)}`;
}

/**
 * 拼最终提示词：设备 + 描述 + 风格 + 通用画质约束
 * 壁纸不要文字水印，所以显式禁止
 */
export function buildWallpaperPrompt(
  description: string,
  sizeOption: WallpaperSizeOption,
  tags: StyleTag[],
): string {
  const stylePart =
    tags.length > 0 ? ` Style: ${tags.map((tag) => tag.prompt).join(", ")}.` : "";

  return `Generate a ${sizeOption.device} wallpaper about: ${description}.${stylePart} High detail, balanced composition, no text, no watermark, no logo.`;
}

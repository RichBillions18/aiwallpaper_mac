/**
 * 【第1阶段 · 第6课】Wallpaper 类型定义
 *
 * interface：描述「一张壁纸对象应该有哪些字段、什么类型」。
 * TypeScript 会在写代码时帮你检查，比如少写字段或类型不对会提示。
 *
 * 字段说明：
 *   - 带 ? 的字段是「可选的」，可能没有
 *   - 不带 ? 的字段是「必须的」
 *
 * 使用示例（在 page.tsx 里）：
 *   useState<Wallpaper[]>([])  → wallpapers 是 Wallpaper 对象组成的数组
 */
export interface Wallpaper {
  id?: number; // 数据库自增 ID（可选，新生成时可能还没有）
  user_email: string; // 所属用户邮箱
  img_description?: string; // 用户输入的壁纸描述
  img_size?: string; // 图片尺寸，如 "1792x1024"
  img_url: string; // 图片地址（必须），WallpaperList 里 <img src={...}> 用的就是这个
  llm_name: string; // 使用的 AI 模型名，如 "dall-e-3"
  llm_params?: any; // AI 生成时的参数（JSON 格式）
  created_at: string; // 创建时间
  user_avatar?: string; // 用户头像 URL
  user_nickname?: string; // 用户昵称
}

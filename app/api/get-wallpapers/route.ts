/**
 * 【第3阶段 · GET 读数据】/api/get-wallpapers
 *
 * GET 典型用法：前端 fetch 不带 body，后端查库后返回列表。
 * 统一响应格式：{ code, message, data }，成功时 code=0，真实数据在 data 里。
 *
 * 调用方：app/page.tsx 的 fetchWallpapers()
 */
import { getWallpapers } from "@/models/wallpaper";

export async function GET(req: Request) {
  // async + await：等数据库查完再继续（第4阶段会看 getWallpapers 里的 SQL）
  const wallpapers = await getWallpapers(1, 50);

  return Response.json({
    code: 0,
    message: "ok",
    data: wallpapers, // 数组，多张壁纸；对比 gen-wallpaper 返回的是单个对象
  });
}

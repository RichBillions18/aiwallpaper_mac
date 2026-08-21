/**
 * 【第3阶段 · GET 读数据】/api/get-wallpapers
 *
 * GET 典型用法：前端 fetch 不带 body，后端查库后返回列表。
 * 统一响应格式：{ code, message, data }，成功时 code=0，真实数据在 data 里。
 *
 * 调用方：app/page.tsx 的 fetchWallpapers()
 *
 * 查询参数：
 *   page  页码，从 1 开始，默认 1
 *   limit 每页条数，默认 9
 *
 * 只返回当前登录用户自己的壁纸。
 *
 * 整个函数体包在 try/catch 里：Clerk 或数据库偶发断连时也返回规范 JSON，
 * 不让 Next 抛出裸 500（前端拿到 500 解析不出 code，只会莫名清空列表）。
 */
import { getUserWallpapersCount, getWallpapers } from "@/models/wallpaper";
import { getCurrentUserInfo } from "@/service/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserInfo();
    if (!user) {
      return Response.json({
        code: -2,
        message: "请先登录",
      });
    }

    const { searchParams } = new URL(req.url);

    const pageRaw = Number.parseInt(searchParams.get("page") || "1", 10);
    const limitRaw = Number.parseInt(searchParams.get("limit") || "9", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 9;

    const [wallpapers, total] = await Promise.all([
      getWallpapers(page, limit, user.email),
      getUserWallpapersCount(user.email),
    ]);

    // 昵称头像来自 Clerk，列表里每张图都是同一个人，直接复用
    const list = wallpapers.map((wallpaper) => ({
      ...wallpaper,
      user_nickname: user.nickname,
      user_avatar: user.avatarUrl,
    }));

    return Response.json({
      code: 0,
      message: "ok",
      data: {
        list,
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    // 重试之后仍然失败才会走到这里（重试逻辑见 lib/retry.ts）
    console.error("Get wallpapers error:", error);
    return Response.json({
      code: 500,
      message: "网络不稳定，加载壁纸失败，请重试",
    });
  }
}

/**
 * 【下载原图】/api/download-wallpaper?id=123
 *
 * 为什么不让前端直接点 S3 链接？
 *   1. 浏览器会「打开」图片而不是下载，除非响应带 Content-Disposition
 *   2. 跨域时 <a download> 的文件名会失效
 *   3. 这里能顺手校验「这张图是不是你的」
 *
 * 做法：服务端拉 S3 原图 → 原样转发给浏览器，只是换个响应头。
 */
import { getWallpaperById } from "@/models/wallpaper";
import { getCurrentUserInfo } from "@/service/auth";
import { getSizeOptionBySize } from "@/lib/wallpaper-options";
import { withRetry } from "@/lib/retry";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserInfo();
    if (!user) {
      return Response.json({ code: -2, message: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = Number.parseInt(searchParams.get("id") || "", 10);
    if (!Number.isFinite(id) || id <= 0) {
      return Response.json({ code: 400, message: "参数错误" }, { status: 400 });
    }

    const wallpaper = await getWallpaperById(id);
    // 找不到或不是自己的图，统一按 404 处理（不暴露「存在但无权」）
    if (!wallpaper || wallpaper.user_email !== user.email) {
      return Response.json(
        { code: 404, message: "壁纸不存在" },
        { status: 404 },
      );
    }

    const upstream = await withRetry("s3.fetchImage", () =>
      fetch(wallpaper.img_url),
    );
    if (!upstream.ok || !upstream.body) {
      throw new Error(`fetch image failed: ${upstream.status}`);
    }

    // 文件名带上尺寸，用户存到本地一眼能分清桌面版还是手机版
    // 扩展名跟着真实 Content-Type 走：图片存的是 WebP，就别给个 .png 的假名字
    const contentType = upstream.headers.get("content-type") || "image/webp";
    const extension = contentType.includes("png")
      ? "png"
      : contentType.includes("jpeg")
        ? "jpg"
        : "webp";
    const sizeOption = getSizeOptionBySize(wallpaper.img_size);
    const filename = `wallpaper-${id}-${sizeOption.size}.${extension}`;

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        // attachment 才是「下载」，inline 是「在浏览器里打开」
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (error) {
    console.error("Download wallpaper error:", error);
    return Response.json(
      { code: 500, message: "下载失败，请稍后重试" },
      { status: 500 },
    );
  }
}

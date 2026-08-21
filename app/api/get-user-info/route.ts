/**
 * 【第3阶段 · POST 无 body】【第5阶段 · 服务端鉴权】/api/get-user-info
 *
 * POST 也可以不带 body：身份靠 Cookie，不靠 body 里的参数。
 * 调用方：app/page.tsx、components/header/index.tsx
 *
 * 【第5阶段】和 gen-wallpaper / checkout 同一套路：
 *   取当前登录用户 → 拿 email → 再查业务数据（这里是积分）
 *
 * 返回格式统一成 { code, message, data }，未登录也不再返回裸字符串，
 * 否则前端 data?.credits 取不到值还得猜是哪种情况。
 */
import { getUserCredits } from "@/service/order";
import { getCurrentUserInfo } from "@/service/auth";

export async function POST() {
  try {
    const user = await getCurrentUserInfo();
    if (!user) {
      return Response.json({
        code: -2,
        message: "请先登录",
      });
    }

    const user_credits = await getUserCredits(user.email);

    return Response.json({
      code: 0,
      message: "ok",
      data: {
        credits: user_credits,
      },
    });
  } catch (error) {
    console.error("Get user info error:", error);
    return Response.json({
      code: 500,
      message: "网络不稳定，获取积分失败，请重试",
    });
  }
}

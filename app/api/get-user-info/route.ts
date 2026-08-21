/**
 * 【第3阶段 · POST 无 body】【第5阶段 · 服务端鉴权】/api/get-user-info
 *
 * POST 也可以不带 body：身份靠 Cookie，不靠 body 里的参数。
 * 调用方：app/page.tsx、components/header/index.tsx
 *
 * 【第5阶段】和 gen-wallpaper / checkout 同一套路：
 *   currentUser() → 取 user_email → 再查业务数据（这里是积分）
 */
import { getUserCredits } from "@/service/order";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  // 【第5阶段】根据 Cookie 认人；没有有效会话就返回未登录
  const user = await currentUser();
  if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
    return Response.json("not login");
  }
  const user_email = user.emailAddresses[0].emailAddress;

  const user_credis = await getUserCredits(user_email);
  console.log("user_credis", user_credis);

  return Response.json({
    code: 0,
    message: "ok",
    data: {
      credits: user_credis,
    },
  });
}

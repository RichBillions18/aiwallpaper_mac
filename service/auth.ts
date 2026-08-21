/**
 * 【服务端鉴权封装】service/auth.ts
 *
 * 四个 API 之前都在重复同一段代码：
 *   const user = await currentUser();
 *   if (!user || !user.emailAddresses || user.emailAddresses.length === 0) ...
 *
 * 抽到这里有两个好处：
 *   1. 少写重复代码，取邮箱/昵称/头像的口径统一
 *   2. currentUser() 是「服务器再去问一次 Clerk」的网络请求，慢链路上会偶发失败，
 *      统一包上重试（见 lib/retry.ts），不用在每个路由里各写一遍
 *
 * 约定：
 *   返回 undefined = 确实没登录 → 路由回 code -2
 *   抛异常         = 网络/Clerk 故障 → 路由回 code 500，别误报成「请先登录」
 */
import { currentUser } from "@clerk/nextjs/server";
import { withRetry } from "@/lib/retry";

export interface CurrentUserInfo {
  email: string; // 业务主键，wallpapers / orders 都用它关联
  nickname: string;
  avatarUrl: string;
}

export async function getCurrentUserInfo(): Promise<
  CurrentUserInfo | undefined
> {
  const user = await withRetry("clerk.currentUser", () => currentUser());

  if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
    return undefined;
  }

  return {
    email: user.emailAddresses[0].emailAddress,
    nickname: user.firstName || "",
    avatarUrl: user.imageUrl,
  };
}

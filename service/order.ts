/**
 * 【第7阶段 · 积分计算】service/order.ts
 *
 * left_credits = total_credits - used_credits
 *   · used_credits  ← wallpapers 表 COUNT（每生成 1 张 +1）
 *   · total_credits ← orders 表已支付且未过期订单的 credits 之和（无订单时用默认 3 次）
 *
 * 调用方：gen-wallpaper（查够不够）、get-user-info（Header 显示积分）
 */
import { Order } from "@/types/order";
import { UserCredits } from "@/types/user";
import { getUserOrders } from "@/models/order";
import { getUserWallpapersCount } from "@/models/wallpaper";

export async function getUserCredits(user_email: string): Promise<UserCredits> {
  // 无付费订单时的初始额度（有订单时下面会用订单 credits 覆盖 total）
  let user_credits: UserCredits = {
    one_time_credits: 2,
    monthly_credits: 1,
    total_credits: 3,
    used_credits: 0,
    left_credits: 3,
  };

  try {
    // 两次查询互不依赖，并行发出。串行时慢链路上要 10 秒以上
    // 【第7阶段】已用：wallpapers 表里该 user_email 生成了几条
    // 【第7阶段】已购：orders 表 status=2 且未过期的 credits 累加
    const [used_credits, orders] = await Promise.all([
      getUserWallpapersCount(user_email),
      getUserOrders(user_email),
    ]);

    user_credits.used_credits = Number(used_credits);

    if (!orders) {
      return user_credits;
    }

    let monthly_credits = 0;
    let one_time_credits = 0;
    let total_credits = 0;

    orders.forEach((order: Order) => {
      if (order.plan === "monthly") {
        monthly_credits += order.credits;
      } else {
        one_time_credits += order.credits;
      }
      total_credits += order.credits;
    });

    user_credits.monthly_credits = monthly_credits;
    user_credits.one_time_credits = one_time_credits;
    user_credits.total_credits = total_credits;
    user_credits.left_credits = total_credits - used_credits;
    if (user_credits.left_credits < 0) {
      user_credits.left_credits = 0;
    }

    return user_credits;
  } catch (e) {
    console.log("get user credits failed: ", e);
    return user_credits;
  }
}

/**
 * 【第3阶段 · POST】【第5阶段 · 鉴权】【第7阶段 · 创建订单 + Stripe Session】
 * 【第8阶段 · 部署】/api/checkout
 *
 * 第7阶段四步：鉴权 → insertOrder(status=1) → Stripe 创建 Session → updateOrderSession
 * 调用方：components/pricing/index.tsx
 *
 * 第8阶段环境变量（.env 本地 / Vercel 线上）：
 *   STRIPE_PRIVATE_KEY  服务端创建 Session
 *   STRIPE_PUBLIC_KEY   返回前端 loadStripe
 *   WEB_BASE_URL        拼 success/cancel 跳转，上线必须改成 Vercel 域名，不能留 localhost
 *
 * 注意：此时只是「待支付」，积分要等 pay-success 把 status 改为 2 后，getUserCredits 才会计入。
 */
import { insertOrder, updateOrderSession } from "@/models/order";
import { Order } from "@/types/order";
import Stripe from "stripe";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  // 【第5阶段】0. 服务端取当前登录用户（Cookie → currentUser → email）
  const user = await currentUser();
  if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
    return Response.json("not login");
  }
  const user_email = user.emailAddresses[0].emailAddress;
  console.log("user_email", user_email);

  // 1. 获取下单参数
  const params = await req.json();
  console.log("params", params);

  const currentDate = new Date();
  const oneMonthLater = new Date(currentDate);
  oneMonthLater.setMonth(currentDate.getMonth() + 1);

  const created_at = currentDate.toISOString();
  const expired_at = oneMonthLater.toISOString();
  const order_no = new Date().getMilliseconds();

  // 【第7阶段】2. 创建订单（order_status: 1 = 待支付，2 = 已支付在 pay-success 里改）
  const order: Order = {
    order_no: order_no.toString(),
    created_at: created_at,
    user_email: user_email,
    amount: params.amount,
    plan: params.plan,
    expired_at: expired_at,
    order_status: 1,
    credits: params.credits,
  };
  console.log("order", order);

  // 把订单保存到 db
  await insertOrder(order);

  // 【第7阶段】3. 用私钥向 Stripe 要收银台链接（STRIPE_PRIVATE_KEY 只在服务端）
  const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "");

  const session = await stripe.checkout.sessions.create({
    customer_email: user_email,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "aiwallpaper.demo credits plan",
          },
          unit_amount: params.amount,
          recurring:
            params.plan === "monthly"
              ? {
                  interval: "month",
                }
              : undefined,
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: false,
    // metadata 挂在 Session 上，pay-success 页靠 order_no 找到要更新的订单
    metadata: {
      project: "aiwallpaper-demo",
      pay_scene: "buy-credits",
      order_no: order_no.toString(),
      user_email: user_email,
      credits: params.credits,
    },
    mode: params.plan === "monthly" ? "subscription" : "payment",
    // 【第8阶段】WEB_BASE_URL：本地 http://localhost:3000，线上 https://你的域名.vercel.app
    success_url: `${process.env.WEB_BASE_URL}/pay-success/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.WEB_BASE_URL}/pricing`,
  });

  console.log("pay result", session);

  // 4. 更新支付标识
  const stripe_session_id = session.id;
  console.log("stripe session id", stripe_session_id);
  await updateOrderSession(order_no.toString(), stripe_session_id);

  return Response.json({
    code: 0,
    message: "ok",
    data: {
      public_key: process.env.STRIPE_PUBLIC_KEY, // 公钥可给浏览器；私钥 STRIPE_PRIVATE_KEY 只在上面用过
      order_no: order_no.toString(),
      session_id: stripe_session_id,
    },
  });
}

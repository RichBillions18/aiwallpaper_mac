/**
 * 【第2阶段 · 动态路由】【第7阶段 · 支付成功回调】【第8阶段 · 部署】
 * app/pay-success/[session_id]/page.tsx
 *
 * [session_id]：Stripe 付完后 success_url 里 {CHECKOUT_SESSION_ID} 替换成的会话 ID
 *
 * 本页不做 UI，在服务器：向 Stripe 核实 → updateOrderStatus(2) → redirect("/")
 * 积分不在此页写入，而是 orders 变已支付后，getUserCredits 查 orders 表重新计算。
 *
 * 【第8阶段】STRIPE_PRIVATE_KEY 只在服务端读；部署时 Vercel 与 .env 都要配齐。
 */
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { updateOrderStatus } from "@/models/order";

export default async function ({
  params,
}: {
  params: Promise<{ session_id: string }>;
}) {
  // URL 里 /pay-success/ 后面的那段就是 session_id
  const resolvedParams = await params;
  console.log("pay callback id", resolvedParams.session_id);

  // 私钥只能在服务端用（和首页 fetch API 的写法是两种路线）
  const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "");
  try {
    const session = await stripe.checkout.sessions.retrieve(
      resolvedParams.session_id
    );
    console.log("order session: ", session);

    console.log("metadata", session.metadata);
    if (!session || !session.metadata || !session.metadata.order_no) {
      console.log("invalid session", resolvedParams.session_id);
      throw new Error("invalid session");
    }

    const order_no = session.metadata.order_no;
    const paied_at = new Date().toISOString();

    // 【第7阶段】1 → 2：待支付变已支付，之后 getUserOrders 才会把 credits 算进 total
    updateOrderStatus(order_no, 2, paied_at);
    console.log("update success order status: ", order_no, paied_at);

    redirect("/"); // 服务端跳转，用户通常看不到本页内容
  } catch (e) {
    console.log("handle order session failed: ", e);
    throw e;
  }
}

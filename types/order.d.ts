/**
 * 【第7阶段】Order 类型 ↔ data/install.sql 里 orders 表
 * order_status：1 待支付（checkout 写入）→ 2 已支付（pay-success 更新）
 */
export interface Order {
  order_no: string;
  created_at: string;
  user_email: string;
  amount: number;
  plan: string;
  expired_at: string;
  order_status: number;
  paied_at?: string;
  stripe_session_id?: string;
  credits: number;
}

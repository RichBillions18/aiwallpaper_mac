/**
 * 【第4阶段 · 数据层】【第8阶段 · 环境变量】models/db.ts
 *
 * 各 model 通过 getDb() 拿连接，不各自 new 连接。
 * POSTGRES_URL：Supabase 等 Postgres 的连接串，写在 .env，部署时在 Vercel 配同名变量。
 */
import { Pool } from "pg";

// 连接池：全局只创建一次，复用连接（比每次请求新建快）
let globalPool: Pool;

export function getDb() {
  if (!globalPool) {
    const connectionString = process.env.POSTGRES_URL;
    console.log("connectionString", connectionString);

    globalPool = new Pool({
      connectionString,
    });
  }

  return globalPool;
}

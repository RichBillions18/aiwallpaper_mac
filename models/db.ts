/**
 * 【第4阶段 · 数据层】【第8阶段 · 环境变量】models/db.ts
 *
 * 各 model 通过 query() 拿数据，不各自 new 连接、也不各自写重试。
 * POSTGRES_URL：Supabase 等 Postgres 的连接串，写在 .env，部署时在 Vercel 配同名变量。
 *
 * 为什么要这些连接池参数：
 *   连到境外数据库时，空闲连接常被中间设备掐断，再拿来查询就报
 *   「Connection terminated unexpectedly」。对策是保活 + 尽快回收空闲连接，
 *   并且给查询包一层重试（拿到死连接时重试一次通常就好了）。
 */
import { Pool, QueryResult, QueryResultRow } from "pg";
import { withRetry } from "@/lib/retry";

// 连接池：全局只创建一次，复用连接（比每次请求新建快）
let globalPool: Pool;

export function getDb() {
  if (!globalPool) {
    const connectionString = process.env.POSTGRES_URL;
    // 不要打印 connectionString，里面带数据库密码

    globalPool = new Pool({
      connectionString,
      max: 5, // 本地开发用不着很多连接
      keepAlive: true, // 发保活包，减少连接被中途掐断
      connectionTimeoutMillis: 15000, // 慢链路上给握手留足时间
      idleTimeoutMillis: 10000, // 空闲连接尽快回收，避免下次拿到死连接
    });

    // ★ 必须监听：空闲连接出错时如果没人处理，会直接把 Node 进程带崩
    globalPool.on("error", (err) => {
      console.error("pg pool idle client error:", err.message);
    });
  }

  return globalPool;
}

/**
 * 带重试的查询入口，所有 model 都走这里
 * 只有网络类错误才会重试，SQL 写错之类的会立刻抛出（见 lib/retry.ts）
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return withRetry("pg.query", () => getDb().query<T>(sql, params));
}

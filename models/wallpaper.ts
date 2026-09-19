import { Wallpaper } from "@/types/wallpaper";
import { getDb } from "./db";

// 【第4阶段 · 写】【第6阶段 · 衔接】写入一张壁纸（gen-wallpaper 在 AI 生图 + S3 上传后调用）
export async function insertWallpaper(wallpaper: Wallpaper) {
  const db = getDb();
  const res = await db.query(
    `INSERT INTO wallpapers 
        (user_email, img_description, img_size, img_url, llm_name, llm_params, created_at) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      wallpaper.user_email,
      wallpaper.img_description,
      wallpaper.img_size,
      wallpaper.img_url,
      wallpaper.llm_name,
      wallpaper.llm_params,
      wallpaper.created_at,
    ],
  );

  return res;
}

// 分页读取壁纸列表（api/get-wallpapers 调用）
export async function getWallpapers(
  page: number, // 分页参数
  limit: number, // 限制图片数
): Promise<Wallpaper[] | undefined> {
  if (page < 1) {
    page = 1;
  }
  if (limit <= 0) {
    limit = 50;
  }
  const offset = (page - 1) * limit; // 第 1 页 offset=0，第 2 页 offset=limit

  const db = getDb();
  const res = await db.query(`select * from wallpapers limit $1 offset $2`, [
    limit,
    offset,
  ]);
  if (res.rowCount === 0) {
    return undefined;
  }

  // 类型转换 QueryResult --> Wallpaper
  const { rows } = res;
  let wallpapers: Wallpaper[] = [];

  rows.forEach((row) => {
    const wallpaper: Wallpaper = {
      id: row.id,
      user_email: row.user_email,
      img_description: row.img_description,
      img_size: row.img_size,
      img_url: row.img_url,
      llm_name: row.llm_name,
      llm_params: row.llm_params,
      created_at: row.created_at,
    };
    wallpapers.push(wallpaper);
  });

  return wallpapers;
}

// 统计某用户已生成壁纸数（service/order 用来计算 used_credits）
/**
 * 统计某用户已生成壁纸数
 * 用于积分系统（如 service/order 的 getUserCredits 计算已用积分）
 * @param user_email 用户邮箱
 * @returns 已生成的壁纸数量（number，若无则为0）
 */
export async function getUserWallpapersCount(
  user_email: string,
): Promise<number> {
  const db = getDb();
  // 查询该用户在 wallpapers 表的壁纸总数
  const res = await db.query(
    `SELECT count(1) as count FROM wallpapers WHERE user_email = $1`,
    [user_email],
  );
  if (res.rowCount === 0) {
    // 没有找到记录，返回0
    return 0;
  }

  const { rows } = res;
  const row = rows[0];

  // 返回数量字段
  return row.count;
}

/*
res 是 pg 的 QueryResult（查询结果对象），大致长这样：
{
  command: "SELECT",   // 执行的是哪种 SQL
  rowCount: 1,         // 返回了几行
  rows: [              // 真正的数据，数组
    { count: "3" }     // 列名 count（SQL 里 as count）→ 值 3
  ],
  fields: [...],       // 字段元信息（一般用不到）
  oid: ...
}
*/

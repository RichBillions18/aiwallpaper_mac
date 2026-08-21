/**
 * 【第4阶段 · 数据层】models/wallpaper.ts
 *
 * 表结构见 data/install.sql，没有删除相关字段。
 *
 * 为什么不提供删除？
 *   积分的 used_credits 是「wallpapers 表里这个用户有几条」算出来的（service/order.ts），
 *   一旦允许删行，用户「生成 → 删除 → 再生成」就能无限白嫖积分。
 *   要支持删除，得先加 deleted_at 之类的软删除字段，让统计和展示用两套口径。
 */
import { Wallpaper } from "@/types/wallpaper";
import { QueryResultRow } from "pg";
import { query } from "./db";

function formatWallpaper(row: QueryResultRow): Wallpaper {
  return {
    id: row.id,
    user_email: row.user_email,
    img_description: row.img_description,
    img_size: row.img_size,
    img_url: row.img_url,
    llm_name: row.llm_name,
    llm_params: row.llm_params,
    created_at: row.created_at,
  };
}

// 【第4阶段 · 写】【第6阶段 · 衔接】写入一张壁纸（gen-wallpaper 在 AI 生图 + S3 上传后调用）
// RETURNING id：把自增主键带回来，前端才能跳 /wallpaper/[id] 详情页
export async function insertWallpaper(wallpaper: Wallpaper) {
  const res = await query(
    `INSERT INTO wallpapers 
        (user_email, img_description, img_size, img_url, llm_name, llm_params, created_at) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id
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

  return res.rows[0]?.id as number | undefined;
}

// 分页读取当前用户的壁纸列表（api/get-wallpapers 调用）
export async function getWallpapers(
  page: number, // 分页参数
  limit: number, // 限制图片数
  user_email: string, // 只查当前登录用户
): Promise<Wallpaper[]> {
  if (page < 1) {
    page = 1;
  }
  if (limit <= 0) {
    limit = 9;
  }
  const offset = (page - 1) * limit; // 第 1 页 offset=0，第 2 页 offset=limit

  const res = await query(
    `SELECT * FROM wallpapers
     WHERE user_email = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [user_email, limit, offset],
  );

  return res.rows.map(formatWallpaper);
}

// 按主键读取单张壁纸（详情页 / 下载原图前的归属校验）
export async function getWallpaperById(
  id: number,
): Promise<Wallpaper | undefined> {
  const res = await query(`SELECT * FROM wallpapers WHERE id = $1`, [id]);
  if (res.rowCount === 0) {
    return undefined;
  }

  return formatWallpaper(res.rows[0]);
}

// 统计某用户已生成壁纸数（service/order 用来计算 used_credits，同时也是列表分页总数）
/**
 * 统计某用户已生成壁纸数
 * @param user_email 用户邮箱
 * @returns 已生成的壁纸数量（number，若无则为0）
 */
export async function getUserWallpapersCount(
  user_email: string,
): Promise<number> {
  // 查询该用户在 wallpapers 表的壁纸总数
  const res = await query(
    `SELECT count(1) as count FROM wallpapers WHERE user_email = $1`,
    [user_email],
  );
  if (res.rowCount === 0) {
    // 没有找到记录，返回0
    return 0;
  }

  const { rows } = res;
  const row = rows[0];

  // pg 的 count 可能是 string，转成 number
  return Number(row.count) || 0;
}

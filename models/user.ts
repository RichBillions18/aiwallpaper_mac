import { User } from "@/types/user";
import { getDb } from "./db";

// 写入用户信息（gen-wallpaper 里目前注释掉了，登录数据主要来自 Clerk）
export async function insertUser(user: User) {
  const createdAt: string = new Date().toISOString();

  const db = await getDb();
  const res = await db.query(
    `INSERT INTO users 
        (email, nickname, avatar_url, created_at) 
        VALUES 
        ($1, $2, $3, $4)
    `,
    [user.email, user.nickname, user.avatar_url, createdAt]
  );

  return res;
}

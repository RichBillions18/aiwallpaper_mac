/**
 * 【第3阶段 · POST 写数据】【第5阶段 · 服务端鉴权】【第6阶段 · OpenAI + S3】/api/gen-wallpaper
 *
 * 本项目最完整的 API 示例，流水线：
 *   读 body → 验登录 → 查积分 → OpenAI 生图 → 上传 S3 → 写入数据库 → 返回 JSON
 *
 * 业务 code 约定（body 里的 code，和 HTTP status 是两套）：
 *   0  成功   -1  积分不足   -2  未登录   400  参数错误   500  服务器异常
 *
 * 调用方：components/input/index.tsx
 *
 * 【第5阶段】双重鉴权复习：
 *   前端 useUser 管体验；这里 currentUser() 管安全。
 *   身份靠请求自带的 Cookie，不要信前端 body 里传来的邮箱。
 *
 * 【第6阶段】生图复习：
 *   OpenAI 负责「画」（临时 URL）；S3 负责「长期存」（Location）。
 *   数据库 img_url 必须存 S3 地址，不能直接存 OpenAI 临时链接。
 *
 * 【第8阶段】涉及环境变量：apiKey/baseURL、AWS_*、均在 .env；上线时在 Vercel 配齐同名变量。
 */
import { getOpenAIClient } from "@/service/openai";
import { downloadAndUploadImage } from "@/lib/s3";
import { Wallpaper } from "@/types/wallpaper";
import { ImageGenerateParams } from "openai/resources/images.mjs";
import { insertWallpaper } from "@/models/wallpaper";
import { auth, currentUser } from "@clerk/nextjs/server";
import { User } from "@/types/user";
import { getUserCredits } from "@/service/order";
import { insertUser } from "@/models/user";

// 响应类型定义
type GenerateResponse = {
  code: number;
  message: string;
  data?: {
    img_description: string;
    img_url: string;
    created_at: string;
    img_size: string;
  };
};

export async function POST(req: Request) {
  try {
    // 【第6阶段】生图后要上传 S3；【第8阶段】AWS_BUCKET_NAME 在 .env / Vercel 配置
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error("AWS_BUCKET_NAME is required");
    }

    // POST 读参数：前端 body: JSON.stringify({ description }) → 这里 await req.json() 还原
    const { description } = await req.json();
    if (!description || description.length > 1000) {
      // 第二个参数 { status: 400 } 是 HTTP 状态码，和 body 里的 code 配合使用
      return Response.json(
        {
          code: 400,
          message: "Description is invalid or too long",
        },
        { status: 400 },
      );
    }

    // 【第5阶段】服务端鉴权：currentUser() 根据 Cookie 识别用户（只能在服务端用）
    // 对比前端 useUser：一个管 UI，一个管「能不能调这个接口」
    const user = await currentUser();
    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      return Response.json({
        code: -2, // 未登录；前端 Input 会 alert
        message: "请先登录",
      });
    }
    // 邮箱从 Clerk 用户对象取，作为业务主键（wallpapers / orders 都用 user_email 关联）
    const user_email = user.emailAddresses[0].emailAddress;
    const credits = await getUserCredits(user_email);
    console.log("credits", credits);

    if (credits.left_credits <= 0) {
      return Response.json({
        code: -1, // 无 data 字段；前端 Input 根据 code 提示用户
        message: "积分不足，请前往付费页面购买",
      });
    }
    // 昵称、头像也来自 Clerk；登录找 Clerk，业务数据找 PostgreSQL
    const nickname = user.firstName;
    const avatarUrl = user.imageUrl;
    const userInfo: User = {
      email: user_email,
      nickname: nickname || "",
      avatar_url: avatarUrl,
    };

    // await insertUser(userInfo); // 可选：把 Clerk 用户同步到 users 表（目前注释掉）

    // 【第6阶段】拿到 AI 客户端（密钥在 service/openai.ts，只在服务端跑）
    const client = getOpenAIClient();

    // 【第6阶段】拼提示词 + 生成参数；模板告诉 AI「这是桌面壁纸」
    const img_size = "1792x1024";
    const llm_name = "dall-e-3";
    const llm_params: ImageGenerateParams = {
      prompt: `generate a desktop wallpaper about: ${description}`,
      model: llm_name,
      n: 1, // 生成 1 张
      quality: "standard",
      response_format: "url", // 返回临时 URL（不是 base64）
      size: img_size,
      style: "natural",
    };

    // 【第6阶段】调 DALL·E；这一步通常最慢。拿到的 url 会过期，不能当永久图床
    const response = await client.images.generate(llm_params);
    if (!response?.data?.[0]?.url) {
      throw new Error("Invalid response from image generation API");
    }

    console.log("Generate response!!!", response);

    // 【第6阶段】临时 URL → 下载 → 上传自己的桶；s3Key 用时间戳+随机串防重名
    const s3Result = await downloadAndUploadImage(
      response.data[0].url, // OpenAI 临时地址
      process.env.AWS_BUCKET_NAME,
      `wallpapers/${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
    );

    if (!s3Result?.Location) {
      throw new Error("Failed to get S3 upload URL");
    }

    console.log("Upload aws response!!!", s3Result.Location);

    // 准备数据库记录：user_email 来自 currentUser()；img_url 必须用 S3 Location
    const created_at = new Date().toISOString();
    const wallpaper: Wallpaper = {
      user_email: user_email,
      img_description: description,
      img_size: img_size,
      img_url: s3Result.Location, // ★ 存永久地址，不是 OpenAI 临时 URL
      llm_name: llm_name,
      llm_params: JSON.stringify(llm_params), // 当时用的参数，方便以后排查
      created_at: created_at,
    };
    // 【第4阶段】写入 wallpapers 表；前端列表展示的就是这里的 img_url
    await insertWallpaper(wallpaper);
    console.log("database response!!!");

    // 返回成功响应
    return Response.json({
      code: 0,
      message: "ok",
      data: wallpaper,
    } as GenerateResponse);
  } catch (error: any) {
    // try/catch 兜底：OpenAI 生图、S3 上传、写库任一步抛错都进这里（前端会看到 code: 500）
    console.error("Generate wallpaper error:", error);
    return Response.json(
      {
        code: 500,
        message: error.message || "生成图片失败",
      } as GenerateResponse,
      { status: 500 },
    );
  }
}

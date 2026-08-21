/**
 * 【第3阶段 · POST 写数据】【第5阶段 · 服务端鉴权】【第6阶段 · OpenAI + S3】/api/gen-wallpaper
 *
 * 本项目最完整的 API 示例，流水线：
 *   读 body → 校验描述 → 验登录 → 查积分 → OpenAI 生图 → 上传 S3 → 写入数据库 → 返回 JSON
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
 * 参数白名单：size / tags 只收 id，再用 lib/wallpaper-options 反查真实参数，
 * 前端传什么尺寸字符串都不作数（同 checkout 不信前端金额的道理）。
 *
 * 【第8阶段】涉及环境变量：apiKey/baseURL、AWS_*、均在 .env；上线时在 Vercel 配齐同名变量。
 */
import { getOpenAIClient } from "@/service/openai";
import { downloadAndUploadImage } from "@/lib/s3";
import { Wallpaper } from "@/types/wallpaper";
import { ImageGenerateParams } from "openai/resources/images.mjs";
import { insertWallpaper } from "@/models/wallpaper";
import { getCurrentUserInfo } from "@/service/auth";
import { getUserCredits } from "@/service/order";
import {
  buildWallpaperPrompt,
  getSizeOption,
  getStyleTags,
} from "@/lib/wallpaper-options";
import { checkDescription } from "@/lib/prompt-filter";
import { withRetry } from "@/lib/retry";

// 响应类型定义
type GenerateResponse = {
  code: number;
  message: string;
  data?: Wallpaper;
};

// DALL·E 一张图常要十几秒，加上下载 + 上传 S3，给足超时时间（Vercel 上限视套餐而定）
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 【第6阶段】生图后要上传 S3；【第8阶段】AWS_BUCKET_NAME 在 .env / Vercel 配置
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error("AWS_BUCKET_NAME is required");
    }

    // POST 读参数：前端 body 里有 description / size / tags
    const body = await req.json();

    // 描述校验 + 敏感词拦截（前端也会校验一遍，但后端这道才算数）
    const checked = checkDescription(body?.description);
    if (!checked.ok) {
      // 第二个参数 { status: 400 } 是 HTTP 状态码，和 body 里的 code 配合使用
      return Response.json(
        {
          code: 400,
          message: checked.message,
        },
        { status: 400 },
      );
    }
    const description = checked.description;

    // 尺寸和风格：非法 id 会被过滤掉，尺寸回落到默认桌面比例
    const sizeOption = getSizeOption(body?.size);
    const styleTags = getStyleTags(body?.tags);

    // 【第5阶段】服务端鉴权：根据 Cookie 识别用户（只能在服务端用）
    // 对比前端 useUser：一个管 UI，一个管「能不能调这个接口」
    const user = await getCurrentUserInfo();
    if (!user) {
      return Response.json({
        code: -2, // 未登录；前端 Input 会提示
        message: "请先登录",
      });
    }
    // 邮箱作为业务主键（wallpapers / orders 都用 user_email 关联）
    const user_email = user.email;
    const credits = await getUserCredits(user_email);

    if (credits.left_credits <= 0) {
      return Response.json({
        code: -1, // 无 data 字段；前端 Input 根据 code 提示用户
        message: "积分不足，请前往付费页面购买",
      });
    }
    // 【第6阶段】拿到 AI 客户端（密钥在 service/openai.ts，只在服务端跑）
    const client = getOpenAIClient();

    // 【第6阶段】提示词由「设备 + 描述 + 风格 + 画质约束」拼成，见 lib/wallpaper-options
    const img_size = sizeOption.size;
    const llm_name = "dall-e-3";
    const llm_params: ImageGenerateParams = {
      prompt: buildWallpaperPrompt(description, sizeOption, styleTags),
      model: llm_name,
      n: 1, // 生成 1 张
      quality: "standard",
      response_format: "url", // 返回临时 URL（不是 base64）
      size: img_size,
      style: "natural",
    };

    /*
     * 【第6阶段】调 DALL·E；这一步通常最慢。拿到的 url 会过期，不能当永久图床
     *
     * 只重试 1 次：代理偶发 ECONNRESET（连接都没建立，没产生费用）重试是划算的，
     * 但万一是「图已经生成、响应回不来」，重试就会重复计费，所以不多试。
     */
    const response = await withRetry(
      "openai.images.generate",
      () => client.images.generate(llm_params),
      1,
    );
    if (!response?.data?.[0]?.url) {
      throw new Error("Invalid response from image generation API");
    }

    // 【第6阶段】临时 URL → 下载 → 压成 WebP → 上传自己的桶
    // s3Key 用时间戳+随机串防重名；扩展名 .webp 与 lib/s3 里的转码格式保持一致
    const s3Result = await downloadAndUploadImage(
      response.data[0].url, // OpenAI 临时地址
      process.env.AWS_BUCKET_NAME,
      `wallpapers/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`,
    );

    if (!s3Result?.Location) {
      throw new Error("Failed to get S3 upload URL");
    }

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
      user_avatar: user.avatarUrl,
      user_nickname: user.nickname,
    };
    // 【第4阶段】写入 wallpapers 表；前端列表展示的就是这里的 img_url
    const wallpaperId = await insertWallpaper(wallpaper);
    wallpaper.id = wallpaperId;

    // 返回成功响应
    return Response.json({
      code: 0,
      message: "ok",
      data: wallpaper,
    } as GenerateResponse);
  } catch (error) {
    // try/catch 兜底：OpenAI 生图、S3 上传、写库任一步抛错都进这里（前端会看到 code: 500）
    // 细节只写服务端日志，不回给前端，避免泄漏第三方错误信息
    console.error("Generate wallpaper error:", error);
    return Response.json(
      {
        code: 500,
        message: "生成图片失败，请稍后重试",
      } as GenerateResponse,
      { status: 500 },
    );
  }
}

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
    // 验证环境变量
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error("AWS_BUCKET_NAME is required");
    }

    // 解析并验证请求参数
    const { description } = await req.json();
    if (!description || description.length > 1000) {
      return Response.json(
        {
          code: 400,
          message: "Description is invalid or too long",
        },
        { status: 400 }
      );
    }

    // check user auth 身份与积分检查
    const user = await currentUser();
    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      return Response.json({
        code: -2,
        message: "请先登录",
      });
    }
    const user_email = user.emailAddresses[0].emailAddress;
    const credits = await getUserCredits(user_email);
    console.log("credits", credits);

    if (credits.left_credits <= 0) {
      return Response.json({
        code: -1,
        message: "积分不足，请前往付费页面购买",
      });
    }
    const nickname = user.firstName;
    const avatarUrl = user.imageUrl;
    const userInfo: User = {
      email: user_email,
      nickname: nickname || "",
      avatar_url: avatarUrl,
    };

    // await insertUser(userInfo);

    // 初始化 OpenAI 客户端
    const client = getOpenAIClient();

    // 配置生成参数
    const img_size = "1792x1024";
    const llm_name = "dall-e-3";
    const llm_params: ImageGenerateParams = {
      prompt: `generate a desktop wallpaper about: ${description}`,
      model: llm_name,
      n: 1,
      quality: "standard",
      response_format: "url",
      size: img_size,
      style: "natural",
    };

    // 调用 OpenAI 生成图片
    const response = await client.images.generate(llm_params);
    if (!response?.data?.[0]?.url) {
      throw new Error("Invalid response from image generation API");
    }

    console.log("Generate response!!!", response);

    // 上传图片到 AWS S3
    const s3Result = await downloadAndUploadImage(
      response.data[0].url,
      process.env.AWS_BUCKET_NAME,
      `wallpapers/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    );

    if (!s3Result?.Location) {
      throw new Error("Failed to get S3 upload URL");
    }

    console.log("Upload aws response!!!", s3Result.Location);

    // 准备数据库记录
    const created_at = new Date().toISOString();
    const wallpaper: Wallpaper = {
      user_email: user_email, // TODO: 从认证系统获取用户邮箱
      img_description: description,
      img_size: img_size,
      img_url: s3Result.Location,
      llm_name: llm_name,
      llm_params: JSON.stringify(llm_params),
      created_at: created_at,
    };
    // 保存到数据库
    await insertWallpaper(wallpaper);
    console.log("database response!!!");

    // 返回成功响应
    return Response.json({
      code: 0,
      message: "ok",
      data: wallpaper,
    } as GenerateResponse);
  } catch (error: any) {
    // 错误日志和响应
    console.error("Generate wallpaper error:", error);
    return Response.json(
      {
        code: 500,
        message: error.message || "生成图片失败",
      } as GenerateResponse,
      { status: 500 }
    );
  }
}

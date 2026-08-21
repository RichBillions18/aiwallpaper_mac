/**
 * 【第6阶段 · S3 图床】【第8阶段 · 环境变量】lib/s3.ts
 *
 * 为什么要 S3：OpenAI 返回的图片 URL 会过期；上传到自己的桶后得到长期可访问地址。
 * 主流程只用 downloadAndUploadImage；downloadImage 是本地下载工具，生成壁纸没用到。
 *
 * 环境变量：AWS_REGION、AWS_AK、AWS_SK（服务端）；AWS_BUCKET_NAME 在 gen-wallpaper 里读。
 * 部署：Vercel 配齐上述变量；S3 桶需允许线上读图（CORS / 公开读策略）。
 */
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";
import fs from "fs";

// 用区域 + 密钥连上 AWS；凭证只在服务端读
const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_AK!,
    secretAccessKey: process.env.AWS_SK!,
  },
});

// 下载 OpenAI 临时图 → 上传到 S3 → 返回结果（含永久 Location）
export async function downloadAndUploadImage(
  imageUrl: string, // OpenAI 临时 URL
  bucketName: string, // 桶名
  s3Key: string, // 桶内路径，如 wallpapers/时间戳-随机.png
) {
  try {
    // ① 服务器去拉临时图，读成二进制
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    // ② 传到自己的桶；ContentType 告诉浏览器这是 png
    const upload = new Upload({
      client,
      params: {
        Bucket: bucketName,
        Key: s3Key,
        Body: Buffer.from(buffer),
        ContentType: "image/png",
      },
    });

    // done() 完成后结果里有 Location，gen-wallpaper 会把它写入 img_url
    return upload.done();
  } catch (e) {
    console.error("upload failed:", e);
    throw e;
  }
}

// 实现下载图片到本地（学习用/备用；主流程走上面的 downloadAndUploadImage）
export async function downloadImage(imageUrl: string, outputPath: string) {
  try {
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "stream",
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      let error: Error | null = null;
      writer.on("error", (err) => {
        error = err;
        writer.close();
        reject(err);
      });

      writer.on("close", () => {
        if (!error) {
          resolve(null);
        }
      });
    });
  } catch (e) {
    console.log("upload failed:", e);
    throw e;
  }
}

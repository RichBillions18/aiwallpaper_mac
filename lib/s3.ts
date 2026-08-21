/**
 * 【第6阶段 · S3 图床】【第8阶段 · 环境变量】lib/s3.ts
 *
 * 为什么要 S3：OpenAI 返回的图片 URL 会过期；上传到自己的桶后得到长期可访问地址。
 * 主流程只用 downloadAndUploadImage；downloadImage 是本地下载工具，生成壁纸没用到。
 *
 * ★ 为什么要转 WebP：
 *   DALL·E 返回的 PNG 一张 5MB 上下，直接存会有两个后果——
 *   1. 浏览器加载列表要下载几十 MB
 *   2. next/image 的优化接口回源拉图有 7 秒硬超时，大图必然超时报 500
 *   转成 WebP 后体积大约降到 1/10，画质肉眼几乎无差。
 *
 * 环境变量：AWS_REGION、AWS_AK、AWS_SK（服务端）；AWS_BUCKET_NAME 在 gen-wallpaper 里读。
 * 部署：Vercel 配齐上述变量；S3 桶需允许线上读图（CORS / 公开读策略）。
 */
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";
import axios from "axios";
import fs from "fs";

/** 转码质量：82 是体积和画质比较平衡的取值 */
export const WEBP_QUALITY = 82;

/** 列表缩略图：640px 宽足够铺满卡片，体积只有原图的十分之一 */
export const THUMB_WIDTH = 640;
export const THUMB_QUALITY = 72;

/** 图片一旦生成就不会再变，可以让浏览器/CDN 长期缓存 */
export const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** 原图 Key → 缩略图 Key，规则要和 lib/wallpaper-options 的 getThumbUrl 一致 */
export function getThumbKey(s3Key: string): string {
  const index = s3Key.lastIndexOf("/");
  if (index < 0) {
    return `thumbs/${s3Key}`;
  }

  return `${s3Key.slice(0, index)}/thumbs${s3Key.slice(index)}`;
}

// 用区域 + 密钥连上 AWS；凭证只在服务端读
const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_AK!,
    secretAccessKey: process.env.AWS_SK!,
  },
});

// 下载 OpenAI 临时图 → 压成 WebP → 上传到 S3 → 返回结果（含永久 Location）
export async function downloadAndUploadImage(
  imageUrl: string, // OpenAI 临时 URL
  bucketName: string, // 桶名
  s3Key: string, // 桶内路径，如 wallpapers/时间戳-随机.webp
) {
  try {
    // ① 服务器去拉临时图，读成二进制
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // ② 压缩转码：5MB PNG → 几百 KB WebP，尺寸不变
    const optimized = await sharp(buffer)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    console.log(
      `image optimized: ${Math.round(buffer.length / 1024)}KB -> ${Math.round(
        optimized.length / 1024,
      )}KB`,
    );

    // ③ 再压一张列表用的缩略图，列表就不必下载原图
    const thumbnail = await sharp(buffer)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    console.log(`thumbnail: ${Math.round(thumbnail.length / 1024)}KB`);

    // ④ 传到自己的桶；ContentType 要和真实格式一致，浏览器按它解码
    const upload = new Upload({
      client,
      params: {
        Bucket: bucketName,
        Key: s3Key,
        Body: optimized,
        ContentType: "image/webp",
        CacheControl: IMAGE_CACHE_CONTROL,
      },
    });

    const thumbUpload = new Upload({
      client,
      params: {
        Bucket: bucketName,
        Key: getThumbKey(s3Key), // 地址可由原图推出，不用在数据库多存一列
        Body: thumbnail,
        ContentType: "image/webp",
        CacheControl: IMAGE_CACHE_CONTROL,
      },
    });

    // done() 完成后结果里有 Location，gen-wallpaper 会把它写入 img_url
    const [result] = await Promise.all([upload.done(), thumbUpload.done()]);
    return result;
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

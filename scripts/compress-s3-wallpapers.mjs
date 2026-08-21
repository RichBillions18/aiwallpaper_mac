/**
 * 【一次性维护脚本】把 S3 上已有的大 PNG 原地压成 WebP，并补一张缩略图
 *
 * 为什么需要它：
 *   早期生成的壁纸是 5MB 左右的 PNG，在慢链路上要十几秒才能下完，
 *   列表页会卡到没法看（之前还会让 /_next/image 回源超时报 500）。
 *
 * 做两件事：
 *   1. 原图原地转 WebP（Key 不变）
 *   2. 在 thumbs/ 下生成 640px 缩略图，列表页加载它，几十 KB
 *
 * 为什么可以「原地」压：
 *   只改文件内容和 ContentType，S3 的 Key 不变 → 数据库里存的 img_url 不用动，
 *   也就不需要改任何表结构。浏览器按 Content-Type 解码，文件名还叫 .png 也能正常显示。
 *   缩略图地址由原图地址按约定推出（见 lib/wallpaper-options.ts 的 getThumbUrl）。
 *
 * 用法（在项目根目录）：
 *   pnpm compress:s3                        # 处理 .env 里配的桶
 *   pnpm compress:s3 --dry                  # 只看会处理哪些文件，不写回
 *   pnpm compress:s3 --bucket=旧桶名        # 处理换桶之前的历史图片
 *   pnpm compress:s3 --bucket=旧桶名 --region=us-east-1
 *
 * 默认读 .env 里的 AWS_REGION / AWS_AK / AWS_SK / AWS_BUCKET_NAME，
 * --bucket / --region 可以临时覆盖（数据库里存着旧桶地址的老图就靠这个补）。
 */
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const PREFIX = "wallpapers/";
const THUMB_DIR = "thumbs";
const QUALITY = 82;
const THUMB_WIDTH = 640;
const THUMB_QUALITY = 72;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
// 原图小于这个体积就不再转码了（缩略图仍然会补）
const MIN_SIZE_BYTES = 400 * 1024;

/** 原图 Key → 缩略图 Key，规则和 lib/s3.ts 的 getThumbKey 保持一致 */
function getThumbKey(key) {
  const index = key.lastIndexOf("/");
  if (index < 0) {
    return `${THUMB_DIR}/${key}`;
  }

  return `${key.slice(0, index)}/${THUMB_DIR}${key.slice(index)}`;
}

const dryRun = process.argv.includes("--dry");

/** 从命令行取 --key=value 形式的参数 */
function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const accessKeyId = process.env.AWS_AK;
const secretAccessKey = process.env.AWS_SK;
// 命令行优先，方便处理已经换掉的旧桶
const region = getArg("region") || process.env.AWS_REGION;
const bucket = getArg("bucket") || process.env.AWS_BUCKET_NAME;

if (!region || !accessKeyId || !secretAccessKey || !bucket) {
  console.error(
    "缺少环境变量，请确认 .env 里有 AWS_REGION / AWS_AK / AWS_SK / AWS_BUCKET_NAME",
  );
  process.exit(1);
}

const client = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

const kb = (bytes) => `${Math.round(bytes / 1024)}KB`;

async function listAllObjects() {
  const keys = [];
  let ContinuationToken;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PREFIX,
        ContinuationToken,
      }),
    );

    (res.Contents ?? []).forEach((item) => {
      // 跳过缩略图目录本身，避免给缩略图再生成缩略图
      if (
        item.Key &&
        !item.Key.endsWith("/") &&
        !item.Key.includes(`/${THUMB_DIR}/`)
      ) {
        keys.push({ key: item.Key, size: item.Size ?? 0 });
      }
    });

    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return keys;
}

async function main() {
  console.log(`扫描 s3://${bucket}/${PREFIX} ...`);
  const objects = await listAllObjects();
  console.log(`共 ${objects.length} 个文件${dryRun ? "（dry run）" : ""}\n`);

  let processed = 0;
  let thumbs = 0;
  let before = 0;
  let after = 0;

  for (const { key, size } of objects) {
    const got = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const original = Buffer.from(await got.Body.transformToByteArray());
    const meta = await sharp(original).metadata();

    // 原图：已经是 WebP 或本来就不大，就不重复转码（脚本可以重复执行）
    const needsRecompress =
      meta.format !== "webp" && original.length >= MIN_SIZE_BYTES;

    if (needsRecompress) {
      const optimized = await sharp(original)
        .webp({ quality: QUALITY })
        .toBuffer();

      before += original.length;
      after += optimized.length;
      processed += 1;
      console.log(`${key}: ${kb(original.length)} -> ${kb(optimized.length)}`);

      if (!dryRun) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key, // ★ Key 不变，数据库里的 URL 继续有效
            Body: optimized,
            ContentType: "image/webp",
            CacheControl: CACHE_CONTROL,
          }),
        );
      }
    }

    // 缩略图：无论原图有没有重压，都补一张，列表页要用
    const thumbnail = await sharp(original)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    thumbs += 1;
    console.log(`  └ 缩略图 ${getThumbKey(key)}: ${kb(thumbnail.length)}`);

    if (!dryRun) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: getThumbKey(key),
          Body: thumbnail,
          ContentType: "image/webp",
          CacheControl: CACHE_CONTROL,
        }),
      );
    }
  }

  console.log(
    `\n完成：重压原图 ${processed} 个，生成缩略图 ${thumbs} 个` +
      (processed > 0 ? `，原图总体积 ${kb(before)} -> ${kb(after)}` : ""),
  );
  if (dryRun && processed > 0) {
    console.log("这是 dry run，没有真的写回。去掉 --dry 再跑一次即可。");
  }
}

main().catch((e) => {
  console.error("压缩失败：", e);
  process.exit(1);
});

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const ENDPOINT = process.env.MINIO_ENDPOINT!;
const BUCKET = process.env.MINIO_BUCKET!;
const PUBLIC_BASE = process.env.PUBLIC_IMAGES_BASE_URL!;
const ACCESS_KEY = process.env.MINIO_ROOT_USER!;
const SECRET_KEY = process.env.MINIO_ROOT_PASSWORD!;

const PUBLIC_PREFIX = `${PUBLIC_BASE}/${BUCKET}/`;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const RESIZE: Record<Folder, { width: number; height: number }> = {
  articles: { width: 1200, height: 800 },
  profiles: { width: 512, height: 512 },
};

export type Folder = "articles" | "profiles";

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: "us-east-1",
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  folder: Folder,
): Promise<string> {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const { width, height } = RESIZE[folder];
  const resized = await sharp(buffer)
    .resize(width, height, { fit: "cover" })
    .webp()
    .toBuffer();

  const key = `${folder}/${randomUUID()}.webp`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: resized,
      ContentType: "image/webp",
    }),
  );

  return `${PUBLIC_PREFIX}${key}`;
}

export function isManagedUrl(url: string): boolean {
  return url.startsWith(PUBLIC_PREFIX);
}

export async function deleteImage(url: string): Promise<void> {
  if (!isManagedUrl(url)) return;
  const key = url.slice(PUBLIC_PREFIX.length);
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

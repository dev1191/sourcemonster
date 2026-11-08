import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadResult {
  disk: "local" | "r2";
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  publicUrl: string;
}

const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure upload directory exists for local driver
async function ensureLocalDir() {
  try {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  } catch {
    // Already exists
  }
}

export async function uploadFile(
  file: File | Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> {
  const extension = path.extname(originalName).toLowerCase() || ".bin";
  const uniqueId = crypto.randomUUID();
  const safeFilename = `${uniqueId}${extension}`;

  if (STORAGE_DRIVER === "r2" && process.env.R2_BUCKET && process.env.R2_ACCOUNT_ID) {
    try {
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
      });

        const buffer = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());
        const objectKey = `products/${safeFilename}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: objectKey,
            Body: buffer,
            ContentType: mimeType,
          })
        );

        const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
        return {
          disk: "r2",
          objectKey,
          originalName,
          mimeType,
          sizeBytes: buffer.length,
          publicUrl: `${publicBaseUrl}/${objectKey}`,
        };
    } catch (r2Error) {
      console.warn("⚠️ R2 upload failed or driver unavailable, falling back to local disk:", r2Error);
    }
  }

  // Fallback / default: Local filesystem driver
  await ensureLocalDir();
  const buffer = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());
  const filePath = path.join(LOCAL_UPLOAD_DIR, safeFilename);
  await fs.writeFile(filePath, buffer);

  const objectKey = `uploads/${safeFilename}`;
  return {
    disk: "local",
    objectKey,
    originalName,
    mimeType,
    sizeBytes: buffer.length,
    publicUrl: `/${objectKey}`,
  };
}

export function getPublicUrl(objectKey: string, disk: string = "local"): string {
  if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
    return objectKey;
  }
  if (disk === "r2" && process.env.R2_PUBLIC_BASE_URL) {
    const base = process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "");
    return `${base}/${objectKey}`;
  }
  return `/${objectKey.replace(/^\//, "")}`;
}


import { Client as MinioClient } from "minio";
import { env } from "@config/env";

export const minio = new MinioClient({
  endPoint:  env.MINIO_ENDPOINT,
  port:      env.MINIO_PORT,
  useSSL:    env.MINIO_USE_SSL,
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD,
});

export async function ensureBucketExists() {
  const exists = await minio.bucketExists(env.MINIO_BUCKET);
  if (!exists) {
    await minio.makeBucket(env.MINIO_BUCKET);
    console.log(`✅ MinIO bucket criado: ${env.MINIO_BUCKET}`);
  } else {
    console.log(`✅ MinIO bucket OK: ${env.MINIO_BUCKET}`);
  }
}
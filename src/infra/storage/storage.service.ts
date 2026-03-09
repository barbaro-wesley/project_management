import { minio } from "./minio.client";
import { env } from "@config/env";
import { randomUUID } from "crypto";
import path from "path";
import sharp from "sharp";

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadFileParams {
  workspaceId: string;
  taskId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  sizeBytes: number;
}

export interface UploadFileResult {
  storagePath: string;
  filename: string;
}

export async function uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
  const { workspaceId, taskId, filename, mimeType, buffer, sizeBytes } = params;

  const ext = path.extname(filename);
  const uniqueName = `${randomUUID()}${ext}`;
  const storagePath = `workspaces/${workspaceId}/tasks/${taskId}/${uniqueName}`;

  await minio.putObject(
    env.MINIO_BUCKET,
    storagePath,
    buffer,
    sizeBytes,
    { "Content-Type": mimeType, "x-original-filename": filename }
  );

  return { storagePath, filename };
}

// ─── Download como Buffer ─────────────────────────────────────────────────────
// Carrega o objeto do MinIO em memória e retorna o Buffer completo.
// O storagePath nunca é exposto ao cliente.

export async function downloadFileAsBuffer(storagePath: string): Promise<Buffer> {
  const stream = await minio.getObject(env.MINIO_BUCKET, storagePath);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFile(storagePath: string): Promise<void> {
  await minio.removeObject(env.MINIO_BUCKET, storagePath);
}
export interface UploadResult {
  path: string; // caminho do objeto no MinIO (ex: "avatars/uuid.webp")
  url: string; // URL pública completa
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPublicUrl(objectPath: string): string {
  const protocol = env.MINIO_USE_SSL ? "https" : "http";
  const port = env.MINIO_PORT !== 80 && env.MINIO_PORT !== 443
    ? `:${env.MINIO_PORT}`
    : "";

  return `${protocol}://${env.MINIO_ENDPOINT}${port}/${env.MINIO_BUCKET}/${objectPath}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

/**
 * Faz upload de um avatar para o MinIO.
 * - Converte a imagem para WebP via sharp (melhor compressão)
 * - Redimensiona para 256x256 (tamanho ideal para avatars)
 * - Retorna o path e a URL pública
 */
export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
): Promise<UploadResult> {
  // Processa a imagem: redimensiona e converte para webp
  const processed = await sharp(buffer)
    .resize(256, 256, {
      fit: "cover",   // recorta centralizado (como object-fit: cover)
      position: "center",
    })
    .webp({ quality: 85 })
    .toBuffer();

  const objectPath = `avatars/${userId}.webp`;

  await minio.putObject(
    env.MINIO_BUCKET,
    objectPath,
    processed,
    processed.length,
    { "Content-Type": "image/webp" },
  );

  return {
    path: objectPath,
    url: buildPublicUrl(objectPath),
  };
}

/**
 * Remove um avatar do MinIO pelo path armazenado no banco.
 * Não lança erro se o objeto não existir.
 */
export async function deleteAvatar(objectPath: string): Promise<void> {
  try {
    await minio.removeObject(env.MINIO_BUCKET, objectPath);
  } catch {
    // Se o objeto não existir, ignora silenciosamente
  }
}

/**
 * Extrai o path do objeto a partir de uma URL pública completa.
 * Ex: "http://localhost:9000/bucket/avatars/uuid.webp" → "avatars/uuid.webp"
 */
export function extractObjectPath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const prefix = `/${env.MINIO_BUCKET}/`;
    const pathname = urlObj.pathname;

    if (pathname.startsWith(prefix)) {
      return pathname.slice(prefix.length);
    }
    return null;
  } catch {
    return null;
  }
}
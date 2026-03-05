import { minio } from "./minio.client";
import { env } from "@config/env";
import { randomUUID } from "crypto";
import path from "path";

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadFileParams {
  workspaceId: string;
  taskId:      string;
  filename:    string;
  mimeType:    string;
  buffer:      Buffer;
  sizeBytes:   number;
}

export interface UploadFileResult {
  storagePath: string;
  filename:    string;
}

export async function uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
  const { workspaceId, taskId, filename, mimeType, buffer, sizeBytes } = params;

  const ext         = path.extname(filename);
  const uniqueName  = `${randomUUID()}${ext}`;
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
    stream.on("data",  (chunk: Buffer) => chunks.push(chunk));
    stream.on("end",   () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFile(storagePath: string): Promise<void> {
  await minio.removeObject(env.MINIO_BUCKET, storagePath);
}
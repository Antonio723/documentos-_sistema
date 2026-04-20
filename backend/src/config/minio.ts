import * as Minio from 'minio';
import { env } from './env';
import { logger } from '../shared/logger/logger';

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET, 'us-east-1');
    logger.info({ msg: 'MinIO bucket created', bucket: env.MINIO_BUCKET });
  } else {
    logger.info({ msg: 'MinIO bucket ready', bucket: env.MINIO_BUCKET });
  }
}

export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  await minioClient.putObject(env.MINIO_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
}

export async function getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
  return minioClient.presignedGetObject(env.MINIO_BUCKET, objectName, expirySeconds);
}

export async function deleteFile(objectName: string): Promise<void> {
  await minioClient.removeObject(env.MINIO_BUCKET, objectName);
}

export async function getFileBuffer(objectName: string): Promise<Buffer> {
  const stream = await minioClient.getObject(env.MINIO_BUCKET, objectName);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

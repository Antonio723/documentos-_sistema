import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default('DocManager'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().default(10),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('docmanager'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),

  MASTER_ADMIN_EMAIL: z.string().email().default('admin@docmanager.com'),
  MASTER_ADMIN_PASSWORD: z.string().min(8).default('Admin@123456'),
  MASTER_COMPANY_NAME: z.string().default('Master Company'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('DocManager <noreply@docmanager.com>'),
  SMTP_ENABLED: z.coerce.boolean().default(false),

  AUTH_DISABLED: z.coerce.boolean().default(false),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() !== '') return Number(val);
    return undefined;
  }, z.number().positive().optional()),
  JWT_SECRET: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  GCS_BUCKET: z.string(),
  GCS_PROJECT_ID: z.string().optional(),
  GCS_KEYFILE: z.string().optional(),
  YOLO_URL: z.string(),
  REGRESSION_URL: z.string(),
  CLIENT_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

const env = {
  PORT: parsed.data.PORT,
  JWT_SECRET: parsed.data.JWT_SECRET,
  SUPABASE_URL: parsed.data.SUPABASE_URL,
  SUPABASE_KEY: parsed.data.SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  GCS_BUCKET: parsed.data.GCS_BUCKET,
  GCS_PROJECT_ID: parsed.data.GCS_PROJECT_ID,
  GCS_KEYFILE: parsed.data.GCS_KEYFILE,
  YOLO_URL: parsed.data.YOLO_URL,
  REGRESSION_URL: parsed.data.REGRESSION_URL,
  CLIENT_ORIGIN: parsed.data.CLIENT_ORIGIN,
};

export default env;

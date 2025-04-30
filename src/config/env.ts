import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().regex(/^[0-9]+$/).transform(Number).refine(n => n > 0),
  JWT_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GCP_BUCKET: z.string().min(1),
  GCP_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  YOLO_URL: z.string().url(),
  REGRESSION_URL: z.string().url(),
  CLIENT_ORIGIN: z.string().url().optional(),
});

const _env = envSchema.parse(process.env);

const config = {
  port: _env.PORT,
  jwtSecret: _env.JWT_SECRET,
  supabaseUrl: _env.SUPABASE_URL,
  supabaseServiceKey: _env.SUPABASE_SERVICE_ROLE_KEY,
  gcsBucket: _env.GCP_BUCKET,
  gcsProjectId: _env.GCP_PROJECT_ID,
  gcsKeyfile: _env.GOOGLE_APPLICATION_CREDENTIALS,
  googleClientId: _env.GOOGLE_CLIENT_ID,
  yoloUrl: _env.YOLO_URL,
  regressionUrl: _env.REGRESSION_URL,
  clientOrigin: _env.CLIENT_ORIGIN,
};

export default config;
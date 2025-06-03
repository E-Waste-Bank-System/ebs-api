import { z } from 'zod';

// Base types
export type UUID = string;
export type Timestamp = string;

// Enums
export enum ScanStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum DetectionSource {
  YOLO = 'YOLO',
  GEMINI_INTERFERED = 'Gemini Interfered',
  SYSTEM = 'System'
}

// Zod Schemas
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();

export const ProfileSchema = z.object({
  id: UUIDSchema,
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  is_admin: z.boolean().default(false),
  created_at: TimestampSchema,
  updated_at: TimestampSchema
});

export const ArticleSchema = z.object({
  id: UUIDSchema,
  title: z.string().min(1),
  content: z.string().min(1),
  image_url: z.string().nullable(),
  slug: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  author_id: UUIDSchema.nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  published_at: TimestampSchema.nullable(),
  deleted_at: TimestampSchema.nullable()
});

export const ScanSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  status: z.nativeEnum(ScanStatus).default(ScanStatus.PENDING),
  metadata: z.record(z.unknown()).nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  completed_at: TimestampSchema.nullable(),
  deleted_at: TimestampSchema.nullable()
});

export const ObjectSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  scan_id: UUIDSchema,
  image_url: z.string().url(),
  detection_source: z.nativeEnum(DetectionSource).default(DetectionSource.YOLO),
  category: z.string().min(1),
  confidence: z.number().min(0).max(1),
  regression_result: z.number().nullable(),
  description: z.string().nullable(),
  suggestions: z.array(z.string()).default([]),
  risk_level: z.number().int().min(1).max(10),
  bbox_coordinates: z.record(z.unknown()),
  metadata: z.record(z.unknown()).nullable(),
  is_validated: z.boolean().default(false),
  validated_at: TimestampSchema.nullable(),
  validated_by: UUIDSchema.nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  deleted_at: TimestampSchema.nullable()
});

export const EwasteSchema = z.object({
  id: UUIDSchema,
  object_id: UUIDSchema.nullable(),
  user_id: UUIDSchema,
  name: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().positive().default(1),
  estimated_price: z.number().nonnegative().nullable(),
  image_url: z.string().url().nullable(),
  status: z.enum(['pending', 'processed', 'rejected']).default('pending'),
  metadata: z.record(z.unknown()).nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  deleted_at: TimestampSchema.nullable()
});

export const RetrainingDataSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  object_id: UUIDSchema,
  image_url: z.string().url(),
  original_category: z.string().min(1),
  bbox_coordinates: z.record(z.unknown()),
  confidence_score: z.number().min(0).max(1),
  corrected_category: z.string().nullable(),
  original_price: z.number().nullable(),
  corrected_price: z.number().nullable(),
  is_verified: z.boolean().default(false),
  verified_at: TimestampSchema.nullable(),
  verified_by: UUIDSchema.nullable(),
  model_version: z.string().min(1),
  metadata: z.record(z.unknown()).nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  deleted_at: TimestampSchema.nullable()
});

export const ValidationHistorySchema = z.object({
  id: UUIDSchema,
  object_id: UUIDSchema,
  user_id: UUIDSchema,
  action: z.enum(['verify', 'reject', 'modify']),
  previous_category: z.string().nullable(),
  new_category: z.string().nullable(),
  previous_confidence: z.number().nullable(),
  new_confidence: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: TimestampSchema
});

export const ModelVersionSchema = z.object({
  id: UUIDSchema,
  version: z.string().min(1),
  description: z.string().nullable(),
  is_active: z.boolean().default(false),
  performance_metrics: z.record(z.unknown()).nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema
});

// TypeScript Types
export type Profile = z.infer<typeof ProfileSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type Scan = z.infer<typeof ScanSchema>;
export type Object = z.infer<typeof ObjectSchema>;
export type Ewaste = z.infer<typeof EwasteSchema>;
export type RetrainingData = z.infer<typeof RetrainingDataSchema>;
export type ValidationHistory = z.infer<typeof ValidationHistorySchema>;
export type ModelVersion = z.infer<typeof ModelVersionSchema>;

// Request/Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface AuthResponse {
  token: string;
  user: Profile;
}

// Request Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface FilterQuery {
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

// Export all types
export * from './supabase'; 
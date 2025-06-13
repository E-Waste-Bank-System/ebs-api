import { z } from 'zod';

export const retrainingSchema = z.object({
  object_id: z.string(),
  category: z.string(),
  confidence: z.number().min(0).max(1),
  is_correct: z.boolean(),
  notes: z.string().optional(),
});

export const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['verified', 'unverified']).optional(),
  category: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}); 
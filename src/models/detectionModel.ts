export interface Detection {
  id: string;
  user_id: string;
  image_url: string;
  label: string;
  confidence: number;
  regression_result: number;
  created_at: string;
} 
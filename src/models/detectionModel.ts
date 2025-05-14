export interface Detection {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  confidence: number;
  regression_result?: number;
  description?: string;
  suggestion?: string;
  risk_lvl?: number;
  detection_source?: string;
  created_at: string;
} 
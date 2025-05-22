export interface RetrainingData {
  id: string;
  image_url: string;
  original_category: string;
  bbox_coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence_score: number;
  corrected_category: string | null;
  is_verified: boolean;
  model_version: string;
  user_id: string;
  object_id: string;
  created_at: string;
  updated_at?: string;
} 
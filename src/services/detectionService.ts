import supabase from '../utils/supabase';
import { Detection } from '../models/detectionModel';
import { v4 as uuidv4 } from 'uuid';

export interface DetectionWithPredictions {
  id: string;
  user_id: string | null;
  scan_id: string | null;
  prediction: Array<{
    image_url: string;
    category: string;
    confidence: number;
    regression_result: number | null;
    description: string | null;
    suggestion: string | null;
    risk_lvl: number | null;
    detection_source: string | null;
  }>;
  created_at: string;
}

export async function createScan(userId: string) {
  const scanId = uuidv4();
  const { data, error } = await supabase
    .from('scans')
    .insert({ id: scanId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createDetection(detection: Omit<Detection, 'created_at'>) {
  const { data, error } = await supabase
    .from('objects')
    .insert(detection)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllDetections() {
  const { data, error } = await supabase
    .from('objects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllDetectionsWithFilters(
  limit: number,
  offset: number,
  search?: string,
  category?: string,
  detection_source?: string
) {
  let query = supabase
    .from('objects')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters if provided
  if (search) {
    query = query.or(`category.ilike.%${search}%,description.ilike.%${search}%`);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  if (detection_source) {
    query = query.eq('detection_source', detection_source);
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1);
  
  const { data, count, error } = await query;
  
  if (error) throw error;
  
  const total = count || 0;
  const last_page = Math.ceil(total / limit);
  
  return {
    data: data || [],
    total,
    last_page
  };
}

export async function getDetectionsByUser(userId: string) {
  const { data, error } = await supabase
    .from('objects')
    .select('*, scans(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Group detections by scan_id
  const groupedDetections = (data || []).reduce((acc: { [key: string]: DetectionWithPredictions }, detection: Detection) => {
    const key = detection.scan_id || detection.id;
    if (!acc[key]) {
      acc[key] = {
        id: detection.id,
        user_id: detection.user_id,
        scan_id: detection.scan_id || null,
        prediction: [],
        created_at: detection.created_at
      };
    }
    
    acc[key].prediction.push({
      image_url: detection.image_url || '',
      category: detection.category || '',
      confidence: detection.confidence || 0,
      regression_result: detection.regression_result ?? null,
      description: detection.description ?? null,
      suggestion: detection.suggestion ?? null,
      risk_lvl: detection.risk_lvl ?? null,
      detection_source: detection.detection_source ?? null
    });
    
    return acc;
  }, {});

  return Object.values(groupedDetections);
}

export async function getDetectionById(id: string) {
  const { data, error } = await supabase
    .from('objects')
    .select(`
      *,
      scans(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDetection(id: string) {
  const { error } = await supabase
    .from('objects')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function updateDetection(id: string, fields: Partial<Detection>) {
  // First get the detection to verify user_id
  const { data: detection, error: getError } = await supabase
    .from('objects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (getError) throw getError;
  
  // Verify if the user_id in the request matches the detection's user_id
  if (fields.user_id && fields.user_id !== detection.user_id) {
    throw new Error('Unauthorized: User ID does not match detection owner');
  }
  
  // Update object fields
  const { data, error } = await supabase
    .from('objects')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
} 
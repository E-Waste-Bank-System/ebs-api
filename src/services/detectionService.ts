import supabase from '../utils/supabase';
import { Detection } from '../models/detectionModel';

export async function createDetection(detection: Omit<Detection, 'created_at'>) {
  const { data, error } = await supabase
    .from('detections')
    .insert(detection)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllDetections() {
  const { data, error } = await supabase
    .from('detections')
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
    .from('detections')
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
    .from('detections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getDetectionById(id: string) {
  const { data, error } = await supabase
    .from('detections')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDetection(id: string) {
  const { error } = await supabase
    .from('detections')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function updateDetection(id: string, fields: Partial<Detection>) {
  const { data, error } = await supabase
    .from('detections')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
} 
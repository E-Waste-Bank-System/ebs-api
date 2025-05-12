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
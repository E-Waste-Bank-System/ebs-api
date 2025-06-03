import supabase from '../utils/supabase';
import { RetrainingData } from '../models/retraining';
import { v4 as uuidv4 } from 'uuid';

export async function createRetrainingData(data: Omit<RetrainingData, 'id' | 'created_at' | 'is_verified'>) {
  const newRecord = {
    ...data,
    id: uuidv4(),
    is_verified: false
  };

  const { data: result, error } = await supabase
    .from('retraining_data')
    .insert(newRecord)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function getRetrainingDataById(id: string) {
  const { data, error } = await supabase
    .from('retraining_data')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAllRetrainingData(
  limit: number = 10,
  offset: number = 0,
  filters: {
    is_verified?: boolean,
    model_version?: string,
    confidence_below?: number,
    category?: string
  } = {}
) {
  let query = supabase
    .from('retraining_data')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (filters.is_verified !== undefined) {
    query = query.eq('is_verified', filters.is_verified);
  }
  
  if (filters.model_version) {
    query = query.eq('model_version', filters.model_version);
  }
  
  if (filters.confidence_below !== undefined) {
    query = query.lt('confidence_score', filters.confidence_below);
  }
  
  if (filters.category) {
    query = query.eq('original_category', filters.category);
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

export async function updateRetrainingData(id: string, updates: Partial<RetrainingData>) {
  const { data, error } = await supabase
    .from('retraining_data')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteRetrainingData(id: string) {
  const { error } = await supabase
    .from('retraining_data')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

export async function getUnverifiedSamples(limit: number = 10) {
  const { data, error } = await supabase
    .from('retraining_data')
    .select('*')
    .eq('is_verified', false)
    .order('confidence_score', { ascending: true })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function exportVerifiedData() {
  const { data, error } = await supabase
    .from('retraining_data')
    .select('*')
    .eq('is_verified', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get retraining data entry by object ID
 */
export async function getRetrainingDataByObjectId(object_id: string): Promise<RetrainingData | null> {
  try {
    const { data, error } = await supabase
      .from('retraining_data')
      .select('*')
      .eq('object_id', object_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Error getting retraining data by object ID:', err);
    throw err;
  }
} 
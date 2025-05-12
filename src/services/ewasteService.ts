import supabase from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function getAllEwaste() {
  const { data, error } = await supabase
    .from('ewaste')
    .select('id, name, category, quantity, estimated_price, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createEwaste({ detection_id, user_id, name, category, quantity, estimated_price, image_url }: {
  detection_id?: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  estimated_price?: number;
  image_url?: string;
}) {
  const { data, error } = await supabase
    .from('ewaste')
    .insert({
      id: uuidv4(),
      detection_id: detection_id || null,
      user_id,
      name,
      category,
      quantity,
      estimated_price,
      image_url,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
} 
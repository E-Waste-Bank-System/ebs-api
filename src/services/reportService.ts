import supabase from '../utils/supabase';
import { EWasteRequest } from './requestService';

export async function getApprovedRequests(): Promise<EWasteRequest[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'approved')
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data || [];
}
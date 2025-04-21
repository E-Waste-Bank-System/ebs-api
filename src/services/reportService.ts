import supabase from '../config/supabase';
import { EWasteRequest } from '../models/request';

export async function getReports(): Promise<EWasteRequest[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'approved');
  if (error) throw error;
  return data as EWasteRequest[];
}
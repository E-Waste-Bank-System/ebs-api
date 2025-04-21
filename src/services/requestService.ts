import supabase from '../config/supabase';
import { EWasteRequest } from '../models/request';

export async function getAllRequests(
  limit: number,
  offset: number
): Promise<{ data: EWasteRequest[]; total: number }> {
  const { data, error, count } = await supabase
    .from('requests')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: data as EWasteRequest[], total: count || 0 };
}

export async function getRequestsByUser(userId: string): Promise<EWasteRequest[]> {
  const { data, error } = await supabase.from('requests').select('*').eq('userId', userId);
  if (error) throw error;
  return data as EWasteRequest[];
}

export async function createRequest(request: Partial<EWasteRequest>): Promise<EWasteRequest> {
  const { data, error } = await supabase.from('requests').insert(request).single();
  if (error) throw error;
  return data as EWasteRequest;
}

export async function updateRequestStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<EWasteRequest> {
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as EWasteRequest;
}
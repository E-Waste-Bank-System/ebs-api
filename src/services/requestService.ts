import supabase from '../utils/supabase';

export interface EWasteRequest {
  id: string;
  user_id: string;
  image_url: string;
  description: string;
  status: string;
  created_at: string;
}

export async function getAllRequests(limit: number, offset: number) {
  const { data, count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit, { offset });
  if (error) throw error;
  return { data: data || [], total: count || 0 };
}

export async function getRequestsByUser(userId: string) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRequest(request: Omit<EWasteRequest, 'created_at'>) {
  const { data, error } = await supabase
    .from('requests')
    .insert(request)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRequestStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
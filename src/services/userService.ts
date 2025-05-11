import supabase from '../utils/supabase';

export async function getAllAdmins() {
  const { data, error } = await supabase
    .from('admin')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAdminById(id: string) {
  const { data, error } = await supabase
    .from('admin')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAdmin(admin: { user_id: string; name: string }) {
  const { data, error } = await supabase
    .from('admin')
    .insert(admin)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAdmin(id: string) {
  const { error } = await supabase
    .from('admin')
    .delete()
    .eq('id', id);
  if (error) throw error;
} 
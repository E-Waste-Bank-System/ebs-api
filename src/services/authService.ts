import supabase from '../config/supabase';
import bcrypt from 'bcryptjs';

interface AdminRecord {
  id: string;
  email: string;
  password_hash: string;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase
    .from('admins')
    .select('id, email, password_hash')
    .eq('email', email)
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  return { id: data.id, email: data.email };
}
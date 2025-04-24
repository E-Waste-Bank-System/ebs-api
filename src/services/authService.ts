import supabase from '../config/supabase';
import bcrypt from 'bcryptjs';

interface AdminRecord {
  id: string;
  email: string;
  password_hash: string;
}

interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  // tambahkan field lain jika perlu
}

export async function login(email: string, password: string) {
  // Cek di tabel admins
  let { data, error } = await supabase
    .from('admins')
    .select('id, email, password_hash')
    .eq('email', email)
    .single();

  if (!error && data) {
    const isValid = await bcrypt.compare(password, data.password_hash);
    if (isValid) {
      return { id: data.id, email: data.email, role: 'admin' };
    }
  }

  // Jika tidak ditemukan di admins, cek ke Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!authError && authData?.user) {
    return { id: authData.user.id, email: authData.user.email, role: 'user' };
  }

  throw Object.assign(new Error('Invalid email or password'), { status: 401 });
}
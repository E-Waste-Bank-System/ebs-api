import supabase from '../config/supabase';

export async function signup(
  email: string,
  password: string,
  name: string
) {
  // Use Admin API to create user with service role key
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'USER' }
  });
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return data.user;
}
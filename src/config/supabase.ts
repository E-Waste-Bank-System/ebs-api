import { createClient } from '@supabase/supabase-js';
import env from './env';

// Use service role key on server to allow admin operations (signUp, RLS bypass)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export default supabase;
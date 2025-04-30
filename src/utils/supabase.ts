import { createClient } from '@supabase/supabase-js';
import env from '../config/env';

const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey) as any;
export default supabase;
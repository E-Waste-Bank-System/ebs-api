import { createClient } from '@supabase/supabase-js';
import env from '../config/env';

// Create Supabase client with better error handling
const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'ebs-api'
    }
  }
});

// Test the connection and verify table structure
async function testConnection() {
  try {
    // First test basic connection
    const { data: healthCheck, error: healthError } = await supabase.from('scans').select('count').limit(1);
    
    if (healthError) {
      console.error('Supabase connection test failed:', {
        error: healthError,
        message: healthError.message,
        details: healthError.details,
        hint: healthError.hint,
        code: healthError.code
      });
      return;
    }

    // Then verify table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('scans')
      .select('id, user_id, created_at')
      .limit(1);

    if (tableError) {
      console.error('Table structure verification failed:', {
        error: tableError,
        message: tableError.message,
        details: tableError.details,
        hint: tableError.hint,
        code: tableError.code
      });
      return;
    }

    console.log('Supabase connection and table structure verification successful');
  } catch (err) {
    console.error('Unexpected error during Supabase connection test:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}

testConnection();

export default supabase;
import supabase from './utils/supabase';

// Get user_id from environment variable or command line argument
const user_id = process.env.ADMIN_USER_ID || 'd0ac0ecb-b4d7-4d81-bcd7-c0bcec391527';
const name = 'Admin User';

if (!user_id) {
  console.error('Error: Please provide a Supabase Auth user_id as ADMIN_USER_ID env or as a command line argument.');
  process.exit(1);
}

async function seedAdmin() {
  try {
    await supabase.from('admin').insert({ user_id, name });
    console.log('Admin seeded successfully');
  } catch (err: any) {
    if (err.message && err.message.includes('duplicate key')) {
      console.log('Admin already exists');
    } else {
      console.error('Error seeding admin:', err);
    }
  }
}

seedAdmin();

import { registerUser } from './services/authService';

async function seedAdmin() {
  const email = 'ebs@admin.com';
  const password = 'adminpassword'; // Change to a secure password
  try {
    // is_admin is now in snake_case instead of camelCase
    await registerUser(email, password, true);
    console.log('Admin user seeded successfully');
  } catch (err: any) {
    if (err.message && err.message.includes('duplicate key')) {
      console.log('Admin user already exists');
    } else {
      console.error('Error seeding admin user:', err);
    }
  }
}

seedAdmin();

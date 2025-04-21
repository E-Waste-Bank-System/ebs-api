import supabase from './config/supabase';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Seeding database...');

  // Admin
  const adminPassword = 'ebskesandung';
  const password_hash = await bcrypt.hash(adminPassword, 10);
  const { error: adminError } = await supabase.from('admins').insert([{
    id: uuidv4(),
    email: 'ebs@admin.com',
    password_hash,
  }]);
  if (adminError) console.error('Admin seed error:', adminError.message);
  else console.log('Admin seeded');

  // Articles
  const articles = [
    {
      id: uuidv4(),
      title: 'Welcome to EBS',
      content: 'This is the first article on E-Waste Bank System.',
      image_url: 'https://via.placeholder.com/300',
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      title: 'Recycling Tips',
      content: 'Here are some tips to recycle your electronics safely.',
      image_url: 'https://via.placeholder.com/300',
      created_at: new Date().toISOString(),
    },
  ];
  const { error: articleError } = await supabase.from('articles').insert(articles);
  if (articleError) console.error('Articles seed error:', articleError.message);
  else console.log('Articles seeded');

  // E-Waste Requests
  const requests = [
    {
      id: uuidv4(),
      user_id: 'user-123',
      category: 'electronic',
      weight: 2.5,
      price: 10,
      status: 'approved',
      pickup_date: new Date().toISOString(),
      location: 'Jakarta',
      image_url: 'https://via.placeholder.com/300',
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      user_id: 'user-456',
      category: 'battery',
      weight: 1.2,
      price: 5,
      status: 'pending',
      pickup_date: new Date().toISOString(),
      location: 'Bandung',
      image_url: 'https://via.placeholder.com/300',
      created_at: new Date().toISOString(),
    },
  ];
  const { error: requestError } = await supabase.from('requests').insert(requests);
  if (requestError) console.error('Requests seed error:', requestError.message);
  else console.log('Requests seeded');

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Unexpected error during seed:', err);
  process.exit(1);
});
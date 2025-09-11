import { config } from 'dotenv';
import postgres from 'postgres';
import { generateHashedPassword, generateUUID } from './lib/utils.js';

config({ path: '.env.local' });

const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

async function createMissingUser() {
  try {
    const userId = '2e089acc-f435-426a-a97b-e421eddf9ddc';
    const email = `guest-${Date.now()}`;
    const password = generateHashedPassword(generateUUID());
    
    console.log('Creating missing user:', { userId, email });
    
    await sql`
      INSERT INTO "User" (id, email, password, created_at, updated_at) 
      VALUES (${userId}, ${email}, ${password}, NOW(), NOW())
    `;
    
    console.log('✅ Missing user created successfully');
    
    // Verify it was created
    const users = await sql`
      SELECT id, email, created_at 
      FROM "User" 
      WHERE id = ${userId}
    `;
    
    console.log('Verification:', users);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
}

createMissingUser();
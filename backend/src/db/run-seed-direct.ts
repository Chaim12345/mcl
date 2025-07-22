import { config } from 'dotenv';
import { query } from './client.js';
import { generateId } from '../utils/id.js';
import { Priority, Role, Status, NotificationType } from '../models/types.js';
import { createRequire } from 'module';

// Use createRequire to import bcrypt in ESM context
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

// Hash password using bcrypt
function hashPassword(password: string): string {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

// Load environment variables
config();

console.log('🌱 Starting database seeding directly...');

// Test bcrypt first
console.log('Testing bcrypt...');
const testHash = hashPassword('test123');
console.log('Bcrypt test successful, hash:', testHash);

// Simple seed function
async function simpleSeed() {
  try {
    console.log('Creating a test user...');
    
    const testUser = {
      id: generateId(),
      email: 'test@example.com',
      password: hashPassword('password123'),
      firstName: 'Test',
      lastName: 'User',
    };
    
    const { rows } = await query(
      `INSERT INTO users (id, email, password, "firstName", "lastName")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [testUser.id, testUser.email, testUser.password, testUser.firstName, testUser.lastName]
    );
    
    console.log('✅ Created test user:', rows[0]);
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
  }
}

simpleSeed();
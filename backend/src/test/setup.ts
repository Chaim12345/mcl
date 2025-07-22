import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

beforeAll(async () => {
  // Any global test setup can go here
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Any global test cleanup can go here
  console.log('🧹 Cleaning up test environment...');
});
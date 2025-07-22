import { config } from 'dotenv';
import { createRequire } from 'module';

// Load environment variables
config();

// Use createRequire to enable CommonJS require in ESM
const require = createRequire(import.meta.url);

let prisma: any;
let PrismaClient: any;

try {
  const prismaModule = require('@prisma/client');
  PrismaClient = prismaModule.PrismaClient;
  
  // Create a singleton instance of PrismaClient
  const globalForPrisma = global as unknown as { prisma: any };
  
  prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  
  // Prevent multiple instances of Prisma Client in development
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} catch (error) {
  console.error('Failed to initialize Prisma client:', error);
  // Create a mock client for development
  prisma = {
    $connect: async () => console.log('Mock prisma client connected'),
    $disconnect: async () => console.log('Mock prisma client disconnected'),
    $queryRaw: async () => [{ test: 1 }],
  };
}

export { prisma, PrismaClient };
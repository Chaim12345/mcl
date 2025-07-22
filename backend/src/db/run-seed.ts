import { seedDatabase } from './seed.js';

console.log('Starting seed process from wrapper...');

seedDatabase()
  .then(() => {
    console.log('Seed completed successfully from wrapper');
    process.exit(0);
  })
  .catch((error: any) => {
    console.error('Seed failed with error from wrapper:', error);
    process.exit(1);
  });
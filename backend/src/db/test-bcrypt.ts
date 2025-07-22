import { createRequire } from 'module';

const require = createRequire(import.meta.url);

try {
  const bcrypt = require('bcryptjs');
  console.log('bcrypt imported successfully');
  console.log('bcrypt object:', bcrypt);
  console.log('bcrypt.hashSync type:', typeof bcrypt.hashSync);
  
  if (bcrypt.hashSync) {
    const hash = bcrypt.hashSync('test', 10);
    console.log('Hash created successfully:', hash);
  } else {
    console.log('hashSync method not found');
  }
} catch (error) {
  console.error('Error importing bcrypt:', error);
}
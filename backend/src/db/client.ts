import { config } from 'dotenv';
import { Pool, PoolClient } from 'pg';

// Load environment variables
config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

/**
 * Execute a query with parameters
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  
  return res;
}

/**
 * Get a client from the pool
 * @returns PostgreSQL client
 */
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  const originalRelease = client.release;
  
  // Monkey patch the release method to log duration
  client.release = () => {
    client.release = originalRelease;
    return client.release();
  };
  
  return client;
}

/**
 * Execute a transaction
 * @param callback - Function to execute within the transaction
 * @returns Result of the callback function
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Close the pool
 */
export async function closePool() {
  await pool.end();
}

export default {
  query,
  getClient,
  transaction,
  closePool,
};
import { randomUUID } from 'crypto';

/**
 * Generate a unique ID
 * @returns Unique ID string
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Generate a short unique ID
 * @returns Short unique ID string
 */
export function generateShortId(): string {
  return randomUUID().split('-')[0] || randomUUID();
}
/**
 * Global Teardown for Playwright Tests
 * Cleans up test data and resources
 */

async function globalTeardown(config) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up test data if needed
    // This could include database cleanup, file cleanup, etc.
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;
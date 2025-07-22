// Simple test to check if we can import the board service
async function testImport() {
  try {
    console.log('Attempting to import board service...');
    const boardService = await import('./src/services/boardService.js');
    console.log('Board service exports:', Object.keys(boardService));
    console.log('createBoard function:', typeof boardService.createBoard);
  } catch (error) {
    console.error('Import failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testImport();
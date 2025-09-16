import http from 'http';
import fs from 'fs';

// Simple test to verify the board.html file can be served correctly
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/board.html',
  method: 'GET'
};

console.log('Testing if board.html can be served correctly...');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Content-Type: ${res.headers['content-type']}`);
  
  if (res.statusCode === 200) {
    console.log('✅ SUCCESS: board.html is being served correctly');
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      // Check if the response contains key elements
      if (data.includes('<title>Project Management System</title>')) {
        console.log('✅ SUCCESS: Page title is correct');
      } else {
        console.log('❌ FAILURE: Page title is incorrect');
      }
      
      if (data.includes('board-container')) {
        console.log('✅ SUCCESS: Board container is present');
      } else {
        console.log('❌ FAILURE: Board container is missing');
      }
      
      if (data.includes('task-form')) {
        console.log('✅ SUCCESS: Task form is present');
      } else {
        console.log('❌ FAILURE: Task form is missing');
      }
      
      if (data.includes('task-list')) {
        console.log('✅ SUCCESS: Task list is present');
      } else {
        console.log('❌ FAILURE: Task list is missing');
      }
      
      console.log('=== Manual Test Complete ===');
    });
  } else {
    console.log('❌ FAILURE: Unable to serve board.html');
  }
});

req.on('error', (error) => {
  console.log(`❌ FAILURE: Error connecting to server - ${error.message}`);
  console.log('Please make sure the server is running on port 3001');
});

req.end();
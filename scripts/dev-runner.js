#!/usr/bin/env node

/**
 * Development Runner for Project Management Platform
 * This script starts both the React frontend and Go backend with proper coordination
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging functions
const log = (message, color = colors.blue) => {
  console.log(`${color}[DEV]${colors.reset} ${message}`);
};

const logSuccess = (message) => log(message, colors.green);
const logError = (message) => log(message, colors.red);
const logWarning = (message) => log(message, colors.yellow);

// Process tracking
let processes = [];
let isShuttingDown = false;

// Cleanup function
const cleanup = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  log('Shutting down development servers...');
  
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${proc.pid} /T /F`);
        } else {
          proc.kill('SIGTERM');
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Check if required tools are available
const checkRequirements = () => {
  return new Promise((resolve, reject) => {
    log('Checking requirements...');
    
    // Check Node.js
    exec('node --version', (error, stdout) => {
      if (error) {
        logError('Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/');
        return reject(error);
      }
      
      const nodeVersion = parseInt(stdout.replace('v', '').split('.')[0]);
      if (nodeVersion < 18) {
        logError(`Node.js version 18+ is required. Current version: ${stdout.trim()}`);
        return reject(new Error('Node.js version too old'));
      }
      
      // Check Go
      exec('go version', (error, stdout) => {
        if (error) {
          logError('Go is not installed. Please install Go 1.21+ from https://golang.org/');
          return reject(error);
        }
        
        // Check Docker
        exec('docker --version', (error) => {
          if (error) {
            logWarning('Docker is not installed. MongoDB will need to be running separately.');
          }
          
          logSuccess('Requirements check passed!');
          resolve();
        });
      });
    });
  });
};

// Setup environment
const setupEnvironment = () => {
  log('Setting up environment...');
  
  // Check if .env exists
  if (!fs.existsSync('.env')) {
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
      logWarning('Created .env file from .env.example. Please review and update the configuration.');
    } else {
      logWarning('.env file not found. Please create one with your configuration.');
    }
  }
  
  // Check if frontend dependencies are installed
  if (!fs.existsSync('frontend/node_modules')) {
    log('Installing frontend dependencies...');
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], { 
        cwd: 'frontend',
        stdio: 'inherit',
        shell: true 
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          logSuccess('Frontend dependencies installed!');
          resolve();
        } else {
          logError('Failed to install frontend dependencies');
          reject(new Error('npm install failed'));
        }
      });
    });
  }
  
  return Promise.resolve();
};

// Start MongoDB using Docker
const startMongoDB = () => {
  return new Promise((resolve) => {
    log('Starting MongoDB...');
    
    exec('docker-compose -f docker-compose.dev.yml up -d mongodb', (error, stdout, stderr) => {
      if (error) {
        logWarning('Failed to start MongoDB with Docker. Please ensure MongoDB is running manually on port 27017.');
        logWarning('You can install MongoDB locally or run: docker run -d -p 27017:27017 --name mongodb mongo:7.0');
      } else {
        logSuccess('MongoDB started successfully!');
      }
      resolve(); // Continue regardless of MongoDB status
    });
  });
};

// Start the Go backend
const startBackend = () => {
  return new Promise((resolve, reject) => {
    log('Starting Go backend...');
    
    const backend = spawn('go', ['run', './cmd/server'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    processes.push(backend);
    
    backend.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.magenta}[BACKEND]${colors.reset} ${output}`);
      }
    });
    
    backend.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.magenta}[BACKEND]${colors.reset} ${output}`);
      }
      
      // Check if server started successfully
      if (output.includes('Starting server') || output.includes('Gin-Gonic')) {
        logSuccess('Backend started on http://localhost:8080');
        resolve();
      }
    });
    
    backend.on('close', (code) => {
      if (!isShuttingDown) {
        logError(`Backend process exited with code ${code}`);
        cleanup();
      }
    });
    
    backend.on('error', (error) => {
      logError(`Failed to start backend: ${error.message}`);
      reject(error);
    });
    
    // Resolve after a timeout if we don't get confirmation
    setTimeout(() => {
      if (!isShuttingDown) {
        resolve();
      }
    }, 5000);
  });
};

// Start the React frontend
const startFrontend = () => {
  return new Promise((resolve, reject) => {
    log('Starting React frontend...');
    
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: 'frontend',
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    processes.push(frontend);
    
    frontend.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.cyan}[FRONTEND]${colors.reset} ${output}`);
      }
      
      // Check if Vite started successfully
      if (output.includes('Local:') || output.includes('localhost:3000')) {
        logSuccess('Frontend started on http://localhost:3000');
        resolve();
      }
    });
    
    frontend.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.cyan}[FRONTEND]${colors.reset} ${output}`);
      }
    });
    
    frontend.on('close', (code) => {
      if (!isShuttingDown) {
        logError(`Frontend process exited with code ${code}`);
        cleanup();
      }
    });
    
    frontend.on('error', (error) => {
      logError(`Failed to start frontend: ${error.message}`);
      reject(error);
    });
    
    // Resolve after a timeout if we don't get confirmation
    setTimeout(() => {
      if (!isShuttingDown) {
        resolve();
      }
    }, 10000);
  });
};

// Main execution
const main = async () => {
  try {
    console.log(`
🚀 Project Management Platform - Development Runner
==================================================
    `);
    
    await checkRequirements();
    await setupEnvironment();
    await startMongoDB();
    
    // Add a small delay to ensure MongoDB is ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await startBackend();
    
    // Add a small delay to ensure backend is ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await startFrontend();
    
    console.log(`
${colors.green}🎉 Development environment is ready!${colors.reset}

📱 Frontend: http://localhost:3000
🔧 Backend:  http://localhost:8080
🗄️  MongoDB: localhost:27017

${colors.yellow}Press Ctrl+C to stop all services${colors.reset}
    `);
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logError(`Failed to start development environment: ${error.message}`);
    cleanup();
    process.exit(1);
  }
};

// Run the main function
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  cleanup();
  process.exit(1);
});
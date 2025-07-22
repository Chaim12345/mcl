import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { query, closePool } from './db/client.js';
import apiRoutes from './routes/index.js';
import { socketService } from './services/socketService.js';
import { initializeScheduledTasks } from './services/scheduledTasks.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  let dbConnected = false;
  try {
    await query('SELECT 1');
    dbConnected = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  res.status(dbConnected ? 200 : 503).json({ 
    status: dbConnected ? 'healthy' : 'unhealthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Basic API route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Project Management Platform API',
    version: '1.0.0',
    status: 'running'
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export app for testing
export default app;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = socketService.initialize(httpServer);

// Make io available globally for event handlers
declare global {
  var io: any;
}
global.io = io;

const server = httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Check database connection on startup
  try {
    await query('SELECT 1');
    console.log(`🗄️  Database: ✅ Connected`);
    
    // Initialize scheduled tasks
    initializeScheduledTasks();
  } catch (error) {
    console.log(`🗄️  Database: ❌ Disconnected`);
    console.error('Database connection error:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await closePool();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await closePool();
    console.log('✅ Server closed');
    process.exit(0);
  });
});
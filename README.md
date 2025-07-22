# Project Management Platform

A modern, production-grade project management tool similar to Monday.com, built with React, Node.js, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd project-management-platform
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development environment:**
   ```bash
   # Using Docker (recommended)
   npm run docker:dev
   
   # Or run locally
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Health: http://localhost:3001/health

## 🏗️ Project Structure

```
project-management-platform/
├── frontend/                 # React frontend application
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   ├── Dockerfile.dev       # Development Docker config
│   ├── Dockerfile.prod      # Production Docker config
│   └── package.json         # Frontend dependencies
├── backend/                 # Node.js backend application
│   ├── src/                 # Source code
│   ├── prisma/              # Database schema and migrations
│   ├── Dockerfile.dev       # Development Docker config
│   ├── Dockerfile.prod      # Production Docker config
│   └── package.json         # Backend dependencies
├── nginx/                   # Nginx configuration
├── docker-compose.dev.yml   # Development Docker Compose
├── docker-compose.prod.yml  # Production Docker Compose
└── package.json             # Root package.json (workspace)
```

## 🛠️ Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run lint` - Lint both applications
- `npm run format` - Format code in both applications
- `npm run docker:dev` - Start development environment with Docker
- `npm run docker:prod` - Start production environment with Docker

### Frontend
- `npm run dev --workspace=frontend` - Start frontend development server
- `npm run build --workspace=frontend` - Build frontend for production
- `npm run test --workspace=frontend` - Run frontend tests
- `npm run lint --workspace=frontend` - Lint frontend code

### Backend
- `npm run dev --workspace=backend` - Start backend development server
- `npm run build --workspace=backend` - Build backend for production
- `npm run test --workspace=backend` - Run backend tests
- `npm run lint --workspace=backend` - Lint backend code
- `npm run db:generate --workspace=backend` - Generate Prisma client
- `npm run db:migrate --workspace=backend` - Run database migrations

## 🐳 Docker Development

The project includes Docker configurations for both development and production environments.

### Development with Docker
```bash
npm run docker:dev
```

This will start:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- Backend API on port 3001
- Frontend application on port 3000

### Production with Docker
```bash
npm run docker:prod
```

This will start the full production stack with Nginx reverse proxy.

## 🧪 Testing

The project uses Vitest for both frontend and backend testing.

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch --workspace=frontend
npm run test:watch --workspace=backend
```

## 📝 Code Quality

The project uses ESLint and Prettier for code quality and formatting.

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix --workspace=frontend
npm run lint:fix --workspace=backend

# Format all code
npm run format
```

## 🗄️ Database

The project uses PostgreSQL with Prisma ORM.

```bash
# Generate Prisma client
npm run db:generate --workspace=backend

# Run migrations
npm run db:migrate --workspace=backend

# Open Prisma Studio
npm run db:studio --workspace=backend
```

## 🚀 Deployment

The project is containerized and ready for deployment with Docker.

1. **Build production images:**
   ```bash
   npm run docker:build
   ```

2. **Deploy with Docker Compose:**
   ```bash
   npm run docker:prod
   ```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `SMTP_*` - Email configuration for notifications

## 📚 Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **React DnD** - Drag and drop
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Redis** - Caching
- **Socket.io** - Real-time communication
- **JWT** - Authentication

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Docker Compose** - Orchestration

## 📄 License

This project is licensed under the MIT License.
# Technology Stack & Build System

## Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** as build tool and dev server
- **Tailwind CSS** for styling with Shadcn/ui components
- **Zustand** for state management
- **React Query** for server state management
- **React Hook Form** with Zod validation
- **React DnD** for drag and drop functionality
- **Socket.io-client** for real-time features

## Backend Stack
- **Node.js** with Express.js framework
- **TypeScript** with ES modules (type: "module")
- **Prisma ORM** with PostgreSQL database
- **Redis** for caching and sessions
- **Socket.io** for WebSocket connections
- **JWT** for authentication
- **Winston** for logging

## Infrastructure
- **Docker** with multi-stage builds for dev/prod
- **Docker Compose** for orchestration
- **Nginx** as reverse proxy in production
- **PostgreSQL 15** as primary database
- **Redis 7** for caching

## Development Tools
- **ESLint** with TypeScript rules
- **Prettier** for code formatting
- **Vitest** for testing (both frontend and backend)
- **npm workspaces** for monorepo management

## Common Commands

### Development
```bash
# Start full development environment
npm run docker:dev

# Start locally (requires DB setup)
npm run dev

# Individual services
npm run dev:frontend
npm run dev:backend
```

### Building & Testing
```bash
# Build all applications
npm run build

# Run all tests
npm run test

# Lint and format
npm run lint
npm run format
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate --workspace=backend

# Run migrations
npm run db:migrate --workspace=backend

# Open Prisma Studio
npm run db:studio --workspace=backend
```

### Production Deployment
```bash
# Build production images
npm run docker:build

# Start production stack
npm run docker:prod
```

## Code Style Guidelines
- Use TypeScript strict mode with path aliases (@/ for src)
- ESLint with max 0 warnings policy
- Prettier for consistent formatting
- ES modules throughout (no CommonJS)
- Functional components with hooks (React)
- Async/await over promises
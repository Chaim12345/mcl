# Project Structure & Organization

## Monorepo Layout
This is an npm workspace monorepo with separate frontend and backend applications:

```
project-management-platform/
├── frontend/                 # React application
├── backend/                  # Node.js API server
├── nginx/                    # Nginx configuration
├── .kiro/                    # Kiro AI assistant files
├── docker-compose.*.yml      # Container orchestration
└── package.json              # Root workspace config
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   ├── pages/               # Route-level components
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand state stores
│   ├── services/            # API client functions
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Helper functions
│   └── test/                # Test utilities and setup
├── public/                  # Static assets
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── package.json             # Frontend dependencies
```

## Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── routes/              # Express route handlers
│   ├── services/            # Business logic layer
│   ├── middleware/          # Express middleware
│   ├── models/              # Data models and types
│   ├── utils/               # Helper functions
│   ├── types/               # TypeScript interfaces
│   └── server.ts            # Application entry point
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Prisma schema definition
│   └── migrations/          # Database migration files
├── dist/                    # Compiled JavaScript output
├── tsconfig.json            # TypeScript configuration
└── package.json             # Backend dependencies
```

## Configuration Files
- **Docker**: Separate dev/prod Dockerfiles for each service
- **Environment**: `.env.example` template, `.env` for local config
- **Code Quality**: `.eslintrc.cjs`, `.prettierrc`, `.prettierignore`
- **Git**: `.gitignore` configured for Node.js, Docker, and IDE files

## Path Aliases
Both frontend and backend use `@/` alias for src directory:
- Frontend: `@/components`, `@/hooks`, `@/stores`
- Backend: `@/routes`, `@/services`, `@/middleware`

## Naming Conventions
- **Files**: kebab-case for components, camelCase for utilities
- **Components**: PascalCase React components
- **Variables**: camelCase for variables and functions
- **Constants**: UPPER_SNAKE_CASE for constants
- **Database**: snake_case for table and column names

## Import Organization
1. External libraries (React, Express, etc.)
2. Internal modules with `@/` alias
3. Relative imports (`./`, `../`)
4. Type-only imports at the end

## Development Workflow
- Use Docker Compose for full-stack development
- Frontend runs on port 3000, backend on 3001
- Database on 5432, Redis on 6379
- Nginx reverse proxy on port 80 (production only)
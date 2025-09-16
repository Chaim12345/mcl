# Development Setup Guide

This guide will help you set up and run the Project Management Platform locally with the updated Vibe Design System frontend.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Go 1.21+** - [Download here](https://golang.org/)
- **Docker** - [Download here](https://docker.com/) (for MongoDB)

### Option 1: Automated Setup (Recommended)

```bash
# Run the development environment
npm run dev
```

This will automatically:
- Check requirements
- Install dependencies
- Start MongoDB (via Docker)
- Start the Go backend on port 8080
- Start the React frontend on port 3000

### Option 2: Manual Setup

1. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

2. **Start MongoDB:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d mongodb
   ```

3. **Start the backend:**
   ```bash
   go run ./cmd/server
   ```

4. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

## 🌐 Access Points

Once everything is running:

- **Frontend (React + Vibe):** http://localhost:3000
- **Backend API:** http://localhost:8080
- **MongoDB:** localhost:27017

## 🎨 Vibe Design System Features

The frontend now includes comprehensive Vibe Design System integration:

### Demo Pages Available:
- **Table Demo:** http://localhost:3000/demo/vibe-table
- **Board Demo:** http://localhost:3000/demo/vibe-board
- **Navigation Demo:** http://localhost:3000/demo/vibe-navigation
- **Layout Demo:** http://localhost:3000/demo/vibe-layout
- **Notifications Demo:** http://localhost:3000/demo/vibe-notifications

### Key Features Implemented:
- ✅ Complete Vibe Table system with sorting, filtering, selection
- ✅ Advanced board management with item editing and bulk operations
- ✅ Modern navigation components with dropdowns and user menus
- ✅ Comprehensive layout system with responsive design
- ✅ Rich notification system with toasts and alerts
- ✅ Form components with validation and error handling
- ✅ Theme system with light/dark mode support

## 🔧 Development Commands

```bash
# Start development environment
npm run dev

# Start only frontend
npm run dev:frontend

# Start only backend
npm run dev:backend

# Build everything
npm run build

# Run tests
npm run test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend

# Clean up Docker containers
docker-compose -f docker-compose.dev.yml down
```

## 🗄️ Database Setup

The development environment uses MongoDB with the following default configuration:

- **Host:** localhost:27017
- **Database:** project_management_dev
- **Username:** root
- **Password:** password

You can modify these settings in the `.env` file.

## 🔐 Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Key configuration options:
- `DATABASE_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (change in production)
- `SMTP_*` - Email configuration for notifications
- `SERVER_PORT` - Backend server port (default: 8080)

## 🐛 Troubleshooting

### Frontend won't start
- Ensure Node.js 18+ is installed
- Delete `frontend/node_modules` and run `npm install` again
- Check if port 3000 is available

### Backend won't start
- Ensure Go 1.21+ is installed
- Check if MongoDB is running
- Verify `.env` file configuration
- Check if port 8080 is available

### MongoDB connection issues
- Ensure Docker is running
- Run: `docker-compose -f docker-compose.dev.yml up -d mongodb`
- Check MongoDB logs: `docker-compose -f docker-compose.dev.yml logs mongodb`

### API calls failing
- Verify backend is running on port 8080
- Check browser network tab for CORS issues
- Ensure frontend proxy configuration is correct in `vite.config.ts`

## 📱 Testing the Integration

1. **Register a new account:** http://localhost:3000/register
2. **Login:** http://localhost:3000/login
3. **Create a workspace:** Navigate to workspaces and create one
4. **Create a board:** Within the workspace, create a board
5. **Test Vibe components:** Visit the demo pages to see all features

## 🎯 What's New in This Version

- **Complete Vibe Design System integration** replacing Shadcn/ui components
- **Advanced table management** with sorting, filtering, and bulk operations
- **Modern board interface** with drag-and-drop and real-time updates
- **Enhanced navigation** with improved user experience
- **Comprehensive demo pages** showcasing all Vibe features
- **Improved performance** with optimized component architecture
- **Better accessibility** with WCAG 2.1 AA compliance

## 🚀 Next Steps

After getting the development environment running:

1. Explore the demo pages to see all Vibe components in action
2. Test the board management features with real data
3. Try the advanced filtering and search capabilities
4. Test the responsive design on different screen sizes
5. Experiment with the theme switching functionality

## 📞 Support

If you encounter any issues:

1. Check this troubleshooting guide
2. Review the console logs for error messages
3. Ensure all prerequisites are properly installed
4. Try the manual setup steps if the automated setup fails

Happy coding! 🎉
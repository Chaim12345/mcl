#!/bin/bash

# Development Setup Script for Project Management Platform
# This script helps you run the React frontend and Go backend together

set -e

echo "🚀 Project Management Platform - Development Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check Go
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed. Please install Go 1.21+ from https://golang.org/"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker from https://docker.com/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose"
        exit 1
    fi
    
    print_success "All requirements are met!"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Copy .env.example to .env if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file from .env.example..."
        cp .env.example .env
        print_warning "Please review and update the .env file with your configuration"
    fi
    
    print_success "Environment setup complete!"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Install Go dependencies
    print_status "Installing Go dependencies..."
    go mod download
    go mod tidy
    
    print_success "Dependencies installed!"
}

# Start MongoDB
start_mongodb() {
    print_status "Starting MongoDB..."
    
    # Check if MongoDB container is already running
    if docker ps | grep -q "pm-mongodb-dev"; then
        print_warning "MongoDB container is already running"
    else
        docker-compose -f docker-compose.dev.yml up -d mongodb
        
        # Wait for MongoDB to be ready
        print_status "Waiting for MongoDB to be ready..."
        timeout=30
        while [ $timeout -gt 0 ]; do
            if docker-compose -f docker-compose.dev.yml ps -q mongodb | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
                break
            fi
            sleep 2
            timeout=$((timeout - 1))
        done
        
        if [ $timeout -eq 0 ]; then
            print_error "MongoDB failed to start within 60 seconds"
            exit 1
        fi
    fi
    
    print_success "MongoDB is running!"
}

# Start backend
start_backend() {
    print_status "Starting Go backend..."
    
    # Build and run the backend
    echo "Building backend..."
    go build -o bin/server ./cmd/server
    
    echo "Starting backend server on port 8080..."
    ./bin/server &
    BACKEND_PID=$!
    
    # Wait a moment for the server to start
    sleep 3
    
    # Check if backend is running
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_success "Backend is running on http://localhost:8080 (PID: $BACKEND_PID)"
        echo $BACKEND_PID > .backend.pid
    else
        print_error "Failed to start backend"
        exit 1
    fi
}

# Start frontend
start_frontend() {
    print_status "Starting React frontend..."
    
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Wait a moment for the server to start
    sleep 3
    
    # Check if frontend is running
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_success "Frontend is running on http://localhost:3000 (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > .frontend.pid
    else
        print_error "Failed to start frontend"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Kill backend if running
    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_status "Stopping backend (PID: $BACKEND_PID)..."
            kill $BACKEND_PID
        fi
        rm -f .backend.pid
    fi
    
    # Kill frontend if running
    if [ -f .frontend.pid ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_status "Stopping frontend (PID: $FRONTEND_PID)..."
            kill $FRONTEND_PID
        fi
        rm -f .frontend.pid
    fi
    
    print_success "Cleanup complete!"
}

# Handle script interruption
trap cleanup EXIT INT TERM

# Main execution
main() {
    case "${1:-start}" in
        "check")
            check_requirements
            ;;
        "setup")
            check_requirements
            setup_environment
            install_dependencies
            ;;
        "start")
            check_requirements
            setup_environment
            start_mongodb
            start_backend
            start_frontend
            
            echo ""
            print_success "🎉 Development environment is ready!"
            echo ""
            echo "📱 Frontend: http://localhost:3000"
            echo "🔧 Backend:  http://localhost:8080"
            echo "🗄️  MongoDB: localhost:27017"
            echo ""
            echo "Press Ctrl+C to stop all services"
            echo ""
            
            # Wait for user to stop
            wait
            ;;
        "stop")
            cleanup
            docker-compose -f docker-compose.dev.yml down
            ;;
        "clean")
            cleanup
            docker-compose -f docker-compose.dev.yml down -v
            rm -rf frontend/node_modules
            rm -rf bin/
            go clean -cache
            ;;
        *)
            echo "Usage: $0 {check|setup|start|stop|clean}"
            echo ""
            echo "Commands:"
            echo "  check  - Check if all requirements are installed"
            echo "  setup  - Install dependencies and setup environment"
            echo "  start  - Start all services (default)"
            echo "  stop   - Stop all services"
            echo "  clean  - Clean up everything (containers, dependencies, builds)"
            exit 1
            ;;
    esac
}

main "$@"
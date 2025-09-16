@echo off
setlocal enabledelayedexpansion

REM Development Setup Script for Project Management Platform (Windows)
REM This script helps you run the React frontend and Go backend together

echo.
echo 🚀 Project Management Platform - Development Setup
echo ==================================================
echo.

REM Function to check if a command exists
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)

where go >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Go is not installed. Please install Go 1.21+ from https://golang.org/
    exit /b 1
)

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker from https://docker.com/
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose
    exit /b 1
)

echo [INFO] All requirements are met!
echo.

REM Setup environment
echo [INFO] Setting up environment...
if not exist .env (
    echo [INFO] Creating .env file from .env.example...
    copy .env.example .env >nul
    echo [WARNING] Please review and update the .env file with your configuration
)

REM Install dependencies
echo [INFO] Installing dependencies...
echo [INFO] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    exit /b 1
)
cd ..

echo [INFO] Installing Go dependencies...
go mod download
go mod tidy

REM Start MongoDB
echo [INFO] Starting MongoDB...
docker-compose -f docker-compose.dev.yml up -d mongodb
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start MongoDB
    exit /b 1
)

echo [INFO] Waiting for MongoDB to be ready...
timeout /t 10 /nobreak >nul

REM Build and start backend
echo [INFO] Building and starting Go backend...
if not exist bin mkdir bin
go build -o bin/server.exe ./cmd/server
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build backend
    exit /b 1
)

echo [INFO] Starting backend server on port 8080...
start "Backend Server" bin/server.exe

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo [INFO] Starting React frontend...
cd frontend
start "Frontend Server" npm run dev
cd ..

echo.
echo [SUCCESS] 🎉 Development environment is ready!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:8080  
echo 🗄️  MongoDB: localhost:27017
echo.
echo The services are running in separate windows.
echo Close the terminal windows to stop the services.
echo.

pause
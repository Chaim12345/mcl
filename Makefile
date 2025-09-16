# Makefile for Go project management platform

.PHONY: test test-with-mongodb test-unit test-integration build clean help docker-build docker-dev docker-prod docker-stop docker-clean

# Default target
help:
	@echo "Available targets:"
	@echo "  test              - Run all tests (requires MongoDB)"
	@echo "  test-with-mongodb - Start MongoDB and run all tests"
	@echo "  test-unit         - Run unit tests only (no database required)"
	@echo "  test-integration  - Run integration tests (requires MongoDB)"
	@echo "  build             - Build the application"
	@echo "  clean             - Clean up test containers and build artifacts"
	@echo ""
	@echo "Docker targets:"
	@echo "  docker-build      - Build Docker images"
	@echo "  docker-dev        - Start development environment"
	@echo "  docker-prod       - Start production environment"
	@echo "  docker-stop       - Stop all Docker containers"
	@echo "  docker-clean      - Clean up Docker containers and volumes"

# Run all tests with MongoDB
test-with-mongodb:
	@echo "Starting MongoDB for testing..."
	docker-compose -f docker-compose.test.yml up -d mongodb-test
	@echo "Waiting for MongoDB to be ready..."
	@timeout=30; while [ $$timeout -gt 0 ]; do \
		if docker-compose -f docker-compose.test.yml ps -q mongodb-test | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then \
			break; \
		fi; \
		sleep 2; \
		timeout=$$((timeout - 1)); \
	done
	@echo "Running tests with MongoDB..."
	TEST_MONGODB_URI="mongodb://testuser:testpass@localhost:27017/test_project_management?authSource=admin" go test ./... -v
	@echo "Cleaning up..."
	docker-compose -f docker-compose.test.yml down -v

# Run tests assuming MongoDB is already running
test:
	TEST_MONGODB_URI="mongodb://testuser:testpass@localhost:27017/test_project_management?authSource=admin" go test ./... -v

# Run only unit tests (no database)
test-unit:
	go test ./internal/auth/... ./internal/models/... -v

# Run integration tests (requires MongoDB)
test-integration:
	TEST_MONGODB_URI="mongodb://testuser:testpass@localhost:27017/test_project_management?authSource=admin" go test ./internal/database/... ./internal/repository/... ./internal/services/... ./internal/handlers/... -v

# Build the application
build:
	go build -o bin/server ./cmd/server

# Clean up
clean:
	docker-compose -f docker-compose.test.yml down -v
	rm -rf bin/
	go clean -testcache

# Docker targets
docker-build:
	@echo "Building Docker images..."
	docker build -t pm-app:latest .
	docker build -f Dockerfile.dev -t pm-app:dev .

docker-dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up --build

docker-dev-detached:
	@echo "Starting development environment in background..."
	docker-compose -f docker-compose.dev.yml up --build -d

docker-prod:
	@echo "Starting production environment..."
	docker-compose -f docker-compose.prod.yml up --build

docker-prod-detached:
	@echo "Starting production environment in background..."
	docker-compose -f docker-compose.prod.yml up --build -d

docker-stop:
	@echo "Stopping all Docker containers..."
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.prod.yml down
	docker-compose -f docker-compose.test.yml down

docker-clean:
	@echo "Cleaning up Docker containers and volumes..."
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker-compose -f docker-compose.prod.yml down -v --remove-orphans
	docker-compose -f docker-compose.test.yml down -v --remove-orphans
	docker system prune -f
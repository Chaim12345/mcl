#!/bin/bash

# Script to run tests with MongoDB
echo "Starting MongoDB for testing..."

# Start MongoDB container
docker-compose -f docker-compose.test.yml up -d mongodb-test

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    sleep 2
    
    # Check if container is healthy
    status=$(docker-compose -f docker-compose.test.yml ps -q mongodb-test | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
    echo "Attempt $attempt/$max_attempts - MongoDB status: $status"
    
    if [ "$status" = "healthy" ]; then
        break
    fi
done

if [ "$status" != "healthy" ]; then
    echo "MongoDB failed to start within timeout"
    docker-compose -f docker-compose.test.yml logs mongodb-test
    exit 1
fi

echo "MongoDB is ready! Running tests..."

# Set environment variable for test MongoDB URI
export TEST_MONGODB_URI="mongodb://testuser:testpass@localhost:27017/test_project_management?authSource=admin"

# Run tests
test_result=0
go test ./... -v || test_result=$?

# Cleanup - stop MongoDB container
echo "Cleaning up MongoDB container..."
docker-compose -f docker-compose.test.yml down -v

exit $test_result
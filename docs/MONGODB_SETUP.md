

# MongoDB Setup for Testing

This document explains how to set up MongoDB for running tests in the Go project management platform.

## Option 1: Using Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed

### Quick Start
```bash
# Start MongoDB and run tests
make test-with-mongodb

# Or use the PowerShell script on Windows
.\scripts\test-with-mongodb.ps1

# Or use the bash script on Linux/Mac
./scripts/test-with-mongodb.sh
```

### Manual Docker Setup
```bash
# Start MongoDB container
docker-compose -f docker-compose.test.yml up -d mongodb-test

# Set environment variable
export TEST_MONGODB_URI="mongodb://testuser:testpass@localhost:27017/test_project_management?authSource=admin"

# Run tests
go test ./... -v

# Clean up
docker-compose -f docker-compose.test.yml down -v
```

## Option 2: Local MongoDB Installation

### Windows
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install MongoDB following the installer instructions
3. Start MongoDB service:
   ```cmd
   net start MongoDB
   ```
4. Create a test user (optional):
   ```bash
   mongosh
   use admin
   db.createUser({
     user: "testuser",
     pwd: "testpass",
     roles: ["readWriteAnyDatabase"]
   })
   ```

### macOS
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Or using MacPorts
sudo port install mongodb
sudo port load mongodb
```

### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Environment Variables

The tests use the following environment variable:

- `TEST_MONGODB_URI`: MongoDB connection string for tests
  - Default: `mongodb://localhost:27017`
  - With auth: `mongodb://testuser:testpass@localhost:27017/test_project_management?authSource=admin`

## Test Database Names

The tests use these database names:
- `test_project_management` - Main test database
- `test_project_management_init` - Database initialization tests
- `test_project_management_cleanup` - Cleanup tests
- `test_connection` - Connection tests

## Running Specific Test Suites

```bash
# Run only unit tests (no database required)
make test-unit

# Run only integration tests (requires MongoDB)
make test-integration

# Run all tests
make test-with-mongodb
```

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running on port 27017
- Check firewall settings
- Verify authentication credentials if using auth

### Permission Issues
- Ensure the test user has read/write permissions
- Check MongoDB logs for authentication errors

### Port Conflicts
- If port 27017 is in use, you can change the port in `docker-compose.test.yml`
- Update the `TEST_MONGODB_URI` environment variable accordingly

### Docker Issues
- Ensure Docker is running
- Try `docker-compose -f docker-compose.test.yml logs mongodb-test` to see container logs
- Clean up with `docker-compose -f docker-compose.test.yml down -v`
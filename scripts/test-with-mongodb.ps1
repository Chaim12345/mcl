# PowerShell script to run tests with MongoDB
Write-Host "Starting MongoDB for testing..." -ForegroundColor Green

# Start MongoDB container
docker-compose -f docker-compose.test.yml up -d mongodb-test

# Wait for MongoDB to be ready
Write-Host "Waiting for MongoDB to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

do {
    $attempt++
    Start-Sleep -Seconds 2
    $status = docker-compose -f docker-compose.test.yml ps -q mongodb-test | ForEach-Object { docker inspect $_ --format='{{.State.Health.Status}}' }
    Write-Host "Attempt $attempt/$maxAttempts - MongoDB status: $status"
} while ($status -ne "healthy" -and $attempt -lt $maxAttempts)

if ($status -ne "healthy") {
    Write-Host "MongoDB failed to start within timeout" -ForegroundColor Red
    docker-compose -f docker-compose.test.yml logs mongodb-test
    exit 1
}

Write-Host "MongoDB is ready! Running tests..." -ForegroundColor Green

# Set environment variable for test MongoDB URI
$env:TEST_MONGODB_URI = "mongodb://testuser:testpass@localhost:27017/test_project_management?authSource=admin"

# Run tests
try {
    go test ./... -v
    $testResult = $LASTEXITCODE
} finally {
    # Cleanup - stop MongoDB container
    Write-Host "Cleaning up MongoDB container..." -ForegroundColor Yellow
    docker-compose -f docker-compose.test.yml down -v
}

exit $testResult
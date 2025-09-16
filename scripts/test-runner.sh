#!/bin/bash

# Comprehensive Test Runner Script
# Usage: ./scripts/test-runner.sh [backend|frontend|all|performance|security]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_COVERAGE_THRESHOLD=85
FRONTEND_COVERAGE_THRESHOLD=85
PERFORMANCE_THRESHOLD_MS=1000

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" >&2
}

check_requirements() {
    log "Checking requirements..."
    
    # Check Go
    if ! command -v go &> /dev/null; then
        error "Go is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    log "Requirements check passed"
}

# Backend Tests
run_backend_tests() {
    log "Running backend tests..."
    
    cd "$(dirname "$0")/.."
    
    # Install dependencies
    log "Installing Go dependencies..."
    go mod tidy
    
    # Run unit tests
    log "Running unit tests..."
    go test -v -coverprofile=coverage-backend.out ./internal/... ./cmd/...
    
    # Generate coverage report
    log "Generating backend coverage report..."
    go tool cover -html=coverage-backend.out -o coverage-backend.html
    
    # Check coverage threshold
    COVERAGE=$(go tool cover -func=coverage-backend.out | grep total | awk '{print $3}' | sed 's/%//')
    log "Backend coverage: ${COVERAGE}%"
    
    if (( $(echo "$COVERAGE < $BACKEND_COVERAGE_THRESHOLD" | bc -l) )); then
        error "Backend coverage (${COVERAGE}%) is below threshold (${BACKEND_COVERAGE_THRESHOLD}%)"
        exit 1
    fi
    
    log "Backend tests completed successfully"
}

# Frontend Tests
run_frontend_tests() {
    log "Running frontend tests..."
    
    cd "$(dirname "$0")/../frontend/vanilla"
    
    # Install dependencies
    log "Installing frontend dependencies..."
    npm ci
    
    # Run unit tests with coverage
    log "Running unit tests..."
    npm run test:coverage
    
    # Check coverage threshold
    if [ -f "coverage/coverage-summary.json" ]; then
        FRONTEND_COVERAGE=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
        log "Frontend coverage: ${FRONTEND_COVERAGE}%"
        
        if (( $(echo "$FRONTEND_COVERAGE < $FRONTEND_COVERAGE_THRESHOLD" | bc -l) )); then
            error "Frontend coverage (${FRONTEND_COVERAGE}%) is below threshold (${FRONTEND_COVERAGE_THRESHOLD}%)"
            exit 1
        fi
    else
        warn "Frontend coverage report not found"
    fi
    
    # Run E2E tests
    log "Running E2E tests..."
    npm run test:e2e
    
    log "Frontend tests completed successfully"
}

# Performance Tests
run_performance_tests() {
    log "Running performance tests..."
    
    cd "$(dirname "$0")/.."
    
    # Backend performance tests
    log "Running backend performance benchmarks..."
    go test -bench=. -benchmem ./internal/services/... > performance-results.txt
    
    # Frontend performance tests
    cd frontend/vanilla
    npm run test:performance
    
    log "Performance tests completed"
}

# Security Tests
run_security_tests() {
    log "Running security tests..."
    
    # Backend security scan
    log "Running gosec security scan..."
    if command -v gosec &> /dev/null; then
        gosec ./...
    else
        warn "gosec not found, installing..."
        go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest
        gosec ./...
    fi
    
    # Frontend security scan
    cd frontend/vanilla
    npm audit
    
    log "Security tests completed"
}

# Integration Tests
run_integration_tests() {
    log "Running integration tests..."
    
    # Start test environment
    log "Starting test environment..."
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services
    log "Waiting for services to be ready..."
    sleep 30
    
    # Run integration tests
    cd "$(dirname "$0")/.."
    go test -v -tags=integration ./test/integration/...
    
    # Cleanup
    docker-compose -f docker-compose.test.yml down
    
    log "Integration tests completed"
}

# All Tests
run_all_tests() {
    log "Running complete test suite..."
    
    run_backend_tests
    run_frontend_tests
    run_integration_tests
    run_performance_tests
    run_security_tests
    
    log "All tests completed successfully!"
}

# Test Report Generation
generate_report() {
    log "Generating test report..."
    
    cd "$(dirname "$0")/.."
    
    # Create report directory
    mkdir -p test-reports
    
    # Generate combined report
    cat > test-reports/summary.md << EOF
# Test Suite Summary

## Backend Tests
- Coverage: $(go tool cover -func=coverage-backend.out | grep total | awk '{print $3}')
- Tests: $(go test ./... 2>&1 | grep -o '[0-9]\+ tests' | awk '{sum += $1} END {print sum}')
- Passed: ✅

## Frontend Tests
- Coverage: ${FRONTEND_COVERAGE:-N/A}%
- Tests: $(cd frontend/vanilla && npm test -- --silent --json | jq '.numTotalTests')
- Passed: ✅

## Performance Tests
- Backend benchmarks: ✅
- Frontend benchmarks: ✅

## Security Tests
- Backend scan: ✅
- Frontend audit: ✅

Generated: $(date)
EOF
    
    log "Test report generated: test-reports/summary.md"
}

# Main execution
main() {
    check_requirements
    
    case "${1:-all}" in
        "backend")
            run_backend_tests
            ;;
        "frontend")
            run_frontend_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "security")
            run_security_tests
            ;;
        "all")
            run_all_tests
            generate_report
            ;;
        *)
            echo "Usage: $0 [backend|frontend|integration|performance|security|all]"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
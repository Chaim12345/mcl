#!/bin/sh

# Health check script for the Go application
# This script is used by Docker health checks

set -e

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/health}"
TIMEOUT="${TIMEOUT:-3}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# Function to check health endpoint
check_health() {
    if command -v curl >/dev/null 2>&1; then
        curl -f -s --max-time "$TIMEOUT" "$HEALTH_URL" >/dev/null
    elif command -v wget >/dev/null 2>&1; then
        wget --quiet --timeout="$TIMEOUT" --tries=1 --spider "$HEALTH_URL"
    else
        echo "Neither curl nor wget is available for health check"
        exit 1
    fi
}

# Retry logic
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
    if check_health; then
        echo "Health check passed"
        exit 0
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $MAX_RETRIES ]; then
        echo "Health check failed, retrying... ($retry_count/$MAX_RETRIES)"
        sleep 1
    fi
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1
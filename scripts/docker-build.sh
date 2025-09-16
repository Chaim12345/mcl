#!/bin/bash

# Docker build script for the Go/Vanilla Project Management Platform

set -e

# Configuration
IMAGE_NAME="${IMAGE_NAME:-pm-app}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
TAG="${TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
    exit 1
fi

# Build arguments
BUILD_ARGS=""
if [ -n "$BUILD_ARG_VERSION" ]; then
    BUILD_ARGS="$BUILD_ARGS --build-arg VERSION=$BUILD_ARG_VERSION"
fi

if [ -n "$BUILD_ARG_GIT_COMMIT" ]; then
    BUILD_ARGS="$BUILD_ARGS --build-arg GIT_COMMIT=$BUILD_ARG_GIT_COMMIT"
fi

# Build the image
log_info "Building Docker image: $IMAGE_NAME:$TAG"
log_info "Build context: $BUILD_CONTEXT"
log_info "Dockerfile: $DOCKERFILE"

if [ -n "$BUILD_ARGS" ]; then
    log_info "Build args: $BUILD_ARGS"
fi

docker build \
    -t "$IMAGE_NAME:$TAG" \
    -f "$DOCKERFILE" \
    $BUILD_ARGS \
    "$BUILD_CONTEXT"

if [ $? -eq 0 ]; then
    log_info "Successfully built $IMAGE_NAME:$TAG"
    
    # Show image size
    IMAGE_SIZE=$(docker images "$IMAGE_NAME:$TAG" --format "table {{.Size}}" | tail -n 1)
    log_info "Image size: $IMAGE_SIZE"
    
    # Tag as latest if not already
    if [ "$TAG" != "latest" ]; then
        docker tag "$IMAGE_NAME:$TAG" "$IMAGE_NAME:latest"
        log_info "Tagged as $IMAGE_NAME:latest"
    fi
else
    log_error "Failed to build $IMAGE_NAME:$TAG"
    exit 1
fi

# Optional: Run security scan if trivy is available
if command -v trivy &> /dev/null; then
    log_info "Running security scan with Trivy..."
    trivy image "$IMAGE_NAME:$TAG"
fi

log_info "Build completed successfully!"
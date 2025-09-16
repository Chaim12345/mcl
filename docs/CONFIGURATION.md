# Configuration Guide

## Overview

This document provides comprehensive configuration options for the Project Management Platform. The application supports multiple configuration methods including environment variables, configuration files, and command-line arguments.

## Configuration Methods

### 1. Environment Variables (Recommended)

Environment variables are the primary configuration method, especially for production deployments.

```bash
# Create .env file
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Configuration File

Alternative JSON-based configuration:

```json
{
  "server": {
    "port": 8080,
    "host": "localhost",
    "environment": "development"
  },
  "database": {
    "uri": "mongodb://localhost:27017",
    "name": "project_management",
    "timeout": "10s"
  }
}
```

### 3. Command Line Arguments

Override specific settings:

```bash
go run cmd/server/main.go -port=8080 -env=production
```

## Server Configuration

### Basic Server Settings

```env
# Server Configuration
PORT=8080                    # Server port (default: 8080)
HOST=localhost               # Server host (default: localhost)
ENV=development              # Environment: development, staging, production
DEBUG=true                   # Enable debug mode (default: false)
```

### Advanced Server Settings

```env
# Timeouts
READ_TIMEOUT=30s             # HTTP read timeout
WRITE_TIMEOUT=30s            # HTTP write timeout
IDLE_TIMEOUT=120s            # HTTP idle timeout
SHUTDOWN_TIMEOUT=30s         # Graceful shutdown timeout

# TLS Configuration (Production)
TLS_ENABLED=true             # Enable HTTPS
TLS_CERT_FILE=/path/to/cert.pem
TLS_KEY_FILE=/path/to/key.pem
TLS_MIN_VERSION=1.2          # Minimum TLS version

# HTTP/2 Support
HTTP2_ENABLED=true           # Enable HTTP/2 (default: true)
```

## Database Configuration

### MongoDB Settings

```env
# Basic MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=project_management
MONGODB_TIMEOUT=10s

# Authentication
MONGODB_USERNAME=pm_user
MONGODB_PASSWORD=secure_password
MONGODB_AUTH_SOURCE=admin

# Connection Pool
MONGODB_MIN_POOL_SIZE=5      # Minimum connections
MONGODB_MAX_POOL_SIZE=100    # Maximum connections
MONGODB_MAX_IDLE_TIME=30m    # Connection idle timeout

# Advanced Options
MONGODB_REPLICA_SET=rs0      # Replica set name
MONGODB_READ_PREFERENCE=primary  # Read preference
MONGODB_WRITE_CONCERN=majority   # Write concern
```

### Connection String Examples

```env
# Local development
MONGODB_URI=mongodb://localhost:27017/project_management

# With authentication
MONGODB_URI=mongodb://user:password@localhost:27017/project_management?authSource=admin

# Replica set
MONGODB_URI=mongodb://host1:27017,host2:27017,host3:27017/project_management?replicaSet=rs0

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/project_management?retryWrites=true&w=majority
```

## Authentication Configuration

### JWT Settings

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256           # Signing algorithm
JWT_EXPIRY=15m               # Access token expiry
REFRESH_TOKEN_EXPIRY=7d      # Refresh token expiry
JWT_ISSUER=project-management-platform
JWT_AUDIENCE=api-users

# Token Security
JWT_REQUIRE_HTTPS=true       # Require HTTPS for tokens (production)
JWT_SECURE_COOKIES=true      # Use secure cookies
JWT_SAME_SITE=strict         # SameSite cookie attribute
```

### Session Configuration

```env
# Session Management
SESSION_SECRET=your-session-secret-key
SESSION_NAME=pm_session      # Session cookie name
SESSION_MAX_AGE=24h          # Session duration
SESSION_SECURE=true          # Secure cookies (HTTPS only)
SESSION_HTTP_ONLY=true       # HttpOnly cookies
SESSION_SAME_SITE=strict     # SameSite attribute
```

### Password Policy

```env
# Password Requirements
PASSWORD_MIN_LENGTH=8        # Minimum password length
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=false
PASSWORD_MAX_AGE=90d         # Password expiry (0 = never)
PASSWORD_HISTORY_COUNT=5     # Remember last N passwords
```

## Security Configuration

### CORS Settings

```env
# CORS Configuration
CORS_ENABLED=true
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization,X-Requested-With
CORS_CREDENTIALS=true        # Allow credentials
CORS_MAX_AGE=86400          # Preflight cache duration
```

### Rate Limiting

```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100      # Requests per window
RATE_LIMIT_WINDOW=1m         # Time window
RATE_LIMIT_BURST=10          # Burst allowance

# Per-endpoint limits
AUTH_RATE_LIMIT=5            # Auth endpoints
SEARCH_RATE_LIMIT=50         # Search endpoints
UPLOAD_RATE_LIMIT=10         # File upload endpoints
```

### Content Security Policy

```env
# CSP Configuration
CSP_ENABLED=true
CSP_DEFAULT_SRC='self'
CSP_SCRIPT_SRC='self' 'unsafe-inline'
CSP_STYLE_SRC='self' 'unsafe-inline'
CSP_IMG_SRC='self' data: https:
CSP_FONT_SRC='self'
CSP_CONNECT_SRC='self'
CSP_REPORT_URI=/api/csp-report
```

### Security Headers

```env
# Security Headers
HSTS_ENABLED=true            # HTTP Strict Transport Security
HSTS_MAX_AGE=31536000        # HSTS max age (1 year)
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true

X_FRAME_OPTIONS=DENY         # Clickjacking protection
X_CONTENT_TYPE_OPTIONS=nosniff
X_XSS_PROTECTION=1; mode=block
REFERRER_POLICY=strict-origin-when-cross-origin
```

## Email Configuration

### SMTP Settings

```env
# Email Configuration
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_ENCRYPTION=tls          # tls, ssl, or none

# Email Settings
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=Project Management Platform
REPLY_TO_EMAIL=support@your-domain.com

# Email Templates
EMAIL_TEMPLATE_DIR=./templates/email
EMAIL_LOGO_URL=https://your-domain.com/logo.png
```

### Email Providers

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_ENCRYPTION=tls
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-ses-username
SMTP_PASSWORD=your-ses-password
```

## Logging Configuration

### Log Settings

```env
# Logging Configuration
LOG_LEVEL=info               # debug, info, warn, error
LOG_FORMAT=json              # json, text
LOG_OUTPUT=stdout            # stdout, stderr, file
LOG_FILE=/var/log/pm-platform.log

# Structured Logging
LOG_INCLUDE_CALLER=true      # Include file:line in logs
LOG_INCLUDE_TIMESTAMP=true   # Include timestamp
LOG_TIMEZONE=UTC             # Log timezone

# Log Rotation (if LOG_OUTPUT=file)
LOG_MAX_SIZE=100MB           # Max file size
LOG_MAX_BACKUPS=5            # Number of backup files
LOG_MAX_AGE=30               # Days to keep logs
LOG_COMPRESS=true            # Compress old logs
```

### Log Levels

- **debug**: Detailed information for debugging
- **info**: General information about application flow
- **warn**: Warning messages for potential issues
- **error**: Error messages for failures

### Structured Logging Example

```json
{
  "level": "info",
  "timestamp": "2024-01-01T12:00:00Z",
  "caller": "handlers/auth.go:45",
  "message": "User login successful",
  "user_id": "507f1f77bcf86cd799439011",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

## File Upload Configuration

### Upload Settings

```env
# File Upload Configuration
UPLOAD_ENABLED=true
UPLOAD_PATH=./uploads        # Local storage path
MAX_FILE_SIZE=10MB           # Maximum file size
MAX_FILES_PER_REQUEST=5      # Maximum files per upload

# Allowed file types
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt,csv
ALLOWED_MIME_TYPES=image/*,application/pdf,text/*

# Storage Configuration
STORAGE_TYPE=local           # local, s3, gcs
STORAGE_PUBLIC_URL=https://your-domain.com/uploads
```

### AWS S3 Configuration

```env
# S3 Storage
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_PREFIX=uploads/           # Optional prefix
S3_PUBLIC_READ=false         # Make uploads public
```

### Google Cloud Storage

```env
# GCS Storage
STORAGE_TYPE=gcs
GCS_PROJECT_ID=your-project-id
GCS_BUCKET=your-bucket-name
GCS_CREDENTIALS_FILE=/path/to/credentials.json
```

## Cache Configuration

### In-Memory Cache

```env
# Cache Configuration
CACHE_ENABLED=true
CACHE_TYPE=memory            # memory, redis
CACHE_TTL=5m                 # Default TTL
CACHE_CLEANUP_INTERVAL=10m   # Cleanup interval
CACHE_MAX_SIZE=100MB         # Maximum cache size
```

### Redis Cache

```env
# Redis Configuration
CACHE_TYPE=redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0                   # Redis database number
REDIS_POOL_SIZE=10           # Connection pool size
REDIS_TIMEOUT=5s             # Connection timeout
```

## Monitoring Configuration

### Health Checks

```env
# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
READINESS_CHECK_PATH=/health/ready
LIVENESS_CHECK_PATH=/health/live

# Health Check Timeouts
DB_HEALTH_TIMEOUT=5s         # Database health check timeout
EXTERNAL_SERVICE_TIMEOUT=3s  # External service timeout
```

### Metrics

```env
# Metrics Configuration
METRICS_ENABLED=true
METRICS_PATH=/metrics
METRICS_NAMESPACE=pm_platform
METRICS_SUBSYSTEM=api

# Prometheus Configuration
PROMETHEUS_ENABLED=true
PROMETHEUS_PUSH_GATEWAY=http://localhost:9091
PROMETHEUS_JOB_NAME=pm-platform
```

### Tracing

```env
# Distributed Tracing
TRACING_ENABLED=true
TRACING_SERVICE_NAME=pm-platform
JAEGER_ENDPOINT=http://localhost:14268/api/traces
JAEGER_SAMPLER_TYPE=const
JAEGER_SAMPLER_PARAM=1
```

## Environment-Specific Configurations

### Development Environment

```env
# Development Settings
ENV=development
DEBUG=true
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
TLS_ENABLED=false
JWT_REQUIRE_HTTPS=false
SESSION_SECURE=false
```

### Staging Environment

```env
# Staging Settings
ENV=staging
DEBUG=false
LOG_LEVEL=info
TLS_ENABLED=true
JWT_REQUIRE_HTTPS=true
SESSION_SECURE=true
CORS_ORIGINS=https://staging.your-domain.com
```

### Production Environment

```env
# Production Settings
ENV=production
DEBUG=false
LOG_LEVEL=warn
TLS_ENABLED=true
JWT_REQUIRE_HTTPS=true
SESSION_SECURE=true
HSTS_ENABLED=true
CSP_ENABLED=true
RATE_LIMIT_ENABLED=true
CORS_ORIGINS=https://your-domain.com
```

## Docker Configuration

### Docker Environment

```env
# Docker-specific settings
DOCKER_ENV=true
HOST=0.0.0.0                 # Bind to all interfaces
MONGODB_URI=mongodb://mongodb:27017/project_management
REDIS_URL=redis://redis:6379
```

### Docker Compose Override

Create `docker-compose.override.yml` for local customizations:

```yaml
version: '3.8'
services:
  app:
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    ports:
      - "8080:8080"
    volumes:
      - ./uploads:/app/uploads
```

## Configuration Validation

### Required Variables

The application validates these required variables on startup:

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`

### Optional Variables

Optional variables have sensible defaults:

- `HOST`: localhost
- `ENV`: development
- `LOG_LEVEL`: info
- `CACHE_TTL`: 5m

### Validation Errors

Common validation errors:

```
Error: MONGODB_URI is required
Error: JWT_SECRET must be at least 32 characters
Error: PORT must be a valid number between 1 and 65535
Error: LOG_LEVEL must be one of: debug, info, warn, error
```

## Configuration Best Practices

### Security

1. **Never commit secrets** to version control
2. **Use strong JWT secrets** (32+ characters)
3. **Enable HTTPS** in production
4. **Set secure cookie attributes**
5. **Configure CORS** restrictively

### Performance

1. **Tune connection pools** based on load
2. **Configure appropriate timeouts**
3. **Enable caching** for frequently accessed data
4. **Set reasonable rate limits**

### Monitoring

1. **Enable structured logging**
2. **Configure health checks**
3. **Set up metrics collection**
4. **Enable distributed tracing**

### Environment Management

1. **Use different configs** per environment
2. **Validate configuration** on startup
3. **Document all variables**
4. **Use configuration management tools**

## Troubleshooting Configuration

### Common Issues

#### 1. Database Connection Failed
```
Error: failed to connect to MongoDB
```
**Solution**: Check `MONGODB_URI`, ensure MongoDB is running

#### 2. JWT Token Invalid
```
Error: invalid JWT secret
```
**Solution**: Ensure `JWT_SECRET` is set and at least 32 characters

#### 3. CORS Errors
```
Error: CORS policy blocked request
```
**Solution**: Add your frontend URL to `CORS_ORIGINS`

#### 4. File Upload Failed
```
Error: file too large
```
**Solution**: Increase `MAX_FILE_SIZE` or check file type restrictions

### Configuration Debugging

Enable debug logging to troubleshoot configuration issues:

```env
DEBUG=true
LOG_LEVEL=debug
```

Check configuration loading:

```bash
# Validate configuration
go run cmd/server/main.go -validate-config

# Print current configuration
go run cmd/server/main.go -print-config
```

## Configuration Templates

### Minimal Configuration

```env
# Minimal .env for development
MONGODB_URI=mongodb://localhost:27017/project_management
JWT_SECRET=your-super-secret-jwt-key-change-in-production-must-be-32-chars-minimum
PORT=8080
```

### Production Configuration Template

```env
# Production .env template
ENV=production
PORT=8080
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/project_management
MONGODB_TIMEOUT=10s

# Security
JWT_SECRET=your-production-jwt-secret-key-must-be-very-secure-and-long
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
TLS_ENABLED=true
TLS_CERT_FILE=/etc/ssl/certs/cert.pem
TLS_KEY_FILE=/etc/ssl/private/key.pem

# CORS
CORS_ORIGINS=https://your-domain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_OUTPUT=file
LOG_FILE=/var/log/pm-platform.log

# Email
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
FROM_EMAIL=noreply@your-domain.com

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
```

## Support

For configuration support:
- **Documentation**: This guide
- **Examples**: `.env.example` file
- **Issues**: GitHub Issues
- **Email**: config-support@your-domain.com
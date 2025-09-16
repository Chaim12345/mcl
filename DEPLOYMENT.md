# Deployment Guide

This guide covers deployment options for the Go/Vanilla Project Management Platform.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Environment](#development-environment)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Docker Configuration](#docker-configuration)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd project-management-platform
```

2. Start the development environment:
```bash
make docker-dev
```

3. Access the application:
- Application: http://localhost:8080
- Health check: http://localhost:8080/health

### Production Setup

1. Configure environment variables (see [Environment Variables](#environment-variables))

2. Start production environment:
```bash
make docker-prod
```

3. Access the application:
- Application: http://localhost (via nginx)
- Health check: http://localhost/health

## Development Environment

### Architecture

The development environment consists of:
- **MongoDB**: Database server (port 27017)
- **Go Application**: Backend with vanilla frontend (port 8080)

### Starting Development Environment

```bash
# Start with logs
make docker-dev

# Start in background
make docker-dev-detached

# Stop environment
make docker-stop
```

### Development Features

- **Hot Reloading**: Code changes automatically restart the server using Air
- **Volume Mounting**: Source code is mounted for live editing
- **Debug Mode**: Gin runs in debug mode with detailed logging

### Development Configuration

The development environment uses these default settings:
- MongoDB: `mongodb://root:password@mongodb:27017/project_management_dev?authSource=admin`
- JWT Secret: `your_super_secret_key_change_me_in_production` (change in production!)
- SMTP: Pre-configured test credentials

## Production Deployment

### Architecture

The production environment consists of:
- **MongoDB**: Database server with authentication
- **Go Application**: Backend with vanilla frontend
- **Nginx**: Reverse proxy with SSL termination, caching, and security headers

### Production Setup

1. **Create environment file**:
```bash
cp .env.example .env
```

2. **Configure environment variables** (see [Environment Variables](#environment-variables))

3. **Deploy**:
```bash
# Build and start
make docker-prod

# Or start in background
make docker-prod-detached
```

### SSL/HTTPS Configuration

To enable HTTPS in production:

1. **Obtain SSL certificates** and place them in `nginx/ssl/`:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key

2. **Uncomment HTTPS server block** in `nginx/nginx.conf`

3. **Update environment variables**:
   - Set your domain name in nginx configuration
   - Configure proper CORS origins

### Production Optimizations

- **Multi-stage Docker build** for minimal image size
- **Non-root user** for security
- **Health checks** for container orchestration
- **Nginx caching** for static assets
- **Rate limiting** for API endpoints
- **Security headers** for protection
- **Gzip compression** for performance

## Environment Variables

### Required Variables

Create a `.env` file with these variables:

```bash
# Database Configuration
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=your_secure_password_here
MONGO_DATABASE=project_management

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here_at_least_32_characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=168h

# Email Configuration
SMTP_HOST=your.smtp.server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
FROM_ADDRESS=noreply@yourdomain.com
```

### Optional Variables

```bash
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
ENVIRONMENT=production

# Database Configuration
DATABASE_URI=mongodb://root:password@mongodb:27017/project_management?authSource=admin
DATABASE_NAME=project_management
```

### Security Notes

- **Never commit `.env` files** to version control
- **Use strong passwords** for database and JWT secrets
- **Rotate secrets regularly** in production
- **Use environment-specific configurations**

## Docker Configuration

### Images

- **Production Image**: Multi-stage build with minimal Alpine Linux base
- **Development Image**: Includes development tools and hot reloading

### Volumes

#### Development
- Source code mounted for live editing
- MongoDB data persisted in named volume

#### Production
- MongoDB data persisted in named volume
- No source code mounting for security

### Networks

All services communicate through a custom Docker network (`pm-network`) for isolation.

### Health Checks

All services include health checks:
- **MongoDB**: Connection test using mongosh
- **Application**: HTTP health endpoint
- **Nginx**: HTTP health endpoint proxy

## Monitoring and Health Checks

### Health Endpoints

- **Application Health**: `GET /health`
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
  ```

### Docker Health Checks

Health checks are configured for all services:

```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect <container_name> | grep -A 10 Health
```

### Monitoring Integration

The application is ready for monitoring integration:
- **Structured JSON logging** for log aggregation
- **Health check endpoints** for uptime monitoring
- **Prometheus metrics** (can be added)
- **Distributed tracing** (can be added)

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed

**Symptoms**: Application fails to start with MongoDB connection error

**Solutions**:
```bash
# Check MongoDB container status
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Verify connection string in environment variables
echo $DATABASE_URI
```

#### 2. Port Already in Use

**Symptoms**: `bind: address already in use`

**Solutions**:
```bash
# Find process using port
lsof -i :8080

# Stop existing containers
make docker-stop

# Clean up all containers
make docker-clean
```

#### 3. Permission Denied

**Symptoms**: Permission errors in container

**Solutions**:
```bash
# Check file permissions
ls -la

# Fix ownership (if needed)
sudo chown -R $USER:$USER .

# Rebuild containers
docker-compose build --no-cache
```

#### 4. Static Files Not Loading

**Symptoms**: CSS/JS files return 404

**Solutions**:
```bash
# Check if frontend files exist
ls -la frontend/vanilla/

# Verify nginx configuration
docker-compose exec nginx nginx -t

# Check nginx logs
docker-compose logs nginx
```

### Debugging

#### Application Logs

```bash
# View application logs
docker-compose logs app

# Follow logs in real-time
docker-compose logs -f app

# View specific service logs
docker-compose logs mongodb
docker-compose logs nginx
```

#### Container Shell Access

```bash
# Access application container
docker-compose exec app sh

# Access MongoDB container
docker-compose exec mongodb mongosh

# Access nginx container
docker-compose exec nginx sh
```

#### Database Debugging

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh -u root -p password

# List databases
show dbs

# Use project database
use project_management_dev

# List collections
show collections
```

### Performance Tuning

#### MongoDB Optimization

```bash
# Check MongoDB performance
docker-compose exec mongodb mongostat

# Check database indexes
docker-compose exec mongodb mongosh -u root -p password --eval "db.items.getIndexes()"
```

#### Application Optimization

```bash
# Check memory usage
docker stats

# Profile Go application (add pprof endpoints)
go tool pprof http://localhost:8080/debug/pprof/heap
```

### Backup and Recovery

#### Database Backup

```bash
# Create backup
docker-compose exec mongodb mongodump --uri="mongodb://root:password@localhost:27017/project_management?authSource=admin" --out=/backup

# Restore backup
docker-compose exec mongodb mongorestore --uri="mongodb://root:password@localhost:27017/project_management?authSource=admin" /backup/project_management
```

## Support

For additional support:
1. Check the application logs
2. Review this deployment guide
3. Check the project documentation
4. Open an issue in the project repository

## Security Checklist

Before deploying to production:

- [ ] Change default passwords and secrets
- [ ] Configure HTTPS with valid SSL certificates
- [ ] Set up proper firewall rules
- [ ] Enable MongoDB authentication
- [ ] Configure rate limiting
- [ ] Set up log monitoring
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Monitor for security vulnerabilities
- [ ] Review and test disaster recovery procedures
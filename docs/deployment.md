# Project Management Platform - Deployment Guide

## Overview

This guide covers deployment strategies for the Project Management Platform, from local development to production environments. The application is containerized using Docker and orchestrated with Docker Compose, making it easy to deploy across different environments.

## Deployment Architecture

### Production Architecture Diagram

```mermaid
graph TB
    subgraph "Load Balancer / CDN"
        LB[Load Balancer]
        CDN[CDN / Static Assets]
    end
    
    subgraph "Web Layer"
        NGINX[Nginx Reverse Proxy]
    end
    
    subgraph "Application Layer"
        APP1[App Instance 1]
        APP2[App Instance 2]
        APP3[App Instance N]
    end
    
    subgraph "Database Layer"
        MONGO_PRIMARY[MongoDB Primary]
        MONGO_SECONDARY[MongoDB Secondary]
        MONGO_ARBITER[MongoDB Arbiter]
    end
    
    subgraph "Caching Layer"
        REDIS[Redis Cache]
    end
    
    subgraph "Monitoring"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana]
        ALERTS[AlertManager]
    end
    
    Internet --> LB
    LB --> NGINX
    CDN --> Internet
    NGINX --> APP1
    NGINX --> APP2
    NGINX --> APP3
    APP1 --> MONGO_PRIMARY
    APP2 --> MONGO_PRIMARY
    APP3 --> MONGO_PRIMARY
    APP1 --> REDIS
    APP2 --> REDIS
    APP3 --> REDIS
    
    MONGO_PRIMARY --> MONGO_SECONDARY
    MONGO_PRIMARY --> MONGO_ARBITER
    
    PROMETHEUS --> APP1
    PROMETHEUS --> APP2
    PROMETHEUS --> APP3
    PROMETHEUS --> MONGO_PRIMARY
    GRAFANA --> PROMETHEUS
    ALERTS --> PROMETHEUS
```

## Environment Types

### 1. Development Environment

**Purpose**: Local development with hot reload and debugging capabilities

**Components**:
- Go backend with live reload (Air)
- Vanilla JavaScript frontend served by Go
- MongoDB container
- Redis container (optional)

**Characteristics**:
- Hot reload enabled
- Debug logging
- Development database
- No SSL/TLS
- Exposed ports for debugging

### 2. Staging Environment

**Purpose**: Pre-production testing and validation

**Components**:
- Production-like setup
- Nginx reverse proxy
- Application containers
- Database with production-like data
- SSL certificates (Let's Encrypt)

**Characteristics**:
- Production configuration
- SSL enabled
- Monitoring enabled
- Performance testing
- User acceptance testing

### 3. Production Environment

**Purpose**: Live application serving real users

**Components**:
- Load balancer (AWS ALB, Cloudflare, etc.)
- Nginx reverse proxy
- Multiple application instances
- MongoDB replica set
- Redis cluster
- Monitoring stack
- Backup systems

**Characteristics**:
- High availability
- Auto-scaling
- SSL/TLS encryption
- Comprehensive monitoring
- Automated backups
- Security hardening

## Development Deployment

### Prerequisites

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Go**: 1.21+
- **Node.js**: 18+ (for frontend development)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd project-management-platform

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Or use the development script
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh start
```

### Development Configuration

**docker-compose.dev.yml**:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: pm-mongodb-dev
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: project_management_dev
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: pm-app-dev
    ports:
      - "8080:8080"
    depends_on:
      mongodb:
        condition: service_healthy
    volumes:
      - ./internal:/app/internal
      - ./cmd:/app/cmd
      - ./frontend/vanilla:/app/frontend/vanilla
    environment:
      - GIN_MODE=debug
      - DATABASE_URI=mongodb://root:password@mongodb:27017/project_management_dev?authSource=admin
      - JWT_SECRET=your_super_secret_key_change_me_in_production
      - ENVIRONMENT=development
    restart: unless-stopped
```

### Development Commands

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up -d --build

# Clean up volumes
docker-compose -f docker-compose.dev.yml down -v
```

## Production Deployment

### Prerequisites

- **Server**: Linux (Ubuntu 20.04+ recommended)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Domain**: Registered domain with DNS configured
- **SSL Certificate**: Let's Encrypt or commercial certificate

### Production Setup

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y nginx certbot python3-certbot-nginx htop curl wget
```

#### 2. Environment Configuration

Create production environment file:

```bash
# Create .env.prod file
cat > .env.prod << EOF
# Database Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=$(openssl rand -base64 32)
MONGO_DATABASE=project_management

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 64)
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=168h

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_ADDRESS=noreply@yourdomain.com

# Application Configuration
ENVIRONMENT=production
EOF
```

#### 3. SSL Certificate Setup

```bash
# Obtain SSL certificate with Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Create SSL directory for Docker
sudo mkdir -p /opt/project-management/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/project-management/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/project-management/nginx/ssl/
```

#### 4. Production Deployment

```bash
# Clone repository
git clone <repository-url> /opt/project-management
cd /opt/project-management

# Copy environment file
cp .env.prod .env

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

### Production Configuration

**docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: pm-mongodb-prod
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_DATABASE}
    volumes:
      - mongodb_data_prod:/data/db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pm-app-prod
    environment:
      DATABASE_URI: mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/${MONGO_DATABASE}?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      ENVIRONMENT: production
    depends_on:
      mongodb:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: pm-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      app:
        condition: service_healthy
    restart: unless-stopped
```

## Container Configuration

### Application Dockerfile

**Multi-stage build for optimal production image**:

```dockerfile
# Builder stage
FROM golang:alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -o main ./cmd/server

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy binary and assets
COPY --from=builder /app/main .
COPY --from=builder /app/frontend/vanilla ./frontend/vanilla
COPY --from=builder /app/config ./config

# Change ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./main"]
```

### Nginx Configuration

**Production Nginx setup**:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        image/svg+xml;

    upstream app {
        server app:8080;
        keepalive 32;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        client_max_body_size 10M;

        # Health check
        location /health {
            proxy_pass http://app/health;
            access_log off;
        }

        # Auth routes with rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files with caching
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # All other routes
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Cloud Deployment

### AWS Deployment

#### 1. ECS with Fargate

```yaml
# ecs-task-definition.json
{
  "family": "project-management-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-ecr-repo/project-management:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URI",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-uri"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/project-management",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --spider http://localhost:8080/health"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### 2. EKS Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: project-management-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: project-management
  template:
    metadata:
      labels:
        app: project-management
    spec:
      containers:
      - name: app
        image: your-registry/project-management:latest
        ports:
        - containerPort: 8080
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: DATABASE_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: project-management-service
spec:
  selector:
    app: project-management
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

### Google Cloud Platform

#### Cloud Run Deployment

```bash
# Build and push to Container Registry
docker build -t gcr.io/PROJECT_ID/project-management:latest .
docker push gcr.io/PROJECT_ID/project-management:latest

# Deploy to Cloud Run
gcloud run deploy project-management \
  --image gcr.io/PROJECT_ID/project-management:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production \
  --set-secrets DATABASE_URI=database-uri:latest \
  --set-secrets JWT_SECRET=jwt-secret:latest \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 100 \
  --max-instances 10
```

### Digital Ocean

#### App Platform Deployment

```yaml
# .do/app.yaml
name: project-management
services:
- name: api
  source_dir: /
  github:
    repo: your-username/project-management-platform
    branch: main
  run_command: ./main
  build_command: go build -o main ./cmd/server
  environment_slug: go
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: ENVIRONMENT
    value: production
  - key: DATABASE_URI
    value: ${DATABASE_URI}
    type: SECRET
  - key: JWT_SECRET
    value: ${JWT_SECRET}
    type: SECRET
  health_check:
    http_path: /health
  http_port: 8080
  routes:
  - path: /
databases:
- name: mongodb
  engine: MONGODB
  version: "5"
  size: basic-xs
```

## Monitoring and Observability

### Health Checks

The application provides multiple health check endpoints:

```go
// Basic health check
GET /health
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0"
}

// Readiness check (includes database connectivity)
GET /health/ready
{
  "status": "ready",
  "checks": {
    "database": "healthy",
    "redis": "healthy"
  }
}

// Liveness check
GET /health/live
{
  "status": "alive"
}
```

### Metrics Collection

```bash
# Prometheus metrics endpoint
GET /metrics/prometheus

# Custom metrics endpoint
GET /metrics
{
  "requests_total": 1234,
  "requests_duration_ms": 45.2,
  "active_connections": 12,
  "database_queries_total": 5678
}
```

### Logging

**Structured logging with context**:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "message": "User login successful",
  "request_id": "req-123456",
  "user_id": "507f1f77bcf86cd799439011",
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "duration_ms": 234
}
```

### Docker Compose Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboard.json:/var/lib/grafana/dashboards/dashboard.json
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  prometheus_data:
  grafana_data:
```

## Backup and Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/opt/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pm_backup_$DATE"

# Create backup
docker exec pm-mongodb-prod mongodump \
  --host localhost:27017 \
  --username admin \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --out /tmp/$BACKUP_NAME

# Copy backup from container
docker cp pm-mongodb-prod:/tmp/$BACKUP_NAME $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR/$BACKUP_NAME.tar.gz -C $BACKUP_DIR $BACKUP_NAME
rm -rf $BACKUP_DIR/$BACKUP_NAME

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/$BACKUP_NAME.tar.gz s3://your-backup-bucket/mongodb/

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_NAME.tar.gz"
```

### Automated Backup with Cron

```bash
# Add to crontab
0 2 * * * /opt/project-management/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Recovery Process

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop app

# Restore database
docker exec -i pm-mongodb-prod mongorestore \
  --host localhost:27017 \
  --username admin \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --drop \
  /tmp/backup_directory

# Start application
docker-compose -f docker-compose.prod.yml start app
```

## Security Considerations

### Container Security

1. **Non-root User**: Containers run as non-root user
2. **Minimal Base Image**: Using Alpine Linux for smaller attack surface
3. **Security Scanning**: Regular vulnerability scans
4. **Secret Management**: Using Docker secrets or external secret managers

### Network Security

1. **Reverse Proxy**: Nginx handles SSL termination and security headers
2. **Rate Limiting**: API and authentication endpoint protection
3. **CORS Configuration**: Proper cross-origin resource sharing setup
4. **Security Headers**: HSTS, CSP, X-Frame-Options, etc.

### Database Security

1. **Authentication**: MongoDB authentication enabled
2. **Encryption**: TLS encryption for database connections
3. **Network Isolation**: Database not exposed to public internet
4. **Regular Updates**: Keep database version updated

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check container logs
docker-compose logs app

# Check container status
docker-compose ps

# Check resource usage
docker stats

# Rebuild container
docker-compose build --no-cache app
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
docker exec -it pm-mongodb-prod mongosh \
  --username admin \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin

# Check database logs
docker-compose logs mongodb

# Verify network connectivity
docker exec app ping mongodb
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/fullchain.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew

# Test SSL configuration
curl -I https://yourdomain.com
```

#### 4. Performance Issues

```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:8080/metrics

# Monitor database performance
docker exec pm-mongodb-prod mongostat

# Check Nginx access logs
docker-compose logs nginx | grep "GET\|POST"
```

### Debugging Commands

```bash
# Enter running container
docker exec -it pm-app-prod /bin/sh

# View application logs
docker-compose logs -f app

# Check environment variables
docker exec pm-app-prod env

# Test health endpoints
curl http://localhost:8080/health
curl http://localhost:8080/health/ready
curl http://localhost:8080/health/live

# Monitor real-time logs
docker-compose logs -f --tail=100
```

## Maintenance

### Regular Maintenance Tasks

1. **Security Updates**: Regular OS and dependency updates
2. **Certificate Renewal**: Automated SSL certificate renewal
3. **Database Maintenance**: Index optimization, cleanup
4. **Log Rotation**: Prevent log files from growing too large
5. **Backup Verification**: Regular backup restoration tests
6. **Performance Monitoring**: Resource usage and optimization

### Update Process

```bash
# 1. Backup current state
./scripts/backup.sh

# 2. Pull latest code
git pull origin main

# 3. Build new images
docker-compose -f docker-compose.prod.yml build

# 4. Rolling update (zero downtime)
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# 5. Verify deployment
curl https://yourdomain.com/health

# 6. Rollback if needed
docker-compose -f docker-compose.prod.yml rollback
```

This comprehensive deployment guide provides everything needed to deploy the Project Management Platform from development to production environments with proper security, monitoring, and maintenance procedures.

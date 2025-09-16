# Deployment Guide - Project Management Platform

This guide covers deploying the Go/Vanilla JavaScript project management platform in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Production Deployment](#production-deployment)
4. [Monitoring Setup](#monitoring-setup)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Backup and Recovery](#backup-and-recovery)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: Minimum 20GB free space
- **Network**: Ports 80, 443, 3000, 9090, 9093 available

### Software Dependencies

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Environment Configuration

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
# Database Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password_here
MONGO_DATABASE=project_management

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=168h

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
FROM_ADDRESS=noreply@yourdomain.com

# Monitoring Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_grafana_password
```

## Production Deployment

### 1. Build and Deploy

```bash
# Clone the repository
git clone <repository-url>
cd project-management-platform

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Create Docker network
docker network create pm-network

# Deploy the application
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### 2. Health Check Verification

```bash
# Check application health
curl http://localhost/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "uptime": "5m30s",
  "components": {
    "database": {
      "status": "healthy",
      "details": {
        "duration_ms": 15
      }
    }
  }
}
```

## Monitoring Setup

### 1. Deploy Monitoring Stack

```bash
# Deploy monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify monitoring services
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Access Monitoring Dashboards

- **Grafana**: http://your-domain:3000 (admin/your_grafana_password)
- **Prometheus**: http://your-domain:9090
- **AlertManager**: http://your-domain:9093

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Common causes:
# - Database connection issues
# - Missing environment variables
# - Port conflicts
```

#### 2. Database Connection Issues

```bash
# Check MongoDB logs
docker-compose -f docker-compose.prod.yml logs mongodb

# Test connection
docker exec pm-mongodb-prod mongosh --eval "db.adminCommand('ping')"
```

## Security Checklist

- [ ] Environment variables are properly secured
- [ ] SSL/TLS certificates are valid and up-to-date
- [ ] Database has strong authentication
- [ ] Firewall rules are configured
- [ ] Regular security updates are applied
- [ ] Monitoring and alerting are active
- [ ] Backup and recovery procedures are tested
- [ ] Access logs are monitored
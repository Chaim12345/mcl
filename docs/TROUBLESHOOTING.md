# Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with the Project Management Platform. It covers both user-facing problems and system-level issues.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Authentication Issues](#authentication-issues)
3. [Database Problems](#database-problems)
4. [Performance Issues](#performance-issues)
5. [Frontend Problems](#frontend-problems)
6. [API Issues](#api-issues)
7. [Security Problems](#security-problems)
8. [Deployment Issues](#deployment-issues)
9. [Emergency Procedures](#emergency-procedures)

## Quick Diagnostics

### Health Check Commands

```bash
# Basic application health
curl http://localhost:8080/health

# Database connectivity
curl http://localhost:8080/health/ready

# System resources
curl http://localhost:8080/health/live

# Application metrics
curl http://localhost:8080/metrics
```

### Log Analysis

```bash
# View recent logs
tail -f /var/log/pm-platform.log

# Search for errors
grep -i "error" /var/log/pm-platform.log | tail -20

# Check specific time range
grep "2024-01-01T1[0-2]:" /var/log/pm-platform.log

# Monitor real-time errors
tail -f /var/log/pm-platform.log | grep -i "error"
```

### System Status

```bash
# Check service status
systemctl status pm-platform

# Check process
ps aux | grep pm-platform

# Check ports
netstat -tlnp | grep :8080

# Check disk space
df -h

# Check memory usage
free -h
```

## Authentication Issues

### Problem: Cannot Login

#### Symptoms
- "Invalid credentials" error with correct password
- Login page redirects back to itself
- Token expired errors immediately after login

#### Diagnosis
```bash
# Check user exists in database
mongosh project_management --eval "db.users.findOne({email: 'user@example.com'})"

# Check JWT configuration
grep JWT_ .env

# Check authentication logs
grep "auth" /var/log/pm-platform.log | tail -10
```

#### Solutions

1. **Password Reset**
   ```bash
   # Generate password reset token
   go run cmd/admin/main.go reset-password --email user@example.com
   ```

2. **JWT Secret Issues**
   ```bash
   # Verify JWT secret is set and long enough
   echo $JWT_SECRET | wc -c  # Should be > 32
   
   # Regenerate JWT secret if needed
   openssl rand -base64 32
   ```

3. **Database Connection**
   ```bash
   # Test database connection
   mongosh $MONGODB_URI --eval "db.adminCommand('ismaster')"
   ```

### Problem: Session Expires Too Quickly

#### Symptoms
- Users logged out frequently
- "Token expired" errors during normal use

#### Solutions
```bash
# Increase token expiry time
# In .env file:
JWT_EXPIRY=60m
REFRESH_TOKEN_EXPIRY=30d

# Restart application
systemctl restart pm-platform
```

### Problem: Cannot Access Workspace

#### Symptoms
- "Forbidden" errors when accessing workspace
- User can login but sees no workspaces

#### Diagnosis
```bash
# Check user workspace membership
mongosh project_management --eval "
db.workspaces.find({
  'members.user_id': ObjectId('USER_ID')
})"

# Check user permissions
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/workspaces
```

#### Solutions
```bash
# Add user to workspace
mongosh project_management --eval "
db.workspaces.updateOne(
  {_id: ObjectId('WORKSPACE_ID')},
  {\$push: {members: {
    user_id: ObjectId('USER_ID'),
    role: 'member',
    joined_at: new Date()
  }}}
)"
```

## Database Problems

### Problem: Database Connection Failed

#### Symptoms
- Application fails to start
- "Connection refused" errors
- Timeout errors

#### Diagnosis
```bash
# Check MongoDB status
systemctl status mongod

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh --eval "db.adminCommand('ismaster')"

# Check network connectivity
telnet localhost 27017
```

#### Solutions

1. **Start MongoDB**
   ```bash
   # Start MongoDB service
   systemctl start mongod
   
   # Enable auto-start
   systemctl enable mongod
   ```

2. **Fix Configuration**
   ```bash
   # Check MongoDB configuration
   cat /etc/mongod.conf
   
   # Verify data directory permissions
   ls -la /var/lib/mongodb
   chown -R mongodb:mongodb /var/lib/mongodb
   ```

3. **Repair Database**
   ```bash
   # Stop MongoDB
   systemctl stop mongod
   
   # Repair database
   mongod --repair --dbpath /var/lib/mongodb
   
   # Start MongoDB
   systemctl start mongod
   ```

### Problem: Slow Database Queries

#### Symptoms
- Application responds slowly
- Timeout errors
- High CPU usage on database server

#### Diagnosis
```bash
# Enable profiling for slow queries
mongosh project_management --eval "db.setProfilingLevel(1, {slowms: 100})"

# Check slow queries
mongosh project_management --eval "db.system.profile.find({millis: {\$gt: 100}}).sort({ts: -1}).limit(5)"

# Check index usage
mongosh project_management --eval "db.items.aggregate([{\$indexStats: {}}])"
```

#### Solutions

1. **Add Missing Indexes**
   ```bash
   # Run index optimization
   go run cmd/admin/main.go optimize-indexes
   
   # Or manually add indexes
   mongosh project_management --eval "
   db.items.createIndex({board_id: 1, status: 1});
   db.items.createIndex({assignee_id: 1, due_date: 1});
   db.comments.createIndex({item_id: 1, created_at: -1});
   "
   ```

2. **Optimize Queries**
   ```bash
   # Analyze query performance
   go run cmd/admin/main.go analyze-queries --slow-threshold 100ms
   ```

### Problem: Database Disk Space Full

#### Symptoms
- "No space left on device" errors
- Database writes fail
- Application becomes read-only

#### Solutions
```bash
# Check disk usage
df -h

# Clean up old logs
find /var/log -name "*.log" -mtime +30 -delete

# Compact database
mongosh project_management --eval "db.runCommand({compact: 'items'})"

# Archive old data
go run cmd/admin/main.go archive-data --older-than 1year
```

## Performance Issues

### Problem: High Memory Usage

#### Symptoms
- Application becomes slow
- Out of memory errors
- System becomes unresponsive

#### Diagnosis
```bash
# Check memory usage
free -h
top -p $(pgrep pm-platform)

# Generate memory profile
go tool pprof http://localhost:8080/debug/pprof/heap

# Check for memory leaks
curl http://localhost:8080/debug/pprof/heap > heap1.prof
# Wait 5 minutes
curl http://localhost:8080/debug/pprof/heap > heap2.prof
go tool pprof -base heap1.prof heap2.prof
```

#### Solutions

1. **Restart Application**
   ```bash
   systemctl restart pm-platform
   ```

2. **Increase Memory Limits**
   ```bash
   # Edit systemd service
   sudo systemctl edit pm-platform
   
   [Service]
   Environment=GOMEMLIMIT=2GiB
   
   # Reload and restart
   systemctl daemon-reload
   systemctl restart pm-platform
   ```

3. **Optimize Garbage Collection**
   ```bash
   # Tune GC settings
   export GOGC=50
   export GOMEMLIMIT=1GiB
   ```

### Problem: High CPU Usage

#### Symptoms
- System becomes slow
- High load average
- Application timeouts

#### Diagnosis
```bash
# Check CPU usage
top
htop

# Generate CPU profile
go tool pprof http://localhost:8080/debug/pprof/profile?seconds=30

# Check for infinite loops
curl http://localhost:8080/debug/pprof/goroutine
```

#### Solutions

1. **Identify Bottlenecks**
   ```bash
   # Analyze CPU profile
   go tool pprof -http=:8081 cpu.prof
   ```

2. **Scale Application**
   ```bash
   # Using Docker Compose
   docker-compose up --scale app=3
   
   # Using systemd (multiple instances)
   systemctl start pm-platform@8081
   systemctl start pm-platform@8082
   ```

### Problem: Slow Response Times

#### Symptoms
- Pages load slowly
- API requests timeout
- Users complain about performance

#### Diagnosis
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/workspaces

# Monitor metrics
curl http://localhost:8080/metrics | grep http_request_duration

# Check database performance
mongosh project_management --eval "db.serverStatus().opcounters"
```

#### Solutions

1. **Enable Caching**
   ```bash
   # Configure Redis cache
   CACHE_ENABLED=true
   CACHE_TYPE=redis
   REDIS_URL=redis://localhost:6379
   CACHE_TTL=5m
   ```

2. **Optimize Database**
   ```bash
   # Add indexes for common queries
   go run cmd/admin/main.go optimize-indexes
   
   # Enable query caching
   mongosh project_management --eval "db.adminCommand({planCacheClear: 'items'})"
   ```

3. **Use CDN for Static Assets**
   ```nginx
   # Nginx configuration
   location /static/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

## Frontend Problems

### Problem: JavaScript Errors

#### Symptoms
- Blank pages
- Features not working
- Console errors in browser

#### Diagnosis
```bash
# Check browser console (F12)
# Look for JavaScript errors

# Check network tab for failed requests
# Verify API endpoints are accessible

# Check application logs
grep "frontend" /var/log/pm-platform.log
```

#### Solutions

1. **Clear Browser Cache**
   ```bash
   # Hard refresh: Ctrl+F5 or Cmd+Shift+R
   # Clear cache and cookies for the site
   ```

2. **Check Static File Serving**
   ```bash
   # Verify static files are accessible
   curl http://localhost:8080/static/js/main.js
   curl http://localhost:8080/static/css/main.css
   ```

3. **Update Browser**
   ```bash
   # Ensure browser supports ES6+ features
   # Check browser compatibility
   ```

### Problem: CORS Errors

#### Symptoms
- "CORS policy" errors in browser console
- API requests fail from frontend
- Cross-origin request blocked

#### Solutions
```bash
# Configure CORS in .env
CORS_ENABLED=true
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true

# Restart application
systemctl restart pm-platform
```

### Problem: Authentication Not Working in Frontend

#### Symptoms
- Login form submits but doesn't redirect
- "Unauthorized" errors after login
- Token not being sent with requests

#### Diagnosis
```bash
# Check browser storage
# Open DevTools → Application → Local Storage
# Verify tokens are stored

# Check network requests
# Verify Authorization header is sent
```

#### Solutions

1. **Check Token Storage**
   ```javascript
   // In browser console
   localStorage.getItem('access_token')
   localStorage.getItem('refresh_token')
   ```

2. **Verify API Client Configuration**
   ```javascript
   // Check API base URL
   console.log(api.baseURL)
   
   // Check token in requests
   console.log(api.defaults.headers.Authorization)
   ```

## API Issues

### Problem: API Endpoints Not Responding

#### Symptoms
- 404 errors for API endpoints
- Connection refused errors
- Timeout errors

#### Diagnosis
```bash
# Check if server is running
curl http://localhost:8080/health

# Check specific endpoint
curl -v http://localhost:8080/api/workspaces

# Check server logs
grep "api" /var/log/pm-platform.log | tail -10
```

#### Solutions

1. **Verify Server is Running**
   ```bash
   systemctl status pm-platform
   systemctl start pm-platform
   ```

2. **Check Route Configuration**
   ```bash
   # Verify routes are registered
   curl http://localhost:8080/debug/routes
   ```

3. **Check Firewall**
   ```bash
   # Check if port is open
   netstat -tlnp | grep :8080
   
   # Open port if needed
   ufw allow 8080
   ```

### Problem: API Returns 500 Errors

#### Symptoms
- Internal server errors
- "Something went wrong" messages
- API requests fail unexpectedly

#### Diagnosis
```bash
# Check application logs
grep "error" /var/log/pm-platform.log | tail -20

# Check stack traces
grep -A 10 "panic" /var/log/pm-platform.log

# Test with curl
curl -v -H "Content-Type: application/json" \
     -d '{"test": "data"}' \
     http://localhost:8080/api/test
```

#### Solutions

1. **Check Database Connection**
   ```bash
   mongosh $MONGODB_URI --eval "db.adminCommand('ismaster')"
   ```

2. **Validate Input Data**
   ```bash
   # Check request validation
   curl -v -H "Content-Type: application/json" \
        -d '{"invalid": "data"}' \
        http://localhost:8080/api/workspaces
   ```

3. **Restart Application**
   ```bash
   systemctl restart pm-platform
   ```

### Problem: API Rate Limiting

#### Symptoms
- "Too many requests" errors
- 429 HTTP status codes
- Requests blocked after certain threshold

#### Solutions
```bash
# Adjust rate limits in .env
RATE_LIMIT_REQUESTS=200
RATE_LIMIT_WINDOW=1m

# Check current rate limit status
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/admin/rate-limit-stats

# Reset rate limits for specific IP
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8080/api/admin/rate-limit/reset/192.168.1.100
```

## Security Problems

### Problem: SSL/TLS Certificate Issues

#### Symptoms
- "Certificate not trusted" warnings
- HTTPS connections fail
- Mixed content warnings

#### Solutions

1. **Check Certificate Validity**
   ```bash
   # Check certificate expiration
   openssl x509 -in cert.pem -text -noout | grep "Not After"
   
   # Test SSL connection
   openssl s_client -connect your-domain.com:443
   ```

2. **Renew Certificate**
   ```bash
   # Using Let's Encrypt
   certbot renew
   
   # Restart web server
   systemctl restart nginx
   ```

3. **Fix Certificate Chain**
   ```bash
   # Verify certificate chain
   openssl verify -CAfile ca-bundle.crt cert.pem
   ```

### Problem: CSRF Token Errors

#### Symptoms
- "CSRF token mismatch" errors
- Form submissions fail
- API requests rejected

#### Solutions
```bash
# Check CSRF configuration
grep CSRF_ .env

# Verify CSRF token in requests
curl -v -H "X-CSRF-Token: token" \
     -H "Content-Type: application/json" \
     -d '{"data": "test"}' \
     http://localhost:8080/api/test
```

### Problem: Unauthorized Access

#### Symptoms
- Users accessing resources they shouldn't
- Permission errors not working correctly
- Privilege escalation

#### Diagnosis
```bash
# Check user permissions
mongosh project_management --eval "
db.users.findOne({_id: ObjectId('USER_ID')}, {role: 1, permissions: 1})
"

# Check workspace membership
mongosh project_management --eval "
db.workspaces.find({'members.user_id': ObjectId('USER_ID')})
"

# Audit access logs
grep "unauthorized" /var/log/pm-platform.log
```

#### Solutions

1. **Review User Permissions**
   ```bash
   # Update user role
   mongosh project_management --eval "
   db.users.updateOne(
     {_id: ObjectId('USER_ID')},
     {\$set: {role: 'member'}}
   )"
   ```

2. **Check Authorization Middleware**
   ```bash
   # Verify middleware is applied to routes
   grep -r "RequireAuth" internal/handlers/
   ```

## Deployment Issues

### Problem: Docker Container Won't Start

#### Symptoms
- Container exits immediately
- "Container failed to start" errors
- Application not accessible

#### Diagnosis
```bash
# Check container status
docker ps -a

# Check container logs
docker logs pm-platform

# Check Docker Compose logs
docker-compose logs app
```

#### Solutions

1. **Check Environment Variables**
   ```bash
   # Verify .env file exists and is readable
   cat .env
   
   # Check Docker environment
   docker exec pm-platform env | grep MONGODB_URI
   ```

2. **Fix Volume Mounts**
   ```bash
   # Check volume permissions
   ls -la ./uploads
   chown -R 1000:1000 ./uploads
   ```

3. **Rebuild Container**
   ```bash
   # Rebuild with no cache
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Problem: Load Balancer Issues

#### Symptoms
- Intermittent connection failures
- Some requests work, others don't
- Health checks failing

#### Solutions

1. **Check Health Endpoints**
   ```bash
   # Test health endpoints
   curl http://app1:8080/health
   curl http://app2:8080/health
   ```

2. **Verify Load Balancer Configuration**
   ```nginx
   # Nginx upstream configuration
   upstream pm-platform {
       server app1:8080 max_fails=3 fail_timeout=30s;
       server app2:8080 max_fails=3 fail_timeout=30s;
   }
   ```

3. **Check Session Affinity**
   ```nginx
   # Add session persistence if needed
   upstream pm-platform {
       ip_hash;
       server app1:8080;
       server app2:8080;
   }
   ```

## Emergency Procedures

### System Recovery

#### Complete System Failure

1. **Immediate Actions**
   ```bash
   # Check system status
   systemctl status pm-platform mongod nginx
   
   # Check system resources
   df -h
   free -h
   top
   ```

2. **Recovery Steps**
   ```bash
   # Stop all services
   systemctl stop pm-platform nginx
   
   # Check and repair file system if needed
   fsck /dev/sda1
   
   # Restore from backup if necessary
   mongorestore --drop /backups/latest/
   
   # Start services
   systemctl start mongod
   systemctl start pm-platform
   systemctl start nginx
   ```

#### Data Corruption

1. **Detect Corruption**
   ```bash
   # Check database integrity
   mongosh project_management --eval "db.runCommand({validate: 'users'})"
   
   # Check application data consistency
   go run cmd/admin/main.go verify-data
   ```

2. **Recovery Actions**
   ```bash
   # Stop application
   systemctl stop pm-platform
   
   # Restore from latest backup
   mongorestore --drop /backups/latest/
   
   # Verify restoration
   go run cmd/admin/main.go verify-data
   
   # Start application
   systemctl start pm-platform
   ```

### Contact Information

#### Emergency Contacts

- **System Administrator**: admin@your-domain.com
- **Database Administrator**: dba@your-domain.com  
- **Security Team**: security@your-domain.com
- **On-call Engineer**: +1-555-0123

#### Escalation Matrix

1. **Level 1**: Basic troubleshooting, service restarts
2. **Level 2**: Database issues, performance problems
3. **Level 3**: Security incidents, data corruption
4. **Level 4**: Complete system failure, disaster recovery

### Support Bundle Creation

```bash
# Create comprehensive support bundle
go run cmd/admin/main.go support-bundle \
  --include-logs \
  --include-config \
  --include-metrics \
  --output support-$(date +%Y%m%d-%H%M%S).tar.gz

# Manual support bundle
mkdir support-bundle
cp .env support-bundle/
cp /var/log/pm-platform.log support-bundle/
curl http://localhost:8080/metrics > support-bundle/metrics.txt
systemctl status pm-platform > support-bundle/service-status.txt
df -h > support-bundle/disk-usage.txt
free -h > support-bundle/memory-usage.txt
tar -czf support-bundle.tar.gz support-bundle/
```

## Prevention and Monitoring

### Proactive Monitoring

1. **Set Up Alerts**
   ```bash
   # Configure monitoring alerts
   # - High error rate (>1%)
   # - High response time (>500ms)
   # - Low disk space (<10%)
   # - High memory usage (>80%)
   # - Database connection failures
   ```

2. **Regular Health Checks**
   ```bash
   # Daily health check script
   #!/bin/bash
   curl -f http://localhost:8080/health || echo "Health check failed"
   curl -f http://localhost:8080/health/ready || echo "Readiness check failed"
   ```

3. **Automated Backups**
   ```bash
   # Ensure backups are running
   crontab -l | grep backup
   
   # Test backup restoration monthly
   /scripts/test-backup-restore.sh
   ```

### Best Practices

1. **Regular Maintenance**
   - Update dependencies monthly
   - Review and rotate logs weekly
   - Monitor disk space daily
   - Test backup restoration monthly

2. **Documentation**
   - Keep runbooks updated
   - Document all configuration changes
   - Maintain contact information
   - Record lessons learned from incidents

3. **Training**
   - Train team on emergency procedures
   - Practice disaster recovery scenarios
   - Keep troubleshooting skills current
   - Share knowledge across team

## Conclusion

This troubleshooting guide covers the most common issues you may encounter with the Project Management Platform. Remember to:

1. **Start with basics**: Check logs, system resources, and service status
2. **Follow systematic approach**: Diagnose before attempting fixes
3. **Document solutions**: Record what worked for future reference
4. **Escalate when needed**: Don't hesitate to contact support for complex issues
5. **Learn from incidents**: Update procedures based on experience

For issues not covered in this guide, check the system logs, contact your administrator, or reach out to the development team for assistance.
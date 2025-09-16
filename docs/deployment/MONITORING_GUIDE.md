# Monitoring and Observability Guide

This guide covers the comprehensive monitoring setup for the project management platform.

## Overview

The monitoring stack includes:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert handling and notifications
- **Loki**: Log aggregation
- **Promtail**: Log shipping
- **Node Exporter**: System metrics
- **MongoDB Exporter**: Database metrics

## Architecture

```
Application → Prometheus → Grafana
     ↓           ↓
   Logs → Loki → Grafana
     ↓
AlertManager → Notifications
```

## Metrics Collection

### Application Metrics

The application exposes metrics at `/metrics` endpoint:

```go
// Custom metrics examples
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
        },
        []string{"method", "endpoint"},
    )
)
```

### Database Metrics

MongoDB metrics are collected via the MongoDB Exporter:

- Connection pool status
- Operation counters
- Memory usage
- Index usage statistics
- Replication lag (if applicable)

### System Metrics

Node Exporter provides system-level metrics:

- CPU usage
- Memory usage
- Disk I/O
- Network statistics
- File system usage

## Dashboards

### Application Dashboard

Key metrics to monitor:

1. **Request Rate**: Requests per second
2. **Response Time**: P50, P95, P99 latencies
3. **Error Rate**: 4xx and 5xx error percentages
4. **Throughput**: Data processed per second

### Database Dashboard

MongoDB-specific metrics:

1. **Operations**: Insert, update, delete, query rates
2. **Connections**: Active connections, available connections
3. **Memory**: Resident memory, virtual memory
4. **Storage**: Data size, index size, storage engine metrics

### System Dashboard

Infrastructure metrics:

1. **CPU**: Usage percentage, load average
2. **Memory**: Used, available, swap usage
3. **Disk**: Usage, I/O operations, read/write rates
4. **Network**: Bytes sent/received, packet rates

## Alerting Rules

### Critical Alerts

```yaml
groups:
  - name: critical_alerts
    rules:
      - alert: ApplicationDown
        expr: up{job="project-management-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Application is down"
          description: "The application has been down for more than 1 minute"

      - alert: DatabaseDown
        expr: up{job="mongodb"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "MongoDB has been down for more than 30 seconds"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
```

### Warning Alerts

```yaml
  - name: warning_alerts
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage"
          description: "Disk usage is {{ $value | humanizePercentage }}"
```

## Log Management

### Log Levels

The application uses structured logging with these levels:

- **ERROR**: Application errors, failed requests
- **WARN**: Warnings, deprecated features
- **INFO**: General information, request logs
- **DEBUG**: Detailed debugging information

### Log Format

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "message": "Request processed",
  "method": "GET",
  "path": "/api/workspaces",
  "status": 200,
  "duration_ms": 45,
  "user_id": "user123",
  "request_id": "req-456"
}
```

### Log Aggregation

Loki collects logs from all services:

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*.log
```

## Performance Monitoring

### Key Performance Indicators (KPIs)

1. **Availability**: Uptime percentage (target: 99.9%)
2. **Response Time**: Average response time (target: <200ms)
3. **Throughput**: Requests per second
4. **Error Rate**: Percentage of failed requests (target: <1%)

### SLA Monitoring

```yaml
# SLA alert rules
- alert: SLAViolation
  expr: |
    (
      sum(rate(http_requests_total{status!~"5.."}[30d])) /
      sum(rate(http_requests_total[30d]))
    ) < 0.999
  labels:
    severity: critical
  annotations:
    summary: "SLA violation: Availability below 99.9%"
    description: "30-day availability is {{ $value | humanizePercentage }}"
```

## Notification Channels

### Slack Integration

```yaml
# alertmanager.yml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

### Email Notifications

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@company.com'
        from: 'alerts@company.com'
        smarthost: 'smtp.company.com:587'
        auth_username: 'alerts@company.com'
        auth_password: 'password'
        subject: 'Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
```

## Troubleshooting

### Common Issues

1. **Metrics not appearing**: Check Prometheus targets
2. **Alerts not firing**: Verify alert rules syntax
3. **Dashboard not loading**: Check Grafana data sources
4. **High cardinality**: Review metric labels

### Debugging Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query metrics
curl 'http://localhost:9090/api/v1/query?query=up'

# Check AlertManager status
curl http://localhost:9093/api/v1/status

# View Grafana logs
docker logs pm-grafana
```

## Best Practices

1. **Metric Naming**: Use consistent naming conventions
2. **Label Usage**: Keep cardinality low, use meaningful labels
3. **Alert Fatigue**: Avoid too many alerts, focus on actionable ones
4. **Dashboard Design**: Keep dashboards focused and readable
5. **Data Retention**: Configure appropriate retention policies
6. **Security**: Secure monitoring endpoints and dashboards

## Maintenance

### Regular Tasks

1. **Update Dashboards**: Keep dashboards current with application changes
2. **Review Alerts**: Regularly review and tune alert rules
3. **Clean Up Metrics**: Remove unused metrics to reduce storage
4. **Backup Configuration**: Backup Grafana dashboards and Prometheus config
5. **Monitor Storage**: Ensure adequate storage for metrics and logs

### Capacity Planning

Monitor these metrics for capacity planning:

- Prometheus storage usage
- Grafana database size
- Log volume growth
- Query performance
- Resource utilization trends
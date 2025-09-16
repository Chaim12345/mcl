package monitoring

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// MetricsCollector collects application metrics
type MetricsCollector struct {
	requestCount    map[string]int64
	requestDuration map[string][]time.Duration
	errorCount      map[string]int64
	activeUsers     map[string]time.Time
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		requestCount:    make(map[string]int64),
		requestDuration: make(map[string][]time.Duration),
		errorCount:      make(map[string]int64),
		activeUsers:     make(map[string]time.Time),
	}
}

// RecordRequest records a request metric
func (m *MetricsCollector) RecordRequest(method, path string, statusCode int, duration time.Duration) {
	key := method + " " + path
	m.requestCount[key]++
	m.requestDuration[key] = append(m.requestDuration[key], duration)

	if statusCode >= 400 {
		errorKey := key + " " + strconv.Itoa(statusCode)
		m.errorCount[errorKey]++
	}
}

// RecordActiveUser records an active user
func (m *MetricsCollector) RecordActiveUser(userID string) {
	m.activeUsers[userID] = time.Now()
}

// GetMetrics returns collected metrics
func (m *MetricsCollector) GetMetrics() map[string]interface{} {
	// Clean up old active users (older than 5 minutes)
	cutoff := time.Now().Add(-5 * time.Minute)
	for userID, lastSeen := range m.activeUsers {
		if lastSeen.Before(cutoff) {
			delete(m.activeUsers, userID)
		}
	}

	metrics := map[string]interface{}{
		"requests":          m.requestCount,
		"errors":            m.errorCount,
		"active_users":      len(m.activeUsers),
		"request_durations": m.calculateDurationStats(),
	}

	return metrics
}

// calculateDurationStats calculates duration statistics
func (m *MetricsCollector) calculateDurationStats() map[string]interface{} {
	stats := make(map[string]interface{})

	for endpoint, durations := range m.requestDuration {
		if len(durations) == 0 {
			continue
		}

		var total time.Duration
		min := durations[0]
		max := durations[0]

		for _, d := range durations {
			total += d
			if d < min {
				min = d
			}
			if d > max {
				max = d
			}
		}

		avg := total / time.Duration(len(durations))

		stats[endpoint] = map[string]interface{}{
			"count":  len(durations),
			"avg_ms": avg.Milliseconds(),
			"min_ms": min.Milliseconds(),
			"max_ms": max.Milliseconds(),
		}
	}

	return stats
}

// MetricsMiddleware creates a middleware for collecting metrics
func (m *MetricsCollector) MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		duration := time.Since(start)
		m.RecordRequest(c.Request.Method, c.Request.URL.Path, c.Writer.Status(), duration)

		// Record active user if authenticated
		if userID := c.GetString("user_id"); userID != "" {
			m.RecordActiveUser(userID)
		}
	}
}

// PrometheusMetrics provides Prometheus-compatible metrics
type PrometheusMetrics struct {
	collector *MetricsCollector
}

// NewPrometheusMetrics creates a new Prometheus metrics provider
func NewPrometheusMetrics(collector *MetricsCollector) *PrometheusMetrics {
	return &PrometheusMetrics{
		collector: collector,
	}
}

// Handler returns a Gin handler for Prometheus metrics
func (p *PrometheusMetrics) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		metrics := p.collector.GetMetrics()

		// Convert to Prometheus format
		prometheusMetrics := p.convertToPrometheusFormat(metrics)

		c.Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		c.String(200, prometheusMetrics)
	}
}

// convertToPrometheusFormat converts metrics to Prometheus format
func (p *PrometheusMetrics) convertToPrometheusFormat(metrics map[string]interface{}) string {
	var output string

	// Request count metrics
	if requests, ok := metrics["requests"].(map[string]int64); ok {
		output += "# HELP http_requests_total Total number of HTTP requests\n"
		output += "# TYPE http_requests_total counter\n"
		for endpoint, count := range requests {
			output += "http_requests_total{endpoint=\"" + endpoint + "\"} " + strconv.FormatInt(count, 10) + "\n"
		}
	}

	// Error count metrics
	if errors, ok := metrics["errors"].(map[string]int64); ok {
		output += "# HELP http_errors_total Total number of HTTP errors\n"
		output += "# TYPE http_errors_total counter\n"
		for endpoint, count := range errors {
			output += "http_errors_total{endpoint=\"" + endpoint + "\"} " + strconv.FormatInt(count, 10) + "\n"
		}
	}

	// Active users metric
	if activeUsers, ok := metrics["active_users"].(int); ok {
		output += "# HELP active_users_current Current number of active users\n"
		output += "# TYPE active_users_current gauge\n"
		output += "active_users_current " + strconv.Itoa(activeUsers) + "\n"
	}

	// Request duration metrics
	if durations, ok := metrics["request_durations"].(map[string]interface{}); ok {
		output += "# HELP http_request_duration_milliseconds HTTP request duration in milliseconds\n"
		output += "# TYPE http_request_duration_milliseconds histogram\n"
		for endpoint, stats := range durations {
			if statsMap, ok := stats.(map[string]interface{}); ok {
				if avg, ok := statsMap["avg_ms"].(int64); ok {
					output += "http_request_duration_milliseconds{endpoint=\"" + endpoint + "\",quantile=\"0.5\"} " + strconv.FormatInt(avg, 10) + "\n"
				}
				if min, ok := statsMap["min_ms"].(int64); ok {
					output += "http_request_duration_milliseconds{endpoint=\"" + endpoint + "\",quantile=\"0.0\"} " + strconv.FormatInt(min, 10) + "\n"
				}
				if max, ok := statsMap["max_ms"].(int64); ok {
					output += "http_request_duration_milliseconds{endpoint=\"" + endpoint + "\",quantile=\"1.0\"} " + strconv.FormatInt(max, 10) + "\n"
				}
			}
		}
	}

	return output
}

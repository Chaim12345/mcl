package services

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// QueryMetrics represents performance metrics for a query
type QueryMetrics struct {
	QueryType       string        `json:"queryType"`
	Collection      string        `json:"collection"`
	Operation       string        `json:"operation"`
	Duration        time.Duration `json:"duration"`
	DocumentsRead   int64         `json:"documentsRead"`
	DocumentsReturned int64       `json:"documentsReturned"`
	IndexesUsed     []string      `json:"indexesUsed"`
	ExecutionStats  bson.M        `json:"executionStats,omitempty"`
	Timestamp       time.Time     `json:"timestamp"`
	QueryHash       string        `json:"queryHash"`
}

// QueryPerformanceMonitor tracks and analyzes query performance
type QueryPerformanceMonitor struct {
	db              *mongo.Database
	logger          *log.Logger
	metrics         []QueryMetrics
	metricsMutex    sync.RWMutex
	maxMetrics      int
	slowQueryThreshold time.Duration
	alertCallback   func(QueryMetrics)
}

// NewQueryPerformanceMonitor creates a new query performance monitor
func NewQueryPerformanceMonitor(db *mongo.Database, logger *log.Logger) *QueryPerformanceMonitor {
	return &QueryPerformanceMonitor{
		db:                 db,
		logger:             logger,
		metrics:            make([]QueryMetrics, 0),
		maxMetrics:         1000, // Keep last 1000 queries
		slowQueryThreshold: 100 * time.Millisecond,
	}
}

// SetSlowQueryThreshold sets the threshold for slow query alerts
func (qpm *QueryPerformanceMonitor) SetSlowQueryThreshold(threshold time.Duration) {
	qpm.slowQueryThreshold = threshold
}

// SetAlertCallback sets a callback function for slow query alerts
func (qpm *QueryPerformanceMonitor) SetAlertCallback(callback func(QueryMetrics)) {
	qpm.alertCallback = callback
}

// TrackQuery tracks a query's performance metrics
func (qpm *QueryPerformanceMonitor) TrackQuery(ctx context.Context, collection, operation string, filter bson.M, duration time.Duration) {
	// Get query execution stats
	stats, err := qpm.getQueryExecutionStats(ctx, collection, filter)
	if err != nil {
		qpm.logger.Printf("Failed to get execution stats for query: %v", err)
		stats = bson.M{}
	}

	metrics := QueryMetrics{
		QueryType:         qpm.classifyQuery(operation, filter),
		Collection:        collection,
		Operation:         operation,
		Duration:          duration,
		DocumentsRead:     qpm.extractDocumentsRead(stats),
		DocumentsReturned: qpm.extractDocumentsReturned(stats),
		IndexesUsed:       qpm.extractIndexesUsed(stats),
		ExecutionStats:    stats,
		Timestamp:         time.Now(),
		QueryHash:         qpm.generateQueryHash(collection, operation, filter),
	}

	qpm.recordMetrics(metrics)

	// Check for slow queries
	if duration > qpm.slowQueryThreshold {
		qpm.handleSlowQuery(metrics)
	}
}

// recordMetrics stores query metrics
func (qpm *QueryPerformanceMonitor) recordMetrics(metrics QueryMetrics) {
	qpm.metricsMutex.Lock()
	defer qpm.metricsMutex.Unlock()

	qpm.metrics = append(qpm.metrics, metrics)

	// Keep only the most recent metrics
	if len(qpm.metrics) > qpm.maxMetrics {
		qpm.metrics = qpm.metrics[len(qpm.metrics)-qpm.maxMetrics:]
	}
}

// getQueryExecutionStats gets detailed execution statistics for a query
func (qpm *QueryPerformanceMonitor) getQueryExecutionStats(ctx context.Context, collectionName string, filter bson.M) (bson.M, error) {
	collection := qpm.db.Collection(collectionName)

	// Use explain to get execution stats
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	// For now, return empty stats - in production you'd use MongoDB's explain functionality
	return bson.M{}, nil
}

// classifyQuery classifies the type of query for better analysis
func (qpm *QueryPerformanceMonitor) classifyQuery(operation string, filter bson.M) string {
	switch operation {
	case "find":
		if len(filter) == 0 {
			return "full_scan"
		}
		if _, hasText := filter["$text"]; hasText {
			return "text_search"
		}
		if _, hasID := filter["_id"]; hasID {
			return "id_lookup"
		}
		return "filtered_find"
	case "aggregate":
		return "aggregation"
	case "count":
		return "count"
	case "insert":
		return "insert"
	case "update":
		return "update"
	case "delete":
		return "delete"
	default:
		return "other"
	}
}

// generateQueryHash generates a hash for similar queries
func (qpm *QueryPerformanceMonitor) generateQueryHash(collection, operation string, filter bson.M) string {
	// Simplified hash generation - in production you'd want a more sophisticated approach
	return fmt.Sprintf("%s_%s_%d", collection, operation, len(filter))
}

// extractDocumentsRead extracts the number of documents read from execution stats
func (qpm *QueryPerformanceMonitor) extractDocumentsRead(stats bson.M) int64 {
	if executionStats, ok := stats["executionStats"].(bson.M); ok {
		if examined, ok := executionStats["totalDocsExamined"].(int64); ok {
			return examined
		}
	}
	return 0
}

// extractDocumentsReturned extracts the number of documents returned from execution stats
func (qpm *QueryPerformanceMonitor) extractDocumentsReturned(stats bson.M) int64 {
	if executionStats, ok := stats["executionStats"].(bson.M); ok {
		if returned, ok := executionStats["totalDocsReturned"].(int64); ok {
			return returned
		}
	}
	return 0
}

// extractIndexesUsed extracts the indexes used from execution stats
func (qpm *QueryPerformanceMonitor) extractIndexesUsed(stats bson.M) []string {
	var indexes []string
	// This would be implemented based on MongoDB's explain output structure
	return indexes
}

// handleSlowQuery handles slow query detection and alerting
func (qpm *QueryPerformanceMonitor) handleSlowQuery(metrics QueryMetrics) {
	qpm.logger.Printf("SLOW QUERY DETECTED: %s.%s took %v (threshold: %v)",
		metrics.Collection, metrics.Operation, metrics.Duration, qpm.slowQueryThreshold)

	if qpm.alertCallback != nil {
		qpm.alertCallback(metrics)
	}
}

// GetMetrics returns recent query metrics
func (qpm *QueryPerformanceMonitor) GetMetrics(limit int) []QueryMetrics {
	qpm.metricsMutex.RLock()
	defer qpm.metricsMutex.RUnlock()

	if limit <= 0 || limit > len(qpm.metrics) {
		limit = len(qpm.metrics)
	}

	// Return the most recent metrics
	start := len(qpm.metrics) - limit
	if start < 0 {
		start = 0
	}

	result := make([]QueryMetrics, limit)
	copy(result, qpm.metrics[start:])
	return result
}

// GetSlowQueries returns queries that exceeded the slow query threshold
func (qpm *QueryPerformanceMonitor) GetSlowQueries(since time.Time) []QueryMetrics {
	qpm.metricsMutex.RLock()
	defer qpm.metricsMutex.RUnlock()

	var slowQueries []QueryMetrics
	for _, metric := range qpm.metrics {
		if metric.Timestamp.After(since) && metric.Duration > qpm.slowQueryThreshold {
			slowQueries = append(slowQueries, metric)
		}
	}

	return slowQueries
}

// GetPerformanceReport generates a performance analysis report
func (qpm *QueryPerformanceMonitor) GetPerformanceReport(since time.Time) *PerformanceReport {
	qpm.metricsMutex.RLock()
	defer qpm.metricsMutex.RUnlock()

	report := &PerformanceReport{
		GeneratedAt:    time.Now(),
		AnalysisPeriod: time.Since(since),
		QueryStats:     make(map[string]*QueryTypeStats),
		CollectionStats: make(map[string]*CollectionStats),
	}

	var totalQueries int64
	var totalDuration time.Duration
	var slowQueries int64

	for _, metric := range qpm.metrics {
		if metric.Timestamp.Before(since) {
			continue
		}

		totalQueries++
		totalDuration += metric.Duration

		if metric.Duration > qpm.slowQueryThreshold {
			slowQueries++
		}

		// Update query type stats
		if _, exists := report.QueryStats[metric.QueryType]; !exists {
			report.QueryStats[metric.QueryType] = &QueryTypeStats{}
		}
		stats := report.QueryStats[metric.QueryType]
		stats.Count++
		stats.TotalDuration += metric.Duration
		if metric.Duration > stats.MaxDuration {
			stats.MaxDuration = metric.Duration
		}
		if stats.MinDuration == 0 || metric.Duration < stats.MinDuration {
			stats.MinDuration = metric.Duration
		}

		// Update collection stats
		if _, exists := report.CollectionStats[metric.Collection]; !exists {
			report.CollectionStats[metric.Collection] = &CollectionStats{}
		}
		collStats := report.CollectionStats[metric.Collection]
		collStats.QueryCount++
		collStats.TotalDuration += metric.Duration
		collStats.DocumentsRead += metric.DocumentsRead
		collStats.DocumentsReturned += metric.DocumentsReturned
	}

	report.TotalQueries = totalQueries
	report.SlowQueries = slowQueries
	if totalQueries > 0 {
		report.AverageDuration = totalDuration / time.Duration(totalQueries)
		report.SlowQueryPercentage = float64(slowQueries) / float64(totalQueries) * 100
	}

	// Calculate averages for query types
	for _, stats := range report.QueryStats {
		if stats.Count > 0 {
			stats.AverageDuration = stats.TotalDuration / time.Duration(stats.Count)
		}
	}

	// Calculate averages for collections
	for _, stats := range report.CollectionStats {
		if stats.QueryCount > 0 {
			stats.AverageDuration = stats.TotalDuration / time.Duration(stats.QueryCount)
		}
	}

	return report
}

// PerformanceReport represents a comprehensive performance analysis
type PerformanceReport struct {
	GeneratedAt          time.Time                    `json:"generatedAt"`
	AnalysisPeriod       time.Duration                `json:"analysisPeriod"`
	TotalQueries         int64                        `json:"totalQueries"`
	SlowQueries          int64                        `json:"slowQueries"`
	SlowQueryPercentage  float64                      `json:"slowQueryPercentage"`
	AverageDuration      time.Duration                `json:"averageDuration"`
	QueryStats           map[string]*QueryTypeStats   `json:"queryStats"`
	CollectionStats      map[string]*CollectionStats  `json:"collectionStats"`
	Recommendations      []string                     `json:"recommendations"`
}

// QueryTypeStats represents statistics for a specific query type
type QueryTypeStats struct {
	Count           int64         `json:"count"`
	TotalDuration   time.Duration `json:"totalDuration"`
	AverageDuration time.Duration `json:"averageDuration"`
	MinDuration     time.Duration `json:"minDuration"`
	MaxDuration     time.Duration `json:"maxDuration"`
}

// CollectionStats represents statistics for a specific collection
type CollectionStats struct {
	QueryCount        int64         `json:"queryCount"`
	TotalDuration     time.Duration `json:"totalDuration"`
	AverageDuration   time.Duration `json:"averageDuration"`
	DocumentsRead     int64         `json:"documentsRead"`
	DocumentsReturned int64         `json:"documentsReturned"`
}

// GenerateRecommendations analyzes performance data and generates optimization recommendations
func (qpm *QueryPerformanceMonitor) GenerateRecommendations(report *PerformanceReport) []string {
	var recommendations []string

	// Check slow query percentage
	if report.SlowQueryPercentage > 10 {
		recommendations = append(recommendations, 
			fmt.Sprintf("High slow query percentage (%.1f%%) - consider adding indexes or optimizing queries", 
				report.SlowQueryPercentage))
	}

	// Check for full scans
	if stats, exists := report.QueryStats["full_scan"]; exists && stats.Count > 0 {
		recommendations = append(recommendations, 
			fmt.Sprintf("Found %d full collection scans - add appropriate indexes", stats.Count))
	}

	// Check for inefficient text searches
	if stats, exists := report.QueryStats["text_search"]; exists && stats.AverageDuration > 200*time.Millisecond {
		recommendations = append(recommendations, 
			"Text search queries are slow - consider optimizing text indexes or query patterns")
	}

	// Check collection-specific issues
	for collection, stats := range report.CollectionStats {
		if stats.QueryCount > 0 {
			readRatio := float64(stats.DocumentsReturned) / float64(stats.DocumentsRead)
			if readRatio < 0.1 && stats.DocumentsRead > 1000 {
				recommendations = append(recommendations, 
					fmt.Sprintf("Collection '%s' has low read efficiency (%.1f%%) - consider adding selective indexes", 
						collection, readRatio*100))
			}
		}
	}

	return recommendations
}

// ClearMetrics clears all stored metrics
func (qpm *QueryPerformanceMonitor) ClearMetrics() {
	qpm.metricsMutex.Lock()
	defer qpm.metricsMutex.Unlock()
	qpm.metrics = make([]QueryMetrics, 0)
}

// GetTopSlowQueries returns the slowest queries within a time period
func (qpm *QueryPerformanceMonitor) GetTopSlowQueries(since time.Time, limit int) []QueryMetrics {
	slowQueries := qpm.GetSlowQueries(since)
	
	// Sort by duration (descending)
	for i := 0; i < len(slowQueries)-1; i++ {
		for j := i + 1; j < len(slowQueries); j++ {
			if slowQueries[i].Duration < slowQueries[j].Duration {
				slowQueries[i], slowQueries[j] = slowQueries[j], slowQueries[i]
			}
		}
	}
	
	if limit > 0 && limit < len(slowQueries) {
		slowQueries = slowQueries[:limit]
	}
	
	return slowQueries
}

// MonitoredQuery wraps a query execution with performance monitoring
func (qpm *QueryPerformanceMonitor) MonitoredQuery(ctx context.Context, collection, operation string, filter bson.M, queryFunc func() error) error {
	startTime := time.Now()
	
	err := queryFunc()
	
	duration := time.Since(startTime)
	qpm.TrackQuery(ctx, collection, operation, filter, duration)
	
	return err
}

// StartPeriodicReporting starts a goroutine that generates periodic performance reports
func (qpm *QueryPerformanceMonitor) StartPeriodicReporting(interval time.Duration, reportCallback func(*PerformanceReport)) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		
		for range ticker.C {
			since := time.Now().Add(-interval)
			report := qpm.GetPerformanceReport(since)
			report.Recommendations = qpm.GenerateRecommendations(report)
			
			if reportCallback != nil {
				reportCallback(report)
			}
		}
	}()
}
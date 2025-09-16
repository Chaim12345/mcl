package handlers

import (
	"context"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"project-management-platform/internal/logger"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	db     *mongo.Client
	logger *logger.Logger
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *mongo.Client, logger *logger.Logger) *HealthHandler {
	return &HealthHandler{
		db:     db,
		logger: logger,
	}
}

// HealthStatus represents the health status of a component
type HealthStatus struct {
	Status  string         `json:"status"`
	Details map[string]any `json:"details,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// HealthResponse represents the overall health response
type HealthResponse struct {
	Status     string                  `json:"status"`
	Timestamp  time.Time               `json:"timestamp"`
	Version    string                  `json:"version"`
	Uptime     string                  `json:"uptime"`
	Components map[string]HealthStatus `json:"components"`
	System     SystemInfo              `json:"system"`
}

// SystemInfo represents system information
type SystemInfo struct {
	GoVersion    string     `json:"go_version"`
	NumGoroutine int        `json:"num_goroutine"`
	NumCPU       int        `json:"num_cpu"`
	MemoryUsage  MemoryInfo `json:"memory_usage"`
}

// MemoryInfo represents memory usage information
type MemoryInfo struct {
	Alloc      uint64 `json:"alloc_mb"`
	TotalAlloc uint64 `json:"total_alloc_mb"`
	Sys        uint64 `json:"sys_mb"`
	NumGC      uint32 `json:"num_gc"`
}

var startTime = time.Now()

// Health returns basic health status
func (h *HealthHandler) Health(c *gin.Context) {
	response := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   "1.0.0",
		Uptime:    time.Since(startTime).String(),
		Components: map[string]HealthStatus{
			"database": h.checkDatabase(),
		},
		System: h.getSystemInfo(),
	}

	// Determine overall status
	overallStatus := "healthy"
	for _, component := range response.Components {
		if component.Status != "healthy" {
			overallStatus = "unhealthy"
			break
		}
	}
	response.Status = overallStatus

	// Set appropriate HTTP status code
	statusCode := http.StatusOK
	if overallStatus != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// Readiness returns readiness status (for Kubernetes)
func (h *HealthHandler) Readiness(c *gin.Context) {
	// Check if all critical components are ready
	dbStatus := h.checkDatabase()

	if dbStatus.Status == "healthy" {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ready",
			"timestamp": time.Now(),
		})
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    "not ready",
			"timestamp": time.Now(),
			"reason":    "database not available",
		})
	}
}

// Liveness returns liveness status (for Kubernetes)
func (h *HealthHandler) Liveness(c *gin.Context) {
	// Simple liveness check - if we can respond, we're alive
	c.JSON(http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now(),
		"uptime":    time.Since(startTime).String(),
	})
}

// Metrics returns application metrics
func (h *HealthHandler) Metrics(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	metrics := gin.H{
		"timestamp": time.Now(),
		"uptime":    time.Since(startTime).String(),
		"system": gin.H{
			"go_version":    runtime.Version(),
			"num_goroutine": runtime.NumGoroutine(),
			"num_cpu":       runtime.NumCPU(),
		},
		"memory": gin.H{
			"alloc_mb":        bToMb(m.Alloc),
			"total_alloc_mb":  bToMb(m.TotalAlloc),
			"sys_mb":          bToMb(m.Sys),
			"num_gc":          m.NumGC,
			"gc_cpu_fraction": m.GCCPUFraction,
		},
		"database": h.getDatabaseMetrics(),
	}

	c.JSON(http.StatusOK, metrics)
}

// checkDatabase checks database connectivity
func (h *HealthHandler) checkDatabase() HealthStatus {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	start := time.Now()
	err := h.db.Ping(ctx, readpref.Primary())
	duration := time.Since(start)

	if err != nil {
		h.logger.Error("Database health check failed",
			"error", "database connection failed",
			"duration_ms", duration.Milliseconds(),
		)
		return HealthStatus{
			Status: "unhealthy",
			Error:  "Health check failed",
			Details: map[string]any{
				"duration_ms": duration.Milliseconds(),
			},
		}
	}

	return HealthStatus{
		Status: "healthy",
		Details: map[string]any{
			"duration_ms": duration.Milliseconds(),
		},
	}
}

// getDatabaseMetrics returns database-specific metrics
func (h *HealthHandler) getDatabaseMetrics() map[string]any {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Get database stats
	stats := h.db.Database("admin").RunCommand(ctx, map[string]any{"serverStatus": 1})

	metrics := map[string]any{
		"connected": true,
	}

	var result map[string]any
	if err := stats.Decode(&result); err == nil {
		if connections, ok := result["connections"].(map[string]any); ok {
			metrics["connections"] = connections
		}
		if mem, ok := result["mem"].(map[string]any); ok {
			metrics["memory"] = mem
		}
		if opcounters, ok := result["opcounters"].(map[string]any); ok {
			metrics["operations"] = opcounters
		}
	}

	return metrics
}

// getSystemInfo returns system information
func (h *HealthHandler) getSystemInfo() SystemInfo {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return SystemInfo{
		GoVersion:    runtime.Version(),
		NumGoroutine: runtime.NumGoroutine(),
		NumCPU:       runtime.NumCPU(),
		MemoryUsage: MemoryInfo{
			Alloc:      bToMb(m.Alloc),
			TotalAlloc: bToMb(m.TotalAlloc),
			Sys:        bToMb(m.Sys),
			NumGC:      m.NumGC,
		},
	}
}

// bToMb converts bytes to megabytes
func bToMb(b uint64) uint64 {
	return b / 1024 / 1024
}

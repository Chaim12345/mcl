package monitoring

import (
	"context"
	"fmt"
	"sync"
	"time"

	"project-management-platform/internal/logger"
)

// AlertLevel represents the severity of an alert
type AlertLevel string

const (
	AlertLevelInfo     AlertLevel = "info"
	AlertLevelWarning  AlertLevel = "warning"
	AlertLevelError    AlertLevel = "error"
	AlertLevelCritical AlertLevel = "critical"
)

// Alert represents an alert
type Alert struct {
	ID         string                 `json:"id"`
	Level      AlertLevel             `json:"level"`
	Title      string                 `json:"title"`
	Message    string                 `json:"message"`
	Component  string                 `json:"component"`
	Timestamp  time.Time              `json:"timestamp"`
	Metadata   map[string]interface{} `json:"metadata"`
	Resolved   bool                   `json:"resolved"`
	ResolvedAt *time.Time             `json:"resolved_at,omitempty"`
}

// AlertManager manages alerts and notifications
type AlertManager struct {
	alerts   map[string]*Alert
	mutex    sync.RWMutex
	logger   *logger.Logger
	handlers []AlertHandler
}

// AlertHandler defines the interface for alert handlers
type AlertHandler interface {
	HandleAlert(ctx context.Context, alert *Alert) error
}

// NewAlertManager creates a new alert manager
func NewAlertManager(logger *logger.Logger) *AlertManager {
	return &AlertManager{
		alerts:   make(map[string]*Alert),
		logger:   logger,
		handlers: make([]AlertHandler, 0),
	}
}

// AddHandler adds an alert handler
func (am *AlertManager) AddHandler(handler AlertHandler) {
	am.handlers = append(am.handlers, handler)
}

// TriggerAlert triggers a new alert
func (am *AlertManager) TriggerAlert(level AlertLevel, title, message, component string, metadata map[string]interface{}) {
	alert := &Alert{
		ID:        generateAlertID(),
		Level:     level,
		Title:     title,
		Message:   message,
		Component: component,
		Timestamp: time.Now(),
		Metadata:  metadata,
		Resolved:  false,
	}

	am.mutex.Lock()
	am.alerts[alert.ID] = alert
	am.mutex.Unlock()

	// Log the alert
	am.logger.WithComponent("alert_manager").Error("Alert triggered",
		"alert_id", alert.ID,
		"level", string(alert.Level),
		"title", alert.Title,
		"message", alert.Message,
		"component", alert.Component,
	)

	// Notify handlers
	ctx := context.Background()
	for _, handler := range am.handlers {
		go func(h AlertHandler) {
			if err := h.HandleAlert(ctx, alert); err != nil {
				am.logger.WithError(err).Error("Failed to handle alert",
					"alert_id", alert.ID,
					"handler", fmt.Sprintf("%T", h),
				)
			}
		}(handler)
	}
}

// ResolveAlert resolves an alert
func (am *AlertManager) ResolveAlert(alertID string) {
	am.mutex.Lock()
	defer am.mutex.Unlock()

	if alert, exists := am.alerts[alertID]; exists {
		now := time.Now()
		alert.Resolved = true
		alert.ResolvedAt = &now

		am.logger.WithComponent("alert_manager").Info("Alert resolved",
			"alert_id", alertID,
			"duration", now.Sub(alert.Timestamp).String(),
		)
	}
}

// GetAlerts returns all alerts
func (am *AlertManager) GetAlerts() []*Alert {
	am.mutex.RLock()
	defer am.mutex.RUnlock()

	alerts := make([]*Alert, 0, len(am.alerts))
	for _, alert := range am.alerts {
		alerts = append(alerts, alert)
	}

	return alerts
}

// GetActiveAlerts returns only unresolved alerts
func (am *AlertManager) GetActiveAlerts() []*Alert {
	am.mutex.RLock()
	defer am.mutex.RUnlock()

	alerts := make([]*Alert, 0)
	for _, alert := range am.alerts {
		if !alert.Resolved {
			alerts = append(alerts, alert)
		}
	}

	return alerts
}

// CleanupOldAlerts removes old resolved alerts
func (am *AlertManager) CleanupOldAlerts(maxAge time.Duration) {
	am.mutex.Lock()
	defer am.mutex.Unlock()

	cutoff := time.Now().Add(-maxAge)
	for id, alert := range am.alerts {
		if alert.Resolved && alert.ResolvedAt != nil && alert.ResolvedAt.Before(cutoff) {
			delete(am.alerts, id)
		}
	}
}

// LogAlertHandler logs alerts to the application log
type LogAlertHandler struct {
	logger *logger.Logger
}

// NewLogAlertHandler creates a new log alert handler
func NewLogAlertHandler(logger *logger.Logger) *LogAlertHandler {
	return &LogAlertHandler{
		logger: logger,
	}
}

// HandleAlert handles an alert by logging it
func (h *LogAlertHandler) HandleAlert(ctx context.Context, alert *Alert) error {
	fields := []interface{}{
		"alert_id", alert.ID,
		"level", string(alert.Level),
		"title", alert.Title,
		"message", alert.Message,
		"component", alert.Component,
		"timestamp", alert.Timestamp,
	}

	// Add metadata fields
	for key, value := range alert.Metadata {
		fields = append(fields, key, value)
	}

	switch alert.Level {
	case AlertLevelCritical, AlertLevelError:
		h.logger.Error("Alert triggered", fields...)
	case AlertLevelWarning:
		h.logger.Warn("Alert triggered", fields...)
	default:
		h.logger.Info("Alert triggered", fields...)
	}

	return nil
}

// EmailAlertHandler sends alerts via email (placeholder implementation)
type EmailAlertHandler struct {
	logger *logger.Logger
	// emailService EmailService // Would be injected
}

// NewEmailAlertHandler creates a new email alert handler
func NewEmailAlertHandler(logger *logger.Logger) *EmailAlertHandler {
	return &EmailAlertHandler{
		logger: logger,
	}
}

// HandleAlert handles an alert by sending an email
func (h *EmailAlertHandler) HandleAlert(ctx context.Context, alert *Alert) error {
	// Only send emails for warning and above
	if alert.Level == AlertLevelInfo {
		return nil
	}

	// TODO: Implement email sending
	h.logger.Info("Would send alert email",
		"alert_id", alert.ID,
		"level", string(alert.Level),
		"title", alert.Title,
	)

	return nil
}

// WebhookAlertHandler sends alerts to a webhook endpoint
type WebhookAlertHandler struct {
	logger     *logger.Logger
	webhookURL string
	// httpClient *http.Client // Would be injected
}

// NewWebhookAlertHandler creates a new webhook alert handler
func NewWebhookAlertHandler(logger *logger.Logger, webhookURL string) *WebhookAlertHandler {
	return &WebhookAlertHandler{
		logger:     logger,
		webhookURL: webhookURL,
	}
}

// HandleAlert handles an alert by sending it to a webhook
func (h *WebhookAlertHandler) HandleAlert(ctx context.Context, alert *Alert) error {
	// TODO: Implement webhook sending
	h.logger.Info("Would send alert to webhook",
		"alert_id", alert.ID,
		"webhook_url", h.webhookURL,
		"level", string(alert.Level),
	)

	return nil
}

// generateAlertID generates a unique alert ID
func generateAlertID() string {
	return fmt.Sprintf("alert_%d", time.Now().UnixNano())
}

// MonitoringService provides monitoring capabilities
type MonitoringService struct {
	alertManager *AlertManager
	metrics      *MetricsCollector
	logger       *logger.Logger
}

// NewMonitoringService creates a new monitoring service
func NewMonitoringService(logger *logger.Logger) *MonitoringService {
	alertManager := NewAlertManager(logger)
	metrics := NewMetricsCollector()

	// Add default alert handlers
	alertManager.AddHandler(NewLogAlertHandler(logger))

	return &MonitoringService{
		alertManager: alertManager,
		metrics:      metrics,
		logger:       logger,
	}
}

// GetAlertManager returns the alert manager
func (ms *MonitoringService) GetAlertManager() *AlertManager {
	return ms.alertManager
}

// GetMetricsCollector returns the metrics collector
func (ms *MonitoringService) GetMetricsCollector() *MetricsCollector {
	return ms.metrics
}

// StartBackgroundTasks starts background monitoring tasks
func (ms *MonitoringService) StartBackgroundTasks(ctx context.Context) {
	// Cleanup old alerts every hour
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				ms.alertManager.CleanupOldAlerts(24 * time.Hour)
			}
		}
	}()

	// Monitor system health every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				ms.checkSystemHealth()
			}
		}
	}()
}

// checkSystemHealth performs system health checks
func (ms *MonitoringService) checkSystemHealth() {
	// Check memory usage
	metrics := ms.metrics.GetMetrics()

	// Example: Alert if too many errors
	if errors, ok := metrics["errors"].(map[string]int64); ok {
		totalErrors := int64(0)
		for _, count := range errors {
			totalErrors += count
		}

		if totalErrors > 100 { // Threshold
			ms.alertManager.TriggerAlert(
				AlertLevelWarning,
				"High Error Rate",
				fmt.Sprintf("Total errors: %d", totalErrors),
				"system",
				map[string]interface{}{
					"total_errors": totalErrors,
				},
			)
		}
	}

	// Example: Alert if response times are too high
	if durations, ok := metrics["request_durations"].(map[string]interface{}); ok {
		for endpoint, stats := range durations {
			if statsMap, ok := stats.(map[string]interface{}); ok {
				if avg, ok := statsMap["avg_ms"].(int64); ok && avg > 5000 { // 5 seconds
					ms.alertManager.TriggerAlert(
						AlertLevelWarning,
						"Slow Response Time",
						fmt.Sprintf("Average response time for %s: %dms", endpoint, avg),
						"performance",
						map[string]interface{}{
							"endpoint":  endpoint,
							"avg_ms":    avg,
							"threshold": 5000,
						},
					)
				}
			}
		}
	}
}

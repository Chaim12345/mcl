package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger wraps slog.Logger with additional functionality
type Logger struct {
	*slog.Logger
}

// Config holds logger configuration
type Config struct {
	Level      string `json:"level" yaml:"level"`
	Format     string `json:"format" yaml:"format"`
	Output     string `json:"output" yaml:"output"`
	AddSource  bool   `json:"add_source" yaml:"add_source"`
	TimeFormat string `json:"time_format" yaml:"time_format"`
}

// DefaultConfig returns default logger configuration
func DefaultConfig() Config {
	return Config{
		Level:      "info",
		Format:     "json",
		Output:     "stdout",
		AddSource:  true,
		TimeFormat: time.RFC3339,
	}
}

// New creates a new logger with the given configuration
func New(config Config) *Logger {
	var level slog.Level
	switch config.Level {
	case "debug":
		level = slog.LevelDebug
	case "info":
		level = slog.LevelInfo
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	var output io.Writer
	switch config.Output {
	case "stdout":
		output = os.Stdout
	case "stderr":
		output = os.Stderr
	default:
		output = os.Stdout
	}

	opts := &slog.HandlerOptions{
		Level:     level,
		AddSource: config.AddSource,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// Customize time format
			if a.Key == slog.TimeKey {
				if t, ok := a.Value.Any().(time.Time); ok {
					a.Value = slog.StringValue(t.Format(config.TimeFormat))
				}
			}
			return a
		},
	}

	var handler slog.Handler
	switch config.Format {
	case "json":
		handler = slog.NewJSONHandler(output, opts)
	case "text":
		handler = slog.NewTextHandler(output, opts)
	default:
		handler = slog.NewJSONHandler(output, opts)
	}

	return &Logger{
		Logger: slog.New(handler),
	}
}

// WithContext adds context information to the logger
func (l *Logger) WithContext(ctx context.Context) *Logger {
	// Extract request ID from context if available
	if requestID := ctx.Value("request_id"); requestID != nil {
		return &Logger{
			Logger: l.Logger.With("request_id", requestID),
		}
	}
	return l
}

// WithRequestID adds request ID to the logger
func (l *Logger) WithRequestID(requestID string) *Logger {
	return &Logger{
		Logger: l.Logger.With("request_id", requestID),
	}
}

// WithUserID adds user ID to the logger
func (l *Logger) WithUserID(userID string) *Logger {
	return &Logger{
		Logger: l.Logger.With("user_id", userID),
	}
}

// WithComponent adds component name to the logger
func (l *Logger) WithComponent(component string) *Logger {
	return &Logger{
		Logger: l.Logger.With("component", component),
	}
}

// WithError adds error information to the logger
func (l *Logger) WithError(err error) *Logger {
	return &Logger{
		Logger: l.Logger.With("error", err.Error()),
	}
}

// LogRequest logs HTTP request information
func (l *Logger) LogRequest(c *gin.Context, duration time.Duration, statusCode int) {
	fields := []any{
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"status_code", statusCode,
		"duration_ms", duration.Milliseconds(),
		"client_ip", c.ClientIP(),
		"user_agent", c.Request.UserAgent(),
		"content_length", c.Request.ContentLength,
		"response_size", c.Writer.Size(),
	}

	// Add request ID if available
	if requestID := c.GetString("request_id"); requestID != "" {
		fields = append(fields, "request_id", requestID)
	}

	// Add user ID if available
	if userID := c.GetString("user_id"); userID != "" {
		fields = append(fields, "user_id", userID)
	}

	// Add query parameters if present
	if c.Request.URL.RawQuery != "" {
		fields = append(fields, "query", c.Request.URL.RawQuery)
	}

	// Log based on status code
	if statusCode >= 500 {
		l.Error("HTTP request failed", fields...)
	} else if statusCode >= 400 {
		l.Warn("HTTP request error", fields...)
	} else {
		l.Info("HTTP request", fields...)
	}
}

// LogAuth logs authentication events
func (l *Logger) LogAuth(event string, userID, email, clientIP string, success bool, details map[string]any) {
	fields := []any{
		"event", event,
		"success", success,
		"client_ip", clientIP,
	}

	if userID != "" {
		fields = append(fields, "user_id", userID)
	}
	if email != "" {
		fields = append(fields, "email", email)
	}

	// Add additional details
	for key, value := range details {
		fields = append(fields, key, value)
	}

	if success {
		l.Info("Authentication event", fields...)
	} else {
		l.Warn("Authentication failed", fields...)
	}
}

// LogDatabase logs database operations
func (l *Logger) LogDatabase(operation, collection string, duration time.Duration, err error, details map[string]any) {
	fields := []any{
		"operation", operation,
		"collection", collection,
		"duration_ms", duration.Milliseconds(),
	}

	// Add additional details
	for key, value := range details {
		fields = append(fields, key, value)
	}

	if err != nil {
		fields = append(fields, "error", err.Error())
		l.Error("Database operation failed", fields...)
	} else {
		l.Debug("Database operation", fields...)
	}
}

// LogEmail logs email operations
func (l *Logger) LogEmail(operation, recipient, subject string, success bool, err error) {
	fields := []any{
		"operation", operation,
		"recipient", recipient,
		"subject", subject,
		"success", success,
	}

	if err != nil {
		fields = append(fields, "error", err.Error())
		l.Error("Email operation failed", fields...)
	} else {
		l.Info("Email operation", fields...)
	}
}

// LogSecurity logs security events
func (l *Logger) LogSecurity(event, clientIP, userAgent string, details map[string]any) {
	fields := []any{
		"event", event,
		"client_ip", clientIP,
		"user_agent", userAgent,
	}

	// Add additional details
	for key, value := range details {
		fields = append(fields, key, value)
	}

	l.Warn("Security event", fields...)
}

// LogPerformance logs performance metrics
func (l *Logger) LogPerformance(operation string, duration time.Duration, details map[string]any) {
	fields := []any{
		"operation", operation,
		"duration_ms", duration.Milliseconds(),
	}

	// Add additional details
	for key, value := range details {
		fields = append(fields, key, value)
	}

	// Log as warning if operation is slow
	if duration > 1*time.Second {
		l.Warn("Slow operation detected", fields...)
	} else {
		l.Debug("Performance metric", fields...)
	}
}

// LogBusinessEvent logs business logic events
func (l *Logger) LogBusinessEvent(event string, details map[string]any) {
	fields := []any{
		"event", event,
	}

	// Add additional details
	for key, value := range details {
		fields = append(fields, key, value)
	}

	l.Info("Business event", fields...)
}

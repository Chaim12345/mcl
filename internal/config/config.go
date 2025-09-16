package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
)

// Config holds application configuration
type Config struct {
	Environment string `koanf:"environment" validate:"required,oneof=development production test"`
	Server      Server `koanf:"server" validate:"required"`
	Database    Database `koanf:"database" validate:"required"`
	JWT         JWT `koanf:"jwt" validate:"required"`
	Email       Email `koanf:"email" validate:"required"`
}

// Server holds server configuration
type Server struct {
	Port         string        `koanf:"port" validate:"required"`
	Host         string        `koanf:"host"`
	ReadTimeout  time.Duration `koanf:"read_timeout"`
	WriteTimeout time.Duration `koanf:"write_timeout"`
}

// Database holds database configuration
type Database struct {
	URI             string        `koanf:"uri" validate:"required"`
	Name            string        `koanf:"name" validate:"required"`
	MaxPoolSize     uint64        `koanf:"max_pool_size"`
	MinPoolSize     uint64        `koanf:"min_pool_size"`
	MaxConnIdleTime time.Duration `koanf:"max_conn_idle_time"`
}

// JWT holds JWT configuration
type JWT struct {
	Secret            string        `koanf:"secret" validate:"required,min=32"`
	AccessExpiration  time.Duration `koanf:"access_expiration"`
	RefreshExpiration time.Duration `koanf:"refresh_expiration"`
}

// Email holds email configuration
type Email struct {
	SMTPHost     string `koanf:"smtp_host" validate:"required"`
	SMTPPort     int    `koanf:"smtp_port" validate:"required,min=1,max=65535"`
	SMTPUser     string `koanf:"smtp_user"`
	SMTPPassword string `koanf:"smtp_password"`
	FromAddress  string `koanf:"from_address" validate:"required,email"`
	Secure       bool   `koanf:"secure"`
}

// Load loads configuration from multiple sources
func Load() (*Config, error) {
	k := koanf.New(".")

	// Load from config file if it exists
	if err := k.Load(file.Provider("config.yaml"), yaml.Parser()); err != nil {
		// Config file is optional, so we don't return error
		fmt.Printf("Config file not found, using environment variables and defaults: %v\n", err)
	}

	// Load from environment variables with prefix
	if err := k.Load(env.Provider("APP_", ".", func(s string) string {
		// Convert APP_DATABASE_URI to database.uri
		return strings.ToLower(strings.ReplaceAll(s[4:], "_", "."))
	}), nil); err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

	// Load specific SMTP environment variables without prefix
	smtpEnvVars := map[string]string{
		"SMTP_HOST":   "email.smtp_host",
		"SMTP_PORT":   "email.smtp_port", 
		"SMTP_USER":   "email.smtp_user",
		"SMTP_PASS":   "email.smtp_password",
		"SMTP_SECURE": "email.secure",
	}
	
	for envVar, configKey := range smtpEnvVars {
		if value := os.Getenv(envVar); value != "" {
			k.Set(configKey, value)
		}
	}

	// Set defaults
	setDefaults(k)

	// Unmarshal into config struct
	var config Config
	if err := k.Unmarshal("", &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

// setDefaults sets default configuration values
func setDefaults(k *koanf.Koanf) {
	defaults := map[string]interface{}{
		"environment": "development",
		"server.port": "8080",
		"server.host": "0.0.0.0",
		"server.read_timeout": "15s",
		"server.write_timeout": "15s",
		
		"database.uri": "mongodb://localhost:27017",
		"database.name": "project_management",
		"database.max_pool_size": 100,
		"database.min_pool_size": 10,
		"database.max_conn_idle_time": "30s",
		
		"jwt.secret": "your-secret-key-change-in-production-must-be-at-least-32-characters",
		"jwt.access_expiration": "15m",
		"jwt.refresh_expiration": "168h", // 7 days
		
		"email.smtp_host": "localhost",
		"email.smtp_port": 587,
		"email.smtp_user": "",
		"email.smtp_password": "",
		"email.from_address": "noreply@example.com",
		"email.secure": false,
	}

	for key, value := range defaults {
		if !k.Exists(key) {
			k.Set(key, value)
		}
	}
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Add custom validation logic here if needed
	if c.Environment == "production" && c.JWT.Secret == "your-secret-key-change-in-production-must-be-at-least-32-characters" {
		return fmt.Errorf("JWT secret must be changed in production")
	}

	return nil
}
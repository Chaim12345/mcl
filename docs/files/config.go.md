# internal/config/config.go

## File Overview

Configuration management module that handles loading, parsing, and validation of application settings from multiple sources (YAML files and environment variables). Uses the Koanf library for flexible configuration management with proper defaults and validation.

## Key Components

### Configuration Structures

#### Config (Main Configuration)
```go
type Config struct {
    Environment string   `koanf:"environment" validate:"required,oneof=development production test"`
    Server      Server   `koanf:"server" validate:"required"`
    Database    Database `koanf:"database" validate:"required"`
    JWT         JWT      `koanf:"jwt" validate:"required"`
    Email       Email    `koanf:"email" validate:"required"`
}
```
- **Purpose**: Root configuration structure
- **Validation**: Environment must be one of: development, production, test
- **Dependencies**: All sub-configurations are required

#### Server Configuration
```go
type Server struct {
    Port         string        `koanf:"port" validate:"required"`
    Host         string        `koanf:"host"`
    ReadTimeout  time.Duration `koanf:"read_timeout"`
    WriteTimeout time.Duration `koanf:"write_timeout"`
}
```
- **Purpose**: HTTP server configuration
- **Defaults**: Host="0.0.0.0", Port="8080", Timeouts=15s

#### Database Configuration
```go
type Database struct {
    URI             string        `koanf:"uri" validate:"required"`
    Name            string        `koanf:"name" validate:"required"`
    MaxPoolSize     uint64        `koanf:"max_pool_size"`
    MinPoolSize     uint64        `koanf:"min_pool_size"`
    MaxConnIdleTime time.Duration `koanf:"max_conn_idle_time"`
}
```
- **Purpose**: MongoDB connection settings
- **Connection Pooling**: Configurable pool sizes and idle timeout
- **Required Fields**: URI and database name

#### JWT Configuration
```go
type JWT struct {
    Secret            string        `koanf:"secret" validate:"required,min=32"`
    AccessExpiration  time.Duration `koanf:"access_expiration"`
    RefreshExpiration time.Duration `koanf:"refresh_expiration"`
}
```
- **Purpose**: JWT token management settings
- **Security**: Secret must be at least 32 characters
- **Defaults**: Access=15m, Refresh=168h (7 days)

#### Email Configuration
```go
type Email struct {
    SMTPHost     string `koanf:"smtp_host" validate:"required"`
    SMTPPort     int    `koanf:"smtp_port" validate:"required,min=1,max=65535"`
    SMTPUser     string `koanf:"smtp_user"`
    SMTPPassword string `koanf:"smtp_password"`
    FromAddress  string `koanf:"from_address" validate:"required,email"`
    Secure       bool   `koanf:"secure"`
}
```
- **Purpose**: Email service configuration
- **Validation**: Port range validation, email format validation
- **Security**: Optional authentication with user/password

## Dependencies

### External Libraries
- `github.com/knadh/koanf/v2` - Configuration management
- `github.com/knadh/koanf/parsers/yaml` - YAML file parsing
- `github.com/knadh/koanf/providers/env` - Environment variable provider
- `github.com/knadh/koanf/providers/file` - File provider

### Standard Libraries
- `fmt` - Error formatting
- `os` - Environment variable access
- `strings` - String manipulation
- `time` - Duration parsing

## Data Flow

### Configuration Loading Process
```mermaid
sequenceDiagram
    participant App
    participant Koanf
    participant File
    participant Env
    participant Defaults
    participant Validator
    
    App->>Koanf: Load()
    Koanf->>File: Load config.yaml
    File-->>Koanf: YAML data (optional)
    Koanf->>Env: Load environment variables
    Env-->>Koanf: Environment data
    Koanf->>Defaults: Apply defaults
    Defaults-->>Koanf: Default values
    Koanf->>Validator: Unmarshal & validate
    Validator-->>App: Config struct
```

### Load Function Implementation
```go
func Load() (*Config, error) {
    k := koanf.New(".")
    
    // 1. Load from config file (optional)
    if err := k.Load(file.Provider("config.yaml"), yaml.Parser()); err != nil {
        fmt.Printf("Config file not found, using environment variables and defaults: %v\n", err)
    }
    
    // 2. Load from environment variables with prefix
    if err := k.Load(env.Provider("APP_", ".", func(s string) string {
        return strings.ToLower(strings.ReplaceAll(s[4:], "_", "."))
    }), nil); err != nil {
        return nil, fmt.Errorf("failed to load environment variables: %w", err)
    }
    
    // 3. Load specific SMTP environment variables
    smtpEnvVars := map[string]string{
        "SMTP_HOST": "email.smtp_host",
        "SMTP_PORT": "email.smtp_port",
        // ... more mappings
    }
    
    // 4. Set defaults
    setDefaults(k)
    
    // 5. Unmarshal and return
    var config Config
    if err := k.Unmarshal("", &config); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }
    
    return &config, nil
}
```

## Interactions

### Environment Variable Mapping
The configuration system maps environment variables to nested configuration keys:

- `APP_SERVER_PORT` → `server.port`
- `APP_DATABASE_URI` → `database.uri`
- `APP_JWT_SECRET` → `jwt.secret`
- `SMTP_HOST` → `email.smtp_host` (special case)

### Configuration Precedence
1. **Environment Variables** (highest priority)
2. **YAML Configuration File**
3. **Default Values** (lowest priority)

### Default Values
```go
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
        "jwt.refresh_expiration": "168h",
        
        "email.smtp_host": "localhost",
        "email.smtp_port": 587,
        "email.from_address": "noreply@example.com",
        "email.secure": false,
    }
    
    for key, value := range defaults {
        if !k.Exists(key) {
            k.Set(key, value)
        }
    }
}
```

## Example Usage

### YAML Configuration File
```yaml
# config.yaml
server:
  host: "0.0.0.0"
  port: "8080"
  read_timeout: "30s"
  write_timeout: "30s"

database:
  uri: "mongodb://root:password@localhost:27017/project_management_dev?authSource=admin"
  name: "project_management_dev"

jwt:
  secret: "your_super_secret_key_change_me_in_production"
  access_expiration: "15m"
  refresh_expiration: "168h"

email:
  smtp_host: "smtp.example.com"
  smtp_port: 587
  smtp_user: "user@example.com"
  smtp_password: "password"
  from_address: "noreply@example.com"
  secure: true

environment: "development"
```

### Environment Variables
```bash
# Server configuration
export APP_SERVER_PORT=8080
export APP_SERVER_HOST=0.0.0.0

# Database configuration
export APP_DATABASE_URI=mongodb://localhost:27017
export APP_DATABASE_NAME=project_management

# JWT configuration
export APP_JWT_SECRET=your-secret-key-must-be-at-least-32-characters
export APP_JWT_ACCESS_EXPIRATION=15m

# Email configuration (with and without prefix)
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-password
export APP_EMAIL_FROM_ADDRESS=noreply@yourapp.com

# Environment
export APP_ENVIRONMENT=production
```

### Loading Configuration in Application
```go
// In main.go
cfg, err := config.Load()
if err != nil {
    log.Fatalf("Failed to load configuration: %v", err)
}

// Validate configuration
if err := cfg.Validate(); err != nil {
    log.Fatalf("Configuration validation failed: %v", err)
}

// Use configuration
server := &http.Server{
    Addr:         cfg.Server.Host + ":" + cfg.Server.Port,
    ReadTimeout:  cfg.Server.ReadTimeout,
    WriteTimeout: cfg.Server.WriteTimeout,
}
```

## Error Handling

### Configuration Loading Errors
- **File Not Found**: Non-fatal, continues with environment variables and defaults
- **Environment Variable Errors**: Fatal, returns error
- **Unmarshal Errors**: Fatal, indicates invalid configuration structure
- **Validation Errors**: Fatal, indicates invalid configuration values

### Custom Validation
```go
func (c *Config) Validate() error {
    if c.Environment == "production" && 
       c.JWT.Secret == "your-secret-key-change-in-production-must-be-at-least-32-characters" {
        return fmt.Errorf("JWT secret must be changed in production")
    }
    return nil
}
```

## Security Considerations

### Sensitive Data Handling
- **JWT Secrets**: Must be changed in production
- **Database Credentials**: Should be provided via environment variables
- **SMTP Passwords**: Should be provided via environment variables
- **Default Values**: Safe defaults that must be overridden in production

### Environment-Specific Validation
- **Production Environment**: Enforces secure JWT secret
- **Development Environment**: Allows default values for easier setup
- **Test Environment**: Isolated configuration for testing

## Performance Considerations

### Configuration Loading
- **File Loading**: Optional, non-blocking if file doesn't exist
- **Environment Scanning**: Efficient prefix-based filtering
- **Validation**: Performed once at startup
- **Memory Usage**: Configuration loaded once and reused

### Best Practices
1. **Fail Fast**: Validate configuration at startup
2. **Secure Defaults**: Use secure defaults where possible
3. **Environment Separation**: Clear environment-specific settings
4. **Documentation**: Well-documented configuration options
5. **Backwards Compatibility**: Maintain configuration structure stability

This configuration module provides a robust, flexible, and secure way to manage application settings across different environments while maintaining ease of use for developers.

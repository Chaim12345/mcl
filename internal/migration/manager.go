package migration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/database"
	"project-management-platform/internal/logger"
)

// Config holds migration configuration
type Config struct {
	SourceDB     string
	TargetDB     string
	BatchSize    int
	DryRun       bool
	Verbose      bool
	ConfigFile   string
	RollbackFile string
}

// Manager handles database migration operations
type Manager struct {
	config    Config
	sourceDB  *sql.DB
	targetDB  *mongo.Client
	logger    *logger.Logger
	status    *Status
	migrators []Migrator
}

// Status represents migration status
type Status struct {
	StartTime time.Time              `json:"start_time"`
	EndTime   time.Time              `json:"end_time"`
	State     string                 `json:"state"`
	Total     int64                  `json:"total"`
	Processed int64                  `json:"processed"`
	Progress  float64                `json:"progress"`
	Errors    []string               `json:"errors"`
	Tables    map[string]TableStatus `json:"tables"`
}

// TableStatus represents the status of a single table migration
type TableStatus struct {
	Total     int64    `json:"total"`
	Processed int64    `json:"processed"`
	Progress  float64  `json:"progress"`
	Errors    []string `json:"errors"`
}

// Migrator interface for table-specific migration logic
type Migrator interface {
	TableName() string
	Migrate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database, batchSize int, dryRun bool) error
	Validate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database) error
	Rollback(ctx context.Context, targetDB *mongo.Database, rollbackData []byte) error
}

// NewManager creates a new migration manager
func NewManager(config Config) (*Manager, error) {
	// Initialize logger
	loggerConfig := logger.DefaultConfig()
	if config.Verbose {
		loggerConfig.Level = "debug"
	}
	log := logger.New(loggerConfig)

	// Connect to source PostgreSQL database
	sourceDB, err := sql.Open("postgres", config.SourceDB)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to source database: %w", err)
	}

	if err := sourceDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping source database: %w", err)
	}

	// Connect to target MongoDB database
	targetClient, err := database.NewClient(config.TargetDB)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to target database: %w", err)
	}

	// Initialize status
	status := &Status{
		State:  "initialized",
		Tables: make(map[string]TableStatus),
	}

	manager := &Manager{
		config:   config,
		sourceDB: sourceDB,
		targetDB: targetClient,
		logger:   log,
		status:   status,
	}

	// Initialize migrators
	manager.migrators = []Migrator{
		NewUserMigrator(log),
		NewWorkspaceMigrator(log),
		NewBoardMigrator(log),
		NewItemMigrator(log),
		NewCommentMigrator(log),
		NewActivityMigrator(log),
		NewNotificationMigrator(log),
	}

	return manager, nil
}

// Close closes database connections
func (m *Manager) Close() error {
	if m.sourceDB != nil {
		m.sourceDB.Close()
	}
	if m.targetDB != nil {
		return m.targetDB.Disconnect(context.Background())
	}
	return nil
}

// Migrate performs the complete migration
func (m *Manager) Migrate(ctx context.Context) error {
	m.status.StartTime = time.Now()
	m.status.State = "running"

	m.logger.Info("Starting migration", "dry_run", m.config.DryRun)

	// Calculate total records
	if err := m.calculateTotals(ctx); err != nil {
		return fmt.Errorf("failed to calculate totals: %w", err)
	}

	// Create rollback data file
	rollbackData := make(map[string]interface{})

	// Migrate each table
	for _, migrator := range m.migrators {
		tableName := migrator.TableName()
		m.logger.Info("Migrating table", "table", tableName)

		tableStatus := TableStatus{}
		m.status.Tables[tableName] = tableStatus

		// Get target database
		targetDB := m.targetDB.Database("project_management")

		if err := migrator.Migrate(ctx, m.sourceDB, targetDB, m.config.BatchSize, m.config.DryRun); err != nil {
			m.status.Errors = append(m.status.Errors, fmt.Sprintf("%s: %v", tableName, err))
			m.logger.Error("Migration failed for table", "table", tableName, "error", err)
			continue
		}

		m.logger.Info("Completed migration for table", "table", tableName)
	}

	// Save rollback data
	if !m.config.DryRun && m.config.RollbackFile != "" {
		if err := m.saveRollbackData(rollbackData); err != nil {
			m.logger.Error("Failed to save rollback data", "error", err)
		}
	}

	m.status.EndTime = time.Now()
	m.status.State = "completed"
	m.status.Progress = 100.0

	return nil
}

// Validate validates the migrated data
func (m *Manager) Validate(ctx context.Context) error {
	m.logger.Info("Starting validation")

	targetDB := m.targetDB.Database("project_management")

	for _, migrator := range m.migrators {
		tableName := migrator.TableName()
		m.logger.Info("Validating table", "table", tableName)

		if err := migrator.Validate(ctx, m.sourceDB, targetDB); err != nil {
			return fmt.Errorf("validation failed for %s: %w", tableName, err)
		}
	}

	m.logger.Info("Validation completed successfully")
	return nil
}

// Rollback rolls back the migration
func (m *Manager) Rollback(ctx context.Context) error {
	if m.config.RollbackFile == "" {
		return fmt.Errorf("rollback file not specified")
	}

	m.logger.Info("Starting rollback", "file", m.config.RollbackFile)

	// Load rollback data
	rollbackData, err := m.loadRollbackData()
	if err != nil {
		return fmt.Errorf("failed to load rollback data: %w", err)
	}

	targetDB := m.targetDB.Database("project_management")

	// Rollback each table in reverse order
	for i := len(m.migrators) - 1; i >= 0; i-- {
		migrator := m.migrators[i]
		tableName := migrator.TableName()

		m.logger.Info("Rolling back table", "table", tableName)

		tableData, exists := rollbackData[tableName]
		if !exists {
			m.logger.Warn("No rollback data found for table", "table", tableName)
			continue
		}

		tableBytes, err := json.Marshal(tableData)
		if err != nil {
			return fmt.Errorf("failed to marshal rollback data for %s: %w", tableName, err)
		}

		if err := migrator.Rollback(ctx, targetDB, tableBytes); err != nil {
			return fmt.Errorf("rollback failed for %s: %w", tableName, err)
		}
	}

	m.logger.Info("Rollback completed successfully")
	return nil
}

// Status returns the current migration status
func (m *Manager) Status(ctx context.Context) (*Status, error) {
	return m.status, nil
}

// calculateTotals calculates the total number of records to migrate
func (m *Manager) calculateTotals(ctx context.Context) error {
	var total int64

	for _, migrator := range m.migrators {
		tableName := migrator.TableName()

		query := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)
		var count int64

		if err := m.sourceDB.QueryRowContext(ctx, query).Scan(&count); err != nil {
			m.logger.Warn("Failed to count records", "table", tableName, "error", err)
			continue
		}

		total += count

		tableStatus := m.status.Tables[tableName]
		tableStatus.Total = count
		m.status.Tables[tableName] = tableStatus
	}

	m.status.Total = total
	return nil
}

// saveRollbackData saves rollback data to file
func (m *Manager) saveRollbackData(data map[string]interface{}) error {
	file, err := os.Create(m.config.RollbackFile)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}

// loadRollbackData loads rollback data from file
func (m *Manager) loadRollbackData() (map[string]interface{}, error) {
	file, err := os.Open(m.config.RollbackFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var data map[string]interface{}
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&data); err != nil {
		return nil, err
	}

	return data, nil
}

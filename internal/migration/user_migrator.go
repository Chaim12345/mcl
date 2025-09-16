package migration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/logger"
	"project-management-platform/internal/models"
)

// UserMigrator handles user table migration
type UserMigrator struct {
	logger *logger.Logger
}

// NewUserMigrator creates a new user migrator
func NewUserMigrator(logger *logger.Logger) *UserMigrator {
	return &UserMigrator{logger: logger}
}

// TableName returns the source table name
func (m *UserMigrator) TableName() string {
	return "users"
}

// Migrate migrates users from PostgreSQL to MongoDB
func (m *UserMigrator) Migrate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database, batchSize int, dryRun bool) error {
	// Query to select users from PostgreSQL
	query := `
		SELECT id, email, password_hash, first_name, last_name, 
		       avatar_url, is_verified, created_at, updated_at, last_login_at
		FROM users 
		ORDER BY id
	`

	rows, err := sourceDB.QueryContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	collection := targetDB.Collection("users")
	var batch []interface{}
	var processed int

	for rows.Next() {
		var user struct {
			ID           int64          `db:"id"`
			Email        string         `db:"email"`
			PasswordHash string         `db:"password_hash"`
			FirstName    sql.NullString `db:"first_name"`
			LastName     sql.NullString `db:"last_name"`
			AvatarURL    sql.NullString `db:"avatar_url"`
			IsVerified   bool           `db:"is_verified"`
			CreatedAt    time.Time      `db:"created_at"`
			UpdatedAt    time.Time      `db:"updated_at"`
			LastLoginAt  sql.NullTime   `db:"last_login_at"`
		}

		if err := rows.Scan(
			&user.ID, &user.Email, &user.PasswordHash,
			&user.FirstName, &user.LastName, &user.AvatarURL,
			&user.IsVerified, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
		); err != nil {
			return fmt.Errorf("failed to scan user row: %w", err)
		}

		// Convert to MongoDB document
		mongoUser := models.User{
			ID:            primitive.NewObjectID(),
			Email:         user.Email,
			Password:      user.PasswordHash,
			FirstName:     user.FirstName.String,
			LastName:      user.LastName.String,
			Avatar:        user.AvatarURL.String,
			EmailVerified: user.IsVerified,
			CreatedAt:     user.CreatedAt,
			UpdatedAt:     user.UpdatedAt,
		}

		if user.LastLoginAt.Valid {
			mongoUser.LastLoginAt = &user.LastLoginAt.Time
		}

		batch = append(batch, mongoUser)
		processed++

		// Process batch when it reaches the batch size
		if len(batch) >= batchSize {
			if err := m.processBatch(ctx, collection, batch, dryRun); err != nil {
				return fmt.Errorf("failed to process batch: %w", err)
			}
			batch = batch[:0] // Clear batch
		}
	}

	// Process remaining records
	if len(batch) > 0 {
		if err := m.processBatch(ctx, collection, batch, dryRun); err != nil {
			return fmt.Errorf("failed to process final batch: %w", err)
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("error iterating rows: %w", err)
	}

	m.logger.Info("User migration completed", "processed", processed, "dry_run", dryRun)
	return nil
}

// processBatch processes a batch of users
func (m *UserMigrator) processBatch(ctx context.Context, collection *mongo.Collection, batch []interface{}, dryRun bool) error {
	if dryRun {
		m.logger.Debug("Dry run: would insert batch", "count", len(batch))
		return nil
	}

	_, err := collection.InsertMany(ctx, batch)
	if err != nil {
		return fmt.Errorf("failed to insert batch: %w", err)
	}

	m.logger.Debug("Inserted batch", "count", len(batch))
	return nil
}

// Validate validates the migrated user data
func (m *UserMigrator) Validate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database) error {
	// Count records in source
	var sourceCount int64
	if err := sourceDB.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&sourceCount); err != nil {
		return fmt.Errorf("failed to count source users: %w", err)
	}

	// Count records in target
	collection := targetDB.Collection("users")
	targetCount, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return fmt.Errorf("failed to count target users: %w", err)
	}

	if sourceCount != targetCount {
		return fmt.Errorf("record count mismatch: source=%d, target=%d", sourceCount, targetCount)
	}

	// Validate sample records
	if err := m.validateSampleRecords(ctx, sourceDB, collection); err != nil {
		return fmt.Errorf("sample validation failed: %w", err)
	}

	m.logger.Info("User validation completed", "count", sourceCount)
	return nil
}

// validateSampleRecords validates a sample of migrated records
func (m *UserMigrator) validateSampleRecords(ctx context.Context, sourceDB *sql.DB, collection *mongo.Collection) error {
	// Get sample records from source
	query := `
		SELECT id, email, password_hash, first_name, last_name, is_verified
		FROM users 
		ORDER BY RANDOM() 
		LIMIT 10
	`

	rows, err := sourceDB.QueryContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query sample users: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var user struct {
			ID           int64          `db:"id"`
			Email        string         `db:"email"`
			PasswordHash string         `db:"password_hash"`
			FirstName    sql.NullString `db:"first_name"`
			LastName     sql.NullString `db:"last_name"`
			IsVerified   bool           `db:"is_verified"`
		}

		if err := rows.Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName, &user.IsVerified); err != nil {
			return fmt.Errorf("failed to scan sample user: %w", err)
		}

		// Find corresponding MongoDB document by email (since we don't have legacy_id field)
		filter := bson.M{"email": user.Email}
		var mongoUser models.User
		if err := collection.FindOne(ctx, filter).Decode(&mongoUser); err != nil {
			return fmt.Errorf("failed to find migrated user %d: %w", user.ID, err)
		}

		// Validate key fields
		if mongoUser.Email != user.Email {
			return fmt.Errorf("email mismatch for user %d: expected %s, got %s", user.ID, user.Email, mongoUser.Email)
		}

		if mongoUser.Password != user.PasswordHash {
			return fmt.Errorf("password hash mismatch for user %d", user.ID)
		}

		if mongoUser.EmailVerified != user.IsVerified {
			return fmt.Errorf("verification status mismatch for user %d", user.ID)
		}
	}

	return nil
}

// Rollback removes migrated users
func (m *UserMigrator) Rollback(ctx context.Context, targetDB *mongo.Database, rollbackData []byte) error {
	collection := targetDB.Collection("users")

	// Parse rollback data if needed
	var data map[string]interface{}
	if len(rollbackData) > 0 {
		if err := json.Unmarshal(rollbackData, &data); err != nil {
			return fmt.Errorf("failed to parse rollback data: %w", err)
		}
	}

	// Delete all users (or specific ones based on rollback data)
	filter := bson.M{}
	if emails, exists := data["emails"]; exists {
		filter = bson.M{"email": bson.M{"$in": emails}}
	}

	result, err := collection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete users: %w", err)
	}

	m.logger.Info("User rollback completed", "deleted", result.DeletedCount)
	return nil
}

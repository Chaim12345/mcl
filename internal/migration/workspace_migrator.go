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

// WorkspaceMigrator handles workspace table migration
type WorkspaceMigrator struct {
	logger *logger.Logger
}

// NewWorkspaceMigrator creates a new workspace migrator
func NewWorkspaceMigrator(logger *logger.Logger) *WorkspaceMigrator {
	return &WorkspaceMigrator{logger: logger}
}

// TableName returns the source table name
func (m *WorkspaceMigrator) TableName() string {
	return "workspaces"
}

// Migrate migrates workspaces from PostgreSQL to MongoDB
func (m *WorkspaceMigrator) Migrate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database, batchSize int, dryRun bool) error {
	query := `
		SELECT w.id, w.name, w.description, w.owner_id, w.created_at, w.updated_at,
		       array_agg(DISTINCT wm.user_id) as member_ids,
		       array_agg(DISTINCT wm.role) as member_roles
		FROM workspaces w
		LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
		GROUP BY w.id, w.name, w.description, w.owner_id, w.created_at, w.updated_at
		ORDER BY w.id
	`

	rows, err := sourceDB.QueryContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query workspaces: %w", err)
	}
	defer rows.Close()

	collection := targetDB.Collection("workspaces")
	userCollection := targetDB.Collection("users")
	var batch []interface{}
	var processed int

	for rows.Next() {
		var workspace struct {
			ID          int64     `db:"id"`
			Name        string    `db:"name"`
			Description string    `db:"description"`
			OwnerID     int64     `db:"owner_id"`
			CreatedAt   time.Time `db:"created_at"`
			UpdatedAt   time.Time `db:"updated_at"`
			MemberIDs   []int64   `db:"member_ids"`
			MemberRoles []string  `db:"member_roles"`
		}

		if err := rows.Scan(
			&workspace.ID, &workspace.Name, &workspace.Description,
			&workspace.OwnerID, &workspace.CreatedAt, &workspace.UpdatedAt,
			&workspace.MemberIDs, &workspace.MemberRoles,
		); err != nil {
			return fmt.Errorf("failed to scan workspace row: %w", err)
		}

		// Get owner ObjectID
		ownerObjectID, err := m.getUserObjectID(ctx, userCollection, workspace.OwnerID)
		if err != nil {
			return fmt.Errorf("failed to get owner ObjectID for workspace %d: %w", workspace.ID, err)
		}

		// Convert members
		var members []models.WorkspaceMember
		for i, memberID := range workspace.MemberIDs {
			if memberID == 0 { // Skip null values from array_agg
				continue
			}

			memberObjectID, err := m.getUserObjectID(ctx, userCollection, memberID)
			if err != nil {
				m.logger.Warn("Failed to get member ObjectID", "workspace_id", workspace.ID, "member_id", memberID, "error", err)
				continue
			}

			role := "member" // default role
			if i < len(workspace.MemberRoles) && workspace.MemberRoles[i] != "" {
				role = workspace.MemberRoles[i]
			}

			members = append(members, models.WorkspaceMember{
				UserID:   memberObjectID,
				Role:     role,
				JoinedAt: workspace.CreatedAt, // Use workspace creation time as default
			})
		}

		// Convert to MongoDB document
		mongoWorkspace := models.Workspace{
			ID:          primitive.NewObjectID(),
			Name:        workspace.Name,
			Description: workspace.Description,
			OwnerID:     ownerObjectID,
			Members:     members,
			Settings: models.WorkspaceSettings{
				Visibility:   models.WorkspaceVisibilityPrivate,
				AllowInvites: true,
			},
			CreatedAt: workspace.CreatedAt,
			UpdatedAt: workspace.UpdatedAt,
		}

		batch = append(batch, mongoWorkspace)
		processed++

		if len(batch) >= batchSize {
			if err := m.processBatch(ctx, collection, batch, dryRun); err != nil {
				return fmt.Errorf("failed to process batch: %w", err)
			}
			batch = batch[:0]
		}
	}

	if len(batch) > 0 {
		if err := m.processBatch(ctx, collection, batch, dryRun); err != nil {
			return fmt.Errorf("failed to process final batch: %w", err)
		}
	}

	m.logger.Info("Workspace migration completed", "processed", processed, "dry_run", dryRun)
	return nil
}

// getUserObjectID gets the MongoDB ObjectID for a PostgreSQL user ID
func (m *WorkspaceMigrator) getUserObjectID(ctx context.Context, userCollection *mongo.Collection, legacyID int64) (primitive.ObjectID, error) {
	filter := bson.M{"legacy_id": legacyID}
	var user models.User
	if err := userCollection.FindOne(ctx, filter).Decode(&user); err != nil {
		return primitive.NilObjectID, fmt.Errorf("user not found for legacy ID %d: %w", legacyID, err)
	}
	return user.ID, nil
}

// processBatch processes a batch of workspaces
func (m *WorkspaceMigrator) processBatch(ctx context.Context, collection *mongo.Collection, batch []interface{}, dryRun bool) error {
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

// Validate validates the migrated workspace data
func (m *WorkspaceMigrator) Validate(ctx context.Context, sourceDB *sql.DB, targetDB *mongo.Database) error {
	var sourceCount int64
	if err := sourceDB.QueryRowContext(ctx, "SELECT COUNT(*) FROM workspaces").Scan(&sourceCount); err != nil {
		return fmt.Errorf("failed to count source workspaces: %w", err)
	}

	collection := targetDB.Collection("workspaces")
	targetCount, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return fmt.Errorf("failed to count target workspaces: %w", err)
	}

	if sourceCount != targetCount {
		return fmt.Errorf("record count mismatch: source=%d, target=%d", sourceCount, targetCount)
	}

	m.logger.Info("Workspace validation completed", "count", sourceCount)
	return nil
}

// Rollback removes migrated workspaces
func (m *WorkspaceMigrator) Rollback(ctx context.Context, targetDB *mongo.Database, rollbackData []byte) error {
	collection := targetDB.Collection("workspaces")

	var data map[string]interface{}
	if len(rollbackData) > 0 {
		if err := json.Unmarshal(rollbackData, &data); err != nil {
			return fmt.Errorf("failed to parse rollback data: %w", err)
		}
	}

	filter := bson.M{}
	if legacyIDs, exists := data["legacy_ids"]; exists {
		filter = bson.M{"legacy_id": bson.M{"$in": legacyIDs}}
	}

	result, err := collection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete workspaces: %w", err)
	}

	m.logger.Info("Workspace rollback completed", "deleted", result.DeletedCount)
	return nil
}

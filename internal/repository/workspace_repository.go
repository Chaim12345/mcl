package repository

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"project-management-platform/internal/models"
)

// workspaceRepository implements WorkspaceRepository interface
type workspaceRepository struct {
	collection *mongo.Collection
}

// NewWorkspaceRepository creates a new workspace repository
func NewWorkspaceRepository(db *mongo.Database) WorkspaceRepository {
	return &workspaceRepository{
		collection: db.Collection("workspaces"),
	}
}

// Create creates a new workspace
func (r *workspaceRepository) Create(ctx context.Context, workspace *models.Workspace) (*mongo.InsertOneResult, error) {
	if err := workspace.Validate(); err != nil {
		return nil, fmt.Errorf("workspace validation failed: %w", err)
	}

	// Set timestamps
	now := time.Now()
	workspace.CreatedAt = now
	workspace.UpdatedAt = now

	result, err := r.collection.InsertOne(ctx, workspace)
	if err != nil {
		return nil, fmt.Errorf("failed to create workspace: %w", err)
	}

	return result, nil
}

// GetByID retrieves a workspace by ID
func (r *workspaceRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Workspace, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("workspace ID is required")
	}

	var workspace models.Workspace
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&workspace)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("workspace not found")
		}
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	return &workspace, nil
}

// GetByUserID retrieves workspaces where the user is a member
func (r *workspaceRepository) GetByUserID(ctx context.Context, userID primitive.ObjectID) ([]*models.Workspace, error) {
	if userID.IsZero() {
		return nil, fmt.Errorf("user ID is required")
	}

	filter := bson.M{
		"members.userId": userID,
	}

	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspaces by user ID: %w", err)
	}
	defer cursor.Close(ctx)

	var workspaces []*models.Workspace
	for cursor.Next(ctx) {
		var workspace models.Workspace
		if err := cursor.Decode(&workspace); err != nil {
			return nil, fmt.Errorf("failed to decode workspace: %w", err)
		}
		workspaces = append(workspaces, &workspace)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return workspaces, nil
}

// Update updates a workspace
func (r *workspaceRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("workspace ID is required")
	}

	if update == nil {
		return nil, fmt.Errorf("update data is required")
	}

	// Add updated timestamp
	update["updatedAt"] = time.Now()

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update workspace: %w", err)
	}

	if result.MatchedCount == 0 {
		return nil, fmt.Errorf("workspace not found")
	}

	return result, nil
}

// Delete deletes a workspace
func (r *workspaceRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("workspace ID is required")
	}

	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return nil, fmt.Errorf("failed to delete workspace: %w", err)
	}

	if result.DeletedCount == 0 {
		return nil, fmt.Errorf("workspace not found")
	}

	return result, nil
}

// List retrieves workspaces with pagination
func (r *workspaceRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Workspace, error) {
	if filter == nil {
		filter = bson.M{}
	}

	opts := options.Find()
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}
	opts.SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list workspaces: %w", err)
	}
	defer cursor.Close(ctx)

	var workspaces []*models.Workspace
	for cursor.Next(ctx) {
		var workspace models.Workspace
		if err := cursor.Decode(&workspace); err != nil {
			return nil, fmt.Errorf("failed to decode workspace: %w", err)
		}
		workspaces = append(workspaces, &workspace)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return workspaces, nil
}

// Count counts workspaces matching the filter
func (r *workspaceRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	if filter == nil {
		filter = bson.M{}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count workspaces: %w", err)
	}

	return count, nil
}

// AddMember adds a member to the workspace
func (r *workspaceRepository) AddMember(ctx context.Context, workspaceID, userID primitive.ObjectID, role string) error {
	if workspaceID.IsZero() {
		return fmt.Errorf("workspace ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	if role != models.WorkspaceRoleAdmin && role != models.WorkspaceRoleMember {
		return fmt.Errorf("invalid role: %s", role)
	}

	// Check if user is already a member
	filter := bson.M{
		"_id": workspaceID,
		"members.userId": userID,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check existing membership: %w", err)
	}

	if count > 0 {
		return fmt.Errorf("user is already a member of this workspace")
	}

	// Add member
	member := models.WorkspaceMember{
		UserID:   userID,
		Role:     role,
		JoinedAt: time.Now(),
	}

	update := bson.M{
		"$push": bson.M{"members": member},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": workspaceID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("workspace not found")
	}

	return nil
}

// RemoveMember removes a member from the workspace
func (r *workspaceRepository) RemoveMember(ctx context.Context, workspaceID, userID primitive.ObjectID) error {
	if workspaceID.IsZero() {
		return fmt.Errorf("workspace ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Check if user is the owner
	workspace, err := r.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	if workspace.OwnerID == userID {
		return fmt.Errorf("cannot remove workspace owner")
	}

	// Remove member
	update := bson.M{
		"$pull": bson.M{"members": bson.M{"userId": userID}},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": workspaceID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("workspace not found")
	}

	if result.ModifiedCount == 0 {
		return fmt.Errorf("user is not a member of this workspace")
	}

	return nil
}

// UpdateMemberRole updates a member's role
func (r *workspaceRepository) UpdateMemberRole(ctx context.Context, workspaceID, userID primitive.ObjectID, role string) error {
	if workspaceID.IsZero() {
		return fmt.Errorf("workspace ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	if role != models.WorkspaceRoleAdmin && role != models.WorkspaceRoleMember {
		return fmt.Errorf("invalid role: %s", role)
	}

	// Check if user is the owner
	workspace, err := r.GetByID(ctx, workspaceID)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	if workspace.OwnerID == userID {
		return fmt.Errorf("cannot change workspace owner's role")
	}

	// Update member role
	filter := bson.M{
		"_id": workspaceID,
		"members.userId": userID,
	}

	update := bson.M{
		"$set": bson.M{
			"members.$.role": role,
			"updatedAt":     time.Now(),
		},
	}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update member role: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("workspace or member not found")
	}

	return nil
}

// GetMembers retrieves all members of a workspace
func (r *workspaceRepository) GetMembers(ctx context.Context, workspaceID primitive.ObjectID) ([]models.WorkspaceMember, error) {
	if workspaceID.IsZero() {
		return nil, fmt.Errorf("workspace ID is required")
	}

	workspace, err := r.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	return workspace.Members, nil
}
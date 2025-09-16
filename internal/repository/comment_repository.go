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

// commentRepository implements CommentRepository interface
type commentRepository struct {
	collection *mongo.Collection
}

// NewCommentRepository creates a new comment repository
func NewCommentRepository(db *mongo.Database) CommentRepository {
	return &commentRepository{
		collection: db.Collection("comments"),
	}
}

// Create creates a new comment
func (r *commentRepository) Create(ctx context.Context, comment *models.Comment) (*mongo.InsertOneResult, error) {
	if err := comment.Validate(); err != nil {
		return nil, fmt.Errorf("comment validation failed: %w", err)
	}

	// Set timestamps
	now := time.Now()
	comment.CreatedAt = now
	comment.UpdatedAt = now

	result, err := r.collection.InsertOne(ctx, comment)
	if err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	return result, nil
}

// GetByID retrieves a comment by ID
func (r *commentRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("comment ID is required")
	}

	var comment models.Comment
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&comment)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("comment not found")
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}

	return &comment, nil
}

// GetByItemID retrieves comments by item ID
func (r *commentRepository) GetByItemID(ctx context.Context, itemID primitive.ObjectID) ([]*models.Comment, error) {
	if itemID.IsZero() {
		return nil, fmt.Errorf("item ID is required")
	}

	filter := bson.M{"itemId": itemID}
	opts := options.Find().SetSort(bson.M{"createdAt": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments by item ID: %w", err)
	}
	defer cursor.Close(ctx)

	var comments []*models.Comment
	for cursor.Next(ctx) {
		var comment models.Comment
		if err := cursor.Decode(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return comments, nil
}

// GetReplies retrieves replies to a comment
func (r *commentRepository) GetReplies(ctx context.Context, parentID primitive.ObjectID) ([]*models.Comment, error) {
	if parentID.IsZero() {
		return nil, fmt.Errorf("parent ID is required")
	}

	filter := bson.M{"parentId": parentID}
	opts := options.Find().SetSort(bson.M{"createdAt": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get replies: %w", err)
	}
	defer cursor.Close(ctx)

	var comments []*models.Comment
	for cursor.Next(ctx) {
		var comment models.Comment
		if err := cursor.Decode(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return comments, nil
}

// Update updates a comment
func (r *commentRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("comment ID is required")
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
		return nil, fmt.Errorf("failed to update comment: %w", err)
	}

	if result.MatchedCount == 0 {
		return nil, fmt.Errorf("comment not found")
	}

	return result, nil
}

// Delete deletes a comment
func (r *commentRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	if id.IsZero() {
		return nil, fmt.Errorf("comment ID is required")
	}

	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return nil, fmt.Errorf("failed to delete comment: %w", err)
	}

	if result.DeletedCount == 0 {
		return nil, fmt.Errorf("comment not found")
	}

	return result, nil
}

// List retrieves comments with pagination and filtering
func (r *commentRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Comment, error) {
	if filter == nil {
		filter = bson.M{}
	}

	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	if skip > 0 {
		opts.SetSkip(skip)
	}

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list comments: %w", err)
	}
	defer cursor.Close(ctx)

	var comments []*models.Comment
	for cursor.Next(ctx) {
		var comment models.Comment
		if err := cursor.Decode(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return comments, nil
}

// Count counts comments matching the filter
func (r *commentRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	if filter == nil {
		filter = bson.M{}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count comments: %w", err)
	}

	return count, nil
}

// FindWithFilter finds comments with a custom filter and options
func (r *commentRepository) FindWithFilter(ctx context.Context, filter bson.M, opts *options.FindOptions) ([]*models.Comment, error) {
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find comments with filter: %w", err)
	}
	defer cursor.Close(ctx)

	var comments []*models.Comment
	for cursor.Next(ctx) {
		var comment models.Comment
		if err := cursor.Decode(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return comments, nil
}

// CountWithFilter counts comments with a custom filter
func (r *commentRepository) CountWithFilter(ctx context.Context, filter bson.M) (int64, error) {
	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to count comments with filter: %w", err)
	}
	return count, nil
}

// Aggregate performs aggregation operations on comments
func (r *commentRepository) Aggregate(ctx context.Context, pipeline []bson.M) ([]bson.M, error) {
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate comments: %w", err)
	}
	defer cursor.Close(ctx)

	var results []bson.M
	for cursor.Next(ctx) {
		var result bson.M
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode aggregation result: %w", err)
		}
		results = append(results, result)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return results, nil
}

// AddMention adds a mention to a comment
func (r *commentRepository) AddMention(ctx context.Context, commentID, userID primitive.ObjectID) error {
	if commentID.IsZero() {
		return fmt.Errorf("comment ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Check if user is already mentioned
	filter := bson.M{
		"_id": commentID,
		"mentions": userID,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check existing mention: %w", err)
	}

	if count > 0 {
		return fmt.Errorf("user is already mentioned in this comment")
	}

	// Add mention
	update := bson.M{
		"$push": bson.M{"mentions": userID},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": commentID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to add mention: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("comment not found")
	}

	return nil
}

// RemoveMention removes a mention from a comment
func (r *commentRepository) RemoveMention(ctx context.Context, commentID, userID primitive.ObjectID) error {
	if commentID.IsZero() {
		return fmt.Errorf("comment ID is required")
	}

	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Remove mention
	update := bson.M{
		"$pull": bson.M{"mentions": userID},
		"$set":  bson.M{"updatedAt": time.Now()},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": commentID},
		update,
	)
	if err != nil {
		return fmt.Errorf("failed to remove mention: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("comment not found")
	}

	if result.ModifiedCount == 0 {
		return fmt.Errorf("user is not mentioned in this comment")
	}

	return nil
}

// GetByAuthor retrieves comments by author ID
func (r *commentRepository) GetByAuthor(ctx context.Context, authorID primitive.ObjectID) ([]*models.Comment, error) {
	if authorID.IsZero() {
		return nil, fmt.Errorf("author ID is required")
	}

	filter := bson.M{"authorId": authorID}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments by author: %w", err)
	}
	defer cursor.Close(ctx)

	var comments []*models.Comment
	for cursor.Next(ctx) {
		var comment models.Comment
		if err := cursor.Decode(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return comments, nil
}
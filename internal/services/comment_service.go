package services

import (
	"context"
	"fmt"
	"regexp"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

type CommentService struct {
	commentRepo      repository.CommentRepository
	activityRepo     repository.ActivityRepository
	notificationRepo repository.NotificationRepository
	userRepo         repository.UserRepository
	itemRepo         repository.ItemRepository
	boardRepo        repository.BoardRepository
}

func NewCommentService(
	commentRepo repository.CommentRepository,
	activityRepo repository.ActivityRepository,
	notificationRepo repository.NotificationRepository,
	userRepo repository.UserRepository,
	itemRepo repository.ItemRepository,
	boardRepo repository.BoardRepository,
) *CommentService {
	return &CommentService{
		commentRepo:      commentRepo,
		activityRepo:     activityRepo,
		notificationRepo: notificationRepo,
		userRepo:         userRepo,
		itemRepo:         itemRepo,
		boardRepo:        boardRepo,
	}
}

// Create a new comment for an item
func (s *CommentService) Create(ctx context.Context, content string, itemID, authorID primitive.ObjectID, parentID *primitive.ObjectID) (*models.Comment, error) {
	// Get item details for activity logging
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	// Get author details
	author, err := s.userRepo.GetByID(ctx, authorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get author: %w", err)
	}

	// Create comment
	var comment *models.Comment
	if parentID != nil && !parentID.IsZero() {
		comment = models.NewReply(content, itemID, *parentID, authorID)
	} else {
		comment = models.NewComment(content, itemID, authorID)
	}

	// Parse mentions from content
	mentions := s.parseMentions(content)
	for _, mentionID := range mentions {
		if err := comment.AddMention(mentionID); err != nil {
			// Log error but don't fail the comment creation
			continue
		}
	}

	if err := comment.Validate(); err != nil {
		return nil, err
	}

	// Create comment in database
	_, err = s.commentRepo.Create(ctx, comment)
	if err != nil {
		return nil, err
	}

	// Get board details to get workspace ID for activity logging
	board, err := s.getBoardByID(ctx, item.BoardID)
	if err != nil {
		// Log error but don't fail the comment creation
		return comment, nil
	}

	// Log activity
	activity := models.NewCommentActivity(
		models.ActivityCommentAdded,
		comment.ID,
		authorID,
		board.WorkspaceID,
		item.BoardID,
		itemID,
	)
	activity.SetCommentData(content, mentions)

	if _, err := s.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the comment creation
		// In production, you might want to use a proper logger
	}

	// Send notifications for mentions
	if err := s.sendMentionNotifications(ctx, comment, mentions, author, item); err != nil {
		// Log error but don't fail the comment creation
	}

	return comment, nil
}

// Get comment by ID
func (s *CommentService) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Comment, error) {
	return s.commentRepo.GetByID(ctx, id)
}

// Get all top-level comments for an item with threading support
func (s *CommentService) GetByItemID(ctx context.Context, itemID primitive.ObjectID) ([]*models.Comment, error) {
	return s.commentRepo.GetByItemID(ctx, itemID)
}

// GetCommentsWithReplies gets comments with their replies in a threaded structure
func (s *CommentService) GetCommentsWithReplies(ctx context.Context, itemID primitive.ObjectID) ([]*CommentWithReplies, error) {
	// Get top-level comments
	comments, err := s.commentRepo.GetByItemID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	var result []*CommentWithReplies
	for _, comment := range comments {
		// Get replies for each comment
		replies, err := s.commentRepo.GetReplies(ctx, comment.ID)
		if err != nil {
			return nil, err
		}

		commentWithReplies := &CommentWithReplies{
			Comment: comment,
			Replies: replies,
		}
		result = append(result, commentWithReplies)
	}

	return result, nil
}

// CommentWithReplies represents a comment with its replies
type CommentWithReplies struct {
	Comment *models.Comment   `json:"comment"`
	Replies []*models.Comment `json:"replies"`
}

// Get all replies for a comment
func (s *CommentService) GetReplies(ctx context.Context, parentID primitive.ObjectID) ([]*models.Comment, error) {
	return s.commentRepo.GetReplies(ctx, parentID)
}

// Update a comment's content
func (s *CommentService) Update(ctx context.Context, id primitive.ObjectID, newContent string, userID primitive.ObjectID) (*models.Comment, error) {
	comment, err := s.commentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check if user is authorized to update this comment
	if comment.AuthorID != userID {
		return nil, fmt.Errorf("unauthorized: only the comment author can update the comment")
	}

	// Get item details for activity logging
	item, err := s.itemRepo.GetByID(ctx, comment.ItemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get item: %w", err)
	}

	// Store old content for activity logging
	oldContent := comment.Content

	// Update content
	if err := comment.UpdateContent(newContent); err != nil {
		return nil, err
	}

	if err := comment.ValidateForUpdate(); err != nil {
		return nil, err
	}

	// Parse new mentions
	newMentions := s.parseMentions(newContent)

	// Update mentions in comment
	comment.Mentions = newMentions

	update := bson.M{
		"content":     comment.Content,
		"editHistory": comment.EditHistory,
		"updatedAt":   comment.UpdatedAt,
		"mentions":    comment.Mentions,
	}

	_, err = s.commentRepo.Update(ctx, id, update)
	if err != nil {
		return nil, err
	}

	// Get board details to get workspace ID for activity logging
	board, err := s.getBoardByID(ctx, item.BoardID)
	if err != nil {
		// Log error but don't fail the update
		return comment, nil
	}

	// Log activity
	activity := models.NewCommentActivity(
		models.ActivityCommentUpdated,
		comment.ID,
		userID,
		board.WorkspaceID,
		item.BoardID,
		comment.ItemID,
	)
	activity.SetData("oldContent", oldContent)
	activity.SetData("newContent", newContent)

	if _, err := s.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the update
	}

	// Send notifications for new mentions
	author, err := s.userRepo.GetByID(ctx, userID)
	if err == nil {
		if err := s.sendMentionNotifications(ctx, comment, newMentions, author, item); err != nil {
			// Log error but don't fail the update
		}
	}

	return comment, nil
}

// Delete a comment
func (s *CommentService) Delete(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) error {
	comment, err := s.commentRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Check if user is authorized to delete this comment
	if comment.AuthorID != userID {
		return fmt.Errorf("unauthorized: only the comment author can delete the comment")
	}

	// Get item details for activity logging
	item, err := s.itemRepo.GetByID(ctx, comment.ItemID)
	if err != nil {
		return fmt.Errorf("failed to get item: %w", err)
	}

	// Delete the comment
	_, err = s.commentRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	// Get board details to get workspace ID for activity logging
	board, err := s.getBoardByID(ctx, item.BoardID)
	if err != nil {
		// Log error but don't fail the deletion
		return nil
	}

	// Log activity
	activity := models.NewCommentActivity(
		models.ActivityCommentDeleted,
		comment.ID,
		userID,
		board.WorkspaceID,
		item.BoardID,
		comment.ItemID,
	)
	activity.SetData("deletedContent", comment.Content)

	if _, err := s.activityRepo.Create(ctx, activity); err != nil {
		// Log error but don't fail the deletion
	}

	return nil
}

// List comments with filter, pagination
func (s *CommentService) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Comment, error) {
	return s.commentRepo.List(ctx, filter, limit, skip)
}

// Count comments with filter
func (s *CommentService) Count(ctx context.Context, filter bson.M) (int64, error) {
	return s.commentRepo.Count(ctx, filter)
}

// parseMentions extracts user mentions from comment content
// Expects mentions in format @[userID] or @username (simplified for now)
func (s *CommentService) parseMentions(content string) []primitive.ObjectID {
	// Simple regex to match @[ObjectID] format
	re := regexp.MustCompile(`@\[([a-f0-9]{24})\]`)
	matches := re.FindAllStringSubmatch(content, -1)

	var mentions []primitive.ObjectID
	for _, match := range matches {
		if len(match) > 1 {
			if objID, err := primitive.ObjectIDFromHex(match[1]); err == nil {
				mentions = append(mentions, objID)
			}
		}
	}

	return mentions
}

// sendMentionNotifications sends notifications to mentioned users
func (s *CommentService) sendMentionNotifications(ctx context.Context, comment *models.Comment, mentions []primitive.ObjectID, author *models.User, item *models.Item) error {
	for _, mentionedUserID := range mentions {
		// Don't notify the author about their own mention
		if mentionedUserID == author.ID {
			continue
		}

		// Create mention notification
		notification := models.NewMentionNotification(
			mentionedUserID,
			author.ID,
			item.ID,
			item.Name,
			author.FirstName+" "+author.LastName,
		)

		// Add comment-specific data
		notification.SetData("commentId", comment.ID)
		notification.SetData("commentContent", comment.Content)

		// Create notification
		if _, err := s.notificationRepo.Create(ctx, notification); err != nil {
			// Log error but continue with other notifications
			continue
		}
	}

	return nil
}

// AddMention adds a mention to an existing comment
func (s *CommentService) AddMention(ctx context.Context, commentID, userID primitive.ObjectID) error {
	return s.commentRepo.AddMention(ctx, commentID, userID)
}

// RemoveMention removes a mention from an existing comment
func (s *CommentService) RemoveMention(ctx context.Context, commentID, userID primitive.ObjectID) error {
	return s.commentRepo.RemoveMention(ctx, commentID, userID)
}

// GetByAuthor retrieves comments by author
func (s *CommentService) GetByAuthor(ctx context.Context, authorID primitive.ObjectID) ([]*models.Comment, error) {
	return s.commentRepo.GetByAuthor(ctx, authorID)
}

// AddAttachment adds an attachment to a comment
func (s *CommentService) AddAttachment(ctx context.Context, commentID primitive.ObjectID, filename, url, mimeType string, size int64) error {
	comment, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}

	if err := comment.AddAttachment(filename, url, mimeType, size); err != nil {
		return err
	}

	update := bson.M{
		"attachments": comment.Attachments,
		"updatedAt":   comment.UpdatedAt,
	}

	_, err = s.commentRepo.Update(ctx, commentID, update)
	return err
}

// RemoveAttachment removes an attachment from a comment
func (s *CommentService) RemoveAttachment(ctx context.Context, commentID primitive.ObjectID, filename string) error {
	comment, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}

	if err := comment.RemoveAttachment(filename); err != nil {
		return err
	}

	update := bson.M{
		"attachments": comment.Attachments,
		"updatedAt":   comment.UpdatedAt,
	}

	_, err = s.commentRepo.Update(ctx, commentID, update)
	return err
}

// getBoardByID is a helper method to get board details
func (s *CommentService) getBoardByID(ctx context.Context, boardID primitive.ObjectID) (*models.Board, error) {
	return s.boardRepo.GetByID(ctx, boardID)
}

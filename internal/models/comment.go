package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Comment represents a comment document in MongoDB
type Comment struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Content     string               `bson:"content" json:"content"`
	ItemID      primitive.ObjectID   `bson:"itemId" json:"itemId"`
	ParentID    *primitive.ObjectID  `bson:"parentId,omitempty" json:"parentId,omitempty"` // For threaded comments
	AuthorID    primitive.ObjectID   `bson:"authorId" json:"authorId"`
	Mentions    []primitive.ObjectID `bson:"mentions,omitempty" json:"mentions,omitempty"`
	Attachments []CommentAttachment  `bson:"attachments,omitempty" json:"attachments,omitempty"`
	EditHistory []CommentEdit        `bson:"editHistory,omitempty" json:"editHistory,omitempty"`
	CreatedAt   time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time            `bson:"updatedAt" json:"updatedAt"`
}

// CommentAttachment represents a file attachment in a comment
type CommentAttachment struct {
	Filename string `bson:"filename" json:"filename"`
	URL      string `bson:"url" json:"url"`
	Size     int64  `bson:"size" json:"size"`
	MimeType string `bson:"mimeType" json:"mimeType"`
}

// CommentEdit represents an edit in the comment's history
type CommentEdit struct {
	Content  string    `bson:"content" json:"content"`
	EditedAt time.Time `bson:"editedAt" json:"editedAt"`
}

// NewComment creates a new comment with default values
func NewComment(content string, itemID, authorID primitive.ObjectID) *Comment {
	now := time.Now()
	return &Comment{
		ID:          primitive.NewObjectID(),
		Content:     content,
		ItemID:      itemID,
		AuthorID:    authorID,
		Mentions:    []primitive.ObjectID{},
		Attachments: []CommentAttachment{},
		EditHistory: []CommentEdit{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// NewReply creates a new reply comment
func NewReply(content string, itemID, parentID, authorID primitive.ObjectID) *Comment {
	comment := NewComment(content, itemID, authorID)
	comment.ParentID = &parentID
	return comment
}

// Validate validates the comment data
func (c *Comment) Validate() error {
	if c.Content == "" {
		return fmt.Errorf("comment content is required")
	}

	if len(c.Content) > 2000 {
		return fmt.Errorf("comment content must be less than 2000 characters")
	}

	if c.ItemID.IsZero() {
		return fmt.Errorf("item ID is required")
	}

	if c.AuthorID.IsZero() {
		return fmt.Errorf("author ID is required")
	}

	// Validate attachments
	for i, attachment := range c.Attachments {
		if attachment.Filename == "" {
			return fmt.Errorf("attachment %d: filename is required", i)
		}

		if attachment.URL == "" {
			return fmt.Errorf("attachment %d: URL is required", i)
		}

		if attachment.Size < 0 {
			return fmt.Errorf("attachment %d: size must be non-negative", i)
		}

		if len(attachment.Filename) > 255 {
			return fmt.Errorf("attachment %d: filename must be less than 255 characters", i)
		}
	}

	return nil
}

// ValidateForUpdate validates comment data for update operations
func (c *Comment) ValidateForUpdate() error {
	if c.Content != "" && len(c.Content) > 2000 {
		return fmt.Errorf("comment content must be less than 2000 characters")
	}

	return nil
}

// ToBSON converts the comment to BSON for MongoDB operations
func (c *Comment) ToBSON() (bson.M, error) {
	data, err := bson.Marshal(c)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal comment to BSON: %w", err)
	}

	var bsonDoc bson.M
	err = bson.Unmarshal(data, &bsonDoc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal comment BSON: %w", err)
	}

	return bsonDoc, nil
}

// FromBSON populates the comment from BSON data
func (c *Comment) FromBSON(data bson.M) error {
	bsonData, err := bson.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal BSON data: %w", err)
	}

	err = bson.Unmarshal(bsonData, c)
	if err != nil {
		return fmt.Errorf("failed to unmarshal BSON to comment: %w", err)
	}

	return nil
}

// UpdateContent updates the comment content and adds to edit history
func (c *Comment) UpdateContent(newContent string) error {
	if newContent == "" {
		return fmt.Errorf("comment content is required")
	}

	if len(newContent) > 2000 {
		return fmt.Errorf("comment content must be less than 2000 characters")
	}

	// Add current content to edit history
	if c.Content != "" {
		c.EditHistory = append(c.EditHistory, CommentEdit{
			Content:  c.Content,
			EditedAt: time.Now(),
		})
	}

	c.Content = newContent
	c.UpdatedAt = time.Now()

	return nil
}

// AddMention adds a user mention to the comment
func (c *Comment) AddMention(userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	// Check if already mentioned
	for _, mention := range c.Mentions {
		if mention == userID {
			return fmt.Errorf("user is already mentioned in this comment")
		}
	}

	c.Mentions = append(c.Mentions, userID)
	c.UpdatedAt = time.Now()
	return nil
}

// RemoveMention removes a user mention from the comment
func (c *Comment) RemoveMention(userID primitive.ObjectID) error {
	if userID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	for i, mention := range c.Mentions {
		if mention == userID {
			c.Mentions = append(c.Mentions[:i], c.Mentions[i+1:]...)
			c.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("user is not mentioned in this comment")
}

// AddAttachment adds a file attachment to the comment
func (c *Comment) AddAttachment(filename, url, mimeType string, size int64) error {
	if filename == "" {
		return fmt.Errorf("filename is required")
	}

	if url == "" {
		return fmt.Errorf("URL is required")
	}

	if size < 0 {
		return fmt.Errorf("size must be non-negative")
	}

	if len(filename) > 255 {
		return fmt.Errorf("filename must be less than 255 characters")
	}

	attachment := CommentAttachment{
		Filename: filename,
		URL:      url,
		Size:     size,
		MimeType: mimeType,
	}

	c.Attachments = append(c.Attachments, attachment)
	c.UpdatedAt = time.Now()

	return nil
}

// RemoveAttachment removes an attachment by filename
func (c *Comment) RemoveAttachment(filename string) error {
	if filename == "" {
		return fmt.Errorf("filename is required")
	}

	for i, attachment := range c.Attachments {
		if attachment.Filename == filename {
			c.Attachments = append(c.Attachments[:i], c.Attachments[i+1:]...)
			c.UpdatedAt = time.Now()
			return nil
		}
	}

	return fmt.Errorf("attachment not found: %s", filename)
}

// IsMentioned checks if a user is mentioned in the comment
func (c *Comment) IsMentioned(userID primitive.ObjectID) bool {
	for _, mention := range c.Mentions {
		if mention == userID {
			return true
		}
	}
	return false
}

// IsReply checks if this comment is a reply to another comment
func (c *Comment) IsReply() bool {
	return c.ParentID != nil && !c.ParentID.IsZero()
}

// IsEdited checks if the comment has been edited
func (c *Comment) IsEdited() bool {
	return len(c.EditHistory) > 0
}

// GetAttachmentCount returns the number of attachments
func (c *Comment) GetAttachmentCount() int {
	return len(c.Attachments)
}

// GetMentionCount returns the number of mentions
func (c *Comment) GetMentionCount() int {
	return len(c.Mentions)
}
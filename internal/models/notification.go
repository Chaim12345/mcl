package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Notification represents a notification document in MongoDB
type Notification struct {
	ID        primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID     `bson:"userId" json:"userId"`
	Type      string                 `bson:"type" json:"type"`
	Title     string                 `bson:"title" json:"title"`
	Message   string                 `bson:"message" json:"message"`
	Data      map[string]interface{} `bson:"data,omitempty" json:"data,omitempty"`
	Read      bool                   `bson:"read" json:"read"`
	ReadAt    *time.Time             `bson:"readAt,omitempty" json:"readAt,omitempty"`
	Channels  NotificationChannels   `bson:"channels" json:"channels"`
	CreatedAt time.Time              `bson:"createdAt" json:"createdAt"`
}

// NotificationChannels holds information about notification delivery channels
type NotificationChannels struct {
	InApp       bool       `bson:"inApp" json:"inApp"`
	Email       bool       `bson:"email" json:"email"`
	EmailSentAt *time.Time `bson:"emailSentAt,omitempty" json:"emailSentAt,omitempty"`
}

// Notification type constants
const (
	NotificationTypeMention           = "mention"
	NotificationTypeItemAssigned      = "item_assigned"
	NotificationTypeItemUpdated       = "item_updated"
	NotificationTypeCommentAdded      = "comment_added"
	NotificationTypeWorkspaceInvite   = "workspace_invite"
	NotificationTypeBoardShared       = "board_shared"
	NotificationTypeItemDue           = "item_due"
	NotificationTypePasswordReset     = "password_reset"
	NotificationTypeEmailVerification = "email_verification"
)

// NewNotification creates a new notification with default values
func NewNotification(userID primitive.ObjectID, notificationType, title, message string) *Notification {
	return &Notification{
		ID:      primitive.NewObjectID(),
		UserID:  userID,
		Type:    notificationType,
		Title:   title,
		Message: message,
		Data:    make(map[string]interface{}),
		Read:    false,
		Channels: NotificationChannels{
			InApp: true,
			Email: false,
		},
		CreatedAt: time.Now(),
	}
}

// NewMentionNotification creates a mention notification
func NewMentionNotification(userID, mentionedBy, itemID primitive.ObjectID, itemName, mentionedByName string) *Notification {
	notification := NewNotification(
		userID,
		NotificationTypeMention,
		"You were mentioned",
		fmt.Sprintf("%s mentioned you in %s", mentionedByName, itemName),
	)

	notification.SetData("mentionedBy", mentionedBy)
	notification.SetData("itemId", itemID)
	notification.SetData("itemName", itemName)
	notification.SetData("mentionedByName", mentionedByName)
	notification.Channels.Email = true

	return notification
}

// NewItemAssignedNotification creates an item assignment notification
func NewItemAssignedNotification(userID, assignedBy, itemID primitive.ObjectID, itemName, assignedByName string) *Notification {
	notification := NewNotification(
		userID,
		NotificationTypeItemAssigned,
		"Item assigned to you",
		fmt.Sprintf("%s assigned %s to you", assignedByName, itemName),
	)

	notification.SetData("assignedBy", assignedBy)
	notification.SetData("itemId", itemID)
	notification.SetData("itemName", itemName)
	notification.SetData("assignedByName", assignedByName)
	notification.Channels.Email = true

	return notification
}

// NewCommentNotification creates a comment notification
func NewCommentNotification(userID, commenterID, itemID primitive.ObjectID, itemName, commenterName string) *Notification {
	notification := NewNotification(
		userID,
		NotificationTypeCommentAdded,
		"New comment",
		fmt.Sprintf("%s commented on %s", commenterName, itemName),
	)

	notification.SetData("commenterId", commenterID)
	notification.SetData("itemId", itemID)
	notification.SetData("itemName", itemName)
	notification.SetData("commenterName", commenterName)

	return notification
}

// NewWorkspaceInviteNotification creates a workspace invitation notification
func NewWorkspaceInviteNotification(userID, inviterID, workspaceID primitive.ObjectID, workspaceName, inviterName string) *Notification {
	notification := NewNotification(
		userID,
		NotificationTypeWorkspaceInvite,
		"Workspace invitation",
		fmt.Sprintf("%s invited you to join %s", inviterName, workspaceName),
	)

	notification.SetData("inviterId", inviterID)
	notification.SetData("workspaceId", workspaceID)
	notification.SetData("workspaceName", workspaceName)
	notification.SetData("inviterName", inviterName)
	notification.Channels.Email = true

	return notification
}

// NewPasswordResetNotification creates a password reset notification
func NewPasswordResetNotification(userID primitive.ObjectID, resetToken string) *Notification {
	notification := NewNotification(
		userID,
		NotificationTypePasswordReset,
		"Password reset requested",
		"A password reset was requested for your account",
	)

	notification.SetData("resetToken", resetToken)
	notification.Channels.InApp = false
	notification.Channels.Email = true

	return notification
}

// NewEmailVerificationNotification creates an email verification notification
func NewEmailVerificationNotification(userID primitive.ObjectID, verificationToken string) *Notification {
	notification := NewNotification(
		userID,
		NotificationTypeEmailVerification,
		"Verify your email",
		"Please verify your email address to complete registration",
	)

	notification.SetData("verificationToken", verificationToken)
	notification.Channels.InApp = false
	notification.Channels.Email = true

	return notification
}

// Validate validates the notification data
func (n *Notification) Validate() error {
	if n.UserID.IsZero() {
		return fmt.Errorf("user ID is required")
	}

	if n.Type == "" {
		return fmt.Errorf("notification type is required")
	}

	if !isValidNotificationType(n.Type) {
		return fmt.Errorf("invalid notification type: %s", n.Type)
	}

	if n.Title == "" {
		return fmt.Errorf("notification title is required")
	}

	if len(n.Title) > 100 {
		return fmt.Errorf("notification title must be less than 100 characters")
	}

	if n.Message == "" {
		return fmt.Errorf("notification message is required")
	}

	if len(n.Message) > 500 {
		return fmt.Errorf("notification message must be less than 500 characters")
	}

	return nil
}

// ToBSON converts the notification to BSON for MongoDB operations
func (n *Notification) ToBSON() (bson.M, error) {
	data, err := bson.Marshal(n)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal notification to BSON: %w", err)
	}

	var bsonDoc bson.M
	err = bson.Unmarshal(data, &bsonDoc)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal notification BSON: %w", err)
	}

	return bsonDoc, nil
}

// FromBSON populates the notification from BSON data
func (n *Notification) FromBSON(data bson.M) error {
	bsonData, err := bson.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal BSON data: %w", err)
	}

	err = bson.Unmarshal(bsonData, n)
	if err != nil {
		return fmt.Errorf("failed to unmarshal BSON to notification: %w", err)
	}

	return nil
}

// SetData sets notification-specific data
func (n *Notification) SetData(key string, value interface{}) {
	if n.Data == nil {
		n.Data = make(map[string]interface{})
	}
	n.Data[key] = value
}

// GetData gets notification-specific data
func (n *Notification) GetData(key string) (interface{}, bool) {
	if n.Data == nil {
		return nil, false
	}
	value, exists := n.Data[key]
	return value, exists
}

// MarkAsRead marks the notification as read
func (n *Notification) MarkAsRead() {
	if !n.Read {
		n.Read = true
		now := time.Now()
		n.ReadAt = &now
	}
}

// MarkAsUnread marks the notification as unread
func (n *Notification) MarkAsUnread() {
	n.Read = false
	n.ReadAt = nil
}

// SetEmailSent marks the email as sent
func (n *Notification) SetEmailSent() {
	now := time.Now()
	n.Channels.EmailSentAt = &now
}

// IsEmailSent checks if the email has been sent
func (n *Notification) IsEmailSent() bool {
	return n.Channels.EmailSentAt != nil
}

// ShouldSendEmail checks if an email should be sent for this notification
func (n *Notification) ShouldSendEmail() bool {
	return n.Channels.Email && !n.IsEmailSent()
}

// ShouldShowInApp checks if this notification should be shown in-app
func (n *Notification) ShouldShowInApp() bool {
	return n.Channels.InApp
}

// IsActionable checks if this notification requires user action
func (n *Notification) IsActionable() bool {
	actionableTypes := []string{
		NotificationTypeWorkspaceInvite,
		NotificationTypePasswordReset,
		NotificationTypeEmailVerification,
	}

	for _, actionableType := range actionableTypes {
		if n.Type == actionableType {
			return true
		}
	}

	return false
}

// GetAge returns the age of the notification
func (n *Notification) GetAge() time.Duration {
	return time.Since(n.CreatedAt)
}

// IsExpired checks if the notification is expired (older than 30 days)
func (n *Notification) IsExpired() bool {
	return n.GetAge() > 30*24*time.Hour
}

// isValidNotificationType checks if the notification type is valid
func isValidNotificationType(notificationType string) bool {
	validTypes := []string{
		NotificationTypeMention,
		NotificationTypeItemAssigned,
		NotificationTypeItemUpdated,
		NotificationTypeCommentAdded,
		NotificationTypeWorkspaceInvite,
		NotificationTypeBoardShared,
		NotificationTypeItemDue,
		NotificationTypePasswordReset,
		NotificationTypeEmailVerification,
	}

	for _, validType := range validTypes {
		if notificationType == validType {
			return true
		}
	}

	return false
}
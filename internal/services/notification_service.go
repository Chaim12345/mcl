package services

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// NotificationService handles notification operations
type NotificationService interface {
	// Core notification operations
	CreateNotification(ctx context.Context, notification *models.Notification) error
	GetNotification(ctx context.Context, id primitive.ObjectID) (*models.Notification, error)
	GetUserNotifications(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Notification, error)
	GetUnreadNotifications(ctx context.Context, userID primitive.ObjectID) ([]*models.Notification, error)
	MarkAsRead(ctx context.Context, id primitive.ObjectID) error
	MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error
	GetUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error)
	DeleteNotification(ctx context.Context, id primitive.ObjectID) error

	// Email notification dispatch
	ProcessPendingEmails(ctx context.Context) error
	SendNotificationEmail(ctx context.Context, notification *models.Notification) error

	// Notification preferences
	UpdateNotificationPreferences(ctx context.Context, userID primitive.ObjectID, preferences models.NotificationPreferences) error
	GetNotificationPreferences(ctx context.Context, userID primitive.ObjectID) (*models.NotificationPreferences, error)

	// Cleanup operations
	CleanupExpiredNotifications(ctx context.Context) error
}

// NotificationServiceImpl implements NotificationService
type NotificationServiceImpl struct {
	notificationRepo repository.NotificationRepository
	userRepo         repository.UserRepository
	emailService     EmailService
	logger           *slog.Logger
}

// NewNotificationService creates a new notification service
func NewNotificationService(
	notificationRepo repository.NotificationRepository,
	userRepo repository.UserRepository,
	emailService EmailService,
	logger *slog.Logger,
) NotificationService {
	return &NotificationServiceImpl{
		notificationRepo: notificationRepo,
		userRepo:         userRepo,
		emailService:     emailService,
		logger:           logger,
	}
}

// CreateNotification creates a new notification and optionally sends email
func (s *NotificationServiceImpl) CreateNotification(ctx context.Context, notification *models.Notification) error {
	// Validate notification
	if err := notification.Validate(); err != nil {
		s.logger.Error("Invalid notification", "error", err)
		return fmt.Errorf("invalid notification: %w", err)
	}

	// Get user preferences to determine if email should be sent
	user, err := s.userRepo.GetByID(ctx, notification.UserID)
	if err != nil {
		s.logger.Error("Failed to get user for notification", "userID", notification.UserID, "error", err)
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Apply user preferences
	s.applyUserPreferences(notification, user)

	// Create notification in database
	_, err = s.notificationRepo.Create(ctx, notification)
	if err != nil {
		s.logger.Error("Failed to create notification", "error", err)
		return fmt.Errorf("failed to create notification: %w", err)
	}

	s.logger.Info("Notification created", 
		"id", notification.ID, 
		"userID", notification.UserID, 
		"type", notification.Type,
		"emailEnabled", notification.Channels.Email)

	// Send email immediately if enabled and not already sent
	if notification.ShouldSendEmail() {
		if err := s.SendNotificationEmail(ctx, notification); err != nil {
			s.logger.Error("Failed to send notification email", 
				"notificationID", notification.ID, 
				"error", err)
			// Don't return error - notification was created successfully
		}
	}

	return nil
}

// GetNotification retrieves a notification by ID
func (s *NotificationServiceImpl) GetNotification(ctx context.Context, id primitive.ObjectID) (*models.Notification, error) {
	notification, err := s.notificationRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get notification", "id", id, "error", err)
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}

	return notification, nil
}

// GetUserNotifications retrieves notifications for a user with pagination
func (s *NotificationServiceImpl) GetUserNotifications(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Notification, error) {
	notifications, err := s.notificationRepo.GetByUserID(ctx, userID, limit, skip)
	if err != nil {
		s.logger.Error("Failed to get user notifications", "userID", userID, "error", err)
		return nil, fmt.Errorf("failed to get user notifications: %w", err)
	}

	return notifications, nil
}

// GetUnreadNotifications retrieves unread notifications for a user
func (s *NotificationServiceImpl) GetUnreadNotifications(ctx context.Context, userID primitive.ObjectID) ([]*models.Notification, error) {
	notifications, err := s.notificationRepo.GetUnreadByUserID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get unread notifications", "userID", userID, "error", err)
		return nil, fmt.Errorf("failed to get unread notifications: %w", err)
	}

	return notifications, nil
}

// MarkAsRead marks a notification as read
func (s *NotificationServiceImpl) MarkAsRead(ctx context.Context, id primitive.ObjectID) error {
	err := s.notificationRepo.MarkAsRead(ctx, id)
	if err != nil {
		s.logger.Error("Failed to mark notification as read", "id", id, "error", err)
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	s.logger.Info("Notification marked as read", "id", id)
	return nil
}

// MarkAllAsRead marks all notifications as read for a user
func (s *NotificationServiceImpl) MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error {
	err := s.notificationRepo.MarkAllAsRead(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to mark all notifications as read", "userID", userID, "error", err)
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	s.logger.Info("All notifications marked as read", "userID", userID)
	return nil
}

// GetUnreadCount gets the count of unread notifications for a user
func (s *NotificationServiceImpl) GetUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	count, err := s.notificationRepo.GetUnreadCount(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get unread count", "userID", userID, "error", err)
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return count, nil
}

// DeleteNotification deletes a notification
func (s *NotificationServiceImpl) DeleteNotification(ctx context.Context, id primitive.ObjectID) error {
	_, err := s.notificationRepo.Delete(ctx, id)
	if err != nil {
		s.logger.Error("Failed to delete notification", "id", id, "error", err)
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	s.logger.Info("Notification deleted", "id", id)
	return nil
}

// ProcessPendingEmails processes notifications that need email sending
func (s *NotificationServiceImpl) ProcessPendingEmails(ctx context.Context) error {
	// Get notifications that need email sending
	notifications, err := s.notificationRepo.GetPendingEmails(ctx, 100) // Process up to 100 at a time
	if err != nil {
		s.logger.Error("Failed to get pending email notifications", "error", err)
		return fmt.Errorf("failed to get pending email notifications: %w", err)
	}

	s.logger.Info("Processing pending email notifications", "count", len(notifications))

	successCount := 0
	errorCount := 0

	for _, notification := range notifications {
		if err := s.SendNotificationEmail(ctx, notification); err != nil {
			s.logger.Error("Failed to send notification email", 
				"notificationID", notification.ID, 
				"error", err)
			errorCount++
		} else {
			successCount++
		}
	}

	s.logger.Info("Finished processing pending emails", 
		"success", successCount, 
		"errors", errorCount)

	return nil
}

// SendNotificationEmail sends an email for a notification
func (s *NotificationServiceImpl) SendNotificationEmail(ctx context.Context, notification *models.Notification) error {
	// Get user details
	user, err := s.userRepo.GetByID(ctx, notification.UserID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	var emailErr error

	// Handle template-based notifications
	if s.hasEmailTemplate(notification.Type) {
		templateName, templateData, err := s.getEmailTemplateData(notification, user)
		if err != nil {
			return fmt.Errorf("failed to get email template data: %w", err)
		}

		// Send email using template
		emailErr = s.emailService.SendTemplateEmail(user.Email, notification.Title, templateName, templateData)
	} else {
		// Send as HTML email for other notification types
		emailErr = s.sendHTMLNotificationEmail(user, notification)
	}

	if emailErr != nil {
		return fmt.Errorf("failed to send email: %w", emailErr)
	}

	// Mark email as sent
	if err := s.notificationRepo.MarkEmailSent(ctx, notification.ID); err != nil {
		s.logger.Error("Failed to mark email as sent", "notificationID", notification.ID, "error", err)
		// Don't return error as email was sent successfully
	}

	s.logger.Info("Notification email sent", 
		"notificationID", notification.ID, 
		"userEmail", user.Email, 
		"type", notification.Type)

	return nil
}

// UpdateNotificationPreferences updates user notification preferences
func (s *NotificationServiceImpl) UpdateNotificationPreferences(ctx context.Context, userID primitive.ObjectID, preferences models.NotificationPreferences) error {
	// Update user preferences in database
	update := bson.M{
		"$set": bson.M{
			"preferences.notifications": preferences,
			"updatedAt":                 time.Now(),
		},
	}

	_, err := s.userRepo.Update(ctx, userID, update)
	if err != nil {
		s.logger.Error("Failed to update notification preferences", "userID", userID, "error", err)
		return fmt.Errorf("failed to update notification preferences: %w", err)
	}

	s.logger.Info("Notification preferences updated", "userID", userID)
	return nil
}

// GetNotificationPreferences gets user notification preferences
func (s *NotificationServiceImpl) GetNotificationPreferences(ctx context.Context, userID primitive.ObjectID) (*models.NotificationPreferences, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user for preferences", "userID", userID, "error", err)
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Return user's notification preferences
	return &user.Preferences.Notifications, nil
}

// CleanupExpiredNotifications removes old notifications
func (s *NotificationServiceImpl) CleanupExpiredNotifications(ctx context.Context) error {
	// Delete notifications older than 30 days
	result, err := s.notificationRepo.DeleteExpired(ctx, 30)
	if err != nil {
		s.logger.Error("Failed to cleanup expired notifications", "error", err)
		return fmt.Errorf("failed to cleanup expired notifications: %w", err)
	}

	s.logger.Info("Cleaned up expired notifications", "deletedCount", result.DeletedCount)
	return nil
}

// applyUserPreferences applies user notification preferences to a notification
func (s *NotificationServiceImpl) applyUserPreferences(notification *models.Notification, user *models.User) {
	prefs := &user.Preferences.Notifications

	// Apply email preferences based on notification type
	switch notification.Type {
	case models.NotificationTypeMention:
		notification.Channels.Email = prefs.Email && prefs.Mentions
	case models.NotificationTypeCommentAdded:
		notification.Channels.Email = prefs.Email && prefs.Comments
	case models.NotificationTypeItemAssigned:
		notification.Channels.Email = prefs.Email && prefs.Assignments
	case models.NotificationTypeItemUpdated:
		notification.Channels.Email = prefs.Email && prefs.Updates
	case models.NotificationTypeWorkspaceInvite,
		 models.NotificationTypePasswordReset,
		 models.NotificationTypeEmailVerification:
		// These are always sent via email regardless of preferences
		notification.Channels.Email = true
	default:
		notification.Channels.Email = prefs.Email
	}
}

// getEmailTemplateData returns the template name and data for a notification email
func (s *NotificationServiceImpl) getEmailTemplateData(notification *models.Notification, user *models.User) (string, map[string]interface{}, error) {
	baseData := map[string]interface{}{
		"FirstName": user.FirstName,
		"LastName":  user.LastName,
		"Title":     notification.Title,
		"Message":   notification.Message,
	}

	switch notification.Type {
	case models.NotificationTypePasswordReset:
		if token, exists := notification.GetData("resetToken"); exists {
			baseData["ResetURL"] = fmt.Sprintf("http://localhost:3000/reset-password?token=%s", token)
			return "reset", baseData, nil
		}
		return "", nil, fmt.Errorf("reset token not found in notification data")

	case models.NotificationTypeEmailVerification:
		if token, exists := notification.GetData("verificationToken"); exists {
			baseData["VerificationURL"] = fmt.Sprintf("http://localhost:3000/verify-email?token=%s", token)
			return "verification", baseData, nil
		}
		return "", nil, fmt.Errorf("verification token not found in notification data")

	default:
		return "", nil, fmt.Errorf("no email template defined for notification type: %s", notification.Type)
	}
}

// hasEmailTemplate checks if a notification type has a dedicated email template
func (s *NotificationServiceImpl) hasEmailTemplate(notificationType string) bool {
	templateTypes := []string{
		models.NotificationTypePasswordReset,
		models.NotificationTypeEmailVerification,
	}

	for _, templateType := range templateTypes {
		if notificationType == templateType {
			return true
		}
	}

	return false
}

// sendHTMLNotificationEmail sends a generic HTML email for notifications without templates
func (s *NotificationServiceImpl) sendHTMLNotificationEmail(user *models.User, notification *models.Notification) error {
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>%s</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>%s</h1>
        </div>
        <div class="content">
            <p>Hi %s,</p>
            <p>%s</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Project Management Team</p>
        </div>
    </div>
</body>
</html>`, notification.Title, notification.Title, user.FirstName, notification.Message)

	textBody := fmt.Sprintf("Hi %s,\n\n%s\n\nBest regards,\nProject Management Team", user.FirstName, notification.Message)
	
	return s.emailService.SendHTMLEmail(user.Email, notification.Title, htmlBody, textBody)
}
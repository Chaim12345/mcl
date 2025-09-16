package services

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/models"
)

// MockNotificationRepository is a mock implementation of NotificationRepository
type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) Create(ctx context.Context, notification *models.Notification) (*mongo.InsertOneResult, error) {
	args := m.Called(ctx, notification)
	return args.Get(0).(*mongo.InsertOneResult), args.Error(1)
}

func (m *MockNotificationRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Notification, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.Notification), args.Error(1)
}

func (m *MockNotificationRepository) GetByUserID(ctx context.Context, userID primitive.ObjectID, limit, skip int64) ([]*models.Notification, error) {
	args := m.Called(ctx, userID, limit, skip)
	return args.Get(0).([]*models.Notification), args.Error(1)
}

func (m *MockNotificationRepository) GetUnreadByUserID(ctx context.Context, userID primitive.ObjectID) ([]*models.Notification, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*models.Notification), args.Error(1)
}

func (m *MockNotificationRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error) {
	args := m.Called(ctx, id, update)
	return args.Get(0).(*mongo.UpdateResult), args.Error(1)
}

func (m *MockNotificationRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*mongo.DeleteResult), args.Error(1)
}

func (m *MockNotificationRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.Notification, error) {
	args := m.Called(ctx, filter, limit, skip)
	return args.Get(0).([]*models.Notification), args.Error(1)
}

func (m *MockNotificationRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationRepository) MarkAsRead(ctx context.Context, id primitive.ObjectID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockNotificationRepository) GetUnreadCount(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNotificationRepository) GetPendingEmails(ctx context.Context, limit int64) ([]*models.Notification, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]*models.Notification), args.Error(1)
}

func (m *MockNotificationRepository) MarkEmailSent(ctx context.Context, id primitive.ObjectID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) DeleteExpired(ctx context.Context, olderThan int) (*mongo.DeleteResult, error) {
	args := m.Called(ctx, olderThan)
	return args.Get(0).(*mongo.DeleteResult), args.Error(1)
}



func TestNewNotificationService(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)
	require.NotNil(t, service)
}

func TestCreateNotification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	user := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
		Preferences: models.UserPreferences{
			Notifications: models.UserNotificationSettings{
				Email:    true,
				Mentions: true,
			},
		},
	}

	notification := models.NewMentionNotification(
		userID,
		primitive.NewObjectID(),
		primitive.NewObjectID(),
		"Test Item",
		"Jane Doe",
	)

	// Mock expectations
	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
	mockNotificationRepo.On("Create", mock.Anything, notification).Return(&mongo.InsertOneResult{}, nil)
	mockNotificationRepo.On("MarkEmailSent", mock.Anything, notification.ID).Return(nil)

	// Test
	err := service.CreateNotification(context.Background(), notification)
	assert.NoError(t, err)

	// Verify mocks
	mockUserRepo.AssertExpectations(t)
	mockNotificationRepo.AssertExpectations(t)

	// Check that email was sent
	assert.Len(t, mockEmailService.SentEmails, 1)
}

func TestCreateNotification_InvalidNotification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	// Invalid notification (missing user ID)
	notification := &models.Notification{
		Type:    models.NotificationTypeMention,
		Title:   "Test",
		Message: "Test message",
	}

	err := service.CreateNotification(context.Background(), notification)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid notification")
}

func TestGetNotification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	notificationID := primitive.NewObjectID()
	expectedNotification := &models.Notification{
		ID:      notificationID,
		UserID:  primitive.NewObjectID(),
		Type:    models.NotificationTypeMention,
		Title:   "Test",
		Message: "Test message",
	}

	mockNotificationRepo.On("GetByID", mock.Anything, notificationID).Return(expectedNotification, nil)

	notification, err := service.GetNotification(context.Background(), notificationID)
	assert.NoError(t, err)
	assert.Equal(t, expectedNotification, notification)

	mockNotificationRepo.AssertExpectations(t)
}

func TestGetUserNotifications(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	expectedNotifications := []*models.Notification{
		{
			ID:      primitive.NewObjectID(),
			UserID:  userID,
			Type:    models.NotificationTypeMention,
			Title:   "Test 1",
			Message: "Test message 1",
		},
		{
			ID:      primitive.NewObjectID(),
			UserID:  userID,
			Type:    models.NotificationTypeCommentAdded,
			Title:   "Test 2",
			Message: "Test message 2",
		},
	}

	mockNotificationRepo.On("GetByUserID", mock.Anything, userID, int64(10), int64(0)).Return(expectedNotifications, nil)

	notifications, err := service.GetUserNotifications(context.Background(), userID, 10, 0)
	assert.NoError(t, err)
	assert.Equal(t, expectedNotifications, notifications)

	mockNotificationRepo.AssertExpectations(t)
}

func TestGetUnreadNotifications(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	expectedNotifications := []*models.Notification{
		{
			ID:      primitive.NewObjectID(),
			UserID:  userID,
			Type:    models.NotificationTypeMention,
			Title:   "Unread 1",
			Message: "Unread message 1",
			Read:    false,
		},
	}

	mockNotificationRepo.On("GetUnreadByUserID", mock.Anything, userID).Return(expectedNotifications, nil)

	notifications, err := service.GetUnreadNotifications(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, expectedNotifications, notifications)

	mockNotificationRepo.AssertExpectations(t)
}

func TestMarkAsRead(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	notificationID := primitive.NewObjectID()

	mockNotificationRepo.On("MarkAsRead", mock.Anything, notificationID).Return(nil)

	err := service.MarkAsRead(context.Background(), notificationID)
	assert.NoError(t, err)

	mockNotificationRepo.AssertExpectations(t)
}

func TestMarkAllAsRead(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()

	mockNotificationRepo.On("MarkAllAsRead", mock.Anything, userID).Return(nil)

	err := service.MarkAllAsRead(context.Background(), userID)
	assert.NoError(t, err)

	mockNotificationRepo.AssertExpectations(t)
}

func TestGetUnreadCount(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	expectedCount := int64(5)

	mockNotificationRepo.On("GetUnreadCount", mock.Anything, userID).Return(expectedCount, nil)

	count, err := service.GetUnreadCount(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, expectedCount, count)

	mockNotificationRepo.AssertExpectations(t)
}

func TestDeleteNotification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	notificationID := primitive.NewObjectID()

	mockNotificationRepo.On("Delete", mock.Anything, notificationID).Return(&mongo.DeleteResult{DeletedCount: 1}, nil)

	err := service.DeleteNotification(context.Background(), notificationID)
	assert.NoError(t, err)

	mockNotificationRepo.AssertExpectations(t)
}

func TestProcessPendingEmails(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	user := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
	}

	pendingNotifications := []*models.Notification{
		models.NewPasswordResetNotification(userID, "reset-token-123"),
		models.NewEmailVerificationNotification(userID, "verify-token-456"),
	}

	mockNotificationRepo.On("GetPendingEmails", mock.Anything, int64(100)).Return(pendingNotifications, nil)
	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil).Times(2)
	mockNotificationRepo.On("MarkEmailSent", mock.Anything, mock.AnythingOfType("primitive.ObjectID")).Return(nil).Times(2)

	err := service.ProcessPendingEmails(context.Background())
	assert.NoError(t, err)

	// Check that emails were sent
	assert.Len(t, mockEmailService.SentEmails, 2)

	mockNotificationRepo.AssertExpectations(t)
	mockUserRepo.AssertExpectations(t)
}

func TestUpdateNotificationPreferences(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	preferences := models.NotificationPreferences{
		Email:       true,
		Push:        false,
		Mentions:    true,
		Comments:    false,
		Assignments: true,
		Updates:     false,
	}

	mockUserRepo.On("Update", mock.Anything, userID, mock.MatchedBy(func(update bson.M) bool {
		setClause, ok := update["$set"].(bson.M)
		if !ok {
			return false
		}
		
		// Check if preferences.notifications exists and matches
		prefs, ok := setClause["preferences.notifications"].(models.NotificationPreferences)
		if !ok {
			return false
		}
		
		return prefs.Email == preferences.Email &&
			prefs.Push == preferences.Push &&
			prefs.Mentions == preferences.Mentions &&
			prefs.Comments == preferences.Comments &&
			prefs.Assignments == preferences.Assignments &&
			prefs.Updates == preferences.Updates
	})).Return(&mongo.UpdateResult{ModifiedCount: 1}, nil)

	err := service.UpdateNotificationPreferences(context.Background(), userID, preferences)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
}

func TestGetNotificationPreferences(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	expectedPrefs := &models.NotificationPreferences{
		Email:       true,
		Push:        false,
		Mentions:    true,
		Comments:    false,
		Assignments: true,
		Updates:     false,
	}

	user := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
		Preferences: models.UserPreferences{
			Notifications: *expectedPrefs,
		},
	}

	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	prefs, err := service.GetNotificationPreferences(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, expectedPrefs, prefs)

	mockUserRepo.AssertExpectations(t)
}

func TestGetNotificationPreferences_EmptyPreferences(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	user := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
		Preferences: models.UserPreferences{
			Notifications: models.UserNotificationSettings{}, // Empty preferences
		},
	}

	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	prefs, err := service.GetNotificationPreferences(context.Background(), userID)
	assert.NoError(t, err)
	
	// Should return the user's actual preferences (empty/false values)
	assert.False(t, prefs.Email)
	assert.False(t, prefs.Push)
	assert.False(t, prefs.Mentions)
	assert.False(t, prefs.Comments)
	assert.False(t, prefs.Assignments)
	assert.False(t, prefs.Updates)

	mockUserRepo.AssertExpectations(t)
}

func TestCleanupExpiredNotifications(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	expectedResult := &mongo.DeleteResult{DeletedCount: 10}

	mockNotificationRepo.On("DeleteExpired", mock.Anything, 30).Return(expectedResult, nil)

	err := service.CleanupExpiredNotifications(context.Background())
	assert.NoError(t, err)

	mockNotificationRepo.AssertExpectations(t)
}

func TestSendNotificationEmail_PasswordReset(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	user := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
	}

	notification := models.NewPasswordResetNotification(userID, "reset-token-123")

	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
	mockNotificationRepo.On("MarkEmailSent", mock.Anything, notification.ID).Return(nil)

	err := service.SendNotificationEmail(context.Background(), notification)
	assert.NoError(t, err)

	// Check that email was sent with correct template
	assert.Len(t, mockEmailService.SentEmails, 1)
	sentEmail := mockEmailService.SentEmails[0]
	assert.Equal(t, user.Email, sentEmail.To)
	assert.Equal(t, notification.Title, sentEmail.Subject)
	assert.Contains(t, sentEmail.Body, "reset")

	mockUserRepo.AssertExpectations(t)
	mockNotificationRepo.AssertExpectations(t)
}

func TestSendNotificationEmail_EmailVerification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockUserRepo := &MockUserRepository{}
	mockEmailService := NewMockEmailService()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	service := NewNotificationService(mockNotificationRepo, mockUserRepo, mockEmailService, logger)

	userID := primitive.NewObjectID()
	user := &models.User{
		ID:        userID,
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
	}

	notification := models.NewEmailVerificationNotification(userID, "verify-token-456")

	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
	mockNotificationRepo.On("MarkEmailSent", mock.Anything, notification.ID).Return(nil)

	err := service.SendNotificationEmail(context.Background(), notification)
	assert.NoError(t, err)

	// Check that email was sent with correct template
	assert.Len(t, mockEmailService.SentEmails, 1)
	sentEmail := mockEmailService.SentEmails[0]
	assert.Equal(t, user.Email, sentEmail.To)
	assert.Equal(t, notification.Title, sentEmail.Subject)
	assert.Contains(t, sentEmail.Body, "verification")

	mockUserRepo.AssertExpectations(t)
	mockNotificationRepo.AssertExpectations(t)
}
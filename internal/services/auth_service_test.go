package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/models"
)

// MockUserRepository is a mock implementation of UserRepository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, user *models.User) (*mongo.InsertOneResult, error) {
	args := m.Called(ctx, user)
	return args.Get(0).(*mongo.InsertOneResult), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) (*mongo.UpdateResult, error) {
	args := m.Called(ctx, id, update)
	return args.Get(0).(*mongo.UpdateResult), args.Error(1)
}

func (m *MockUserRepository) Delete(ctx context.Context, id primitive.ObjectID) (*mongo.DeleteResult, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*mongo.DeleteResult), args.Error(1)
}

func (m *MockUserRepository) List(ctx context.Context, filter bson.M, limit, skip int64) ([]*models.User, error) {
	args := m.Called(ctx, filter, limit, skip)
	return args.Get(0).([]*models.User), args.Error(1)
}

func (m *MockUserRepository) Count(ctx context.Context, filter bson.M) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockUserRepository) UpdateLastLogin(ctx context.Context, id primitive.ObjectID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserRepository) SetEmailVerified(ctx context.Context, id primitive.ObjectID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func TestAuthService_Register(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	req := RegisterRequest{
		Email:     "test@example.com",
		Password:  "TestPassword123!",
		FirstName: "John",
		LastName:  "Doe",
	}

	// Mock expectations
	mockUserRepo.On("GetByEmail", ctx, req.Email).Return(nil, mongo.ErrNoDocuments)
	mockUserRepo.On("Create", ctx, mock.AnythingOfType("*models.User")).Return(
		&mongo.InsertOneResult{InsertedID: primitive.NewObjectID()}, nil)

	// Execute
	response, err := authService.Register(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, req.Email, response.User.Email)
	assert.Equal(t, req.FirstName, response.User.FirstName)
	assert.Equal(t, req.LastName, response.User.LastName)
	assert.NotEmpty(t, response.AccessToken)
	assert.NotEmpty(t, response.RefreshToken)
	assert.False(t, response.User.EmailVerified)

	// Verify email was sent
	assert.Len(t, mockEmailService.SentEmails, 1)
	assert.Equal(t, req.Email, mockEmailService.SentEmails[0].To)
	assert.Contains(t, mockEmailService.SentEmails[0].Subject, "Verify")

	mockUserRepo.AssertExpectations(t)
}

func TestAuthService_Register_UserExists(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	req := RegisterRequest{
		Email:     "existing@example.com",
		Password:  "TestPassword123!",
		FirstName: "John",
		LastName:  "Doe",
	}

	existingUser := &models.User{
		ID:    primitive.NewObjectID(),
		Email: req.Email,
	}

	// Mock expectations
	mockUserRepo.On("GetByEmail", ctx, req.Email).Return(existingUser, nil)

	// Execute
	response, err := authService.Register(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "already exists")

	mockUserRepo.AssertExpectations(t)
}

func TestAuthService_Login(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	password := "TestPassword123!"
	hashedPassword, _ := passwordHasher.HashPassword(password)

	user := &models.User{
		ID:        primitive.NewObjectID(),
		Email:     "test@example.com",
		Password:  hashedPassword,
		FirstName: "John",
		LastName:  "Doe",
	}

	req := LoginRequest{
		Email:    user.Email,
		Password: password,
	}

	// Mock expectations
	mockUserRepo.On("GetByEmail", ctx, req.Email).Return(user, nil)
	mockUserRepo.On("UpdateLastLogin", ctx, user.ID).Return(nil)

	// Execute
	response, err := authService.Login(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, user.Email, response.User.Email)
	assert.NotEmpty(t, response.AccessToken)
	assert.NotEmpty(t, response.RefreshToken)

	mockUserRepo.AssertExpectations(t)
}

func TestAuthService_Login_InvalidCredentials(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	req := LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}

	// Mock expectations
	mockUserRepo.On("GetByEmail", ctx, req.Email).Return(nil, mongo.ErrNoDocuments)

	// Execute
	response, err := authService.Login(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "invalid credentials")

	mockUserRepo.AssertExpectations(t)
}

func TestAuthService_RefreshToken(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	userID := primitive.NewObjectID()
	email := "test@example.com"

	user := &models.User{
		ID:        userID,
		Email:     email,
		FirstName: "John",
		LastName:  "Doe",
	}

	// Generate refresh token
	refreshToken, err := jwtManager.GenerateRefreshToken(userID, email)
	assert.NoError(t, err)

	req := RefreshTokenRequest{
		RefreshToken: refreshToken,
	}

	// Mock expectations
	mockUserRepo.On("GetByID", ctx, userID).Return(user, nil)

	// Execute
	response, err := authService.RefreshToken(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, user.Email, response.User.Email)
	assert.NotEmpty(t, response.AccessToken)
	assert.Equal(t, refreshToken, response.RefreshToken)

	mockUserRepo.AssertExpectations(t)
}

func TestAuthService_ForgotPassword(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	user := &models.User{
		ID:        primitive.NewObjectID(),
		Email:     "test@example.com",
		FirstName: "John",
		LastName:  "Doe",
	}

	req := ForgotPasswordRequest{
		Email: user.Email,
	}

	// Mock expectations
	mockUserRepo.On("GetByEmail", ctx, req.Email).Return(user, nil)

	// Execute
	err := authService.ForgotPassword(ctx, req)

	// Assert
	assert.NoError(t, err)

	// Verify email was sent
	assert.Len(t, mockEmailService.SentEmails, 1)
	assert.Equal(t, user.Email, mockEmailService.SentEmails[0].To)
	assert.Contains(t, mockEmailService.SentEmails[0].Subject, "Reset")

	// Verify reset token was stored
	assert.Len(t, authService.resetTokens, 1)

	mockUserRepo.AssertExpectations(t)
}

func TestAuthService_ResetPassword(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	userID := primitive.NewObjectID()
	resetToken := "test-reset-token"
	newPassword := "NewPassword123!"

	// Add reset token to service
	authService.resetTokens[resetToken] = ResetToken{
		UserID:    userID,
		Token:     resetToken,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}

	req := ResetPasswordRequest{
		Token:    resetToken,
		Password: newPassword,
	}

	// Mock expectations
	mockUserRepo.On("Update", ctx, userID, mock.Anything).Return(
		&mongo.UpdateResult{MatchedCount: 1, ModifiedCount: 1}, nil)

	// Execute
	err := authService.ResetPassword(ctx, req)

	// Assert
	assert.NoError(t, err)

	// Verify token was removed
	assert.Len(t, authService.resetTokens, 0)

	mockUserRepo.AssertExpectations(t)
}

func TestAuthService_ResetPassword_ExpiredToken(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	userID := primitive.NewObjectID()
	resetToken := "expired-reset-token"
	newPassword := "NewPassword123!"

	// Add expired reset token to service
	authService.resetTokens[resetToken] = ResetToken{
		UserID:    userID,
		Token:     resetToken,
		ExpiresAt: time.Now().Add(-1 * time.Hour), // Expired
	}

	req := ResetPasswordRequest{
		Token:    resetToken,
		Password: newPassword,
	}

	// Execute
	err := authService.ResetPassword(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "expired")

	// Verify token was removed
	assert.Len(t, authService.resetTokens, 0)

	mockUserRepo.AssertNotCalled(t, "Update")
}

func TestAuthService_Logout(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	userID := primitive.NewObjectID()
	email := "test@example.com"

	// Generate tokens
	accessToken, err := jwtManager.GenerateAccessToken(userID, email, "user")
	assert.NoError(t, err)

	refreshToken, err := jwtManager.GenerateRefreshToken(userID, email)
	assert.NoError(t, err)

	// Verify tokens are valid before logout
	_, err = jwtManager.ValidateToken(accessToken)
	assert.NoError(t, err)

	_, err = jwtManager.ValidateToken(refreshToken)
	assert.NoError(t, err)

	// Execute logout
	err = authService.Logout(ctx, accessToken, refreshToken)

	// Assert
	assert.NoError(t, err)

	// Verify tokens are blacklisted after logout
	_, err = jwtManager.ValidateToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrInvalidToken, err)

	_, err = jwtManager.ValidateToken(refreshToken)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrInvalidToken, err)
}

func TestAuthService_Logout_AccessTokenOnly(t *testing.T) {
	// Setup
	mockUserRepo := new(MockUserRepository)
	mockEmailService := NewMockEmailService()
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	passwordHasher := auth.NewPasswordHasher()

	authService := NewAuthService(mockUserRepo, jwtManager, passwordHasher, mockEmailService)

	ctx := context.Background()
	userID := primitive.NewObjectID()
	email := "test@example.com"

	// Generate access token only
	accessToken, err := jwtManager.GenerateAccessToken(userID, email, "user")
	assert.NoError(t, err)

	// Verify token is valid before logout
	_, err = jwtManager.ValidateToken(accessToken)
	assert.NoError(t, err)

	// Execute logout with empty refresh token
	err = authService.Logout(ctx, accessToken, "")

	// Assert
	assert.NoError(t, err)

	// Verify access token is blacklisted after logout
	_, err = jwtManager.ValidateToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrInvalidToken, err)
}

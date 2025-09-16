package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/models"
	"project-management-platform/internal/repository"
)

// AuthService handles authentication operations
type AuthService struct {
	userRepo       repository.UserRepository
	jwtManager     *auth.JWTManager
	passwordHasher *auth.PasswordHasher
	emailService   EmailService
	resetTokens    map[string]ResetToken // In production, use Redis or database
}

// ResetToken represents a password reset token
type ResetToken struct {
	UserID    primitive.ObjectID
	Token     string
	ExpiresAt time.Time
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
}

// LoginRequest represents a user login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents an authentication response
type AuthResponse struct {
	User         *models.User `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
}

// RefreshTokenRequest represents a token refresh request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

// VerifyEmailRequest represents an email verification request
type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

// NewAuthService creates a new auth service
func NewAuthService(
	userRepo repository.UserRepository,
	jwtManager *auth.JWTManager,
	passwordHasher *auth.PasswordHasher,
	emailService EmailService,
) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		jwtManager:     jwtManager,
		passwordHasher: passwordHasher,
		emailService:   emailService,
		resetTokens:    make(map[string]ResetToken),
	}
}

// Register registers a new user
func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	// Check if user already exists
	existingUser, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		return nil, fmt.Errorf("user with email already exists")
	}

	// Hash password
	hashedPassword, err := s.passwordHasher.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create new user
	user := models.NewUser(req.Email, hashedPassword, req.FirstName, req.LastName)

	// Save user to database
	result, err := s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Set the user ID from the insert result
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		user.ID = oid
	}

	// Generate email verification token
	verificationToken, err := s.generateVerificationToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate verification token: %w", err)
	}

	// Send verification email
	if err := s.sendVerificationEmail(user.Email, user.FirstName, verificationToken); err != nil {
		// Log error but don't fail registration
		// In production, you might want to queue this for retry
		fmt.Printf("Failed to send verification email: %v\n", err)
	}

	// Generate JWT tokens
	accessToken, refreshToken, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email, "user")
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Login authenticates a user
func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Verify password
	if err := s.passwordHasher.VerifyPassword(req.Password, user.Password); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	// Generate JWT tokens
	accessToken, refreshToken, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email, "user")
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// Logout logs out a user by blacklisting their tokens
func (s *AuthService) Logout(ctx context.Context, accessToken, refreshToken string) error {
	// Blacklist both tokens
	if err := s.jwtManager.BlacklistToken(accessToken); err != nil {
		return fmt.Errorf("failed to blacklist access token: %w", err)
	}

	if refreshToken != "" {
		if err := s.jwtManager.BlacklistToken(refreshToken); err != nil {
			return fmt.Errorf("failed to blacklist refresh token: %w", err)
		}
	}

	return nil
}

// RefreshToken generates a new access token using a refresh token
func (s *AuthService) RefreshToken(ctx context.Context, req RefreshTokenRequest) (*AuthResponse, error) {
	// Validate refresh token and get new access token
	accessToken, err := s.jwtManager.RefreshAccessToken(req.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Get user info from refresh token
	claims, err := s.jwtManager.ValidateToken(req.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Get user from database
	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return &AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: req.RefreshToken, // Keep the same refresh token
	}, nil
}

// ForgotPassword initiates password reset process
func (s *AuthService) ForgotPassword(ctx context.Context, req ForgotPasswordRequest) error {
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		// Don't reveal if email exists or not
		return nil
	}

	// Generate reset token
	resetToken, err := s.generateResetToken()
	if err != nil {
		return fmt.Errorf("failed to generate reset token: %w", err)
	}

	// Store reset token (in production, use Redis or database)
	s.resetTokens[resetToken] = ResetToken{
		UserID:    user.ID,
		Token:     resetToken,
		ExpiresAt: time.Now().Add(1 * time.Hour), // Token expires in 1 hour
	}

	// Send reset email
	if err := s.sendPasswordResetEmail(user.Email, user.FirstName, resetToken); err != nil {
		return fmt.Errorf("failed to send reset email: %w", err)
	}

	return nil
}

// ResetPassword resets user password using reset token
func (s *AuthService) ResetPassword(ctx context.Context, req ResetPasswordRequest) error {
	// Validate reset token
	resetToken, exists := s.resetTokens[req.Token]
	if !exists {
		return fmt.Errorf("invalid or expired reset token")
	}

	// Check if token is expired
	if time.Now().After(resetToken.ExpiresAt) {
		delete(s.resetTokens, req.Token)
		return fmt.Errorf("reset token has expired")
	}

	// Hash new password
	hashedPassword, err := s.passwordHasher.HashPassword(req.Password)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update user password
	update := map[string]interface{}{
		"password": hashedPassword,
	}

	_, err = s.userRepo.Update(ctx, resetToken.UserID, update)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Remove used token
	delete(s.resetTokens, req.Token)

	return nil
}

// VerifyEmail verifies user email using verification token
func (s *AuthService) VerifyEmail(ctx context.Context, req VerifyEmailRequest) error {
	// In a real implementation, you would store verification tokens in database
	// For now, we'll just mark any user with a valid token format as verified
	if len(req.Token) < 32 {
		return fmt.Errorf("invalid verification token")
	}

	// This is a simplified implementation
	// In production, you would:
	// 1. Store verification tokens in database with user ID and expiration
	// 2. Validate the token against the database
	// 3. Mark the user as verified

	return fmt.Errorf("email verification not fully implemented")
}

// generateResetToken generates a secure random token for password reset
func (s *AuthService) generateResetToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// generateVerificationToken generates a secure random token for email verification
func (s *AuthService) generateVerificationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// sendVerificationEmail sends email verification email using template
func (s *AuthService) sendVerificationEmail(email, firstName, token string) error {
	data := struct {
		FirstName       string
		VerificationURL string
	}{
		FirstName:       firstName,
		VerificationURL: fmt.Sprintf("http://localhost:8080/verify-email?token=%s", token),
	}

	return s.emailService.SendTemplateEmail(email, "Verify your email address", "verification", data)
}

// sendPasswordResetEmail sends password reset email using template
func (s *AuthService) sendPasswordResetEmail(email, firstName, token string) error {
	data := struct {
		FirstName string
		ResetURL  string
	}{
		FirstName: firstName,
		ResetURL:  fmt.Sprintf("http://localhost:8080/reset-password?token=%s", token),
	}

	return s.emailService.SendTemplateEmail(email, "Reset your password", "reset", data)
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*auth.Claims, error) {
	return s.jwtManager.ValidateToken(tokenString)
}

// CleanupExpiredTokens removes expired reset tokens and blacklisted JWT tokens
func (s *AuthService) CleanupExpiredTokens() {
	// Clean up expired reset tokens
	now := time.Now()
	for token, resetToken := range s.resetTokens {
		if now.After(resetToken.ExpiresAt) {
			delete(s.resetTokens, token)
		}
	}

	// Clean up expired blacklisted JWT tokens
	s.jwtManager.CleanupExpiredBlacklistedTokens()
}

// AuthServiceInterface defines the contract for authentication services
type AuthServiceInterface interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	RefreshToken(ctx context.Context, req RefreshTokenRequest) (*AuthResponse, error)
	Logout(ctx context.Context, accessToken, refreshToken string) error
	ForgotPassword(ctx context.Context, req ForgotPasswordRequest) error
	ResetPassword(ctx context.Context, req ResetPasswordRequest) error
	VerifyEmail(ctx context.Context, req VerifyEmailRequest) error
	ValidateToken(tokenString string) (*auth.Claims, error)
	CleanupExpiredTokens()
}

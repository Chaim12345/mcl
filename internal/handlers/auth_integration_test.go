package handlers

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"project-management-platform/internal/auth"
)

// TestAuthIntegration_JWTTokenFlow tests JWT token generation and validation
func TestAuthIntegration_JWTTokenFlow(t *testing.T) {
	// Setup JWT manager
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	// Test data
	userID := primitive.NewObjectID()
	email := "test@example.com"
	role := "user"

	// Step 1: Generate token pair
	accessToken, refreshToken, err := jwtManager.GenerateTokenPair(userID, email, role)
	require.NoError(t, err)
	require.NotEmpty(t, accessToken)
	require.NotEmpty(t, refreshToken)

	// Step 2: Validate access token
	claims, err := jwtManager.ValidateToken(accessToken)
	assert.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, role, claims.Role)
	assert.Equal(t, "access", claims.TokenType)

	// Step 3: Validate refresh token
	refreshClaims, err := jwtManager.ValidateToken(refreshToken)
	assert.NoError(t, err)
	assert.Equal(t, userID, refreshClaims.UserID)
	assert.Equal(t, email, refreshClaims.Email)
	assert.Equal(t, "refresh", refreshClaims.TokenType)

	// Step 4: Blacklist tokens (simulate logout)
	err = jwtManager.BlacklistToken(accessToken)
	assert.NoError(t, err)

	err = jwtManager.BlacklistToken(refreshToken)
	assert.NoError(t, err)

	// Step 5: Verify tokens are blacklisted
	_, err = jwtManager.ValidateToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrInvalidToken, err)

	_, err = jwtManager.ValidateToken(refreshToken)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrInvalidToken, err)
}

// TestAuthIntegration_PasswordHashing tests password hashing and verification
func TestAuthIntegration_PasswordHashing(t *testing.T) {
	// Setup password hasher
	passwordHasher := auth.NewPasswordHasher()

	// Test data
	password := "TestPassword123!"
	wrongPassword := "WrongPassword123!"

	// Step 1: Hash password
	hashedPassword, err := passwordHasher.HashPassword(password)
	require.NoError(t, err)
	require.NotEmpty(t, hashedPassword)
	require.NotEqual(t, password, hashedPassword)

	// Step 2: Verify correct password
	err = passwordHasher.VerifyPassword(password, hashedPassword)
	assert.NoError(t, err)

	// Step 3: Verify wrong password fails
	err = passwordHasher.VerifyPassword(wrongPassword, hashedPassword)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrPasswordMismatch, err)
}

// TestAuthIntegration_TokenBlacklisting tests token blacklisting functionality
func TestAuthIntegration_TokenBlacklisting(t *testing.T) {
	// Setup JWT manager
	jwtManager := auth.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	// Test data
	userID := primitive.NewObjectID()
	email := "test@example.com"
	role := "user"

	// Generate tokens
	accessToken, err := jwtManager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)

	refreshToken, err := jwtManager.GenerateRefreshToken(userID, email)
	require.NoError(t, err)

	// Verify tokens are valid initially
	_, err = jwtManager.ValidateToken(accessToken)
	assert.NoError(t, err)

	_, err = jwtManager.ValidateToken(refreshToken)
	assert.NoError(t, err)

	// Blacklist access token
	err = jwtManager.BlacklistToken(accessToken)
	assert.NoError(t, err)

	// Verify access token is blacklisted
	_, err = jwtManager.ValidateToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrInvalidToken, err)

	// Verify refresh token is still valid
	_, err = jwtManager.ValidateToken(refreshToken)
	assert.NoError(t, err)

	// Blacklist refresh token
	err = jwtManager.BlacklistToken(refreshToken)
	assert.NoError(t, err)

	// Verify refresh token is now blacklisted
	_, err = jwtManager.ValidateToken(refreshToken)
	assert.Error(t, err)
	assert.Equal(t, auth.ErrInvalidToken, err)
}

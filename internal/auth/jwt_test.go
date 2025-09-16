package auth

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestNewJWTManager(t *testing.T) {
	secretKey := "test-secret-key"
	accessDuration := 15 * time.Minute
	refreshDuration := 7 * 24 * time.Hour

	manager := NewJWTManager(secretKey, accessDuration, refreshDuration)

	assert.NotNil(t, manager)
	assert.Equal(t, []byte(secretKey), manager.secretKey)
	assert.Equal(t, accessDuration, manager.accessTokenDuration)
	assert.Equal(t, refreshDuration, manager.refreshTokenDuration)
	assert.NotNil(t, manager.blacklistedTokens)
}

func TestGenerateAccessToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()
	email := "test@example.com"
	role := "user"

	token, err := manager.GenerateAccessToken(userID, email, role)

	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate the generated token
	claims, err := manager.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, role, claims.Role)
	assert.Equal(t, "access", claims.TokenType)
}

func TestGenerateRefreshToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()
	email := "test@example.com"

	token, err := manager.GenerateRefreshToken(userID, email)

	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate the generated token
	claims, err := manager.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, "refresh", claims.TokenType)
}

func TestGenerateTokenPair(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()
	email := "test@example.com"
	role := "user"

	accessToken, refreshToken, err := manager.GenerateTokenPair(userID, email, role)

	require.NoError(t, err)
	assert.NotEmpty(t, accessToken)
	assert.NotEmpty(t, refreshToken)
	assert.NotEqual(t, accessToken, refreshToken)

	// Validate access token
	accessClaims, err := manager.ValidateToken(accessToken)
	require.NoError(t, err)
	assert.Equal(t, "access", accessClaims.TokenType)
	assert.Equal(t, role, accessClaims.Role)

	// Validate refresh token
	refreshClaims, err := manager.ValidateToken(refreshToken)
	require.NoError(t, err)
	assert.Equal(t, "refresh", refreshClaims.TokenType)
	assert.Empty(t, refreshClaims.Role) // Refresh tokens don't include role
}

func TestValidateToken_ValidToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()
	email := "test@example.com"
	role := "admin"

	token, err := manager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)

	claims, err := manager.ValidateToken(token)

	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, role, claims.Role)
	assert.Equal(t, "access", claims.TokenType)
}

func TestValidateToken_InvalidToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	tests := []struct {
		name  string
		token string
	}{
		{"empty token", ""},
		{"malformed token", "invalid.token.here"},
		{"wrong signature", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := manager.ValidateToken(tt.token)
			assert.Error(t, err)
			assert.Equal(t, ErrInvalidToken, err)
		})
	}
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	// Create manager with very short token duration
	manager := NewJWTManager("test-secret", 1*time.Millisecond, 7*24*time.Hour)
	userID := primitive.NewObjectID()

	token, err := manager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	_, err = manager.ValidateToken(token)
	assert.Error(t, err)
	assert.Equal(t, ErrExpiredToken, err)
}

func TestRefreshAccessToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()
	email := "test@example.com"

	// Generate refresh token
	refreshToken, err := manager.GenerateRefreshToken(userID, email)
	require.NoError(t, err)

	// Use refresh token to get new access token
	newAccessToken, err := manager.RefreshAccessToken(refreshToken)
	require.NoError(t, err)
	assert.NotEmpty(t, newAccessToken)

	// Validate new access token
	claims, err := manager.ValidateToken(newAccessToken)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, "access", claims.TokenType)
}

func TestRefreshAccessToken_WithAccessToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()

	// Generate access token (not refresh token)
	accessToken, err := manager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	// Try to use access token for refresh (should fail)
	_, err = manager.RefreshAccessToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidToken, err)
}

func TestBlacklistToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()

	token, err := manager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	// Token should be valid initially
	_, err = manager.ValidateToken(token)
	assert.NoError(t, err)

	// Blacklist the token
	err = manager.BlacklistToken(token)
	assert.NoError(t, err)

	// Token should now be invalid
	_, err = manager.ValidateToken(token)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidToken, err)
}

func TestIsTokenBlacklisted(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()

	token, err := manager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	// Token should not be blacklisted initially
	assert.False(t, manager.IsTokenBlacklisted(token))

	// Blacklist the token
	err = manager.BlacklistToken(token)
	require.NoError(t, err)

	// Token should now be blacklisted
	assert.True(t, manager.IsTokenBlacklisted(token))
}

func TestCleanupExpiredBlacklistedTokens(t *testing.T) {
	manager := NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()

	// Generate and blacklist a token
	token, err := manager.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	err = manager.BlacklistToken(token)
	require.NoError(t, err)

	// Verify token is blacklisted
	assert.True(t, manager.IsTokenBlacklisted(token))

	// Manually set expiration time in the past to simulate expired blacklisted token
	manager.blacklistedTokens[token] = time.Now().Add(-1 * time.Hour)

	// Cleanup expired tokens
	manager.CleanupExpiredBlacklistedTokens()

	// Token should no longer be in blacklist
	assert.False(t, manager.IsTokenBlacklisted(token))
}

func TestExtractTokenFromHeader(t *testing.T) {
	tests := []struct {
		name     string
		header   string
		expected string
	}{
		{
			name:     "valid bearer token",
			header:   "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expected: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
		},
		{
			name:     "empty header",
			header:   "",
			expected: "",
		},
		{
			name:     "invalid format",
			header:   "Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expected: "",
		},
		{
			name:     "bearer without token",
			header:   "Bearer ",
			expected: "",
		},
		{
			name:     "bearer lowercase",
			header:   "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractTokenFromHeader(tt.header)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestJWTManager_DifferentSecrets(t *testing.T) {
	manager1 := NewJWTManager("secret1", 15*time.Minute, 7*24*time.Hour)
	manager2 := NewJWTManager("secret2", 15*time.Minute, 7*24*time.Hour)
	userID := primitive.NewObjectID()

	// Generate token with first manager
	token, err := manager1.GenerateAccessToken(userID, "test@example.com", "user")
	require.NoError(t, err)

	// Try to validate with second manager (different secret)
	_, err = manager2.ValidateToken(token)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidToken, err)
}

func TestJWTManager_TokenExpiration(t *testing.T) {
	// Test that tokens with different durations have different expiration times
	accessDuration := 15 * time.Minute
	refreshDuration := 7 * 24 * time.Hour
	manager := NewJWTManager("test-secret", accessDuration, refreshDuration)
	userID := primitive.NewObjectID()

	// Generate tokens
	accessToken, refreshToken, err := manager.GenerateTokenPair(userID, "test@example.com", "user")
	require.NoError(t, err)

	// Parse tokens to check expiration times
	accessClaims, err := manager.ValidateToken(accessToken)
	require.NoError(t, err)
	refreshClaims, err := manager.ValidateToken(refreshToken)
	require.NoError(t, err)

	// Access token should expire before refresh token
	assert.True(t, accessClaims.ExpiresAt.Before(refreshClaims.ExpiresAt.Time))

	// Check that expiration times are approximately correct
	now := time.Now()
	expectedAccessExpiry := now.Add(accessDuration)
	expectedRefreshExpiry := now.Add(refreshDuration)

	// Allow for some variance in timing (1 minute)
	assert.WithinDuration(t, expectedAccessExpiry, accessClaims.ExpiresAt.Time, time.Minute)
	assert.WithinDuration(t, expectedRefreshExpiry, refreshClaims.ExpiresAt.Time, time.Minute)
}
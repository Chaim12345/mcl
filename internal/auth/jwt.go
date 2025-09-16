package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
	ErrTokenClaims  = errors.New("invalid token claims")
)

// Claims represents the JWT claims structure
type Claims struct {
	UserID    primitive.ObjectID `json:"user_id"`
	Email     string             `json:"email"`
	Role      string             `json:"role,omitempty"`
	TokenType string             `json:"token_type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// JWTManager handles JWT token operations
type JWTManager struct {
	secretKey             []byte
	accessTokenDuration   time.Duration
	refreshTokenDuration  time.Duration
	blacklistedTokens     map[string]time.Time // In production, use Redis or database
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(secretKey string, accessDuration, refreshDuration time.Duration) *JWTManager {
	return &JWTManager{
		secretKey:             []byte(secretKey),
		accessTokenDuration:   accessDuration,
		refreshTokenDuration:  refreshDuration,
		blacklistedTokens:     make(map[string]time.Time),
	}
}

// GenerateAccessToken creates a new access token
func (j *JWTManager) GenerateAccessToken(userID primitive.ObjectID, email, role string) (string, error) {
	claims := Claims{
		UserID:    userID,
		Email:     email,
		Role:      role,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.accessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   userID.Hex(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

// GenerateRefreshToken creates a new refresh token
func (j *JWTManager) GenerateRefreshToken(userID primitive.ObjectID, email string) (string, error) {
	claims := Claims{
		UserID:    userID,
		Email:     email,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.refreshTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   userID.Hex(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

// GenerateTokenPair creates both access and refresh tokens
func (j *JWTManager) GenerateTokenPair(userID primitive.ObjectID, email, role string) (accessToken, refreshToken string, err error) {
	accessToken, err = j.GenerateAccessToken(userID, email, role)
	if err != nil {
		return "", "", err
	}

	refreshToken, err = j.GenerateRefreshToken(userID, email)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// ValidateToken validates and parses a JWT token
func (j *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	// Check if token is blacklisted
	if j.IsTokenBlacklisted(tokenString) {
		return nil, ErrInvalidToken
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return j.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrTokenClaims
	}

	return claims, nil
}

// RefreshAccessToken generates a new access token using a refresh token
func (j *JWTManager) RefreshAccessToken(refreshTokenString string) (string, error) {
	claims, err := j.ValidateToken(refreshTokenString)
	if err != nil {
		return "", err
	}

	// Verify it's a refresh token
	if claims.TokenType != "refresh" {
		return "", ErrInvalidToken
	}

	// Generate new access token
	return j.GenerateAccessToken(claims.UserID, claims.Email, claims.Role)
}

// BlacklistToken adds a token to the blacklist
func (j *JWTManager) BlacklistToken(tokenString string) error {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		// Even if token is invalid, we should blacklist it
		j.blacklistedTokens[tokenString] = time.Now().Add(24 * time.Hour)
		return nil
	}

	// Blacklist until token would naturally expire
	expirationTime := claims.ExpiresAt.Time
	j.blacklistedTokens[tokenString] = expirationTime

	return nil
}

// IsTokenBlacklisted checks if a token is blacklisted
func (j *JWTManager) IsTokenBlacklisted(tokenString string) bool {
	expirationTime, exists := j.blacklistedTokens[tokenString]
	if !exists {
		return false
	}

	// Clean up expired blacklisted tokens
	if time.Now().After(expirationTime) {
		delete(j.blacklistedTokens, tokenString)
		return false
	}

	return true
}

// CleanupExpiredBlacklistedTokens removes expired tokens from blacklist
func (j *JWTManager) CleanupExpiredBlacklistedTokens() {
	now := time.Now()
	for token, expiration := range j.blacklistedTokens {
		if now.After(expiration) {
			delete(j.blacklistedTokens, token)
		}
	}
}

// ExtractTokenFromHeader extracts JWT token from Authorization header
func ExtractTokenFromHeader(authHeader string) string {
	const bearerPrefix = "Bearer "
	if len(authHeader) > len(bearerPrefix) && authHeader[:len(bearerPrefix)] == bearerPrefix {
		return authHeader[len(bearerPrefix):]
	}
	return ""
}
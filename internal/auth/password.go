package auth

import (
	"errors"
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrPasswordTooShort    = errors.New("password must be at least 8 characters long")
	ErrPasswordTooWeak     = errors.New("password must contain at least one uppercase letter, one lowercase letter, one number, and one special character")
	ErrPasswordTooCommon   = errors.New("password is too common")
	ErrInvalidPassword     = errors.New("invalid password")
	ErrPasswordMismatch    = errors.New("password does not match")
)

const (
	// DefaultCost is the default bcrypt cost for password hashing
	DefaultCost = 12
	// MinPasswordLength is the minimum required password length
	MinPasswordLength = 8
	// MaxPasswordLength is the maximum allowed password length
	MaxPasswordLength = 128
)

// PasswordHasher handles password hashing and validation
type PasswordHasher struct {
	cost int
}

// NewPasswordHasher creates a new password hasher with default cost
func NewPasswordHasher() *PasswordHasher {
	return &PasswordHasher{
		cost: DefaultCost,
	}
}

// NewPasswordHasherWithCost creates a new password hasher with custom cost
func NewPasswordHasherWithCost(cost int) *PasswordHasher {
	return &PasswordHasher{
		cost: cost,
	}
}

// HashPassword hashes a password using bcrypt
func (ph *PasswordHasher) HashPassword(password string) (string, error) {
	if err := ph.ValidatePasswordStrength(password); err != nil {
		return "", err
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), ph.cost)
	if err != nil {
		return "", err
	}

	return string(hashedBytes), nil
}

// VerifyPassword verifies a password against its hash
func (ph *PasswordHasher) VerifyPassword(password, hashedPassword string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return ErrPasswordMismatch
		}
		return err
	}
	return nil
}

// ValidatePasswordStrength validates password strength requirements
func (ph *PasswordHasher) ValidatePasswordStrength(password string) error {
	// Check length
	if len(password) < MinPasswordLength {
		return ErrPasswordTooShort
	}

	if len(password) > MaxPasswordLength {
		return ErrInvalidPassword
	}

	// Check for required character types
	var (
		hasUpper   = false
		hasLower   = false
		hasNumber  = false
		hasSpecial = false
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
		return ErrPasswordTooWeak
	}

	// Check for common passwords
	if ph.isCommonPassword(password) {
		return ErrPasswordTooCommon
	}

	return nil
}

// isCommonPassword checks if the password is in a list of common passwords
func (ph *PasswordHasher) isCommonPassword(password string) bool {
	// List of common passwords to reject
	commonPasswords := []string{
		"password", "123456", "123456789", "12345678", "12345",
		"1234567", "password123", "admin", "qwerty", "abc123",
		"letmein", "monkey", "1234567890", "dragon", "111111",
		"baseball", "iloveyou", "trustno1", "1234", "sunshine",
		"master", "123123", "welcome", "shadow", "ashley",
		"football", "jesus", "michael", "ninja", "mustang",
		"password1", "123456a", "password!", "admin123",
	}

	lowerPassword := strings.ToLower(password)
	for _, common := range commonPasswords {
		if lowerPassword == common {
			return true
		}
	}

	return false
}

// ValidatePasswordFormat validates basic password format (for registration forms)
func ValidatePasswordFormat(password string) error {
	if password == "" {
		return ErrInvalidPassword
	}

	if len(password) < MinPasswordLength {
		return ErrPasswordTooShort
	}

	if len(password) > MaxPasswordLength {
		return ErrInvalidPassword
	}

	// Check for null bytes or other problematic characters
	if strings.Contains(password, "\x00") {
		return ErrInvalidPassword
	}

	return nil
}

// GeneratePasswordRequirements returns a human-readable string of password requirements
func GeneratePasswordRequirements() string {
	return "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
}

// CheckPasswordComplexity returns detailed information about password complexity
func CheckPasswordComplexity(password string) map[string]bool {
	complexity := map[string]bool{
		"min_length":     len(password) >= MinPasswordLength,
		"max_length":     len(password) <= MaxPasswordLength,
		"has_uppercase":  false,
		"has_lowercase":  false,
		"has_number":     false,
		"has_special":    false,
		"not_common":     true,
	}

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			complexity["has_uppercase"] = true
		case unicode.IsLower(char):
			complexity["has_lowercase"] = true
		case unicode.IsNumber(char):
			complexity["has_number"] = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			complexity["has_special"] = true
		}
	}

	// Check for common passwords
	hasher := NewPasswordHasher()
	complexity["not_common"] = !hasher.isCommonPassword(password)

	return complexity
}

// IsPasswordSecure checks if a password meets all security requirements
func IsPasswordSecure(password string) bool {
	complexity := CheckPasswordComplexity(password)
	for _, meets := range complexity {
		if !meets {
			return false
		}
	}
	return true
}

// SanitizePassword removes potentially dangerous characters from password input
func SanitizePassword(password string) string {
	// Remove null bytes and control characters
	re := regexp.MustCompile(`[\x00-\x1f\x7f]`)
	return re.ReplaceAllString(password, "")
}
// Package errors defines custom error types for the application
package errors

import (
	"errors"
	"fmt"
)

// Error codes for consistent error handling
const (
	// Authentication & Authorization errors
	ErrCodeUnauthorized       = "UNAUTHORIZED"
	ErrCodeForbidden          = "FORBIDDEN"
	ErrCodeInvalidToken       = "INVALID_TOKEN"
	ErrCodeExpiredToken       = "EXPIRED_TOKEN"
	ErrCodeWeakPassword       = "WEAK_PASSWORD"
	ErrCodeUserExists         = "USER_EXISTS"
	ErrCodeInvalidCredentials = "INVALID_CREDENTIALS"

	// Resource errors
	ErrCodeNotFound       = "NOT_FOUND"
	ErrCodeConflict       = "CONFLICT"
	ErrCodeValidation     = "VALIDATION_ERROR"
	ErrCodeInvalidRequest = "INVALID_REQUEST"

	// System errors
	ErrCodeInternal = "INTERNAL_ERROR"
	ErrCodeDatabase = "DATABASE_ERROR"
	ErrCodeExternal = "EXTERNAL_SERVICE_ERROR"
)

// AppError represents an application-level error with context
type AppError struct {
	Code           string `json:"code"`
	Message        string `json:"message"`
	UserMessage    string `json:"user_message,omitempty"` // Safe message for end users
	InternalError  error  `json:"-"`                      // Internal error, never exposed to clients
	HTTPStatusCode int    `json:"-"`                      // HTTP status code to return
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.InternalError != nil {
		return fmt.Sprintf("%s: %s (internal: %v)", e.Code, e.Message, e.InternalError)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap returns the underlying error for error unwrapping
func (e *AppError) Unwrap() error {
	return e.InternalError
}

// New creates a new AppError
func New(code, message string, httpStatusCode int) *AppError {
	return &AppError{
		Code:           code,
		Message:        message,
		UserMessage:    message,
		HTTPStatusCode: httpStatusCode,
	}
}

// Wrap creates a new AppError wrapping an existing error
func Wrap(err error, code, message, userMessage string, httpStatusCode int) *AppError {
	return &AppError{
		Code:           code,
		Message:        message,
		UserMessage:    userMessage,
		InternalError:  err,
		HTTPStatusCode: httpStatusCode,
	}
}

// Predefined common errors
var (
	// Authentication errors
	ErrUnauthorized       = New(ErrCodeUnauthorized, "Authentication required", 401)
	ErrForbidden          = New(ErrCodeForbidden, "Access denied", 403)
	ErrInvalidToken       = New(ErrCodeInvalidToken, "Invalid authentication token", 401)
	ErrExpiredToken       = New(ErrCodeExpiredToken, "Authentication token has expired", 401)
	ErrWeakPassword       = New(ErrCodeWeakPassword, "Password does not meet security requirements", 400)
	ErrUserExists         = New(ErrCodeUserExists, "User with this email already exists", 409)
	ErrInvalidCredentials = New(ErrCodeInvalidCredentials, "Invalid email or password", 401)

	// Resource errors
	ErrNotFound       = New(ErrCodeNotFound, "Resource not found", 404)
	ErrConflict       = New(ErrCodeConflict, "Resource conflict", 409)
	ErrValidation     = New(ErrCodeValidation, "Validation failed", 400)
	ErrInvalidRequest = New(ErrCodeInvalidRequest, "Invalid request", 400)

	// System errors
	ErrInternal = New(ErrCodeInternal, "Internal server error", 500)
	ErrDatabase = New(ErrCodeDatabase, "Database operation failed", 500)
	ErrExternal = New(ErrCodeExternal, "External service error", 502)
)

// IsAppError checks if an error is an AppError
func IsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}

// GetHTTPStatusCode returns the appropriate HTTP status code for an error
func GetHTTPStatusCode(err error) int {
	if appErr, ok := IsAppError(err); ok {
		return appErr.HTTPStatusCode
	}
	return 500 // Default to internal server error
}

// GetSafeErrorMessage returns a safe error message for clients
func GetSafeErrorMessage(err error) (string, string) {
	if appErr, ok := IsAppError(err); ok {
		return appErr.Code, appErr.UserMessage
	}
	return ErrCodeInternal, "An unexpected error occurred"
}

// Helper functions for specific error types

// NewNotFoundError creates a not found error for a specific resource
func NewNotFoundError(resource string) *AppError {
	return New(ErrCodeNotFound, fmt.Sprintf("%s not found", resource), 404)
}

// NewValidationError creates a validation error with specific message
func NewValidationError(message string) *AppError {
	return New(ErrCodeValidation, message, 400)
}

// NewUnauthorizedError creates an unauthorized error with specific message
func NewUnauthorizedError(message string) *AppError {
	return New(ErrCodeUnauthorized, message, 401)
}

// NewForbiddenError creates a forbidden error with specific message
func NewForbiddenError(message string) *AppError {
	return New(ErrCodeForbidden, message, 403)
}

// NewInternalError wraps an internal error with a safe user message
func NewInternalError(err error, userMessage string) *AppError {
	if userMessage == "" {
		userMessage = "An unexpected error occurred"
	}
	return Wrap(err, ErrCodeInternal, "Internal server error", userMessage, 500)
}

// NewDatabaseError wraps a database error with a safe user message
func NewDatabaseError(err error) *AppError {
	return Wrap(err, ErrCodeDatabase, "Database operation failed", "A data operation failed", 500)
}

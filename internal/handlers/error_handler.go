package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"project-management-platform/internal/errors"
)

// ErrorHandler provides centralized error handling for HTTP handlers
type ErrorHandler struct {
	logger *logrus.Logger
}

// NewErrorHandler creates a new error handler
func NewErrorHandler(logger *logrus.Logger) *ErrorHandler {
	return &ErrorHandler{
		logger: logger,
	}
}

// HandleError processes an error and sends an appropriate HTTP response
func (eh *ErrorHandler) HandleError(c *gin.Context, err error, operation string) {
	if err == nil {
		return
	}

	// Log the error with context
	logEntry := eh.logger.WithFields(logrus.Fields{
		"operation": operation,
		"path":      c.Request.URL.Path,
		"method":    c.Request.Method,
		"ip":        c.ClientIP(),
	})

	// Check if it's an AppError
	if appErr, ok := errors.IsAppError(err); ok {
		// Log the internal error details (not exposed to client)
		if appErr.InternalError != nil {
			logEntry = logEntry.WithField("internal_error", appErr.InternalError.Error())
		}
		logEntry.WithField("error_code", appErr.Code).Error(appErr.Message)

		// Send safe response to client
		c.JSON(appErr.HTTPStatusCode, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    appErr.Code,
				Message: appErr.UserMessage,
				// Note: Details field is intentionally omitted for security
			},
		})
		return
	}

	// Handle unknown errors - never expose internal details
	logEntry.Error("Unhandled error: " + err.Error())
	c.JSON(http.StatusInternalServerError, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    errors.ErrCodeInternal,
			Message: "An unexpected error occurred",
		},
	})
}

// SendSuccess sends a successful response
func (eh *ErrorHandler) SendSuccess(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

// SendValidationError sends a validation error response
func (eh *ErrorHandler) SendValidationError(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    errors.ErrCodeValidation,
			Message: message,
		},
	})
}

// SendInvalidRequest sends an invalid request error response
func (eh *ErrorHandler) SendInvalidRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    errors.ErrCodeInvalidRequest,
			Message: message,
		},
	})
}

// Global error handler function that can be used by handlers that don't have ErrorHandler injected
func HandleError(c *gin.Context, err error, operation string) {
	if err == nil {
		return
	}

	// Check if it's an AppError
	if appErr, ok := errors.IsAppError(err); ok {
		c.JSON(appErr.HTTPStatusCode, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    appErr.Code,
				Message: appErr.UserMessage,
			},
		})
		return
	}

	// Handle unknown errors safely
	c.JSON(http.StatusInternalServerError, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    errors.ErrCodeInternal,
			Message: "An unexpected error occurred",
		},
	})
}

// SendSuccess is a global helper function for success responses
func SendSuccess(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

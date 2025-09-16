package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"project-management-platform/internal/auth"
	"project-management-platform/internal/services"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	authService services.AuthServiceInterface
	logger      *logrus.Logger
}

// APIResponse represents a standard API response
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

// APIError represents an API error
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService services.AuthServiceInterface, logger *logrus.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req services.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Error("Invalid registration request")
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
				// Details field removed for security
			},
		})
		return
	}

	// Log registration attempt
	h.logger.WithFields(logrus.Fields{
		"email":      req.Email,
		"ip":         c.ClientIP(),
		"user_agent": c.GetHeader("User-Agent"),
	}).Info("User registration attempt")

	// Register user
	response, err := h.authService.Register(c.Request.Context(), req)
	if err != nil {
		h.logger.WithFields(logrus.Fields{
			"error": err,
			"email": req.Email,
		}).Error("Registration failed")

		// Use HandleError which properly handles custom error types
		// This is safer than string matching on error messages
		HandleError(c, err, "user registration")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"email":   req.Email,
		"user_id": response.User.ID.Hex(),
	}).Info("User registered successfully")

	c.JSON(http.StatusCreated, APIResponse{
		Success: true,
		Data:    response,
	})
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Error("Invalid login request")
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
				// Details field removed for security
			},
		})
		return
	}

	// Log login attempt
	h.logger.WithFields(logrus.Fields{
		"email":      req.Email,
		"ip":         c.ClientIP(),
		"user_agent": c.GetHeader("User-Agent"),
	}).Info("User login attempt")

	// Authenticate user
	response, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		h.logger.WithFields(logrus.Fields{
			"error": err,
			"email": req.Email,
		}).Warn("Login failed")
		c.JSON(http.StatusUnauthorized, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "INVALID_CREDENTIALS",
				Message: "Invalid email or password",
			},
		})
		return
	}

	h.logger.WithFields(logrus.Fields{
		"email":   req.Email,
		"user_id": response.User.ID.Hex(),
	}).Info("User logged in successfully")

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    response,
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Extract tokens from request
	accessToken := extractTokenFromHeader(c.GetHeader("Authorization"))
	refreshToken := c.GetHeader("X-Refresh-Token")

	if accessToken == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "MISSING_TOKEN",
				Message: "Access token is required",
			},
		})
		return
	}

	// Logout user
	err := h.authService.Logout(c.Request.Context(), accessToken, refreshToken)
	if err != nil {
		h.logger.WithError(err).Error("Logout failed")
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "LOGOUT_FAILED",
				Message: "Failed to logout user",
			},
		})
		return
	}

	h.logger.Info("User logged out successfully")

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    gin.H{"message": "Logged out successfully"},
	})
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req services.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Error("Invalid refresh token request")
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
				// Details field removed for security
			},
		})
		return
	}

	// Refresh token
	response, err := h.authService.RefreshToken(c.Request.Context(), req)
	if err != nil {
		h.logger.WithError(err).Warn("Token refresh failed")
		c.JSON(http.StatusUnauthorized, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "INVALID_REFRESH_TOKEN",
				Message: "Invalid or expired refresh token",
			},
		})
		return
	}

	h.logger.WithField("user_id", response.User.ID.Hex()).Info("Token refreshed successfully")

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    response,
	})
}

// ForgotPassword handles forgot password requests
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req services.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Error("Invalid forgot password request")
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
				// Details field removed for security
			},
		})
		return
	}

	// Log forgot password attempt
	h.logger.WithFields(logrus.Fields{
		"email": req.Email,
		"ip":    c.ClientIP(),
	}).Info("Forgot password request")

	// Process forgot password
	err := h.authService.ForgotPassword(c.Request.Context(), req)
	if err != nil {
		h.logger.WithFields(logrus.Fields{
			"error": err,
			"email": req.Email,
		}).Error("Forgot password failed")
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "FORGOT_PASSWORD_FAILED",
				Message: "Failed to process forgot password request",
			},
		})
		return
	}

	h.logger.WithField("email", req.Email).Info("Forgot password processed successfully")

	// Always return success to prevent email enumeration
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    gin.H{"message": "If the email exists, a password reset link has been sent"},
	})
}

// ResetPassword handles password reset
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req services.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Error("Invalid reset password request")
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
				// Details field removed for security
			},
		})
		return
	}

	// Log reset password attempt
	h.logger.WithFields(logrus.Fields{
		"token": req.Token[:8] + "...",
		"ip":    c.ClientIP(),
	}).Info("Password reset attempt")

	// Reset password
	err := h.authService.ResetPassword(c.Request.Context(), req)
	if err != nil {
		h.logger.WithError(err).Warn("Password reset failed")

		if strings.Contains(err.Error(), "expired") || strings.Contains(err.Error(), "invalid") {
			c.JSON(http.StatusBadRequest, APIResponse{
				Success: false,
				Error: &APIError{
					Code:    "INVALID_TOKEN",
					Message: "Invalid or expired reset token",
				},
			})
			return
		}

		if strings.Contains(err.Error(), "password") {
			c.JSON(http.StatusBadRequest, APIResponse{
				Success: false,
				Error: &APIError{
					Code:    "WEAK_PASSWORD",
					Message: "Password does not meet security requirements",
					// Details field removed for security
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "RESET_PASSWORD_FAILED",
				Message: "Failed to reset password",
			},
		})
		return
	}

	h.logger.Info("Password reset successfully")

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    gin.H{"message": "Password reset successfully"},
	})
}

// VerifyEmail handles email verification
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req services.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Error("Invalid verify email request")
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
				// Details field removed for security
			},
		})
		return
	}

	// Log email verification attempt
	h.logger.WithFields(logrus.Fields{
		"token": req.Token[:8] + "...",
		"ip":    c.ClientIP(),
	}).Info("Email verification attempt")

	// Verify email
	err := h.authService.VerifyEmail(c.Request.Context(), req)
	if err != nil {
		h.logger.WithError(err).Warn("Email verification failed")
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "INVALID_TOKEN",
				Message: "Invalid or expired verification token",
			},
		})
		return
	}

	h.logger.Info("Email verified successfully")

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    gin.H{"message": "Email verified successfully"},
	})
}

// Verify handles token verification and returns current user info
func (h *AuthHandler) Verify(c *gin.Context) {
	// Get user info from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, APIResponse{
			Success: false,
			Error: &APIError{
				Code:    "UNAUTHORIZED",
				Message: "Invalid or missing token",
			},
		})
		return
	}

	userEmail, _ := c.Get("user_email")
	userRole, _ := c.Get("user_role")

	// Return user info
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"user": gin.H{
				"id":    userID,
				"email": userEmail,
				"role":  userRole,
			},
		},
	})
}

// extractTokenFromHeader extracts JWT token from Authorization header
func extractTokenFromHeader(authHeader string) string {
	return auth.ExtractTokenFromHeader(authHeader)
}

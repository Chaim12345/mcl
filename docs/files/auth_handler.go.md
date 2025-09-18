# internal/handlers/auth_handler.go

## File Overview

HTTP handler for authentication-related endpoints including user registration, login, logout, token refresh, password reset, and email verification. This handler provides secure authentication flows with comprehensive logging and error handling.

## Key Components

### AuthHandler Structure
```go
type AuthHandler struct {
    authService services.AuthServiceInterface
    logger      *logrus.Logger
}
```
- **Purpose**: Handles HTTP authentication requests
- **Dependencies**: Authentication service for business logic, logger for audit trails
- **Responsibilities**: Request validation, response formatting, security logging

### Standard Response Types
```go
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
}

type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}
```
- **Consistent Format**: All API responses follow the same structure
- **Error Safety**: Details field omitted for security-sensitive operations

## Dependencies

### Internal Modules
- `internal/auth` - Authentication types and utilities
- `internal/services` - Business logic services

### External Libraries
- `github.com/gin-gonic/gin` - HTTP router and context
- `github.com/sirupsen/logrus` - Structured logging

## Data Flow

### Authentication Request Flow
```mermaid
sequenceDiagram
    participant Client
    participant Handler
    participant Service
    participant Logger
    participant Database
    
    Client->>Handler: POST /api/auth/login
    Handler->>Handler: Validate Request
    Handler->>Logger: Log Attempt
    Handler->>Service: authService.Login()
    Service->>Database: Verify Credentials
    Database-->>Service: User Data
    Service-->>Handler: Auth Response
    Handler->>Logger: Log Result
    Handler-->>Client: JSON Response
```

## Interactions

### Main Handler Methods

#### 1. Register - `POST /api/auth/register`
```go
func (h *AuthHandler) Register(c *gin.Context) {
    var req services.RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        // Validation error handling
    }
    
    response, err := h.authService.Register(c.Request.Context(), req)
    // Response handling with logging
}
```
- **Purpose**: User account creation
- **Validation**: Email format, password strength, required fields
- **Security**: Password hashing, duplicate email prevention
- **Logging**: Registration attempts and outcomes

#### 2. Login - `POST /api/auth/login`
```go
func (h *AuthHandler) Login(c *gin.Context) {
    var req services.LoginRequest
    // Request validation
    
    h.logger.WithFields(logrus.Fields{
        "email":      req.Email,
        "ip":         c.ClientIP(),
        "user_agent": c.GetHeader("User-Agent"),
    }).Info("User login attempt")
    
    response, err := h.authService.Login(c.Request.Context(), req)
    // Success/failure handling with security logging
}
```
- **Purpose**: User authentication
- **Security Logging**: IP address, user agent, attempt outcomes
- **Rate Limiting**: Protected by middleware
- **Response**: JWT tokens on success

#### 3. Logout - `POST /api/auth/logout`
```go
func (h *AuthHandler) Logout(c *gin.Context) {
    // Extract user from context
    authUser := user.(*auth.AuthenticatedUser)
    
    err := h.authService.Logout(c.Request.Context(), authUser.ID)
    // Token invalidation and cleanup
}
```
- **Purpose**: Session termination
- **Security**: Token invalidation
- **Cleanup**: Remove refresh tokens

#### 4. RefreshToken - `POST /api/auth/refresh`
```go
func (h *AuthHandler) RefreshToken(c *gin.Context) {
    var req services.RefreshTokenRequest
    // Token validation and refresh
    
    response, err := h.authService.RefreshToken(c.Request.Context(), req)
    // New token generation
}
```
- **Purpose**: Access token renewal
- **Security**: Refresh token validation and rotation
- **Expiration**: Short-lived access tokens

#### 5. ForgotPassword - `POST /api/auth/forgot-password`
```go
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
    var req services.ForgotPasswordRequest
    // Email validation
    
    err := h.authService.ForgotPassword(c.Request.Context(), req)
    // Password reset email generation
}
```
- **Purpose**: Password reset initiation
- **Security**: Rate limiting, email verification
- **Privacy**: Same response for existing/non-existing emails

#### 6. ResetPassword - `POST /api/auth/reset-password`
```go
func (h *AuthHandler) ResetPassword(c *gin.Context) {
    var req services.ResetPasswordRequest
    // Token and password validation
    
    err := h.authService.ResetPassword(c.Request.Context(), req)
    // Password update and token invalidation
}
```
- **Purpose**: Password reset completion
- **Security**: Reset token validation, password policy enforcement
- **Cleanup**: Token invalidation after use

#### 7. VerifyEmail - `POST /api/auth/verify-email`
```go
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
    var req services.VerifyEmailRequest
    // Verification token validation
    
    err := h.authService.VerifyEmail(c.Request.Context(), req)
    // Account activation
}
```
- **Purpose**: Email address verification
- **Security**: Verification token validation
- **Account Status**: Activate user account

#### 8. Verify - `GET /api/auth/verify` (Protected)
```go
func (h *AuthHandler) Verify(c *gin.Context) {
    user, ok := c.Get(auth.UserContextKey)
    // User context validation
    
    // Return current user information
}
```
- **Purpose**: Token validation and user info retrieval
- **Middleware**: Requires authentication
- **Response**: Current user details

## Example Usage

### Registration Request
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Login Request
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Login Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "verified": true
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2024-01-01T12:00:00Z"
  }
}
```

### Protected Request
```bash
curl -X GET http://localhost:8080/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Security Features

### Input Validation
- **Email Format**: RFC 5322 compliant email validation
- **Password Policy**: Minimum length, complexity requirements
- **Request Size**: Limited request body size
- **Data Sanitization**: XSS prevention in input fields

### Security Logging
```go
h.logger.WithFields(logrus.Fields{
    "email":      req.Email,
    "ip":         c.ClientIP(),
    "user_agent": c.GetHeader("User-Agent"),
    "result":     "success/failure",
}).Info("Authentication event")
```
- **Audit Trail**: All authentication events logged
- **IP Tracking**: Client IP addresses recorded
- **User Agent**: Browser/client identification
- **Failure Analysis**: Failed attempt patterns

### Error Handling
- **Generic Errors**: No sensitive information in error messages
- **Rate Limiting**: Brute force attack prevention
- **Consistent Responses**: Same response time for valid/invalid requests
- **Security Headers**: CSRF tokens, secure cookies

### Token Security
- **Short Expiration**: 15-minute access tokens
- **Refresh Rotation**: New refresh token on each refresh
- **Secure Storage**: HTTP-only cookies for refresh tokens
- **Invalidation**: Proper logout and token cleanup

## Error Response Examples

### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data"
  }
}
```

### Authentication Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### Rate Limiting Error
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

## Performance Considerations

### Request Processing
- **Minimal Validation**: Quick request validation before service calls
- **Context Propagation**: Request context passed to services
- **Connection Reuse**: Database connections managed by service layer
- **Memory Efficiency**: Minimal request/response object allocation

### Security vs Performance
- **Password Hashing**: Balanced bcrypt cost for security/performance
- **Token Validation**: Efficient JWT verification
- **Rate Limiting**: In-memory rate limiting for speed
- **Database Queries**: Optimized user lookup queries

## Integration Points

### Middleware Integration
- **Authentication Middleware**: Validates JWT tokens
- **Rate Limiting Middleware**: Protects auth endpoints
- **CSRF Middleware**: Prevents cross-site request forgery
- **Logging Middleware**: Request/response logging

### Service Layer Integration
- **AuthService**: Core authentication business logic
- **EmailService**: Password reset and verification emails
- **UserService**: User account management
- **TokenService**: JWT token management

This authentication handler provides a secure, well-logged, and user-friendly authentication system that follows security best practices while maintaining good performance and usability.

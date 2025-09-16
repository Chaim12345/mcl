package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log/slog"
	"time"

	"gopkg.in/gomail.v2"
)

// EmailService handles email operations
type EmailService interface {
	SendEmail(to, subject, body string) error
	SendHTMLEmail(to, subject, htmlBody, textBody string) error
	SendTemplateEmail(to, subject, templateName string, data interface{}) error
}

// SMTPEmailService implements EmailService using gomail with retry logic and error handling
type SMTPEmailService struct {
	host       string
	port       int
	username   string
	password   string
	from       string
	fromName   string
	templates  map[string]*template.Template
	logger     *slog.Logger
	maxRetries int
	retryDelay time.Duration
	secure     bool
}

// EmailConfig holds email configuration
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	FromAddress  string
	FromName     string
	Secure       bool
	MaxRetries   int
	RetryDelay   time.Duration
}

// NewEmailService creates a new SMTP email service with retry logic
func NewEmailService(config EmailConfig, logger *slog.Logger) EmailService {
	// Set defaults if not provided
	maxRetries := config.MaxRetries
	if maxRetries == 0 {
		maxRetries = 3
	}
	
	retryDelay := config.RetryDelay
	if retryDelay == 0 {
		retryDelay = 2 * time.Second
	}

	service := &SMTPEmailService{
		host:       config.SMTPHost,
		port:       config.SMTPPort,
		username:   config.SMTPUser,
		password:   config.SMTPPassword,
		from:       config.FromAddress,
		fromName:   config.FromName,
		templates:  make(map[string]*template.Template),
		logger:     logger,
		maxRetries: maxRetries,
		retryDelay: retryDelay,
		secure:     config.Secure,
	}

	// Load email templates
	service.loadTemplates()

	return service
}

// SendEmail sends a plain text email with retry logic
func (s *SMTPEmailService) SendEmail(to, subject, body string) error {
	// Skip sending email if SMTP is not configured
	if s.host == "" || s.host == "localhost" {
		s.logger.Info("Email would be sent (SMTP not configured)", "to", to, "subject", subject)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", s.fromName, s.from))
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)

	return s.sendEmailWithRetry(m, to, subject)
}

// SendHTMLEmail sends an HTML email with optional text fallback and retry logic
func (s *SMTPEmailService) SendHTMLEmail(to, subject, htmlBody, textBody string) error {
	// Skip sending email if SMTP is not configured
	if s.host == "" || s.host == "localhost" {
		s.logger.Info("HTML Email would be sent (SMTP not configured)", "to", to, "subject", subject)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", s.fromName, s.from))
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	
	if textBody != "" {
		m.SetBody("text/plain", textBody)
		m.AddAlternative("text/html", htmlBody)
	} else {
		m.SetBody("text/html", htmlBody)
	}

	return s.sendEmailWithRetry(m, to, subject)
}

// SendTemplateEmail sends an email using a template with retry logic
func (s *SMTPEmailService) SendTemplateEmail(to, subject, templateName string, data interface{}) error {
	tmpl, exists := s.templates[templateName]
	if !exists {
		s.logger.Error("Template not found", "template", templateName)
		return fmt.Errorf("template %s not found", templateName)
	}

	var htmlBuf, textBuf bytes.Buffer

	// Execute HTML template
	if err := tmpl.ExecuteTemplate(&htmlBuf, templateName+".html", data); err != nil {
		s.logger.Error("Failed to execute HTML template", "template", templateName, "error", err)
		return fmt.Errorf("failed to execute HTML template: %w", err)
	}

	// Execute text template (optional)
	textTemplate := templateName + ".txt"
	if tmpl.Lookup(textTemplate) != nil {
		if err := tmpl.ExecuteTemplate(&textBuf, textTemplate, data); err != nil {
			s.logger.Error("Failed to execute text template", "template", textTemplate, "error", err)
			return fmt.Errorf("failed to execute text template: %w", err)
		}
	}

	return s.SendHTMLEmail(to, subject, htmlBuf.String(), textBuf.String())
}

// sendEmailWithRetry sends the email using SMTP with gomail and retry logic
func (s *SMTPEmailService) sendEmailWithRetry(m *gomail.Message, to, subject string) error {
	d := gomail.NewDialer(s.host, s.port, s.username, s.password)
	
	// Configure TLS/SSL settings
	if s.secure {
		d.SSL = true
	}
	
	var lastErr error
	
	for attempt := 1; attempt <= s.maxRetries; attempt++ {
		s.logger.Info("Attempting to send email", 
			"to", to, 
			"subject", subject, 
			"attempt", attempt, 
			"max_retries", s.maxRetries)
		
		if err := d.DialAndSend(m); err != nil {
			lastErr = err
			s.logger.Warn("Failed to send email", 
				"to", to, 
				"subject", subject, 
				"attempt", attempt, 
				"error", err)
			
			// Don't retry on the last attempt
			if attempt < s.maxRetries {
				s.logger.Info("Retrying email send", 
					"delay", s.retryDelay, 
					"next_attempt", attempt+1)
				time.Sleep(s.retryDelay)
			}
		} else {
			s.logger.Info("Email sent successfully", 
				"to", to, 
				"subject", subject, 
				"attempt", attempt)
			return nil
		}
	}
	
	s.logger.Error("Failed to send email after all retries", 
		"to", to, 
		"subject", subject, 
		"max_retries", s.maxRetries, 
		"final_error", lastErr)
	
	return fmt.Errorf("failed to send email after %d attempts: %w", s.maxRetries, lastErr)
}

// loadTemplates loads email templates
func (s *SMTPEmailService) loadTemplates() {
	// Email verification template
	verificationHTML := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
            <p>Hi {{.FirstName}},</p>
            <p>Thank you for registering with our project management platform! Please click the button below to verify your email address:</p>
            <p style="text-align: center;">
                <a href="{{.VerificationURL}}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{{.VerificationURL}}">{{.VerificationURL}}</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Project Management Team</p>
        </div>
    </div>
</body>
</html>`

	verificationText := `
Hi {{.FirstName}},

Thank you for registering with our project management platform! Please click the link below to verify your email address:

{{.VerificationURL}}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
Project Management Team`

	// Password reset template
	resetHTML := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
        </div>
        <div class="content">
            <p>Hi {{.FirstName}},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="{{.ResetURL}}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{{.ResetURL}}">{{.ResetURL}}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Project Management Team</p>
        </div>
    </div>
</body>
</html>`

	resetText := `
Hi {{.FirstName}},

You requested to reset your password. Click the link below to create a new password:

{{.ResetURL}}

This link will expire in 1 hour.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Project Management Team`

	// Parse templates
	verificationTmpl := template.Must(template.New("verification.html").Parse(verificationHTML))
	template.Must(verificationTmpl.New("verification.txt").Parse(verificationText))

	resetTmpl := template.Must(template.New("reset.html").Parse(resetHTML))
	template.Must(resetTmpl.New("reset.txt").Parse(resetText))

	s.templates["verification"] = verificationTmpl
	s.templates["reset"] = resetTmpl
}

// MockEmailService is a mock implementation for testing
type MockEmailService struct {
	SentEmails []MockEmail
}

// MockEmail represents a sent email for testing
type MockEmail struct {
	To      string
	Subject string
	Body    string
	IsHTML  bool
}

// NewMockEmailService creates a new mock email service
func NewMockEmailService() *MockEmailService {
	return &MockEmailService{
		SentEmails: make([]MockEmail, 0),
	}
}

// SendEmail records the email instead of sending it
func (m *MockEmailService) SendEmail(to, subject, body string) error {
	m.SentEmails = append(m.SentEmails, MockEmail{
		To:      to,
		Subject: subject,
		Body:    body,
		IsHTML:  false,
	})
	return nil
}

// SendHTMLEmail records the HTML email instead of sending it
func (m *MockEmailService) SendHTMLEmail(to, subject, htmlBody, textBody string) error {
	m.SentEmails = append(m.SentEmails, MockEmail{
		To:      to,
		Subject: subject,
		Body:    htmlBody,
		IsHTML:  true,
	})
	return nil
}

// SendTemplateEmail records the template email instead of sending it
func (m *MockEmailService) SendTemplateEmail(to, subject, templateName string, data interface{}) error {
	m.SentEmails = append(m.SentEmails, MockEmail{
		To:      to,
		Subject: subject,
		Body:    fmt.Sprintf("Template: %s, Data: %+v", templateName, data),
		IsHTML:  true,
	})
	return nil
}

// GetLastEmail returns the last sent email
func (m *MockEmailService) GetLastEmail() *MockEmail {
	if len(m.SentEmails) == 0 {
		return nil
	}
	return &m.SentEmails[len(m.SentEmails)-1]
}

// Clear clears all sent emails
func (m *MockEmailService) Clear() {
	m.SentEmails = make([]MockEmail, 0)
}
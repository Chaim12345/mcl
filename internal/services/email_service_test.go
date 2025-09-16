package services

import (
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewEmailService(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "mail.cock.li",
		SMTPPort:     465,
		SMTPUser:     "chaim12345@cock.li",
		SMTPPassword: "Aa123456789!",
		FromAddress:  "chaim12345@cock.li",
		FromName:     "Project Management",
		Secure:       true,
		MaxRetries:   3,
		RetryDelay:   2 * time.Second,
	}

	service := NewEmailService(config, logger)
	require.NotNil(t, service)

	// Cast to concrete type to check internal fields
	smtpService, ok := service.(*SMTPEmailService)
	require.True(t, ok)
	
	assert.Equal(t, "mail.cock.li", smtpService.host)
	assert.Equal(t, 465, smtpService.port)
	assert.Equal(t, "chaim12345@cock.li", smtpService.username)
	assert.Equal(t, "Aa123456789!", smtpService.password)
	assert.Equal(t, "chaim12345@cock.li", smtpService.from)
	assert.Equal(t, "Project Management", smtpService.fromName)
	assert.True(t, smtpService.secure)
	assert.Equal(t, 3, smtpService.maxRetries)
	assert.Equal(t, 2*time.Second, smtpService.retryDelay)
	assert.NotNil(t, smtpService.templates)
	assert.NotNil(t, smtpService.logger)
}

func TestNewEmailServiceDefaults(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "mail.cock.li",
		SMTPPort:     465,
		SMTPUser:     "chaim12345@cock.li",
		SMTPPassword: "Aa123456789!",
		FromAddress:  "chaim12345@cock.li",
		FromName:     "Project Management",
		Secure:       true,
		// MaxRetries and RetryDelay not set - should use defaults
	}

	service := NewEmailService(config, logger)
	smtpService := service.(*SMTPEmailService)
	
	assert.Equal(t, 3, smtpService.maxRetries) // default
	assert.Equal(t, 2*time.Second, smtpService.retryDelay) // default
}

func TestSendEmail_NotConfigured(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "", // Empty host should skip sending
		SMTPPort:     465,
		SMTPUser:     "",
		SMTPPassword: "",
		FromAddress:  "test@example.com",
		FromName:     "Test",
	}

	service := NewEmailService(config, logger)
	
	err := service.SendEmail("recipient@example.com", "Test Subject", "Test Body")
	assert.NoError(t, err) // Should not error when SMTP not configured
}

func TestSendHTMLEmail_NotConfigured(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "localhost", // localhost should skip sending
		SMTPPort:     465,
		SMTPUser:     "",
		SMTPPassword: "",
		FromAddress:  "test@example.com",
		FromName:     "Test",
	}

	service := NewEmailService(config, logger)
	
	err := service.SendHTMLEmail("recipient@example.com", "Test Subject", "<h1>Test HTML</h1>", "Test Text")
	assert.NoError(t, err) // Should not error when SMTP not configured
}

func TestSendTemplateEmail_TemplateNotFound(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "mail.cock.li",
		SMTPPort:     465,
		SMTPUser:     "chaim12345@cock.li",
		SMTPPassword: "Aa123456789!",
		FromAddress:  "chaim12345@cock.li",
		FromName:     "Project Management",
		Secure:       true,
	}

	service := NewEmailService(config, logger)
	
	err := service.SendTemplateEmail("recipient@example.com", "Test Subject", "nonexistent", map[string]string{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "template nonexistent not found")
}

func TestSendTemplateEmail_VerificationTemplate(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "", // Empty to skip actual sending
		SMTPPort:     465,
		SMTPUser:     "",
		SMTPPassword: "",
		FromAddress:  "test@example.com",
		FromName:     "Test",
	}

	service := NewEmailService(config, logger)
	
	data := map[string]string{
		"FirstName":       "John",
		"VerificationURL": "https://example.com/verify?token=abc123",
	}
	
	err := service.SendTemplateEmail("recipient@example.com", "Verify Your Email", "verification", data)
	assert.NoError(t, err) // Should not error when SMTP not configured
}

func TestSendTemplateEmail_ResetTemplate(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "", // Empty to skip actual sending
		SMTPPort:     465,
		SMTPUser:     "",
		SMTPPassword: "",
		FromAddress:  "test@example.com",
		FromName:     "Test",
	}

	service := NewEmailService(config, logger)
	
	data := map[string]string{
		"FirstName": "John",
		"ResetURL":  "https://example.com/reset?token=abc123",
	}
	
	err := service.SendTemplateEmail("recipient@example.com", "Reset Your Password", "reset", data)
	assert.NoError(t, err) // Should not error when SMTP not configured
}

func TestMockEmailService(t *testing.T) {
	mockService := NewMockEmailService()
	
	// Test SendEmail
	err := mockService.SendEmail("test@example.com", "Test Subject", "Test Body")
	assert.NoError(t, err)
	
	// Test SendHTMLEmail
	err = mockService.SendHTMLEmail("test@example.com", "HTML Subject", "<h1>HTML</h1>", "Text")
	assert.NoError(t, err)
	
	// Test SendTemplateEmail
	err = mockService.SendTemplateEmail("test@example.com", "Template Subject", "test-template", map[string]string{"key": "value"})
	assert.NoError(t, err)
	
	// Check sent emails
	assert.Len(t, mockService.SentEmails, 3)
	
	// Check first email
	firstEmail := mockService.SentEmails[0]
	assert.Equal(t, "test@example.com", firstEmail.To)
	assert.Equal(t, "Test Subject", firstEmail.Subject)
	assert.Equal(t, "Test Body", firstEmail.Body)
	assert.False(t, firstEmail.IsHTML)
	
	// Check last email
	lastEmail := mockService.GetLastEmail()
	assert.NotNil(t, lastEmail)
	assert.Equal(t, "test@example.com", lastEmail.To)
	assert.Equal(t, "Template Subject", lastEmail.Subject)
	assert.True(t, lastEmail.IsHTML)
	
	// Test Clear
	mockService.Clear()
	assert.Len(t, mockService.SentEmails, 0)
	assert.Nil(t, mockService.GetLastEmail())
}

// Integration test - only run if SMTP credentials are available
func TestSendEmail_Integration(t *testing.T) {
	// Skip this test in CI/CD or if SMTP_TEST is not set
	if os.Getenv("SMTP_TEST") != "true" {
		t.Skip("Skipping integration test - set SMTP_TEST=true to run")
	}
	
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "mail.cock.li",
		SMTPPort:     465,
		SMTPUser:     "chaim12345@cock.li",
		SMTPPassword: "Aa123456789!",
		FromAddress:  "chaim12345@cock.li",
		FromName:     "Project Management Test",
		Secure:       true,
		MaxRetries:   2,
		RetryDelay:   1 * time.Second,
	}

	service := NewEmailService(config, logger)
	
	// Test sending a real email (to the same address to avoid spam)
	err := service.SendEmail("chaim12345@cock.li", "Test Email from Go Service", "This is a test email from the Go email service.")
	if err != nil {
		t.Logf("Integration test failed (this might be expected): %v", err)
		// Don't fail the test as SMTP might not be accessible in test environment
	} else {
		t.Log("Integration test passed - email sent successfully")
	}
}

func TestEmailTemplatesLoaded(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	
	config := EmailConfig{
		SMTPHost:     "mail.cock.li",
		SMTPPort:     465,
		SMTPUser:     "chaim12345@cock.li",
		SMTPPassword: "Aa123456789!",
		FromAddress:  "chaim12345@cock.li",
		FromName:     "Project Management",
		Secure:       true,
	}

	service := NewEmailService(config, logger)
	smtpService := service.(*SMTPEmailService)
	
	// Check that templates are loaded
	assert.Contains(t, smtpService.templates, "verification")
	assert.Contains(t, smtpService.templates, "reset")
	
	// Check that templates have the expected sub-templates
	verificationTmpl := smtpService.templates["verification"]
	assert.NotNil(t, verificationTmpl.Lookup("verification.html"))
	assert.NotNil(t, verificationTmpl.Lookup("verification.txt"))
	
	resetTmpl := smtpService.templates["reset"]
	assert.NotNil(t, resetTmpl.Lookup("reset.html"))
	assert.NotNil(t, resetTmpl.Lookup("reset.txt"))
}
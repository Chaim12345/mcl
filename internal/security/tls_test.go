package security

import (
	"crypto/tls"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDefaultTLSConfig(t *testing.T) {
	config := DefaultTLSConfig()

	assert.Equal(t, uint16(tls.VersionTLS12), config.MinVersion)
	assert.Equal(t, uint16(tls.VersionTLS13), config.MaxVersion)
	assert.False(t, config.InsecureSkipVerify)
	assert.NotEmpty(t, config.CipherSuites)

	// Check that secure cipher suites are included
	assert.Contains(t, config.CipherSuites, uint16(tls.TLS_AES_256_GCM_SHA384))
	assert.Contains(t, config.CipherSuites, uint16(tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384))
}

func TestTLSConfigValidation(t *testing.T) {
	tests := []struct {
		name        string
		config      TLSConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid config",
			config: TLSConfig{
				MinVersion: tls.VersionTLS12,
				MaxVersion: tls.VersionTLS13,
			},
			expectError: false,
		},
		{
			name: "invalid min version",
			config: TLSConfig{
				MinVersion: tls.VersionTLS10,
				MaxVersion: tls.VersionTLS13,
			},
			expectError: true,
			errorMsg:    "minimum TLS version must be 1.2 or higher",
		},
		{
			name: "max version less than min version",
			config: TLSConfig{
				MinVersion: tls.VersionTLS13,
				MaxVersion: tls.VersionTLS12,
			},
			expectError: true,
			errorMsg:    "maximum TLS version must be greater than or equal to minimum version",
		},
		{
			name: "cert file without key file",
			config: TLSConfig{
				MinVersion: tls.VersionTLS12,
				MaxVersion: tls.VersionTLS13,
				CertFile:   "cert.pem",
			},
			expectError: true,
			errorMsg:    "key file must be provided when certificate file is specified",
		},
		{
			name: "key file without cert file",
			config: TLSConfig{
				MinVersion: tls.VersionTLS12,
				MaxVersion: tls.VersionTLS13,
				KeyFile:    "key.pem",
			},
			expectError: true,
			errorMsg:    "certificate file must be provided when key file is specified",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestCreateTLSConfig(t *testing.T) {
	config := &TLSConfig{
		MinVersion: tls.VersionTLS12,
		MaxVersion: tls.VersionTLS13,
		CipherSuites: []uint16{
			tls.TLS_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		},
	}

	tlsConfig, err := config.CreateTLSConfig()
	require.NoError(t, err)
	require.NotNil(t, tlsConfig)

	assert.Equal(t, uint16(tls.VersionTLS12), tlsConfig.MinVersion)
	assert.Equal(t, uint16(tls.VersionTLS13), tlsConfig.MaxVersion)
	assert.Equal(t, config.CipherSuites, tlsConfig.CipherSuites)
	assert.Equal(t, tls.RenegotiateNever, tlsConfig.Renegotiation)
	assert.False(t, tlsConfig.SessionTicketsDisabled)

	// Check curve preferences
	expectedCurves := []tls.CurveID{tls.X25519, tls.CurveP256}
	assert.Equal(t, expectedCurves, tlsConfig.CurvePreferences)
}

func TestSecureHTTPServer(t *testing.T) {
	tlsConfig := DefaultTLSConfig()

	server, err := SecureHTTPServer(":8443", nil, tlsConfig)
	require.NoError(t, err)
	require.NotNil(t, server)

	assert.Equal(t, ":8443", server.Addr)
	assert.Equal(t, 15*time.Second, server.ReadTimeout)
	assert.Equal(t, 15*time.Second, server.WriteTimeout)
	assert.Equal(t, 60*time.Second, server.IdleTimeout)
	assert.Equal(t, 5*time.Second, server.ReadHeaderTimeout)
	assert.Equal(t, 1<<20, server.MaxHeaderBytes)
	assert.NotNil(t, server.TLSConfig)
	assert.NotNil(t, server.TLSNextProto) // Should be empty map to disable HTTP/2
}

func TestGenerateSelfSignedCert(t *testing.T) {
	// This should return an error as it's not implemented for security reasons
	err := GenerateSelfSignedCert("cert.pem", "key.pem", []string{"localhost"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not implemented")
}

func TestTLSConfigWithInvalidCertificates(t *testing.T) {
	config := &TLSConfig{
		MinVersion: tls.VersionTLS12,
		MaxVersion: tls.VersionTLS13,
		CertFile:   "nonexistent.pem",
		KeyFile:    "nonexistent.key",
	}

	_, err := config.CreateTLSConfig()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to load certificate")
}

func TestTLSConfigCipherSuiteSecurity(t *testing.T) {
	config := DefaultTLSConfig()

	// Ensure no weak cipher suites are included
	weakCiphers := []uint16{
		tls.TLS_RSA_WITH_RC4_128_SHA,
		tls.TLS_RSA_WITH_3DES_EDE_CBC_SHA,
		tls.TLS_RSA_WITH_AES_128_CBC_SHA,
		tls.TLS_RSA_WITH_AES_256_CBC_SHA,
	}

	for _, weakCipher := range weakCiphers {
		assert.NotContains(t, config.CipherSuites, weakCipher,
			"Weak cipher suite %x should not be included", weakCipher)
	}

	// Ensure strong cipher suites are included
	strongCiphers := []uint16{
		tls.TLS_AES_256_GCM_SHA384,
		tls.TLS_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	}

	for _, strongCipher := range strongCiphers {
		assert.Contains(t, config.CipherSuites, strongCipher,
			"Strong cipher suite %x should be included", strongCipher)
	}
}

func BenchmarkCreateTLSConfig(b *testing.B) {
	config := DefaultTLSConfig()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := config.CreateTLSConfig()
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkTLSConfigValidation(b *testing.B) {
	config := DefaultTLSConfig()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := config.Validate()
		if err != nil {
			b.Fatal(err)
		}
	}
}

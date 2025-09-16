package security

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
)

// TLSConfig holds TLS configuration
type TLSConfig struct {
	CertFile           string
	KeyFile            string
	CAFile             string
	MinVersion         uint16
	MaxVersion         uint16
	CipherSuites       []uint16
	InsecureSkipVerify bool
}

// DefaultTLSConfig returns secure TLS configuration
func DefaultTLSConfig() *TLSConfig {
	return &TLSConfig{
		MinVersion:         tls.VersionTLS12,
		MaxVersion:         tls.VersionTLS13,
		InsecureSkipVerify: false,
		CipherSuites: []uint16{
			// TLS 1.3 cipher suites (preferred)
			tls.TLS_AES_256_GCM_SHA384,
			tls.TLS_AES_128_GCM_SHA256,
			tls.TLS_CHACHA20_POLY1305_SHA256,

			// TLS 1.2 cipher suites (fallback)
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
		},
	}
}

// CreateTLSConfig creates a tls.Config from TLSConfig
func (tc *TLSConfig) CreateTLSConfig() (*tls.Config, error) {
	config := &tls.Config{
		MinVersion:             tc.MinVersion,
		MaxVersion:             tc.MaxVersion,
		CipherSuites:           tc.CipherSuites,
		InsecureSkipVerify:     tc.InsecureSkipVerify,
		CurvePreferences:       []tls.CurveID{tls.X25519, tls.CurveP256},
		SessionTicketsDisabled: false,
		Renegotiation:          tls.RenegotiateNever,
	}

	// Load certificates if provided
	if tc.CertFile != "" && tc.KeyFile != "" {
		cert, err := tls.LoadX509KeyPair(tc.CertFile, tc.KeyFile)
		if err != nil {
			return nil, fmt.Errorf("failed to load certificate: %w", err)
		}
		config.Certificates = []tls.Certificate{cert}
	}

	// Load CA certificate if provided
	if tc.CAFile != "" {
		caCert, err := ioutil.ReadFile(tc.CAFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read CA certificate: %w", err)
		}

		caCertPool := x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("failed to parse CA certificate")
		}
		config.ClientCAs = caCertPool
		config.ClientAuth = tls.RequireAndVerifyClientCert
	}

	return config, nil
}

// SecureHTTPServer creates an HTTP server with secure TLS configuration
func SecureHTTPServer(addr string, handler http.Handler, tlsConfig *TLSConfig) (*http.Server, error) {
	config, err := tlsConfig.CreateTLSConfig()
	if err != nil {
		return nil, err
	}

	server := &http.Server{
		Addr:         addr,
		Handler:      handler,
		TLSConfig:    config,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,

		// Security headers
		ReadHeaderTimeout: 5 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1MB

		// Disable HTTP/2 for better security control (optional)
		TLSNextProto: make(map[string]func(*http.Server, *tls.Conn, http.Handler)),
	}

	return server, nil
}

// GenerateSelfSignedCert generates a self-signed certificate for development
func GenerateSelfSignedCert(certFile, keyFile string, hosts []string) error {
	// This is a placeholder for certificate generation
	// In production, use proper certificates from a CA
	return fmt.Errorf("self-signed certificate generation not implemented - use proper certificates in production")
}

// ValidateTLSConfig validates TLS configuration
func (tc *TLSConfig) Validate() error {
	if tc.MinVersion < tls.VersionTLS12 {
		return fmt.Errorf("minimum TLS version must be 1.2 or higher")
	}

	if tc.MaxVersion < tc.MinVersion {
		return fmt.Errorf("maximum TLS version must be greater than or equal to minimum version")
	}

	if tc.CertFile != "" && tc.KeyFile == "" {
		return fmt.Errorf("key file must be provided when certificate file is specified")
	}

	if tc.KeyFile != "" && tc.CertFile == "" {
		return fmt.Errorf("certificate file must be provided when key file is specified")
	}

	return nil
}

// TLSHealthCheck performs a health check on TLS configuration
func TLSHealthCheck(addr string, timeout time.Duration) error {
	client := &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				MinVersion: tls.VersionTLS12,
			},
		},
	}

	resp, err := client.Get("https://" + addr + "/health")
	if err != nil {
		return fmt.Errorf("TLS health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("TLS health check returned status %d", resp.StatusCode)
	}

	return nil
}

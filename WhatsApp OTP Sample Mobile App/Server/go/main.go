/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Package main implements a WhatsApp OTP sample server in Go.
//
// This server generates and verifies OTP codes sent via WhatsApp Business API
// authentication templates. It implements the following security features:
//   - Cryptographically secure OTP generation using crypto/rand
//   - SHA-256 hashing for OTP storage (plaintext never persisted)
//   - Constant-time comparison to prevent timing attacks
//   - Maximum verification attempts (3) to prevent brute force
//   - OTP expiry after 5 minutes
//   - One-time use (code deleted after successful verification)
package main

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Configuration constants
const (
	port                    = 3000
	codeLength              = 6
	codeLifetimeMinutes     = 5
	maxVerificationAttempts = 3
	filename                = "whatsapp-info.json"
	apiVersion              = "v21.0"
)

// OTPData stores the hashed OTP code and its metadata.
type OTPData struct {
	CodeHash            string    `json:"codeHash"`
	ExpirationTimestamp time.Time `json:"expirationTimestamp"`
	Attempts            int       `json:"attempts"`
}

// WhatsAppConfig holds the configuration loaded from the setup JSON file.
type WhatsAppConfig struct {
	WabaID        string `json:"waba_id"`
	AccessToken   string `json:"access_token"`
	PhoneNumberID string `json:"phone_number_id"`
	TemplateID    string `json:"template_id"`
}

// VerifyRequest represents the JSON body for OTP verification.
type VerifyRequest struct {
	Code string `json:"code"`
}

// Global state
var (
	activeCodes  = make(map[string]*OTPData)
	activeCodesMu sync.RWMutex
	config       WhatsAppConfig
	templateName string
)

// generateCode creates a cryptographically secure 6-digit OTP code.
// Uses crypto/rand which is suitable for security-sensitive applications.
func generateCode() (string, error) {
	// Generate a random number between 100000 and 999999 (6 digits)
	min := int64(100000)
	max := int64(999999)
	n, err := rand.Int(rand.Reader, big.NewInt(max-min+1))
	if err != nil {
		return "", err
	}
	code := n.Int64() + min
	return fmt.Sprintf("%06d", code), nil
}

// hashCode computes the SHA-256 hash of an OTP code.
// The plaintext code is never stored - only the hash is persisted.
func hashCode(code string) string {
	hash := sha256.Sum256([]byte(code))
	return hex.EncodeToString(hash[:])
}

// verifyCode performs constant-time comparison of the provided code against the stored hash.
// This prevents timing attacks where an attacker could measure response times.
func verifyCode(providedCode, storedHash string) bool {
	providedHash := hashCode(providedCode)
	storedBytes, err1 := hex.DecodeString(storedHash)
	providedBytes, err2 := hex.DecodeString(providedHash)
	if err1 != nil || err2 != nil {
		return false
	}
	return subtle.ConstantTimeCompare(storedBytes, providedBytes) == 1
}

// logActiveCodes prints a sanitized view of active OTP codes for debugging.
func logActiveCodes() {
	activeCodesMu.RLock()
	defer activeCodesMu.RUnlock()

	log.Println("Active codes state (hashes shown, not plaintext):")
	for phone, data := range activeCodes {
		truncatedHash := data.CodeHash[:16] + "..."
		log.Printf("  %s: hash=%s, expires=%s, attempts=%d\n",
			phone, truncatedHash, data.ExpirationTimestamp.Format(time.RFC3339), data.Attempts)
	}
}

// sendOTP handles GET /otp/:phone_number - generates and sends an OTP via WhatsApp.
func sendOTP(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimPrefix(r.URL.Path, "/otp/")
	phone = strings.TrimSuffix(phone, "/")

	log.Printf("OTP requested for phone # %s\n", phone)

	code, err := generateCode()
	if err != nil {
		log.Printf("Error generating code: %v\n", err)
		http.Error(w, "Error generating code", http.StatusInternalServerError)
		return
	}

	expirationTimestamp := time.Now().Add(codeLifetimeMinutes * time.Minute)

	// Build the WhatsApp API request
	sendMessageURL := fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", apiVersion, config.PhoneNumberID)

	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                phone,
		"type":              "template",
		"template": map[string]interface{}{
			"name": templateName,
			"language": map[string]string{
				"code":   "en_US",
				"policy": "deterministic",
			},
			"components": []map[string]interface{}{
				{
					"type": "body",
					"parameters": []map[string]string{
						{"type": "text", "text": code},
					},
				},
				{
					"type":     "button",
					"sub_type": "url",
					"index":    "0",
					"parameters": []map[string]string{
						{"type": "text", "text": code},
					},
				},
			},
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshaling payload: %v\n", err)
		http.Error(w, "Error preparing request", http.StatusInternalServerError)
		return
	}

	req, err := http.NewRequest("POST", sendMessageURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("Error creating request: %v\n", err)
		http.Error(w, "Error sending message", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.AccessToken)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending message: %v\n", err)
		http.Error(w, "Error calling send message API", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Error (%d) from WhatsApp API: %s\n", resp.StatusCode, string(body))
		http.Error(w, "Error calling send message API. Check server logs.", http.StatusInternalServerError)
		return
	}

	// Store the hashed code
	activeCodesMu.Lock()
	activeCodes[phone] = &OTPData{
		CodeHash:            hashCode(code),
		ExpirationTimestamp: expirationTimestamp,
		Attempts:            0,
	}
	activeCodesMu.Unlock()

	log.Printf("Response (%d): OK\n", http.StatusOK)
	logActiveCodes()
	w.WriteHeader(http.StatusOK)
}

// verifyOTP handles POST /otp/:phone_number - verifies the submitted OTP code.
func verifyOTP(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimPrefix(r.URL.Path, "/otp/")
	phone = strings.TrimSuffix(phone, "/")

	log.Printf("OTP validation request for phone # %s\n", phone)

	activeCodesMu.RLock()
	activeCode, exists := activeCodes[phone]
	activeCodesMu.RUnlock()

	if !exists {
		msg := fmt.Sprintf("No active code for phone # %s", phone)
		log.Printf("Response (%d): %s\n", http.StatusNotFound, msg)
		logActiveCodes()
		http.Error(w, msg, http.StatusNotFound)
		return
	}

	var verifyReq VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&verifyReq); err != nil || verifyReq.Code == "" {
		log.Printf("Response (%d): No code provided.\n", http.StatusBadRequest)
		logActiveCodes()
		http.Error(w, "No code provided.", http.StatusBadRequest)
		return
	}

	// Check if code has expired
	if time.Now().After(activeCode.ExpirationTimestamp) {
		activeCodesMu.Lock()
		delete(activeCodes, phone)
		activeCodesMu.Unlock()
		msg := "Code has expired, please request another."
		log.Printf("Response (%d): %s\n", http.StatusUnauthorized, msg)
		logActiveCodes()
		http.Error(w, msg, http.StatusUnauthorized)
		return
	}

	// Check if max attempts exceeded
	if activeCode.Attempts >= maxVerificationAttempts {
		activeCodesMu.Lock()
		delete(activeCodes, phone)
		activeCodesMu.Unlock()
		msg := "Too many failed attempts, please request a new code."
		log.Printf("Response (%d): %s\n", http.StatusUnauthorized, msg)
		logActiveCodes()
		http.Error(w, msg, http.StatusUnauthorized)
		return
	}

	// Verify the code using constant-time comparison
	if !verifyCode(verifyReq.Code, activeCode.CodeHash) {
		activeCodesMu.Lock()
		activeCodes[phone].Attempts++
		attempts := activeCodes[phone].Attempts
		if attempts >= maxVerificationAttempts {
			delete(activeCodes, phone)
			activeCodesMu.Unlock()
			msg := "Too many failed attempts, please request a new code."
			log.Printf("Response (%d): %s\n", http.StatusUnauthorized, msg)
			logActiveCodes()
			http.Error(w, msg, http.StatusUnauthorized)
			return
		}
		activeCodesMu.Unlock()
		remaining := maxVerificationAttempts - attempts
		msg := fmt.Sprintf("Incorrect code. %d attempt(s) remaining.", remaining)
		log.Printf("Response (%d): %s\n", http.StatusUnauthorized, msg)
		logActiveCodes()
		http.Error(w, msg, http.StatusUnauthorized)
		return
	}

	// Success - delete the code (one-time use)
	activeCodesMu.Lock()
	delete(activeCodes, phone)
	activeCodesMu.Unlock()

	log.Printf("Response (%d): OK\n", http.StatusOK)
	logActiveCodes()
	w.WriteHeader(http.StatusOK)
}

// otpHandler routes requests based on HTTP method.
func otpHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("Current time: %s\n", time.Now().Format(time.RFC3339))

	switch r.Method {
	case http.MethodGet:
		sendOTP(w, r)
	case http.MethodPost:
		verifyOTP(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// loadConfig reads the WhatsApp configuration from the setup JSON file.
func loadConfig() error {
	// Try to find the config file relative to the executable
	configPath := filepath.Join("..", "setup", filename)

	data, err := os.ReadFile(configPath)
	if err != nil {
		// Try alternative path
		configPath = filepath.Join("setup", filename)
		data, err = os.ReadFile(configPath)
		if err != nil {
			return fmt.Errorf("missing %s file. Please run setup.py first", filename)
		}
	}

	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("could not parse %s: %w", filename, err)
	}

	if config.WabaID == "" || config.AccessToken == "" ||
	   config.PhoneNumberID == "" || config.TemplateID == "" {
		return fmt.Errorf("missing required fields in %s", filename)
	}

	return nil
}

// fetchTemplateName retrieves the template name from the WhatsApp API.
func fetchTemplateName() error {
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/message_templates?access_token=%s",
		apiVersion, config.WabaID, config.AccessToken)

	for url != "" {
		resp, err := http.Get(url)
		if err != nil {
			return fmt.Errorf("error fetching templates: %w", err)
		}
		defer resp.Body.Close()

		var result struct {
			Data []struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				Status string `json:"status"`
			} `json:"data"`
			Paging struct {
				Next string `json:"next"`
			} `json:"paging"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return fmt.Errorf("error parsing templates response: %w", err)
		}

		for _, tmpl := range result.Data {
			if tmpl.ID == config.TemplateID {
				if tmpl.Status != "APPROVED" {
					return fmt.Errorf("template with ID %s is not approved (status: %s)",
						config.TemplateID, tmpl.Status)
				}
				templateName = tmpl.Name
				return nil
			}
		}

		url = result.Paging.Next
	}

	return fmt.Errorf("could not find template with ID %s", config.TemplateID)
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	if err := loadConfig(); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	if err := fetchTemplateName(); err != nil {
		log.Fatalf("Template error: %v", err)
	}

	log.Printf("Verified OTP template '%s' with ID %s is approved and ready to send.\n",
		templateName, config.TemplateID)

	http.HandleFunc("/otp/", otpHandler)

	log.Printf("Sample app listening on port %d\n", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

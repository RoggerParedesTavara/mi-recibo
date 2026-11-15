package main_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/google/uuid"
)

type AuthSuccessResponse struct {
	Token string       `json:"token"`
	Owner domain.Owner `json:"owner"`
}

func TestAuthRegistrationAndLogin(t *testing.T) {
	router, db := setupTestServer(t)
	defer db.Close()

	randomSuffix := uuid.New().String()[:8]
	email := fmt.Sprintf("test_user_%s@example.com", randomSuffix)
	password := "SecurePassword123!"
	name := "Usuario De Prueba"
	phone := "+5491199887766"

	// 1. Successful Registration
	regPayload := map[string]string{
		"name":     name,
		"email":    email,
		"password": password,
		"phone":    phone,
	}
	body, _ := json.Marshal(regPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created on registration, got %d: %s", w.Code, w.Body.String())
	}

	var regResp AuthSuccessResponse
	if err := json.Unmarshal(w.Body.Bytes(), &regResp); err != nil {
		t.Fatalf("failed to decode register response: %v", err)
	}

	if regResp.Token == "" {
		t.Errorf("expected non-empty token")
	}
	if regResp.Owner.Email != email {
		t.Errorf("expected email %s, got %s", email, regResp.Owner.Email)
	}
	if regResp.Owner.Name != name {
		t.Errorf("expected name %s, got %s", name, regResp.Owner.Name)
	}
	if regResp.Owner.Phone != phone {
		t.Errorf("expected phone %s, got %s", phone, regResp.Owner.Phone)
	}

	// 2. Duplicate Registration -> 409 Conflict
	dupReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	dupReq.Header.Set("Content-Type", "application/json")
	dupW := httptest.NewRecorder()
	router.ServeHTTP(dupW, dupReq)

	if dupW.Code != http.StatusConflict {
		t.Errorf("expected 409 Conflict on duplicate registration, got %d: %s", dupW.Code, dupW.Body.String())
	}

	// 3. Login with correct credentials -> 200 OK
	loginPayload := map[string]string{
		"email":    email,
		"password": password,
	}
	loginBody, _ := json.Marshal(loginPayload)
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)

	if loginW.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on login, got %d: %s", loginW.Code, loginW.Body.String())
	}

	var loginResp AuthSuccessResponse
	if err := json.Unmarshal(loginW.Body.Bytes(), &loginResp); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}
	if loginResp.Token == "" {
		t.Errorf("expected non-empty token on login")
	}

	// 4. Login with incorrect password -> 401 Unauthorized
	wrongPwdPayload := map[string]string{
		"email":    email,
		"password": "WrongPassword!",
	}
	wrongPwdBody, _ := json.Marshal(wrongPwdPayload)
	wrongReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(wrongPwdBody))
	wrongReq.Header.Set("Content-Type", "application/json")
	wrongW := httptest.NewRecorder()
	router.ServeHTTP(wrongW, wrongReq)

	if wrongW.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized with wrong password, got %d: %s", wrongW.Code, wrongW.Body.String())
	}

	// 5. Login with non-existent email -> 401 Unauthorized
	nonExistentPayload := map[string]string{
		"email":    "nonexistent@example.com",
		"password": password,
	}
	nonExistentBody, _ := json.Marshal(nonExistentPayload)
	nonExistentReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(nonExistentBody))
	nonExistentReq.Header.Set("Content-Type", "application/json")
	nonExistentW := httptest.NewRecorder()
	router.ServeHTTP(nonExistentW, nonExistentReq)

	if nonExistentW.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized with non-existent email, got %d", nonExistentW.Code)
	}

	// 6. Access /api/v1/auth/me with valid Bearer Token -> 200 OK
	meReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	meReq.Header.Set("Authorization", "Bearer "+loginResp.Token)
	meW := httptest.NewRecorder()
	router.ServeHTTP(meW, meReq)

	if meW.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on /me, got %d: %s", meW.Code, meW.Body.String())
	}

	var meOwner domain.Owner
	if err := json.Unmarshal(meW.Body.Bytes(), &meOwner); err != nil {
		t.Fatalf("failed to parse /me response: %v", err)
	}
	if meOwner.ID != regResp.Owner.ID {
		t.Errorf("expected owner ID %s, got %s", regResp.Owner.ID, meOwner.ID)
	}
	if meOwner.Email != email {
		t.Errorf("expected email %s, got %s", email, meOwner.Email)
	}

	// 7. Access /api/v1/auth/me without token -> 401 Unauthorized
	unauthReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	unauthW := httptest.NewRecorder()
	router.ServeHTTP(unauthW, unauthReq)

	if unauthW.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized without token, got %d", unauthW.Code)
	}

	// 8. Access /api/v1/auth/me with invalid/corrupt token -> 401 Unauthorized
	badTokenReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	badTokenReq.Header.Set("Authorization", "Bearer invalid-garbage-token")
	badTokenW := httptest.NewRecorder()
	router.ServeHTTP(badTokenW, badTokenReq)

	if badTokenW.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized with bad token, got %d", badTokenW.Code)
	}
}

func TestAuthValidationErrors(t *testing.T) {
	router, db := setupTestServer(t)
	defer db.Close()

	// Short password (< 8 chars)
	shortPwdPayload := map[string]string{
		"name":     "Juan Perez",
		"email":    fmt.Sprintf("user_%s@example.com", uuid.New().String()[:8]),
		"password": "123",
	}
	body, _ := json.Marshal(shortPwdPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request on short password, got %d: %s", w.Code, w.Body.String())
	}

	// Invalid email format
	badEmailPayload := map[string]string{
		"name":     "Juan Perez",
		"email":    "not-an-email",
		"password": "ValidPassword123!",
	}
	badEmailBody, _ := json.Marshal(badEmailPayload)
	badEmailReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(badEmailBody))
	badEmailReq.Header.Set("Content-Type", "application/json")
	badEmailW := httptest.NewRecorder()
	router.ServeHTTP(badEmailW, badEmailReq)

	if badEmailW.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request on invalid email format, got %d: %s", badEmailW.Code, badEmailW.Body.String())
	}
}

package service_test

import (
	"testing"
	"time"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/service"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestAuthService_TokenGenerationAndValidation(t *testing.T) {
	jwtSecret := "test-secret-key-1234567890123456"
	authSvc := service.NewAuthService(nil, jwtSecret, 2)

	owner := &domain.Owner{
		ID:    uuid.New(),
		Name:  "Test Owner",
		Email: "owner@test.com",
	}

	token, err := authSvc.GenerateToken(owner)
	if err != nil {
		t.Fatalf("unexpected error generating token: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	claims, err := authSvc.ValidateToken(token)
	if err != nil {
		t.Fatalf("unexpected error validating token: %v", err)
	}

	if claims.OwnerID != owner.ID {
		t.Errorf("expected owner ID %s, got %s", owner.ID, claims.OwnerID)
	}
	if claims.Email != owner.Email {
		t.Errorf("expected email %s, got %s", owner.Email, claims.Email)
	}
	if claims.Name != owner.Name {
		t.Errorf("expected name %s, got %s", owner.Name, claims.Name)
	}
}

func TestAuthService_ExpiredToken(t *testing.T) {
	jwtSecret := "test-secret-key-1234567890123456"
	authSvc := service.NewAuthService(nil, jwtSecret, 24)

	// Build an intentionally expired token
	ownerID := uuid.New()
	claims := service.JWTClaims{
		OwnerID: ownerID,
		Email:   "expired@test.com",
		Name:    "Expired User",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   ownerID.String(),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			Issuer:    "mi-recibo-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		t.Fatalf("unexpected error creating expired token: %v", err)
	}

	_, err = authSvc.ValidateToken(tokenStr)
	if err == nil {
		t.Error("expected error validating expired token, got nil")
	}
}

func TestAuthService_TamperedToken(t *testing.T) {
	authSvc := service.NewAuthService(nil, "secret-key", 24)

	owner := &domain.Owner{
		ID:    uuid.New(),
		Name:  "Tamper User",
		Email: "tamper@test.com",
	}

	token, err := authSvc.GenerateToken(owner)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Tamper token string
	tamperedToken := token + "xyz"
	_, err = authSvc.ValidateToken(tamperedToken)
	if err == nil {
		t.Error("expected error validating tampered token, got nil")
	}
}

package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/repository/postgres"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type RefreshSessionStore interface {
	Create(context.Context, uuid.UUID, string, time.Time) error
	FindOwnerID(context.Context, string) (uuid.UUID, error)
	Rotate(context.Context, string, string, time.Time) error
	Revoke(context.Context, string) error
}

type AuthService struct {
	ownerRepo       *postgres.OwnerRepository
	refreshSessions RefreshSessionStore
	jwtSecret       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

func NewAuthService(ownerRepo *postgres.OwnerRepository, jwtSecret string, jwtExpirationHours int) *AuthService {
	if jwtExpirationHours <= 0 {
		jwtExpirationHours = 72
	}
	return NewAuthServiceWithRefreshSessions(ownerRepo, nil, jwtSecret, time.Duration(jwtExpirationHours)*time.Hour, 30*24*time.Hour)
}

func NewAuthServiceWithRefreshSessions(ownerRepo *postgres.OwnerRepository, refreshSessions RefreshSessionStore, jwtSecret string, accessTokenTTL, refreshTokenTTL time.Duration) *AuthService {
	if jwtSecret == "" {
		jwtSecret = "mi-recibo-development-secret-change-before-production"
	}
	if accessTokenTTL <= 0 {
		accessTokenTTL = 15 * time.Minute
	}
	if refreshTokenTTL <= 0 {
		refreshTokenTTL = 30 * 24 * time.Hour
	}
	return &AuthService{
		ownerRepo:       ownerRepo,
		refreshSessions: refreshSessions,
		jwtSecret:       []byte(jwtSecret),
		accessTokenTTL:  accessTokenTTL,
		refreshTokenTTL: refreshTokenTTL,
	}
}

type AuthResponse struct {
	Token        string        `json:"token"` // Deprecated alias retained for current clients.
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	TokenType    string        `json:"token_type"`
	ExpiresIn    int64         `json:"expires_in"`
	Owner        *domain.Owner `json:"owner"`
}

type JWTClaims struct {
	OwnerID uuid.UUID `json:"owner_id"`
	Email   string    `json:"email"`
	Name    string    `json:"name"`
	jwt.RegisteredClaims
}

func (s *AuthService) Register(ctx context.Context, name, email, password, phone string) (*AuthResponse, error) {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(strings.ToLower(email))
	phone = strings.TrimSpace(phone)

	if name == "" {
		return nil, domain.ErrValidation
	}

	if !isValidEmail(email) {
		return nil, domain.ErrInvalidEmail
	}

	if len(password) < 8 || len(password) > 72 {
		return nil, domain.ErrInvalidPassword
	}

	// Verify if email already exists
	existing, err := s.ownerRepo.GetByEmail(ctx, email)
	if err == nil && existing != nil {
		return nil, domain.ErrConflict
	}
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, fmt.Errorf("error al verificar existencia de usuario: %w", err)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("error al cifrar contraseña: %w", err)
	}

	owner := &domain.Owner{
		Name:         name,
		Email:        email,
		PasswordHash: string(hashedPassword),
		Phone:        phone,
	}

	if err := s.ownerRepo.Create(ctx, owner); err != nil {
		return nil, err
	}

	return s.issueTokenPair(ctx, owner)
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthResponse, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	if email == "" || password == "" {
		return nil, domain.ErrInvalidCredentials
	}

	owner, err := s.ownerRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, fmt.Errorf("error al buscar usuario: %w", err)
	}

	if owner.PasswordHash == "" {
		return nil, domain.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(owner.PasswordHash), []byte(password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	return s.issueTokenPair(ctx, owner)
}

func (s *AuthService) Refresh(ctx context.Context, currentRefreshToken string) (*AuthResponse, error) {
	if s.refreshSessions == nil || strings.TrimSpace(currentRefreshToken) == "" {
		return nil, domain.ErrUnauthorized
	}

	ownerID, err := s.refreshSessions.FindOwnerID(ctx, currentRefreshToken)
	if err != nil {
		return nil, err
	}
	owner, err := s.ownerRepo.GetByID(ctx, ownerID)
	if err != nil {
		return nil, err
	}
	response, err := s.newTokenPair(owner)
	if err != nil {
		return nil, err
	}
	if err := s.refreshSessions.Rotate(ctx, currentRefreshToken, response.RefreshToken, time.Now().Add(s.refreshTokenTTL)); err != nil {
		return nil, err
	}
	return response, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	if s.refreshSessions == nil {
		return nil
	}
	return s.refreshSessions.Revoke(ctx, refreshToken)
}

func (s *AuthService) issueTokenPair(ctx context.Context, owner *domain.Owner) (*AuthResponse, error) {
	if s.refreshSessions == nil {
		return nil, fmt.Errorf("almacenamiento de sesiones de renovación no configurado")
	}
	response, err := s.newTokenPair(owner)
	if err != nil {
		return nil, err
	}
	if err := s.refreshSessions.Create(ctx, owner.ID, response.RefreshToken, time.Now().Add(s.refreshTokenTTL)); err != nil {
		return nil, err
	}
	return response, nil
}

func (s *AuthService) newTokenPair(owner *domain.Owner) (*AuthResponse, error) {
	accessToken, err := s.GenerateToken(owner)
	if err != nil {
		return nil, fmt.Errorf("error al generar access token: %w", err)
	}
	refreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		return nil, fmt.Errorf("error al generar refresh token: %w", err)
	}
	refreshToken := base64.RawURLEncoding.EncodeToString(refreshTokenBytes)
	return &AuthResponse{
		Token:        accessToken,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.accessTokenTTL.Seconds()),
		Owner:        owner,
	}, nil
}

func (s *AuthService) GenerateToken(owner *domain.Owner) (string, error) {
	now := time.Now()
	expiresAt := now.Add(s.accessTokenTTL)
	claims := JWTClaims{
		OwnerID: owner.ID,
		Email:   owner.Email,
		Name:    owner.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   owner.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "mi-recibo-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) ValidateToken(tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de firma no soportado: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, domain.ErrAccessTokenExpired
		}
		return nil, domain.ErrUnauthorized
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, domain.ErrUnauthorized
	}

	return claims, nil
}

func (s *AuthService) GetProfile(ctx context.Context, ownerID uuid.UUID) (*domain.Owner, error) {
	return s.ownerRepo.GetByID(ctx, ownerID)
}

func isValidEmail(email string) bool {
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || !strings.EqualFold(addr.Address, email) {
		return false
	}
	parts := strings.Split(addr.Address, "@")
	if len(parts) != 2 || !strings.Contains(parts[1], ".") {
		return false
	}
	return true
}

package http

import (
	"context"
	"net/http"
	"strings"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type contextKey string

const (
	OwnerIDContextKey     contextKey = "owner_id"
	OwnerClaimsContextKey contextKey = "owner_claims"
)

func AuthMiddleware(authService *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if authService == nil {
				RespondError(w, domain.ErrUnauthorized)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				RespondError(w, domain.ErrUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				RespondError(w, domain.ErrUnauthorized)
				return
			}

			tokenStr := strings.TrimSpace(parts[1])
			claims, err := authService.ValidateToken(tokenStr)
			if err != nil {
				RespondError(w, domain.ErrUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), OwnerIDContextKey, claims.OwnerID)
			ctx = context.WithValue(ctx, OwnerClaimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetOwnerIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	val := ctx.Value(OwnerIDContextKey)
	if val == nil {
		return uuid.Nil, false
	}
	id, ok := val.(uuid.UUID)
	return id, ok
}

func GetOwnerClaimsFromContext(ctx context.Context) (*service.JWTClaims, bool) {
	val := ctx.Value(OwnerClaimsContextKey)
	if val == nil {
		return nil, false
	}
	claims, ok := val.(*service.JWTClaims)
	return claims, ok
}

func ResourceOwnershipMiddleware(authz *service.AuthorizationService, resourceType service.ResourceType, paramName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ownerID, ok := GetOwnerIDFromContext(r.Context())
			if !ok || authz == nil {
				RespondError(w, domain.ErrUnauthorized)
				return
			}

			resourceID, err := uuid.Parse(chi.URLParam(r, paramName))
			if err != nil {
				RespondError(w, domain.ErrValidation)
				return
			}
			if err := authz.AuthorizeResource(r.Context(), ownerID, resourceType, resourceID); err != nil {
				RespondError(w, err)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

package http

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type LogoutRequest = RefreshRequest

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := decoder.Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		RespondError(w, domain.ErrValidation)
		return
	}

	res, err := h.authService.Register(r.Context(), req.Name, req.Email, req.Password, req.Phone)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusCreated, res)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := decoder.Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		RespondError(w, domain.ErrValidation)
		return
	}

	res, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, res)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := decoder.Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		RespondError(w, domain.ErrValidation)
		return
	}

	res, err := h.authService.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		RespondError(w, err)
		return
	}
	RespondJSON(w, http.StatusOK, res)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := decoder.Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		RespondError(w, domain.ErrValidation)
		return
	}
	if err := h.authService.Logout(r.Context(), req.RefreshToken); err != nil {
		RespondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := GetOwnerIDFromContext(r.Context())
	if !ok {
		RespondError(w, domain.ErrUnauthorized)
		return
	}

	owner, err := h.authService.GetProfile(r.Context(), ownerID)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, owner)
}

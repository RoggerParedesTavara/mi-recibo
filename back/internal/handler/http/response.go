package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
)

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

func RespondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func RespondError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	code := "INTERNAL_ERROR"

	switch {
	case errors.Is(err, domain.ErrNotFound):
		status = http.StatusNotFound
		code = "NOT_FOUND"
	case errors.Is(err, domain.ErrConflict):
		status = http.StatusConflict
		code = "CONFLICT"
	case errors.Is(err, domain.ErrValidation):
		status = http.StatusBadRequest
		code = "VALIDATION_ERROR"
	case errors.Is(err, domain.ErrInvalidPassword):
		status = http.StatusBadRequest
		code = "INVALID_PASSWORD"
	case errors.Is(err, domain.ErrInvalidEmail):
		status = http.StatusBadRequest
		code = "INVALID_EMAIL"
	case errors.Is(err, domain.ErrInvalidCredentials):
		status = http.StatusUnauthorized
		code = "INVALID_CREDENTIALS"
	case errors.Is(err, domain.ErrAccessTokenExpired):
		status = http.StatusUnauthorized
		code = "ACCESS_TOKEN_EXPIRED"
	case errors.Is(err, domain.ErrUnauthorized):
		status = http.StatusUnauthorized
		code = "UNAUTHORIZED"
	case errors.Is(err, domain.ErrForbidden):
		status = http.StatusForbidden
		code = "FORBIDDEN"
	case errors.Is(err, domain.ErrNoActiveTenants):
		status = http.StatusBadRequest
		code = "NO_ACTIVE_TENANTS"
	case errors.Is(err, domain.ErrMissingConsumptions):
		status = http.StatusBadRequest
		code = "MISSING_CONSUMPTIONS"
	case errors.Is(err, domain.ErrUnitWithoutPrimary):
		status = http.StatusBadRequest
		code = "UNIT_WITHOUT_PRIMARY_TENANT"
	case errors.Is(err, domain.ErrAlreadyCalculated):
		status = http.StatusConflict
		code = "ALREADY_CALCULATED"
	}

	RespondJSON(w, status, ErrorResponse{
		Error: err.Error(),
		Code:  code,
	})
}

package http

import (
	"encoding/json"
	"net/http"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type UnitHandler struct{ service *service.UnitService }

func NewUnitHandler(s *service.UnitService) *UnitHandler { return &UnitHandler{service: s} }

func (h *UnitHandler) Create(w http.ResponseWriter, r *http.Request) {
	propertyID, err := uuid.Parse(chi.URLParam(r, "property_id"))
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	unit, err := h.service.Create(r.Context(), propertyID, req.Name)
	if err != nil {
		RespondError(w, err)
		return
	}
	RespondJSON(w, http.StatusCreated, unit)
}

func (h *UnitHandler) List(w http.ResponseWriter, r *http.Request) {
	propertyID, err := uuid.Parse(chi.URLParam(r, "property_id"))
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	units, err := h.service.ListByProperty(r.Context(), propertyID)
	if err != nil {
		RespondError(w, err)
		return
	}
	RespondJSON(w, http.StatusOK, units)
}

func (h *UnitHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	unit, err := h.service.Update(r.Context(), id, req.Name)
	if err != nil {
		RespondError(w, err)
		return
	}
	RespondJSON(w, http.StatusOK, unit)
}

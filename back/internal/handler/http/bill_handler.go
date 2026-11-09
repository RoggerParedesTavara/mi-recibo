package http

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type BillHandler struct {
	billingService *service.BillingService
}

func NewBillHandler(billingService *service.BillingService) *BillHandler {
	return &BillHandler{billingService: billingService}
}

type CreateMasterBillRequest struct {
	ServiceType         domain.ServiceType               `json:"service_type"`
	BillingYear         int                              `json:"billing_year"`
	BillingMonth        int                              `json:"billing_month"`
	TotalConsumption    decimal.Decimal                  `json:"total_consumption"`
	UnitPrice           decimal.Decimal                  `json:"unit_price"`
	ProviderTotalAmount *decimal.Decimal                 `json:"provider_total_amount,omitempty"`
	IssueDate           *time.Time                       `json:"issue_date,omitempty"`
	DueDate             *time.Time                       `json:"due_date,omitempty"`
	ExtraCharges        []service.CreateExtraChargeInput `json:"extra_charges"`
}

func (h *BillHandler) CreateMasterBill(w http.ResponseWriter, r *http.Request) {
	propertyIDStr := chi.URLParam(r, "property_id")
	propertyID, err := uuid.Parse(propertyIDStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	var req CreateMasterBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	bill, err := h.billingService.CreateMasterBill(r.Context(), service.CreateMasterBillInput{
		PropertyID:          propertyID,
		ServiceType:         req.ServiceType,
		BillingYear:         req.BillingYear,
		BillingMonth:        req.BillingMonth,
		TotalConsumption:    req.TotalConsumption,
		UnitPrice:           req.UnitPrice,
		ProviderTotalAmount: req.ProviderTotalAmount,
		IssueDate:           req.IssueDate,
		DueDate:             req.DueDate,
		ExtraCharges:        req.ExtraCharges,
	})
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusCreated, bill)
}

func (h *BillHandler) UpdateMasterBill(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	var req CreateMasterBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	bill, err := h.billingService.UpdateDraftMasterBill(r.Context(), id, service.CreateMasterBillInput{ServiceType: req.ServiceType, BillingYear: req.BillingYear, BillingMonth: req.BillingMonth, TotalConsumption: req.TotalConsumption, UnitPrice: req.UnitPrice, ProviderTotalAmount: req.ProviderTotalAmount, IssueDate: req.IssueDate, DueDate: req.DueDate, ExtraCharges: req.ExtraCharges})
	if err != nil {
		RespondError(w, err)
		return
	}
	RespondJSON(w, http.StatusOK, bill)
}

func (h *BillHandler) GetMasterBill(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	bill, err := h.billingService.GetMasterBill(r.Context(), id)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, bill)
}

func (h *BillHandler) ListMasterBills(w http.ResponseWriter, r *http.Request) {
	propertyIDStr := chi.URLParam(r, "property_id")
	propertyID, err := uuid.Parse(propertyIDStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	month, _ := strconv.Atoi(r.URL.Query().Get("month"))
	serviceType := domain.ServiceType(r.URL.Query().Get("service"))

	bills, err := h.billingService.ListMasterBills(r.Context(), propertyID, year, month, serviceType)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, bills)
}

type RecordConsumptionsRequest struct {
	Readings []domain.ReadingInput `json:"readings"`
}

type CalculateMasterBillRequest struct {
	ExtraChargeAllocations []domain.ExtraChargeAllocation `json:"extra_charge_allocations,omitempty"`
}

type CalculateMasterBillResponse struct {
	ProviderTotalAmount *decimal.Decimal          `json:"provider_total_amount,omitempty"`
	TotalChargedAmount  decimal.Decimal           `json:"total_charged_amount"`
	TenantBills         []domain.TenantBillDetail `json:"tenant_bills"`
}

func makeCalculateResponse(providerTotal *decimal.Decimal, bills []domain.TenantBillDetail) CalculateMasterBillResponse {
	total := decimal.Zero
	for _, bill := range bills {
		total = total.Add(bill.TotalAmount)
	}
	return CalculateMasterBillResponse{ProviderTotalAmount: providerTotal, TotalChargedAmount: total, TenantBills: bills}
}

func (h *BillHandler) PreviewMasterBill(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}
	var req CalculateMasterBillRequest
	if r.Body != nil {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
			RespondError(w, domain.ErrValidation)
			return
		}
	}
	bills, err := h.billingService.PreviewMasterBill(r.Context(), id, service.CalculateMasterBillInput{ExtraChargeAllocations: req.ExtraChargeAllocations})
	if err != nil {
		RespondError(w, err)
		return
	}
	master, err := h.billingService.GetMasterBill(r.Context(), id)
	if err != nil {
		RespondError(w, err)
		return
	}
	RespondJSON(w, http.StatusOK, makeCalculateResponse(master.ProviderTotalAmount, bills))
}

func (h *BillHandler) RecordConsumptions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	masterBillID, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	var req RecordConsumptionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	consumptions, err := h.billingService.RecordConsumptions(r.Context(), masterBillID, req.Readings)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, map[string]any{
		"message":      "Lecturas registradas exitosamente",
		"consumptions": consumptions,
	})
}

func (h *BillHandler) CalculateMasterBill(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	masterBillID, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	var req CalculateMasterBillRequest
	if r.Body != nil {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
			RespondError(w, domain.ErrValidation)
			return
		}
	}
	bills, err := h.billingService.CalculateMasterBill(r.Context(), masterBillID, service.CalculateMasterBillInput{ExtraChargeAllocations: req.ExtraChargeAllocations})
	if err != nil {
		RespondError(w, err)
		return
	}

	master, err := h.billingService.GetMasterBill(r.Context(), masterBillID)
	if err != nil {
		RespondError(w, err)
		return
	}
	RespondJSON(w, http.StatusOK, map[string]any{
		"message":               "Recibos calculados y generados exitosamente",
		"provider_total_amount": master.ProviderTotalAmount,
		"total_charged_amount":  makeCalculateResponse(nil, bills).TotalChargedAmount,
		"tenant_bills":          bills,
	})
}

func (h *BillHandler) ListMasterBillTenantBills(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	masterBillID, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	bills, err := h.billingService.ListTenantBillsByMasterBill(r.Context(), masterBillID)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, bills)
}

func (h *BillHandler) GetTenantBill(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	bill, err := h.billingService.GetTenantBill(r.Context(), id)
	if err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, bill)
}

type UpdatePaymentRequest struct {
	IsPaid bool `json:"is_paid"`
}

func (h *BillHandler) UpdateTenantBillPayment(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	var req UpdatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, domain.ErrValidation)
		return
	}

	if err := h.billingService.UpdateTenantBillPayment(r.Context(), id, req.IsPaid); err != nil {
		RespondError(w, err)
		return
	}

	RespondJSON(w, http.StatusOK, map[string]string{
		"message": "Estado de pago actualizado",
	})
}

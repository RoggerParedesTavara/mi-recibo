package http

import (
	"net/http"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type RouterParams struct {
	AuthHandler          *AuthHandler
	AuthService          *service.AuthService
	AuthorizationService *service.AuthorizationService
	OwnerHandler         *OwnerHandler
	PropertyHandler      *PropertyHandler
	TenantHandler        *TenantHandler
	BillHandler          *BillHandler
	UnitHandler          *UnitHandler
}

func NewRouter(p RouterParams) http.Handler {
	r := chi.NewRouter()

	// Global middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	// Health check
	r.Handle("/metrics", promhttp.Handler())
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		RespondJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "mi-recibo-api",
		})
	})

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Authentication & Registration
		if p.AuthHandler != nil {
			r.Route("/auth", func(r chi.Router) {
				r.Post("/register", p.AuthHandler.Register)
				r.Post("/login", p.AuthHandler.Login)
				r.Post("/refresh", p.AuthHandler.Refresh)
				r.Post("/logout", p.AuthHandler.Logout)
				if p.AuthService != nil {
					r.With(AuthMiddleware(p.AuthService)).Get("/me", p.AuthHandler.Me)
				}
			})
		}

		// Mount business endpoints on their own router so authentication remains
		// in force across the nested Route() subrouters below.
		protected := chi.NewRouter()
		if p.AuthService == nil {
			protected.Use(rejectProtectedRequests)
		} else {
			protected.Use(AuthMiddleware(p.AuthService))
		}

		// Owner registration lives under /auth/register. Keep the legacy
		// create endpoint authenticated while existing clients migrate.
		protected.Route("/owners", func(r chi.Router) {
			r.Post("/", p.OwnerHandler.CreateOwner)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceOwner, "id")).Get("/{id}", p.OwnerHandler.GetOwner)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceOwner, "owner_id")).Post("/{owner_id}/properties", p.PropertyHandler.CreateProperty)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceOwner, "owner_id")).Get("/{owner_id}/properties", p.PropertyHandler.ListPropertiesByOwner)
		})

		protected.Route("/properties", func(r chi.Router) {
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceProperty, "id")).Get("/{id}", p.PropertyHandler.GetProperty)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceProperty, "property_id")).Post("/{property_id}/tenants", p.TenantHandler.CreateTenant)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceProperty, "property_id")).Get("/{property_id}/tenants", p.TenantHandler.ListTenantsByProperty)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceProperty, "property_id")).Post("/{property_id}/units", p.UnitHandler.Create)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceProperty, "property_id")).Get("/{property_id}/units", p.UnitHandler.List)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceProperty, "property_id")).Post("/{property_id}/master-bills", p.BillHandler.CreateMasterBill)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceProperty, "property_id")).Get("/{property_id}/master-bills", p.BillHandler.ListMasterBills)
		})

		protected.Route("/tenants", func(r chi.Router) {
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceTenant, "id")).Put("/{id}", p.TenantHandler.UpdateTenant)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceTenant, "id")).Get("/{id}/bills", p.TenantHandler.ListTenantBills)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceTenant, "id")).Get("/{id}/readings", p.TenantHandler.GetReadingByPeriod)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceTenant, "id")).Get("/{id}/readings/latest", p.TenantHandler.GetLatestReading)
		})
		protected.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceUnit, "id")).Put("/units/{id}", p.UnitHandler.Update)

		protected.Route("/master-bills", func(r chi.Router) {
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceMasterBill, "id")).Get("/{id}", p.BillHandler.GetMasterBill)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceMasterBill, "id")).Put("/{id}", p.BillHandler.UpdateMasterBill)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceMasterBill, "id")).Post("/{id}/consumptions", p.BillHandler.RecordConsumptions)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceMasterBill, "id")).Post("/{id}/preview", p.BillHandler.PreviewMasterBill)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceMasterBill, "id")).Post("/{id}/calculate", p.BillHandler.CalculateMasterBill)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceMasterBill, "id")).Get("/{id}/tenant-bills", p.BillHandler.ListMasterBillTenantBills)
		})

		protected.Route("/tenant-bills", func(r chi.Router) {
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceTenantBill, "id")).Get("/{id}", p.BillHandler.GetTenantBill)
			r.With(ResourceOwnershipMiddleware(p.AuthorizationService, service.ResourceTenantBill, "id")).Patch("/{id}/payment", p.BillHandler.UpdateTenantBillPayment)
		})
		r.Mount("/", protected)
	})

	return r
}

func rejectProtectedRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		RespondError(w, domain.ErrUnauthorized)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

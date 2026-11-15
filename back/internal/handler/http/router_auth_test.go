package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBusinessRoutesRequireAuthentication(t *testing.T) {
	router := NewRouter(RouterParams{
		OwnerHandler:    &OwnerHandler{},
		PropertyHandler: &PropertyHandler{},
		TenantHandler:   &TenantHandler{},
		BillHandler:     &BillHandler{},
		UnitHandler:     &UnitHandler{},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/owners/950348d7-1f50-4fa8-b393-e9e5b3686aa6", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected business route to reject missing token with 401, got %d: %s", res.Code, res.Body.String())
	}
}

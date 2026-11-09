package service

import (
	"context"
	"strings"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/repository/postgres"
	"github.com/google/uuid"
)

type TenantService struct {
	tenantRepo   *postgres.TenantRepository
	propertyRepo *postgres.PropertyRepository
	unitRepo     *postgres.UnitRepository
}

func NewTenantService(tenantRepo *postgres.TenantRepository, propertyRepo *postgres.PropertyRepository, unitRepos ...*postgres.UnitRepository) *TenantService {
	var unitRepo *postgres.UnitRepository
	if len(unitRepos) > 0 {
		unitRepo = unitRepos[0]
	}
	return &TenantService{
		tenantRepo:   tenantRepo,
		propertyRepo: propertyRepo,
		unitRepo:     unitRepo,
	}
}

func (s *TenantService) CreateTenant(ctx context.Context, propertyID uuid.UUID, name, email, phone, room string, unitIDs ...*uuid.UUID) (*domain.Tenant, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, domain.ErrValidation
	}

	// Verify property exists
	if _, err := s.propertyRepo.GetByID(ctx, propertyID); err != nil {
		return nil, err
	}
	var unitID *uuid.UUID
	if len(unitIDs) > 0 {
		unitID = unitIDs[0]
	}
	if unitID != nil {
		if s.unitRepo == nil {
			return nil, domain.ErrValidation
		}
		unit, err := s.unitRepo.GetByID(ctx, *unitID)
		if err != nil {
			return nil, err
		}
		if unit.PropertyID != propertyID {
			return nil, domain.ErrValidation
		}
	}

	tenant := &domain.Tenant{
		PropertyID: propertyID,
		UnitID:     unitID,
		Name:       name,
		Email:      strings.TrimSpace(email),
		Phone:      strings.TrimSpace(phone),
		RoomOrUnit: strings.TrimSpace(room),
		IsActive:   true,
	}

	if err := s.tenantRepo.Create(ctx, tenant); err != nil {
		return nil, err
	}
	return tenant, nil
}

func (s *TenantService) GetTenant(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	return s.tenantRepo.GetByID(ctx, id)
}

func (s *TenantService) ListTenantsByProperty(ctx context.Context, propertyID uuid.UUID, onlyActive bool) ([]domain.Tenant, error) {
	return s.tenantRepo.ListByPropertyID(ctx, propertyID, onlyActive)
}

func (s *TenantService) UpdateTenant(ctx context.Context, tenant *domain.Tenant) (*domain.Tenant, error) {
	if strings.TrimSpace(tenant.Name) == "" {
		return nil, domain.ErrValidation
	}
	if tenant.UnitID != nil {
		if s.unitRepo == nil {
			return nil, domain.ErrValidation
		}
		unit, err := s.unitRepo.GetByID(ctx, *tenant.UnitID)
		if err != nil {
			return nil, err
		}
		if unit.PropertyID != tenant.PropertyID {
			return nil, domain.ErrValidation
		}
	}
	if err := s.tenantRepo.Update(ctx, tenant); err != nil {
		return nil, err
	}
	return tenant, nil
}

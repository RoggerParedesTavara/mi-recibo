package service

import (
	"context"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/repository/postgres"
	"github.com/google/uuid"
)

type ResourceType string

const (
	ResourceOwner      ResourceType = "owner"
	ResourceProperty   ResourceType = "property"
	ResourceTenant     ResourceType = "tenant"
	ResourceUnit       ResourceType = "unit"
	ResourceMasterBill ResourceType = "master_bill"
	ResourceTenantBill ResourceType = "tenant_bill"
)

type AuthorizationService struct {
	ownerRepo      *postgres.OwnerRepository
	propertyRepo   *postgres.PropertyRepository
	tenantRepo     *postgres.TenantRepository
	unitRepo       *postgres.UnitRepository
	masterBillRepo *postgres.MasterBillRepository
	tenantBillRepo *postgres.TenantBillRepository
}

func NewAuthorizationService(
	ownerRepo *postgres.OwnerRepository,
	propertyRepo *postgres.PropertyRepository,
	tenantRepo *postgres.TenantRepository,
	unitRepo *postgres.UnitRepository,
	masterBillRepo *postgres.MasterBillRepository,
	tenantBillRepo *postgres.TenantBillRepository,
) *AuthorizationService {
	return &AuthorizationService{
		ownerRepo:      ownerRepo,
		propertyRepo:   propertyRepo,
		tenantRepo:     tenantRepo,
		unitRepo:       unitRepo,
		masterBillRepo: masterBillRepo,
		tenantBillRepo: tenantBillRepo,
	}
}

func (s *AuthorizationService) AuthorizeResource(ctx context.Context, ownerID uuid.UUID, resourceType ResourceType, resourceID uuid.UUID) error {
	var resourceOwnerID uuid.UUID

	switch resourceType {
	case ResourceOwner:
		owner, err := s.ownerRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		resourceOwnerID = owner.ID
	case ResourceProperty:
		property, err := s.propertyRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		resourceOwnerID = property.OwnerID
	case ResourceTenant:
		tenant, err := s.tenantRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		property, err := s.propertyRepo.GetByID(ctx, tenant.PropertyID)
		if err != nil {
			return err
		}
		resourceOwnerID = property.OwnerID
	case ResourceUnit:
		unit, err := s.unitRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		property, err := s.propertyRepo.GetByID(ctx, unit.PropertyID)
		if err != nil {
			return err
		}
		resourceOwnerID = property.OwnerID
	case ResourceMasterBill:
		bill, err := s.masterBillRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		property, err := s.propertyRepo.GetByID(ctx, bill.PropertyID)
		if err != nil {
			return err
		}
		resourceOwnerID = property.OwnerID
	case ResourceTenantBill:
		bill, err := s.tenantBillRepo.GetByID(ctx, resourceID)
		if err != nil {
			return err
		}
		masterBill, err := s.masterBillRepo.GetByID(ctx, bill.MasterBillID)
		if err != nil {
			return err
		}
		property, err := s.propertyRepo.GetByID(ctx, masterBill.PropertyID)
		if err != nil {
			return err
		}
		resourceOwnerID = property.OwnerID
	default:
		return domain.ErrForbidden
	}

	if resourceOwnerID != ownerID {
		return domain.ErrForbidden
	}
	return nil
}

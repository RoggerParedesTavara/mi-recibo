package service

import (
	"context"
	"strings"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/RoggerParedesTavara/mi-recibo/internal/repository/postgres"
	"github.com/google/uuid"
)

type UnitService struct {
	unitRepo     *postgres.UnitRepository
	propertyRepo *postgres.PropertyRepository
}

func NewUnitService(unitRepo *postgres.UnitRepository, propertyRepo *postgres.PropertyRepository) *UnitService {
	return &UnitService{unitRepo: unitRepo, propertyRepo: propertyRepo}
}

func (s *UnitService) Create(ctx context.Context, propertyID uuid.UUID, name string) (*domain.Unit, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, domain.ErrValidation
	}
	if _, err := s.propertyRepo.GetByID(ctx, propertyID); err != nil {
		return nil, err
	}
	unit := &domain.Unit{PropertyID: propertyID, Name: name}
	if err := s.unitRepo.Create(ctx, unit); err != nil {
		return nil, err
	}
	return unit, nil
}

func (s *UnitService) ListByProperty(ctx context.Context, propertyID uuid.UUID) ([]domain.Unit, error) {
	if _, err := s.propertyRepo.GetByID(ctx, propertyID); err != nil {
		return nil, err
	}
	return s.unitRepo.ListByPropertyID(ctx, propertyID)
}

func (s *UnitService) Update(ctx context.Context, id uuid.UUID, name string) (*domain.Unit, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, domain.ErrValidation
	}
	unit, err := s.unitRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	unit.Name = name
	if err := s.unitRepo.Update(ctx, unit); err != nil {
		return nil, err
	}
	return unit, nil
}

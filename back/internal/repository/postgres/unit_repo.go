package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UnitRepository struct{ pool *pgxpool.Pool }

func NewUnitRepository(pool *pgxpool.Pool) *UnitRepository { return &UnitRepository{pool: pool} }

func (r *UnitRepository) Create(ctx context.Context, unit *domain.Unit) error {
	if unit.ID == uuid.Nil {
		unit.ID = uuid.New()
	}
	err := r.pool.QueryRow(ctx, `INSERT INTO units (id, property_id, name) VALUES ($1,$2,$3) RETURNING created_at, updated_at`, unit.ID, unit.PropertyID, unit.Name).Scan(&unit.CreatedAt, &unit.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("error al crear unidad: %w", err)
	}
	return nil
}

func (r *UnitRepository) ListByPropertyID(ctx context.Context, propertyID uuid.UUID) ([]domain.Unit, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, property_id, name, created_at, updated_at FROM units WHERE property_id=$1 ORDER BY name`, propertyID)
	if err != nil {
		return nil, fmt.Errorf("error al listar unidades: %w", err)
	}
	defer rows.Close()
	units := make([]domain.Unit, 0)
	for rows.Next() {
		var unit domain.Unit
		if err := rows.Scan(&unit.ID, &unit.PropertyID, &unit.Name, &unit.CreatedAt, &unit.UpdatedAt); err != nil {
			return nil, fmt.Errorf("error al leer unidad: %w", err)
		}
		units = append(units, unit)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return units, nil
}

func (r *UnitRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Unit, error) {
	var unit domain.Unit
	err := r.pool.QueryRow(ctx, `SELECT id, property_id, name, created_at, updated_at FROM units WHERE id=$1`, id).Scan(&unit.ID, &unit.PropertyID, &unit.Name, &unit.CreatedAt, &unit.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("error al obtener unidad: %w", err)
	}
	return &unit, nil
}

func (r *UnitRepository) Update(ctx context.Context, unit *domain.Unit) error {
	err := r.pool.QueryRow(ctx, `UPDATE units SET name=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING updated_at`, unit.ID, unit.Name).Scan(&unit.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("error al actualizar unidad: %w", err)
	}
	return nil
}

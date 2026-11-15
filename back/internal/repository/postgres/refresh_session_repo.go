package postgres

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"time"

	"github.com/RoggerParedesTavara/mi-recibo/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshSessionRepository struct {
	pool *pgxpool.Pool
}

func NewRefreshSessionRepository(pool *pgxpool.Pool) *RefreshSessionRepository {
	return &RefreshSessionRepository{pool: pool}
}

func (r *RefreshSessionRepository) Create(ctx context.Context, ownerID uuid.UUID, rawToken string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO refresh_sessions (id, family_id, owner_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, uuid.New(), uuid.New(), ownerID, hashRefreshToken(rawToken), expiresAt)
	if err != nil {
		return fmt.Errorf("error al crear sesión de renovación: %w", err)
	}
	return nil
}

func (r *RefreshSessionRepository) FindOwnerID(ctx context.Context, rawToken string) (uuid.UUID, error) {
	var ownerID uuid.UUID
	err := r.pool.QueryRow(ctx, `
		SELECT owner_id
		FROM refresh_sessions
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
	`, hashRefreshToken(rawToken)).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, domain.ErrUnauthorized
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("error al buscar sesión de renovación: %w", err)
	}
	return ownerID, nil
}

func (r *RefreshSessionRepository) Rotate(ctx context.Context, currentToken, nextToken string, expiresAt time.Time) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("error al iniciar rotación de sesión: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var sessionID, familyID, ownerID uuid.UUID
	var revokedAt *time.Time
	var expired bool
	err = tx.QueryRow(ctx, `
		SELECT id, family_id, owner_id, revoked_at, expires_at <= CURRENT_TIMESTAMP
		FROM refresh_sessions
		WHERE token_hash = $1
		FOR UPDATE
	`, hashRefreshToken(currentToken)).Scan(&sessionID, &familyID, &ownerID, &revokedAt, &expired)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrUnauthorized
	}
	if err != nil {
		return fmt.Errorf("error al leer sesión de renovación: %w", err)
	}
	if revokedAt != nil {
		// Reuse of an already rotated token invalidates its full session family.
		if _, err := tx.Exec(ctx, `
			UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
			WHERE family_id = $1
		`, familyID); err != nil {
			return fmt.Errorf("error al revocar familia de sesión: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("error al confirmar revocación de sesión: %w", err)
		}
		return domain.ErrUnauthorized
	}
	if expired {
		return domain.ErrUnauthorized
	}

	if _, err := tx.Exec(ctx, `
		UPDATE refresh_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1
	`, sessionID); err != nil {
		return fmt.Errorf("error al rotar sesión de renovación: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO refresh_sessions (id, family_id, owner_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, uuid.New(), familyID, ownerID, hashRefreshToken(nextToken), expiresAt); err != nil {
		return fmt.Errorf("error al guardar nuevo refresh token: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("error al confirmar rotación de sesión: %w", err)
	}
	return nil
}

func (r *RefreshSessionRepository) Revoke(ctx context.Context, rawToken string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE refresh_sessions
		SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
		WHERE family_id = (
			SELECT family_id FROM refresh_sessions WHERE token_hash = $1 LIMIT 1
		) AND revoked_at IS NULL
	`, hashRefreshToken(rawToken))
	if err != nil {
		return fmt.Errorf("error al cerrar sesión: %w", err)
	}
	return nil
}

func hashRefreshToken(rawToken string) []byte {
	hash := sha256.Sum256([]byte(rawToken))
	return hash[:]
}

package postgres

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(ctx context.Context, connString string) (*DB, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("error al parsear config de postgres: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("error al conectar con postgres pool: %w", err)
	}

	// Ping to ensure connection is live
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		return nil, fmt.Errorf("ping a postgres falló: %w", err)
	}

	return &DB{Pool: pool}, nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

// RunMigrations executes SQL files located in migrationsDir in alphabetical order
func (db *DB) RunMigrations(ctx context.Context, migrationsDir string) error {
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		return fmt.Errorf("error buscando migraciones: %w", err)
	}

	// Both API replicas start at the same time. Keep the migration lock and
	// transaction on one PostgreSQL connection so only one replica migrates.
	conn, err := db.Pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("error adquiriendo conexión para migraciones: %w", err)
	}
	defer conn.Release()

	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("error iniciando transacción de migraciones: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(742018421)"); err != nil {
		return fmt.Errorf("error adquiriendo bloqueo de migraciones: %w", err)
	}

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("error leyendo archivo de migración %s: %w", file, err)
		}

		if _, err := tx.Exec(ctx, string(content)); err != nil {
			return fmt.Errorf("error ejecutando migración %s: %w", file, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("error confirmando migraciones: %w", err)
	}

	return nil
}

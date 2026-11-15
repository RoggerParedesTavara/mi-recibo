package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort                     string
	Environment                    string
	DBHost                         string
	DBPort                         string
	DBUser                         string
	DBPassword                     string
	DBName                         string
	DBSSLMode                      string
	ConsumptionAlertSpikeThreshold float64
	JWTSecret                      string
	JWTAccessTokenSeconds          int
	JWTRefreshTokenDays            int
}

func LoadConfig() (*Config, error) {
	// Load .env if present (ignore error if file doesn't exist)
	_ = godotenv.Load()

	spikeThreshold, err := strconv.ParseFloat(getEnv("CONSUMPTION_ALERT_SPIKE_THRESHOLD", "20.0"), 64)
	if err != nil {
		spikeThreshold = 20.0
	}

	environment := getEnv("ENVIRONMENT", "development")
	defaultAccessTokenSeconds := "900"
	if !strings.EqualFold(environment, "production") {
		defaultAccessTokenSeconds = "5"
	}
	accessTokenSeconds, err := strconv.Atoi(getEnv("JWT_ACCESS_TOKEN_SECONDS", defaultAccessTokenSeconds))
	if err != nil || accessTokenSeconds <= 0 {
		accessTokenSeconds, _ = strconv.Atoi(defaultAccessTokenSeconds)
	}
	if strings.EqualFold(environment, "production") && accessTokenSeconds < 60 {
		return nil, fmt.Errorf("JWT_ACCESS_TOKEN_SECONDS debe ser al menos 60 en producción")
	}
	refreshTokenDays, err := strconv.Atoi(getEnv("JWT_REFRESH_TOKEN_DAYS", "30"))
	if err != nil || refreshTokenDays <= 0 {
		refreshTokenDays = 30
	}

	jwtSecret := getEnv("JWT_SECRET", "")
	if strings.EqualFold(environment, "production") {
		if len(jwtSecret) < 32 {
			return nil, fmt.Errorf("JWT_SECRET debe configurarse con al menos 32 caracteres en producción")
		}
	} else if jwtSecret == "" {
		jwtSecret = "mi-recibo-development-secret-change-before-production"
	}

	cfg := &Config{
		ServerPort:                     getEnv("SERVER_PORT", "8080"),
		Environment:                    environment,
		DBHost:                         getEnv("DB_HOST", "localhost"),
		DBPort:                         getEnv("DB_PORT", "5432"),
		DBUser:                         getEnv("DB_USER", "postgres"),
		DBPassword:                     getEnv("DB_PASSWORD", "postgres"),
		DBName:                         getEnv("DB_NAME", "mi_recibo"),
		DBSSLMode:                      getEnv("DB_SSLMODE", "disable"),
		ConsumptionAlertSpikeThreshold: spikeThreshold,
		JWTSecret:                      jwtSecret,
		JWTAccessTokenSeconds:          accessTokenSeconds,
		JWTRefreshTokenDays:            refreshTokenDays,
	}

	return cfg, nil
}

func (c *Config) DatabaseURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

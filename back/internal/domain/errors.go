package domain

import "errors"

var (
	ErrNotFound            = errors.New("recurso no encontrado")
	ErrConflict            = errors.New("conflicto de datos o registro duplicado")
	ErrValidation          = errors.New("error de validación")
	ErrNoActiveTenants     = errors.New("la propiedad no tiene inquilinos activos para calcular el recibo")
	ErrMissingConsumptions = errors.New("faltan lecturas de consumo para uno o más inquilinos activos")
	ErrUnitWithoutPrimary  = errors.New("no se puede calcular: una o más unidades no tienen un inquilino principal activo")
	ErrAlreadyCalculated   = errors.New("el recibo principal ya ha sido liquidado")
	ErrInvalidCredentials  = errors.New("credenciales inválidas")
	ErrUnauthorized        = errors.New("no autorizado o token inválido")
	ErrAccessTokenExpired  = errors.New("el access token venció")
	ErrForbidden           = errors.New("acceso denegado al recurso")
	ErrInvalidPassword     = errors.New("la contraseña debe tener entre 8 y 72 bytes")
	ErrInvalidEmail        = errors.New("el formato de correo electrónico es inválido")
)

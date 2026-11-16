# Postman: Mi Recibo API de desarrollo

1. En Postman, importá `Mi-Recibo-Desarrollo.postman_collection.json` y `Mi-Recibo-Desarrollo.postman_environment.json` desde la carpeta `postman`.
2. Seleccioná el environment `Mi Recibo - Desarrollo` en la esquina superior derecha.
3. Abrí **Environments > Mi Recibo - Desarrollo**. En la variable secreta `password`, ingresá la contraseña actual del usuario `coral@test.com` en **Current value**. No la guardes en un environment compartido ni la exportes.
4. En la colección ejecutá `01 - Health check`. Debe responder `200` y `status: ok`.
5. Ejecutá `02 - Login de prueba`. Si devuelve `200`, la pestaña **Tests** debe mostrar éxito y los tokens se guardan en variables secretas del environment.
6. Ejecutá `03 - Perfil autenticado`. Debe responder `200`.
7. Ejecutá `04 - Última lectura de medidor`. El environment trae el tenant de prueba `Inquilino 1` y `LUZ`; podés cambiar `service` a `AGUA` o reemplazar `tenantId` por otro UUID.
8. Ejecutá `05 - Lectura de un período` para consultar un período específico. Por defecto usa octubre de 2026; cambiá `year` y `month` para otro período.

Interpretación rápida:

- `01 - Health check` falla o da timeout: conectividad/servidor/URL.
- Login `401` con `INVALID_CREDENTIALS`: el servidor respondió, pero el email y la contraseña no coinciden con la base de datos usada por ese servidor.
- Login `200` y perfil `200`: backend, credenciales y autenticación funcionan; si la app sigue fallando, revisá el build/configuración del móvil.
- Última lectura `200`: responde `tenant_id`, `service_type`, período, `previous_reading`, `current_reading` y `consumed_units`. `404` significa que ese inquilino todavía no tiene una lectura actual guardada para el servicio elegido.
- Lectura de período `200`: `year` y `month` deben coincidir con el período solicitado. `404` significa que no hay lectura completa para esa combinación de inquilino, servicio y período.
- Login `400`: revisá el JSON enviado y que ambos valores estén completos.

El environment tiene la contraseña vacía a propósito. No guardes credenciales reales en Git ni compartas capturas que las muestren.

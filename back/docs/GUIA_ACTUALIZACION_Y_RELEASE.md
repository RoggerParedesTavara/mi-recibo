# Actualización y publicación de Mi Recibo

Guía para probar cambios, actualizar el backend de desarrollo y entregar una nueva app Android sin perder la base de datos.

## Entorno actual

- API de desarrollo: `https://mi-recibo-dev.tailf34c81.ts.net`
- VM VirtualBox: `mi-recibo-dev`, Debian, usuario `miadmin`.
- SSH local desde Windows: `ssh -p 2222 miadmin@127.0.0.1`.
- Compose de la VM: `~/mi-recibo/deploy/compose.yaml`.
- El despliegue actual de `~/mi-recibo` **no contiene `.git`**. No ejecutar `git pull` desde esa carpeta; el código se actualiza desde Windows por un paquete que se copia a la VM.
- La app usa perfiles separados. Para desarrollo debe compilarse con `front-mobile/.env.development`.

## Flujo para un cambio del backend

### 1. Actualizar y editar en Windows

En PowerShell, desde la carpeta local del repositorio:

```powershell
Set-Location "$HOME\Documents\mi-recibo"
git status --short
git pull --ff-only origin main
```

Hacé el cambio en `back`. Antes de publicarlo, ejecutá las pruebas:

```powershell
Set-Location back
go test ./...
Set-Location ..
```

Revisá `git diff`, guardá los cambios en un commit y subilos al repositorio según el flujo acordado.

### 2. Preparar un paquete sin secretos

Desde la raíz local del repositorio, este bloque crea un ZIP con el código del backend, sin `deploy/.env`, contraseñas ni binarios:

```powershell
$tag = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $env:TEMP "mi-recibo-back-$tag"
$archive = Join-Path $env:TEMP "mi-recibo-back-$tag.zip"
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$items = @('cmd','docs','internal','migrations','Dockerfile','go.mod','go.sum','README.md','.env.example')
foreach ($item in $items) {
  Copy-Item -LiteralPath (Join-Path (Get-Location) "back\$item") -Destination $stage -Recurse -Force
}
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive -Force
```

Copialo a la VM (reemplazá la ruta por el ZIP que generaste):

```powershell
scp -P 2222 "$archive" miadmin@127.0.0.1:/tmp/mi-recibo-back-update.zip
```

SSH va a pedir la clave de la VM. No la escribas dentro del comando ni en un archivo del repositorio.

### 3. Respaldar la fuente, actualizar y reconstruir en Debian

Conectate por SSH y ejecutá:

```bash
mkdir -p ~/mi-recibo/backups
backup=~/mi-recibo/backups/back-pre-update-$(date +%Y%m%d%H%M%S).tar.gz
tar --exclude=api.exe -czf "$backup" -C ~/mi-recibo/back .
python3 -c "import zipfile; zipfile.ZipFile('/tmp/mi-recibo-back-update.zip').extractall('/home/miadmin/mi-recibo/back')"
cd ~/mi-recibo/deploy
podman-compose -f compose.yaml build api1
```

El backup conserva una copia de la fuente anterior. La configuración secreta permanece en `~/mi-recibo/deploy/.env` y no se copia desde Windows.

### 4. Aplicar la imagen nueva

En esta VM, `podman-compose up -d --force-recreate api1 api2` puede fallar al intentar reemplazar contenedores con dependencias. Para aplicar el build, reiniciá el stack completo, **sin `-v`**:

```bash
podman-compose -f compose.yaml down
podman-compose -f compose.yaml up -d
```

Esto causa una interrupción breve, pero conserva los volúmenes de PostgreSQL, Prometheus y Grafana. Nunca agregues `-v` en una actualización normal: borraría esos datos.

El backend ejecuta las migraciones SQL al iniciar. Si el cambio incluye una migración que pueda alterar o borrar datos, hacé un backup de PostgreSQL y revisá la migración antes de desplegarla.

### 5. Verificar después de publicar

```bash
podman-compose -f compose.yaml ps
curl -fsS http://127.0.0.1:8081/health
podman-compose -f compose.yaml logs --tail=100 api1 api2
```

Luego, desde Windows:

```powershell
Invoke-RestMethod 'https://mi-recibo-dev.tailf34c81.ts.net/health'
```

No se considera terminado hasta que ambas APIs estén `healthy` y el health check local y externo responda `status: ok`.

## Endpoint de última lectura

La ruta ya publicada en desarrollo es:

```http
GET /api/v1/tenants/{tenant_id}/readings/latest?service=LUZ
Authorization: Bearer <access_token>
```

`service` acepta `LUZ`, `AGUA` o `GAS`. La consulta devuelve la lectura más reciente con `current_reading`, ordenada por año/mes de facturación, junto con `previous_reading`, consumo y período. La app toma `current_reading` como lectura anterior del período siguiente. La ruta requiere autenticación y verifica que el inquilino pertenezca al propietario.

- `200`: lectura encontrada.
- `400`: UUID o servicio inválido/faltante.
- `401`: falta sesión válida.
- `404`: ese inquilino no tiene lectura completa para ese servicio.

Para consultar la lectura de un período específico:

```http
GET /api/v1/tenants/{tenant_id}/readings?service=LUZ&year=2026&month=10
Authorization: Bearer <access_token>
```

La respuesta incluye `previous_reading` y `current_reading` del período solicitado. Esta ruta compatible mantiene `/api/v1`; OpenAPI se actualiza a la versión `1.1.0`.

En desarrollo, la colección de Postman está en `postman/Mi-Recibo-Desarrollo.postman_collection.json`. Importá también el environment del mismo nombre, ejecutá login y luego la consulta de última lectura. La contraseña debe cargarse como variable secreta local, no compartirse ni exportarse.

## Sacar una nueva versión de Android

### Instalar una build de desarrollo

En PowerShell, conectá un emulador o teléfono Android con depuración habilitada y ejecutá desde `front-mobile`:

```powershell
node scripts/run-with-env.js android --env development
```

Este comando selecciona `.env.development`, compila e instala la build de desarrollo en el dispositivo conectado. La nueva API se incorpora al actualizar el backend; la app solo necesita recompilarse si cambió su código o configuración.

### Crear el APK debug de desarrollo

Para compilar el APK sin abrir el emulador, configurá el SDK (ajustá la ruta si Android SDK está instalado en otro lugar):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ENVFILE = '.env.development'
Set-Location android
.\gradlew.bat assembleDebug
```

El APK queda en `app/build/outputs/apk/debug/app-debug.apk`. Es una build de desarrollo, firmada con la clave debug; sirve para pruebas, no para distribuir en una tienda.

### Publicar una versión instalable para usuarios

Antes de distribuir, incrementá `versionCode` y `versionName` en `front-mobile/android/app/build.gradle`, configurá una clave de firma de release guardada fuera del repositorio y compilá con la configuración del entorno deseado. El proyecto actual firma `release` con la clave debug, así que primero hay que configurar correctamente la firma de producción. No reutilices ni publiques una clave de firma en Git.

## Versionado de la API

- Cambios compatibles (campos opcionales o rutas nuevas): mantené `/api/v1` y actualizá la versión/documentación de OpenAPI según el release.
- Cambios incompatibles en contratos existentes: agregá `/api/v2`, conservá `/api/v1` durante la migración de la app y retirala solo cuando los clientes ya se hayan actualizado.

Un cambio solo queda disponible en el teléfono después de desplegar el backend (si corresponde) y distribuir/instalar una nueva build móvil cuando cambió el código de la app.

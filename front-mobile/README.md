# 📱 Mi Recibo - Front Mobile

Aplicación móvil desarrollada en **React Native 0.88** con **TypeScript**, orientada a propietarios de inmuebles multifamiliares o alquileres compartidos. Permite la toma de lecturas de medidores (luz y agua), cálculo inmediato de consumos e importes con prorrateo de cargos fijos, persistencia local con **MMKV** y posterior sincronización con la API del backend.

---

## 🛠️ Stack Tecnológico

- **Framework**: React Native 0.88 (New Architecture ready)
- **Lenguaje**: TypeScript 5+
- **Almacenamiento Local**: `react-native-mmkv` v4 (persistencia ultra-rápida y síncrona en C++)
- **Gestión de Configuración**: `react-native-config`
- **Testing**: Jest con tests unitarios de dominio y repositorios
- **UI & Iconos**: Componentes nativos y tema modularizado (`src/shared/ui`)

---

## 📁 Estructura del Módulo

```
front-mobile/
├── android/             # Proyecto nativo de Android (Gradle)
├── ios/                 # Proyecto nativo de iOS (Xcode & CocoaPods)
├── docs/
│   └── local-data.md    # Especificación de persistencia local y datos precargados
├── src/
│   ├── config/          # Variables de entorno y configuración centralizada
│   ├── modules/         # Módulos por dominio de negocio (Clean Architecture)
│   │   ├── auth/        # Lógica de autenticación local
│   │   ├── billing/     # Modelos y cálculo de facturación por servicio (tarifas, IGV, cargos fijos)
│   │   ├── consumptions/# Registro de lecturas, cálculo de unidades y repositorio de mediciones
│   │   ├── preferences/ # Preferencias de usuario (ej. moneda)
│   │   ├── properties/  # Gestión de casas/inmuebles
│   │   └── tenants/     # Gestión de inquilinos y unidades
│   ├── screens/         # Pantallas de la app (Login, Propiedades, Lecturas, Unidades, etc.)
│   └── shared/          # Utilidades compartidas, componentes UI y almacenamiento MMKV
├── App.tsx              # Componente principal y navegación
└── package.json
```

---

## 📋 Requisitos Previos

1. **Node.js**: versión 22.11.0 o superior (`node -v`).
2. **npm** o gestor compatible.
3. **Entorno React Native**:
   - Para **iOS**: macOS, Xcode 16+ y **CocoaPods** (`gem install cocoapods` o `brew install cocoapods`).
   - Para **Android**: Android Studio con Android SDK (API 34/35), JDK 17 y variable `ANDROID_HOME` configurada.
   - Consulta la [guía oficial de configuración de React Native CLI](https://reactnative.dev/docs/set-up-your-environment).

---

## 🚀 Instalación y Ejecución

### 1. Instalar dependencias

Desde el directorio `front-mobile/`:

```bash
npm ci
```

### 2. Configurar variables de entorno

Copia el archivo base `.env.example` a `.env`:

```bash
cp .env.example .env
```

Configura `API_BASE_URL` según tu entorno:

- **Simulador iOS**:
  ```env
  API_BASE_URL=http://localhost:8080/api/v1
  ```
- **Emulador Android**:
  ```env
  API_BASE_URL=http://10.0.2.2:8080/api/v1
  ```
  *(La IP `10.0.2.2` permite que el emulador acceda al `localhost` de tu máquina anfitriona).*
- **Dispositivo físico (iOS / Android)**:
  ```env
  API_BASE_URL=http://<IP_LOCAL_DE_TU_PC>:8080/api/v1
  ```

### 3. Instalar Pods (Sólo para iOS)

En macOS, antes de compilar para iOS:

```bash
cd ios
pod install
cd ..
```

### 4. Iniciar el empaquetador Metro

En una terminal dedicada:

```bash
npm start
```

### 5. Compilar y correr en el dispositivo/emulador

En otra terminal:

- **Para iOS**:
  ```bash
  npm run ios
  ```
- **Para Android**:
  ```bash
  npm run android
  ```

---

## 🔑 Acceso y Datos de Demostración

La app cuenta con autenticación local para desarrollo y evaluación:

- **Usuario**: `coral`
- **Contraseña**: `coral`

Al iniciar sesión, la app precarga datos locales de ejemplo basados en una vivienda típica (**Casa Palermo**), 2 unidades y 2 inquilinos, con las tarifas y estructura de prorrateo de luz (Enel) y agua (Sedapal). Consulta los detalles en **[`docs/local-data.md`](./docs/local-data.md)**.

---

## 🧪 Pruebas y Validación de Calidad

Ejecuta las suites de pruebas y verificaciones estáticas:

```bash
# Tests unitarios con Jest
npm test -- --runInBand

# Chequeo de tipos TypeScript
npx tsc --noEmit

# Linter ESLint
npm run lint
```

---

## 🔧 Solución de Problemas Frecuentes

- **Error de conexión con el backend en Android**: Verifica que tu `.env` tenga `http://10.0.2.2:8080/api/v1` y no `localhost`.
- **Metro Bundler desfasado o errores de caché**:
  ```bash
  npm start -- --reset-cache
  ```
- **Fallo al compilar iOS tras actualizar paquetes**:
  ```bash
  cd ios && rm -rf Pods Podfile.lock build && pod install && cd ..
  ```
- **Watchman warning**:
  ```bash
  watchman watch-del-all
  ```

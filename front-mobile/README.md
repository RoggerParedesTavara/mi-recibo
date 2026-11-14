# Front mobile

Aplicación React Native de Mi Recibo. Desde esta carpeta se ejecutan los comandos de desarrollo.

## Preparación

Requiere Node.js 22 o posterior y el entorno nativo de [React Native](https://reactnative.dev/docs/set-up-your-environment).

```sh
cd front-mobile
npm ci
cp .env.example .env
```

Configura `API_BASE_URL` en `.env`. El archivo no se versiona; `.env.example` contiene las rutas de referencia para simuladores.

## Ejecutar

Inicia Metro en una terminal:

```sh
npm start
```

En otra terminal, desde `front-mobile/`:

```sh
npm run ios
# o
npm run android
```

Después de clonar o cambiar dependencias nativas, instala CocoaPods con `cd ios && pod install` antes de compilar iOS.

El acceso local de demostración es `coral` / `coral`.

## Verificaciones

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint
```

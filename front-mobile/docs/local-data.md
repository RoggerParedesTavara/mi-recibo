# Datos locales del front

## Uso temporal

El front usa MMKV como persistencia local mientras se conecta el backend. La interfaz de dominio es `MeasurementRepository`; `LocalMeasurementRepository` la implementa hoy y puede ser reemplazado o decorado con una fuente HTTP después.

El acceso local de desarrollo es `coral` / `coral`. No valida credenciales contra un servidor y no debe usarse como autenticación de producción.

## Configuración inicial desde la planilla

Al iniciar, la app precarga Casa Palermo, dos unidades y dos inquilinos locales (`Inquilino 1` y `Inquilino 2`). También precarga desde la planilla la tarifa exacta, el IGV y los cargos del proveedor:

- Luz: S/ 0.6192 por kWh, IGV 18%, Alumbrado Público S/ 17.50, Interés Compensatorio S/ 0.36, Cargo Fijo S/ 2.37 y Aporte Ley S/ 3.74.
- Agua: S/ 2.01571428571428 por m³, IGV 18%, Cargo Fijo S/ 6.26, Alcantarillado S/ 10.06 y Redondeo Anterior S/ 0.08.

Los cargos se guardan al nivel de la vivienda y se dividen entre los dos inquilinos. El cálculo local aplica IGV sobre consumo y conceptos marcados como gravados; Aporte Ley y Redondeo Anterior quedan fuera de esa base según la estructura de la planilla.

Como datos de demostración para el período local actual, se precargan los consumos de Enel (filas 5 y 6: 383.1 y 265.9 kWh) y Sedapal (filas 6 y 7: 9.37 y 16.231 m³), asignados por orden a los dos inquilinos locales. Se muestran como `Dato de ejemplo`; no son lecturas actuales confirmadas. Una lectura manual del mismo servicio, inquilino y período reemplaza el ejemplo y queda marcada para sincronización.

## Lecturas creadas desde la app

Una lectura nueva requiere servicio, vivienda, unidad, inquilino, período y lecturas anterior y actual. El consumo se deriva como `lectura actual - lectura anterior`; la lectura anterior se precarga de la lectura actual del período previo y se muestra como solo lectura. Si se cambió el medidor, el usuario puede reiniciarla a cero antes de guardar. La medición y el consumo derivado se guardan inmediatamente con `syncState: pending`. El cálculo presenta base imponible, IGV y total por inquilino. La cola de sincronización con la API todavía debe conectarse cuando el backend esté listo.

La prueba del cálculo usa una fila de ejemplo de luz y otra de agua de la planilla; comprueba consumo, base imponible, IGV y total.

## Configuración de API

El front lee `API_BASE_URL` desde `.env` por medio de `react-native-config`. El archivo `.env` local no se versiona; `.env.example` documenta el valor inicial. En Android Emulator, usar `http://10.0.2.2:8080/api/v1`; en iOS Simulator, `http://localhost:8080/api/v1`.

# AgriBlockchain – IA + Blockchain + Histórico on-chain

Este repositorio contiene tanto la aplicación web (AR + IA + wallet) como los
contratos para guardar eventos históricos en Sepolia.

## Estructura

```
contracts/AgriEvents.sol   <-- contrato append-only
scripts/deploy.js          <-- script Hardhat para desplegar AgriEvents
hardhat.config.js          <-- configuración de compilación y redes
package.json               <-- dependencias (Hardhat, toolbox)
ar/                        <-- aplicación web (index.html, js, css)
```

## Requisitos

- Node.js 18+
- npm
- Cuenta y wallet con fondos en Sepolia
- Project ID de WalletConnect (ya configurado en `ar/js/config.js`)

## Despliegue del contrato AgriEvents

1. Instala dependencias (solo la primera vez):
   ```bash
   npm install
   ```
2. Configura tus variables en un fichero `.env` (mismo nivel que
   `hardhat.config.js`):
   ```env
   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   SEPOLIA_PRIVATE_KEY=0x..............................
   ETHERSCAN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Compila y despliega en Sepolia:
   ```bash
   npx hardhat compile
   npx hardhat run --network sepolia scripts/deploy.js
   ```
4. Copia la dirección que imprime el script y pégala en
   `ar/js/config.js` (`CONFIG.events.contractAddress`).

## Servir la aplicación web

Puedes servir `ar/` con cualquier servidor estático. Ejemplo rápido:
```bash
cd ar
npx serve . -l 4173
```
Abre `http://localhost:4173/index.html?id=planta01`. Para publicar en Netlify
sube la carpeta `ar` o enlaza el repositorio.

## Parámetros útiles

- `?id=planta01` → selecciona la planta/plantaId inicial.
- `?debug=1` → muestra panel de métricas (bloques consultados, eventos, etc.).

## Flujo de uso

1. Detecta la planta (o escanea el QR que apunta a `index.html?id=...`).
2. Pulsa “BC” para abrir el modal. Puedes elegir:
   - **Actualizar estado** (`setPlantData`) – mantiene compatibilidad con el
     flujo antiguo (último JSON por planta).
   - **Guardar histórico** (`addPlantEvent`) – añade un evento append-only en
     la cadena (Seeding, Harvest, Transport, Storage, Sales, ...).
3. La app consulta los eventos on-chain mediante `queryFilter`, cachea en
   `localStorage` (`agri:history:<plantId>`) y permite filtrarlos.
4. Usa el botón de copiar hash o visita el explorador
   [https://sepolia.etherscan.io](https://sepolia.etherscan.io) para auditar las
   transacciones.

## Datos de prueba

```json
{
  "eventType": "SEEDI",
  "eventId": "01HXZZ4G26NQY0XJZK9VG7QVB",
  "batchId": "01HXZZ4G26NS3D8JK8DZXY03",
  "lotCode": "FARM456-2025-03-15-PLOT-3",
  "timestamp": "2025-10-10T14:30:22.000Z",
  "recordedBy": "device-SENSOR-03",
  "fieldId": "PLOT-3",
  "seed_LotId": "SEED-LOT-B12-89",
  "seedVariety": "Cherry Tomato Hybrid",
  "seedSupplier": "BioSeeds International",
  "seedTreatment": "organic-certified",
  "quantity_kg": 1.8,
  "plantingMethod": "hydroponic-system",
  "rowSpacing_cm": 45,
  "plantingDepth_cm": 2.0,
  "germinationRate_pct": 94
}
```

> El histórico se obtiene de los eventos on-chain. El estado (último JSON
> guardado) sigue almacenándose mediante `setPlantData`.

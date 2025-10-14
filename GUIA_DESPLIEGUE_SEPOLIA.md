# 🚀 GUÍA PASO A PASO: DESPLEGAR EN SEPOLIA

## 📋 CHECKLIST PREVIO
- [ ] Tener MetaMask instalado (https://metamask.io)
- [ ] Tener cuenta en Infura (https://infura.io) - Plan gratuito
- [ ] Navegador: Chrome o Firefox

---

## 🔧 PASO 1: CONFIGURAR METAMASK CON SEPOLIA

### 1.1 Instalar MetaMask
1. Ve a https://metamask.io
2. Descargar extensión para tu navegador
3. Crear wallet (GUARDA TU FRASE SECRETA en lugar seguro)

### 1.2 Añadir red Sepolia
1. Abrir MetaMask
2. Click en la red (arriba) → "Add Network" → "Add network manually"
3. Introducir estos datos:

```
Network Name: Sepolia
RPC URL: https://sepolia.infura.io/v3/
Chain ID: 11155111
Currency Symbol: ETH
Block Explorer: https://sepolia.etherscan.io
```

4. Guardar
5. Cambiar a red Sepolia

### 1.3 Obtener ETH de prueba (gratis)
1. Copiar tu dirección de wallet (click en el nombre de cuenta)
2. Ir a https://sepoliafaucet.com
3. O ir a https://www.infura.io/faucet/sepolia
4. Pegar tu dirección
5. Esperar 1-2 minutos
6. Verificar que tienes ~0.5 ETH en MetaMask

---

## 💻 PASO 2: DESPLEGAR CONTRATO EN REMIX

### 2.1 Abrir Remix IDE
1. Ir a https://remix.ethereum.org
2. Esperar a que cargue

### 2.2 Crear el archivo del contrato
1. En el panel izquierdo → File Explorer
2. Click derecho en "contracts" → New File
3. Nombre: `PlantRegistry.sol`
4. Copiar y pegar el código del contrato (ver PlantRegistry.sol)

### 2.3 Compilar
1. Panel izquierdo → Ícono "Solidity Compiler" (3er ícono)
2. Seleccionar compiler: `0.8.20` o superior
3. Click en "Compile PlantRegistry.sol"
4. Verificar ✅ verde = compilado correctamente

### 2.4 Desplegar
1. Panel izquierdo → Ícono "Deploy & Run Transactions" (4to ícono)
2. En "ENVIRONMENT" seleccionar: **"Injected Provider - MetaMask"**
3. Aparecerá popup de MetaMask → Conectar
4. Verificar que dice "Sepolia (11155111)" arriba
5. En "CONTRACT" seleccionar: **PlantRegistry**
6. Click botón naranja "Deploy"
7. MetaMask popup → Confirmar transacción
8. Esperar 10-30 segundos
9. ✅ Aparecerá el contrato en "Deployed Contracts"

### 2.5 Copiar dirección del contrato
1. En "Deployed Contracts" expandir tu contrato
2. Click en el ícono de copiar junto a la dirección
3. **GUARDAR ESTA DIRECCIÓN** (ejemplo: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb)

---

## 📝 PASO 3: CARGAR DATOS DE PLANTA01

### 3.1 Preparar datos
Vamos a usar la función `registerPlant` del contrato.

### 3.2 En Remix, expandir tu contrato desplegado
1. Buscar la función naranja `registerPlant`
2. Click para expandir

### 3.3 Introducir estos valores (en orden):
```
_plantId: "planta01"
_eventType: "SEEDING"
_eventId: "01HXZZ4G26NQY0XJZK9VG7QVB"
_batchId: "01HXZZ4G26NS3D8JK8DZXY03"
_lotCode: "FARM456-2025-03-15-PLOT-3"
_timestamp: 1728568222
_recordedBy: "device-SENSOR-03"
_fieldId: "PLOT-3"
_seed_LotId: "SEED-LOT-B12-89"
_seedVariety: "Cherry Tomato Hybrid"
_seedSupplier: "BioSeeds International"
_seedTreatment: "organic-certified"
_quantity_kg: 1800
_plantingMethod: "hydroponic-system"
_rowSpacing_cm: 45
_plantingDepth_cm: 20
_germinationRate_pct: 94
```

### 3.4 Ejecutar
1. Click botón "transact"
2. MetaMask → Confirmar
3. Esperar confirmación
4. ✅ Datos guardados en blockchain!

### 3.5 Verificar
1. Buscar función azul `getPlant`
2. Introducir: `"planta01"`
3. Click "call"
4. Deberías ver todos los datos!

---

## 🔍 PASO 4: VERIFICAR EN ETHERSCAN

1. Ir a https://sepolia.etherscan.io
2. Pegar tu contract address
3. Ver transacciones y datos
4. ¡Está en blockchain real!

---

## 📊 INFORMACIÓN FINAL

### Datos que necesitas guardar:
```
✅ Contract Address: 0x... (la que copiaste)
✅ Network: Sepolia Testnet
✅ Chain ID: 11155111
✅ RPC URL: https://sepolia.infura.io/v3/[TU_INFURA_KEY]
```

### Obtener Infura Key (gratis):
1. Ir a https://infura.io
2. Crear cuenta gratuita
3. Create New Key → Web3 API
4. Copiar el Project ID
5. RPC completo: `https://sepolia.infura.io/v3/TU_PROJECT_ID`

---

## ⚠️ PROBLEMAS COMUNES

**❌ No tengo ETH de prueba**
→ Usar otro faucet: https://faucet.quicknode.com/ethereum/sepolia

**❌ MetaMask no se conecta**
→ Verificar que estás en red Sepolia

**❌ Error al desplegar**
→ Verificar que tienes suficiente ETH (mínimo 0.05)

**❌ Transacción pendiente mucho tiempo**
→ Aumentar gas price en MetaMask

---

## ✅ PRÓXIMO PASO

Una vez tengas el **Contract Address**, vuelve al chat y te creo el código para que tu app lea de blockchain!

🎯 **Necesitaré:**
- Contract Address: 0x...
- Infura Project ID: abc123...

¡Vamos! 🚀

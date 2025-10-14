# ⚡ CHEATSHEET RÁPIDO - SEPOLIA DEPLOYMENT

## 🔗 ENLACES IMPORTANTES

| Servicio | URL | Uso |
|----------|-----|-----|
| **Remix IDE** | https://remix.ethereum.org | Desplegar contrato |
| **MetaMask** | https://metamask.io | Wallet |
| **Sepolia Faucet** | https://sepoliafaucet.com | ETH gratis |
| **Infura** | https://infura.io | RPC Provider |
| **Sepolia Explorer** | https://sepolia.etherscan.io | Ver transacciones |

---

## 🎯 CONFIGURACIÓN SEPOLIA EN METAMASK

```
Network Name: Sepolia
RPC URL: https://sepolia.infura.io/v3/
Chain ID: 11155111
Symbol: ETH
Explorer: https://sepolia.etherscan.io
```

---

## 📝 COMANDOS REMIX

### 1️⃣ Compilar
```
Solidity Compiler → Version 0.8.20+ → Compile PlantRegistry.sol
```

### 2️⃣ Desplegar
```
Deploy & Run → Environment: "Injected Provider - MetaMask" 
→ Deploy → Confirmar en MetaMask
```

### 3️⃣ Cargar planta01
```javascript
registerPlant(
    "planta01",                    // _plantId
    "SEEDING",                     // _eventType
    "01HXZZ4G26NQY0XJZK9VG7QVB",  // _eventId
    "01HXZZ4G26NS3D8JK8DZXY03",   // _batchId
    "FARM456-2025-03-15-PLOT-3",  // _lotCode
    1728568222,                    // _timestamp
    "device-SENSOR-03",            // _recordedBy
    "PLOT-3",                      // _fieldId
    "SEED-LOT-B12-89",             // _seed_LotId
    "Cherry Tomato Hybrid",        // _seedVariety
    "BioSeeds International",      // _seedSupplier
    "organic-certified",           // _seedTreatment
    1800,                          // _quantity_kg
    "hydroponic-system",           // _plantingMethod
    45,                            // _rowSpacing_cm
    20,                            // _plantingDepth_cm
    94                             // _germinationRate_pct
)
```

### 4️⃣ Verificar datos
```javascript
getPlant("planta01")  // Click "call"
```

---

## 🔐 DATOS A GUARDAR

```javascript
// ⚠️ GUARDAR ESTOS VALORES:

CONTRACT_ADDRESS = "0x..."  // Copiar de Remix después de deploy
INFURA_KEY = "abc123..."    // De dashboard Infura
WALLET_ADDRESS = "0x..."    // Tu dirección MetaMask

// URL completa RPC:
RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`
```

---

## ✅ CHECKLIST DE VALIDACIÓN

- [ ] MetaMask conectado a Sepolia
- [ ] Tengo >0.05 ETH en wallet
- [ ] Contrato compilado sin errores
- [ ] Contrato desplegado (tengo address)
- [ ] Planta01 registrada (transaction confirmada)
- [ ] `getPlant("planta01")` retorna datos correctos
- [ ] Veo transacciones en Sepolia Etherscan

---

## 🚨 SOLUCIÓN RÁPIDA DE ERRORES

**Error: "Insufficient funds"**
→ Ir a faucet, pedir más ETH

**Error: "Transaction failed"**
→ Aumentar gas limit en MetaMask

**Error: "Wrong network"**
→ Cambiar MetaMask a Sepolia

**Error: "Cannot read contract"**
→ Verificar que contract address es correcto

---

## 📊 ESTRUCTURA DE RESPUESTA DEL CONTRATO

```javascript
// Al llamar getPlant("planta01"):
{
  eventType: "SEEDING",
  eventId: "01HXZZ4G26NQY0XJZK9VG7QVB",
  batchId: "01HXZZ4G26NS3D8JK8DZXY03",
  lotCode: "FARM456-2025-03-15-PLOT-3",
  timestamp: 1728568222,
  recordedBy: "device-SENSOR-03",
  fieldId: "PLOT-3",
  seed_LotId: "SEED-LOT-B12-89",
  seedVariety: "Cherry Tomato Hybrid",
  seedSupplier: "BioSeeds International",
  seedTreatment: "organic-certified",
  quantity_kg: 1800,
  plantingMethod: "hydroponic-system",
  rowSpacing_cm: 45,
  plantingDepth_cm: 20,
  germinationRate_pct: 94
}
```

---

## 🎯 PRÓXIMO PASO

Una vez desplegado:
1. Copiar Contract Address
2. Copiar Infura Project ID
3. Volver al chat
4. → Te creo el código de integración para tu app

---

*💡 Tip: Toma screenshot del contract address después de deploy!*

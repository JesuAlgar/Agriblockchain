# 🔗 AR Planta - Sistema Preparado para Blockchain

## 📋 Estado Actual

✅ **Sistema completamente preparado** para integración con blockchain  
✅ **Arquitectura modular** - Solo necesitas conectar tu smart contract  
✅ **Funcionando ahora** con JSON local mientras tanto  
✅ **Generador de QR codes** incluido  

---

## 🎯 Cómo Funciona Ahora

### 1. **Flujo Actual (JSON Local)**
```
Usuario escanea QR → URL con ?id=planta01 → App carga datos de ./data/planta01.json
```

### 2. **Flujo Futuro (Blockchain)**
```
Usuario escanea QR → URL con ?id=0xABC123 → App lee datos de Smart Contract
```

**¡SOLO CAMBIA LA FUENTE DE DATOS, LA UI PERMANECE IGUAL!** 🎨

---

## 🚀 Cómo Usar Ahora (Antes de Blockchain)

### **Paso 1: Generar QR Codes**

1. Abre `qr-generator.html` en tu navegador
2. Configura:
   - **URL Base**: Tu dominio/IP donde está la app
   - **Plant ID**: `planta01`, `planta02`, etc.
3. Click en "Generar QR Code"
4. Descarga el PNG
5. Imprime y pega en las plantas físicas

**Ejemplo de URL generada:**
```
https://192.168.1.100:8443/index.html?id=planta01
```

### **Paso 2: Crear Datos de Plantas**

Crea archivos JSON en la carpeta `data/`:

```json
// data/planta01.json
{
  "eventType": "MONITORING",
  "eventId": "01HXZZ4G26NQY0XJZK9VG7QVB",
  "seedVariety": "Cherry Tomato Hybrid",
  "seedSupplier": "BioSeeds International",
  // ... todos los campos
}
```

### **Paso 3: Probar el Sistema**

1. Inicia el servidor HTTPS:
   ```bash
   python server_https.py
   ```

2. Escanea el QR con tu móvil

3. La app AR detectará la planta y mostrará los datos del JSON

---

## 🔧 Cuando Tengas Blockchain - Solo 3 Pasos

### **Paso 1: Configurar en `dataManager.js`**

```javascript
// Cambiar esta línea:
const DATA_SOURCE = {
  type: 'LOCAL_JSON'  // ← Actual
};

// A esto:
const DATA_SOURCE = {
  type: 'BLOCKCHAIN'  // ← Futuro
};
```

### **Paso 2: Completar la función `loadFromBlockchain()`**

En `dataManager.js`, busca la función `loadFromBlockchain()` y completa con tu lógica:

```javascript
async function loadFromBlockchain(plantId) {
  // 1. Importar librería (ethers.js, web3.js, etc.)
  import { ethers } from 'ethers';
  
  // 2. Configurar provider
  const provider = new ethers.JsonRpcProvider('TU_RPC_URL');
  
  // 3. Configurar contrato
  const contract = new ethers.Contract(
    'TU_CONTRACT_ADDRESS',
    TU_ABI,
    provider
  );
  
  // 4. Leer datos
  const rawData = await contract.getPlantData(plantId);
  
  // 5. Mapear al formato de la app
  return {
    eventType: rawData.eventType,
    seedVariety: rawData.seedVariety,
    // ... resto de campos
  };
}
```

### **Paso 3: Actualizar QR Codes**

Genera nuevos QR con los IDs de blockchain:
```
https://tuapp.com?id=0x742d35Cc6634C0532925a3b8...
```

---

## 📝 Info Que Necesitarás de Blockchain

### 1. **Tipo de Blockchain**
- [ ] Ethereum / Polygon
- [ ] Solana  
- [ ] Hyperledger
- [ ] Otra: __________

### 2. **Estructura de Datos**

**¿Cómo se almacena?**
- [ ] Smart Contract directo
- [ ] IPFS + Hash en blockchain
- [ ] The Graph (Subgraph)

**Ejemplo estructura Smart Contract:**
```solidity
struct PlantData {
    string eventType;
    string eventId;
    string seedVariety;
    // ... resto
}

mapping(string => PlantData) public plants;
```

### 3. **Librería a Usar**
- [ ] ethers.js (Ethereum/Polygon)
- [ ] web3.js (Ethereum)
- [ ] @solana/web3.js (Solana)
- [ ] API REST propia

### 4. **Configuración Necesaria**
```javascript
const BLOCKCHAIN_CONFIG = {
  rpcUrl: 'https://polygon-rpc.com',        // Tu RPC
  contractAddress: '0x...',                 // Address del contrato
  contractABI: [...],                       // ABI del contrato
  chainId: 137,                             // ID de la red
};
```

---

## 🎨 Lo Que YA Está Listo

✅ Lectura de parámetros URL (QR)  
✅ Sistema de caché inteligente  
✅ Capa de abstracción de datos  
✅ UI responsive y optimizada  
✅ Fallback si falla la conexión  
✅ Generador de QR codes  
✅ Detección de plantas con IA  
✅ Sistema modular fácil de mantener  

---

## 🔄 Comparación: Antes vs Después

### **ANTES (JSON Local)**
```javascript
loadPlantData() → fetch('data/planta01.json') → UI
```

### **DESPUÉS (Blockchain)**
```javascript
loadPlantData() → contract.getPlantData() → UI
```

**¡LA UI NO CAMBIA! Solo la fuente de datos** 🎯

---

## 🧪 Testing

### Test Local (Ahora)
```bash
# 1. Generar QR con: https://localhost:8443/index.html?id=planta01
# 2. Escanear con móvil
# 3. Ver datos del JSON
```

### Test Blockchain (Futuro)
```bash
# 1. Cambiar DATA_SOURCE.type = 'BLOCKCHAIN'
# 2. Generar QR con: https://tuapp.com?id=0xABC123
# 3. Escanear con móvil  
# 4. Ver datos de la blockchain
```

---

## 📂 Estructura de Archivos

```
proyecto/
├── index.html              # App principal
├── qr-generator.html       # ✨ Generador de QR codes
├── js/
│   ├── dataManager.js      # 🔗 PREPARADO para blockchain
│   ├── detector.js         # Detección IA
│   ├── ui.js              # Interfaz
│   └── ...
├── data/
│   ├── planta01.json      # Datos temporales
│   └── planta02.json
└── README-BLOCKCHAIN.md   # Este archivo
```

---

## ❓ FAQ

**P: ¿Puedo probar el sistema sin blockchain?**  
R: ✅ Sí, usa JSON local. Todo funciona igual.

**P: ¿Qué pasa si blockchain está lento?**  
R: ✅ El sistema tiene caché. Los datos se guardan localmente.

**P: ¿Puedo cambiar entre JSON y Blockchain fácilmente?**  
R: ✅ Sí, solo cambia `DATA_SOURCE.type` en `dataManager.js`

**P: ¿Los QR funcionarán igual?**  
R: ✅ Sí, solo cambia el parámetro `?id=XXX`

---

## 🎯 Siguiente Paso

**Cuando tengas la info de blockchain**, solo dime:

1. **Blockchain**: Ethereum / Polygon / Solana / Otra
2. **Contract Address**: 0x...
3. **ABI**: [...]
4. **RPC URL**: https://...
5. **Estructura de datos**: Cómo se almacena

¡Y conectamos todo en 10 minutos! 🚀

---

## 📞 Soporte

Si necesitas ayuda para:
- ✅ Diseñar el Smart Contract
- ✅ Conectar con blockchain específica
- ✅ Optimizar queries
- ✅ Añadir más funcionalidades

¡Solo pregunta! 💪
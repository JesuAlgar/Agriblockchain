# 🎯 PASO 1: DESPLEGAR SMART CONTRACT EN SEPOLIA

## 📦 ARCHIVOS INCLUIDOS

1. **PlantRegistry.sol** - Smart contract en Solidity
2. **loadPlantData.js** - Script con datos de planta01
3. **GUIA_DESPLIEGUE_SEPOLIA.md** - Guía paso a paso completa

## ⏱️ TIEMPO ESTIMADO
**Total: 15-20 minutos**
- Configurar MetaMask: 5 min
- Obtener ETH gratis: 2 min
- Desplegar contrato: 5 min
- Cargar datos: 3 min

## 🚀 INICIO RÁPIDO

### 1️⃣ Preparación (5 min)
- [ ] Instalar MetaMask → https://metamask.io
- [ ] Crear cuenta Infura → https://infura.io (gratis)
- [ ] Añadir red Sepolia a MetaMask
- [ ] Obtener ETH gratis → https://sepoliafaucet.com

### 2️⃣ Desplegar (5 min)
- [ ] Abrir Remix → https://remix.ethereum.org
- [ ] Copiar contenido de **PlantRegistry.sol**
- [ ] Compilar con Solidity 0.8.20+
- [ ] Desplegar con MetaMask (Sepolia)
- [ ] **COPIAR CONTRACT ADDRESS** 📋

### 3️⃣ Cargar datos (3 min)
- [ ] En Remix, función `registerPlant`
- [ ] Copiar datos de **loadPlantData.js**
- [ ] Ejecutar transacción
- [ ] Verificar con `getPlant("planta01")`

### 4️⃣ Verificar (2 min)
- [ ] Ir a https://sepolia.etherscan.io
- [ ] Buscar tu contract address
- [ ] ✅ Ver transacciones en blockchain

## 📋 INFORMACIÓN QUE NECESITAS GUARDAR

Al finalizar, tendrás:

```javascript
// GUARDAR ESTOS DATOS:
{
  contractAddress: "0x...",  // De Remix después de deploy
  network: "sepolia",
  chainId: 11155111,
  rpcUrl: "https://sepolia.infura.io/v3/[TU_KEY]",  // De Infura
  explorerUrl: "https://sepolia.etherscan.io"
}
```

## 🎯 SIGUIENTE PASO

Una vez tengas el **Contract Address** y tu **Infura Project ID**, vuelve al chat para:

✅ **PASO 2:** Crear código JavaScript para leer datos  
✅ **PASO 3:** Integrar en tu app AR  
✅ **PASO 4:** Probar todo funcionando  

---

## 💡 TIPS

**✅ Buenas prácticas:**
- Guardar frase secreta de MetaMask en lugar MUY seguro
- Usar red Sepolia (testnet) para pruebas
- No compartir claves privadas nunca
- Verificar transacciones en Etherscan

**⚠️ Si tienes problemas:**
- Leer archivo **GUIA_DESPLIEGUE_SEPOLIA.md** (detallada)
- Sección "Problemas Comunes" al final
- Volver al chat con el error específico

---

## 📞 CONTACTO

Si encuentras algún problema durante el despliegue, vuelve al chat con:
- Screenshot del error
- Paso donde te quedaste
- Network que estás usando

¡Éxito! 🚀

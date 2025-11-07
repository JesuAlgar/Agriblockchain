# Cómo usar Trust Wallet con tu aplicación AR Blockchain

## ⚠️ IMPORTANTE: Solución al error "window.WalletConnectProvider: false"

El error que viste indica que la librería WalletConnect no se cargó desde internet. Esto pasa cuando:
- No hay conexión a internet estable
- El CDN está bloqueado
- Estás usando HTTP en vez de HTTPS

**SOLUCIÓN RECOMENDADA**: Usa Trust Wallet en modo DApp Browser (Opción 1) - esto NO requiere WalletConnect porque Trust Wallet inyecta directamente `window.ethereum`.

---

## Opción 1: Abrir directamente desde Trust Wallet (RECOMENDADO - NO REQUIERE WALLETCONNECT) 📱

1. **Abre Trust Wallet** en tu móvil
2. Ve a la pestaña **"Browser"** o **"DApps"** (icono de navegador en la parte inferior)
3. Escribe o pega la **URL completa** de tu aplicación
   - Ejemplo: `https://tu-dominio.com/ar/index.html`
   - O la URL de Netlify: `https://startling-bublanina-651809.netlify.app/ar/index.html`
4. La aplicación detectará automáticamente Trust Wallet con `window.ethereum`
5. Cuando presiones el botón **"BC"** (Blockchain), Trust Wallet te pedirá:
   - **Cambiar a red Sepolia** (si no la tienes configurada)
   - **Conectar tu cuenta**
6. Acepta ambos permisos
7. **¡Listo!** Ya puedes guardar datos en blockchain

## Opción 2: Usar WalletConnect QR (Escritorio + Móvil) 💻📱

### En Escritorio:
1. Abre la aplicación en tu navegador web (Chrome, Firefox, etc.)
2. Presiona el botón **"BC"** (Blockchain)
3. Aparecerá un **código QR de WalletConnect**

### En Trust Wallet:
1. Abre Trust Wallet en tu móvil
2. Toca el icono de **escanear** (arriba a la derecha)
3. **Escanea el código QR** que aparece en tu pantalla de escritorio
4. Trust Wallet te pedirá **aprobar la conexión**
5. Acepta y ya estarás conectado

## Verificar que está funcionando ✅

Después de conectar, verás:
- En la consola del navegador: `[Blockchain] ✓ Conectado con wallet`
- El modal se cerrará automáticamente
- Tus datos se guardarán en la red Sepolia

## Problemas comunes 🔧

### "No se detectó wallet"
- **Solución**: Abre la página directamente desde el navegador DApp de Trust Wallet

### "WalletConnect no disponible"
- **Solución**: Asegúrate de tener la última versión de Trust Wallet
- Verifica que tienes internet estable

### La transacción falla
- **Solución**: Asegúrate de tener ETH de Sepolia en tu wallet
- Puedes conseguir ETH de prueba en: https://sepoliafaucet.com/

## Red de prueba: Sepolia

Tu aplicación está configurada para usar la red de prueba **Sepolia**:
- **Chain ID**: 11155111
- **Contrato**: 0x2299b2eEc07A9c406C2688EeB6c7c74f92e3dA42
- **No necesitas ETH real** - usa ETH de prueba de un faucet

## Obtener ETH de prueba (gratis) 🪙

1. Ve a: https://sepoliafaucet.com/
2. Conecta tu wallet o pega tu dirección
3. Solicita ETH de prueba (0.5 ETH)
4. Espera 1-2 minutos
5. ¡Ya puedes hacer transacciones!

## Cambios realizados en el código 🔧

Se actualizó `dataManager.js` para:
1. Detectar correctamente WalletConnect v2 (compatible con Trust Wallet)
2. Mejorar los mensajes de error
3. Agregar logs de debugging para ver qué está pasando

Se actualizó la versión de WalletConnect en `index.html` a la 2.16.1 (más estable).

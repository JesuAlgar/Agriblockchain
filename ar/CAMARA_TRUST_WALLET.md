# 📷 Solución: Cámara no funciona en Trust Wallet

## El problema

Cuando abres la aplicación desde el navegador DApp de Trust Wallet, la cámara no se activa o ves el error:
- "Permisos de cámara denegados"
- "NotAllowedError"
- Pantalla negra sin video

## ¿Por qué pasa esto?

El navegador DApp de Trust Wallet necesita permisos específicos del sistema operativo para acceder a la cámara. Por defecto, estos permisos pueden estar desactivados.

---

## ✅ SOLUCIÓN: Habilitar permisos de cámara

### En Android 📱

1. **Sal de Trust Wallet** (ciérrala completamente)

2. **Abre Configuración** (Settings) de tu teléfono Android

3. **Ve a Apps** o **Aplicaciones**

4. **Busca y selecciona "Trust Wallet"**

5. **Toca en "Permisos"** o **"App permissions"**

6. **Busca "Cámara"** o **"Camera"**

7. **Activa el permiso de cámara**:
   - Cambia de "Denegado" → "Permitir"
   - O de "Denied" → "Allow"

8. **Opcional - Ubicación**: Si quieres que detecte tu ubicación para datos geo-referenciados, también activa el permiso de "Ubicación"

9. **Vuelve a abrir Trust Wallet**

10. **Navega nuevamente a tu aplicación** en el navegador DApp

11. **La cámara ahora debería funcionar** ✅

### En iOS (iPhone/iPad) 🍎

1. **Sal de Trust Wallet** (desliza hacia arriba para cerrar)

2. **Abre Configuración** (Settings) del iPhone

3. **Desplázate hacia abajo** hasta encontrar **"Trust Wallet"**

4. **Toca en Trust Wallet**

5. **Busca la sección "Permitir a Trust Wallet acceder"**

6. **Activa "Cámara"** (el switch debe estar en verde)

7. **Opcional - Ubicación**: También puedes activar "Ubicación" si quieres

8. **Vuelve a abrir Trust Wallet**

9. **Navega a tu aplicación** en el navegador DApp

10. **Recarga la página** (pull down para refrescar)

11. **La cámara ahora debería funcionar** ✅

---

## 🔍 Verificar que funciona

Después de habilitar los permisos:

1. Abre la aplicación desde Trust Wallet DApp Browser
2. Deberías ver un popup de "¿Permitir acceso a la cámara?"
3. Presiona **"Permitir"** o **"Allow"**
4. La cámara se activará y verás el video en tiempo real
5. La IA comenzará a detectar plantas automáticamente

En la consola deberías ver:
```
[Camera] Solicitando permisos con constraints: {...}
[Camera] ✓ Stream obtenido, asignando a video element...
[Camera] Started: 1280x720
[Camera] Zoom NOT supported on this device (normal en móviles)
```

---

## ⚠️ Alternativas si no funciona

### Opción 1: Usar otro navegador DApp

Si Trust Wallet sigue sin funcionar, prueba con:

**MetaMask Mobile** (recomendado):
1. Descarga MetaMask Mobile desde Play Store/App Store
2. Abre el navegador DApp dentro de MetaMask (icono de navegador)
3. Navega a: `https://startling-bublanina-651809.netlify.app/ar/index.html`
4. MetaMask generalmente maneja mejor los permisos de cámara

**Coinbase Wallet**:
1. Similar a MetaMask, tiene navegador DApp integrado
2. Buenos permisos de cámara

### Opción 2: Usar escritorio con MetaMask Extension

Si tienes una PC/Mac con webcam:

1. Instala MetaMask extension en Chrome/Firefox
2. Abre la aplicación en el navegador
3. Conecta MetaMask cuando presiones "BC"
4. La cámara funciona mucho mejor en escritorio
5. Útil para desarrollo y pruebas

### Opción 3: Navegador Chrome normal + WalletConnect

1. Abre Chrome/Firefox normal en tu móvil
2. Ve a: `https://startling-bublanina-651809.netlify.app/ar/index.html`
3. Permite el acceso a la cámara (Chrome lo pide automáticamente)
4. Para guardar en blockchain, presiona "BC"
5. Escanea el QR con Trust Wallet
6. Problema: Requiere que WalletConnect se cargue correctamente (CDN)

---

## 🐛 Errores comunes y soluciones

### "Camera permission denied" después de habilitar permisos

**Solución**: Reinicia completamente Trust Wallet y tu teléfono
1. Cierra Trust Wallet (fuerza el cierre)
2. Reinicia tu teléfono
3. Abre Trust Wallet y prueba de nuevo

### "Camera is being used by another app"

**Solución**: Cierra todas las apps que puedan usar la cámara
- Cierra otras apps de fotos/video
- Cierra llamadas de video (Zoom, Meet, WhatsApp)
- Reinicia el teléfono si persiste

### "This page must be served over HTTPS"

**Solución**: Asegúrate de usar HTTPS
- ✅ Correcto: `https://startling-bublanina-651809.netlify.app/ar/index.html`
- ❌ Incorrecto: `http://...` o `file://...`

### Pantalla negra pero sin error

**Solución**: Problema de CSS o z-index
1. Verifica en la consola si hay errores
2. Presiona el botón "🔄 Reintentar" si aparece
3. Recarga la página completamente

### "getUserMedia is not supported"

**Solución**: Actualiza Trust Wallet
1. Ve a Play Store/App Store
2. Busca "Trust Wallet"
3. Presiona "Actualizar"
4. Versiones antiguas pueden no soportar getUserMedia

---

## 📊 Resumen de compatibilidad

| Navegador/Wallet | Cámara | Blockchain | Recomendación |
|------------------|--------|------------|---------------|
| Trust Wallet DApp (permisos OK) | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| MetaMask Mobile DApp | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Chrome móvil + WalletConnect | ✅ | ⚠️ | ⭐⭐⭐ |
| MetaMask Extension (PC) | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Safari iOS | ✅ | ⚠️ | ⭐⭐⭐ |

**Mejor opción**: Trust Wallet o MetaMask Mobile con permisos habilitados

---

## 🆘 Si nada funciona

Si después de todo esto la cámara sigue sin funcionar:

1. **Verifica la versión de Android/iOS**:
   - Android: Requiere Android 7.0+
   - iOS: Requiere iOS 12.0+

2. **Prueba con otro dispositivo** para descartar hardware

3. **Contacta al soporte** con esta información:
   - Modelo de teléfono
   - Versión de Android/iOS
   - Versión de Trust Wallet
   - Mensaje de error exacto de la consola

4. **Usa la alternativa de escritorio** mientras tanto (MetaMask Extension)

---

## 💡 Tip: Debugging

Para ver el error exacto de la cámara:

1. Abre la aplicación desde Trust Wallet DApp
2. Si tienes Android, conecta el teléfono a PC y usa Chrome Remote Debugging
3. O revisa logs en la aplicación (aparecen en pantalla)

El error te dirá exactamente qué falta:
- `NotAllowedError` → Faltan permisos
- `NotFoundError` → No hay cámara física
- `NotReadableError` → Cámara en uso por otra app
- `SecurityError` → No es HTTPS

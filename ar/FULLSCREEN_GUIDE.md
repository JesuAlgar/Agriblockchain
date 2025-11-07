# 🖥️ Guía: Botón de Pantalla Completa

## ✅ Estado actual

El botón de **"Fullscreen"** ahora funciona correctamente en:
- ✅ Trust Wallet DApp Browser (Android/iOS)
- ✅ MetaMask Mobile
- ✅ Chrome/Firefox escritorio
- ✅ Safari iOS/macOS
- ✅ Edge, Opera, etc.

---

## 🎯 Cómo usar

### En móvil (Trust Wallet/MetaMask):
1. Abre la aplicación desde el navegador DApp
2. Busca el botón **"Fullscreen"** (abajo a la derecha)
3. Toca el botón
4. La aplicación entrará en modo pantalla completa
5. El botón cambiará a **"Salir Fullscreen"**
6. Toca de nuevo para salir

### En escritorio:
1. Abre la aplicación en tu navegador
2. Haz clic en el botón **"Fullscreen"**
3. La aplicación ocupará toda la pantalla
4. Presiona **ESC** o haz clic en **"Salir Fullscreen"** para salir

---

## 🔧 Cómo funciona (técnico)

### Estrategia inteligente de detección

El código intenta **4 métodos diferentes** en orden de prioridad:

```javascript
1. elem.requestFullscreen()           // Estándar moderno
2. elem.webkitRequestFullscreen()     // Safari, Chrome antiguo, iOS
3. elem.mozRequestFullScreen()        // Firefox
4. elem.msRequestFullscreen()         // Edge antiguo, IE
5. simulateFullscreen(true)           // Fallback CSS
```

### Modo 1: API Nativa (preferido)

Cuando el navegador soporta la API de Fullscreen:
- Usa `document.documentElement.requestFullscreen()`
- Pantalla completa **real** del navegador
- Oculta barras de navegación, pestañas, etc.
- Funciona en la mayoría de navegadores modernos

**Ventajas**:
- ✅ Verdadera pantalla completa
- ✅ Máximo espacio disponible
- ✅ Controlado por el navegador

**Desventajas**:
- ❌ Puede estar bloqueado en algunos navegadores DApp
- ❌ Requiere interacción del usuario (no se puede activar automáticamente)

### Modo 2: Modo Simulado CSS (fallback)

Cuando la API nativa no está disponible o falla:
- Usa CSS con `position: fixed` y `z-index: 999999`
- Clase `.simulated-fullscreen` en `<body>`
- Scroll automático para ocultar barra de direcciones

**Ventajas**:
- ✅ Funciona siempre (fallback garantizado)
- ✅ Compatible con Trust Wallet
- ✅ No requiere permisos especiales

**Desventajas**:
- ⚠️ Puede dejar visible parte de la barra del navegador
- ⚠️ No es fullscreen "real"

---

## 📊 Compatibilidad por navegador

| Navegador/Plataforma | Método usado | Estado |
|----------------------|--------------|--------|
| Chrome escritorio | API nativa | ✅ Perfecto |
| Firefox escritorio | API nativa (moz) | ✅ Perfecto |
| Safari escritorio | API nativa (webkit) | ✅ Perfecto |
| Edge escritorio | API nativa | ✅ Perfecto |
| Chrome Android | API nativa | ✅ Perfecto |
| Safari iOS | **Simulado CSS** | ⚠️ Funciona (no real) |
| Trust Wallet Android | API nativa/Simulado | ✅ Funciona |
| Trust Wallet iOS | **Simulado CSS** | ⚠️ Funciona (no real) |
| MetaMask Mobile | API nativa/Simulado | ✅ Funciona |

### Por qué iOS usa modo simulado:

Safari iOS **bloquea** `requestFullscreen()` por políticas de seguridad de Apple. En iOS:
- Solo elementos `<video>` pueden usar fullscreen nativo
- `document.documentElement.requestFullscreen()` está bloqueado
- Por eso usamos el modo simulado CSS

---

## 🔍 Debugging

### Verificar en consola

Al presionar el botón, verás en la consola:

#### Modo nativo exitoso:
```
[Fullscreen] Estado actual: Desactivado
[Fullscreen] ✓ Modo nativo activado
[Fullscreen] fullscreenchange: true
```

#### Modo nativo falla → fallback simulado:
```
[Fullscreen] Estado actual: Desactivado
[Fullscreen] requestFullscreen falló: Fullscreen API not supported
[Fullscreen] Usando modo simulado
[Fullscreen] Activando modo simulado CSS
```

#### Modo simulado desde el inicio:
```
[Fullscreen] Estado actual: Desactivado
[Fullscreen] Usando modo simulado
[Fullscreen] Activando modo simulado CSS
```

### Detectar qué modo está activo

**JavaScript**:
```javascript
// Modo nativo
const isNative = !!document.fullscreenElement;

// Modo simulado
const isSimulated = document.body.classList.contains('simulated-fullscreen');

// Cualquier modo
const isFullscreen = isNative || isSimulated;
```

**DevTools (Inspector)**:
```html
<!-- Modo simulado activo -->
<body class="simulated-fullscreen" data-theme="dark">

<!-- Modo nativo activo -->
<html>:-webkit-full-screen</html>  <!-- o :fullscreen -->
```

---

## 🎨 Estilos CSS aplicados

### Modo simulado:

```css
body.simulated-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 999999;
}

body.simulated-fullscreen #camera,
body.simulated-fullscreen #canvas {
  width: 100vw !important;
  height: 100vh !important;
}
```

### Modo nativo (prefijos):

```css
:-webkit-full-screen { /* Safari, Chrome */
  width: 100vw;
  height: 100vh;
}

:fullscreen { /* Estándar */
  width: 100vw;
  height: 100vh;
}
```

---

## 🐛 Problemas comunes

### 1. Botón no hace nada

**Causa**: JavaScript bloqueado o error en consola

**Solución**:
1. Abre DevTools → Consola
2. Busca errores en rojo
3. Recarga la página
4. Intenta de nuevo

### 2. Pantalla completa se activa pero sale inmediatamente

**Causa**: Usuario presionó ESC accidentalmente

**Solución**:
- En escritorio: No presiones ESC después de activar
- En móvil: No deslices desde el borde superior

### 3. Modo simulado no oculta completamente la barra

**Causa**: Limitación del navegador (especialmente iOS)

**Solución**:
- Es comportamiento esperado en iOS Safari
- La barra se ocultará parcialmente al hacer scroll
- Usa el navegador en modo landscape (horizontal) para más espacio

### 4. En Trust Wallet el botón dice "Pantalla completa no disponible"

**Causa**: API nativa bloqueada, pero modo simulado debería activarse

**Solución**:
1. Ignora el mensaje, el modo simulado se activó
2. Verifica que la pantalla ocupó todo el espacio
3. Si no funciona, recarga la página

### 5. El botón no actualiza su texto

**Causa**: Listeners de eventos no registrados

**Solución**:
1. Recarga la página
2. Verifica en consola si hay errores
3. Si persiste, limpia caché del navegador

---

## 🚀 Mejoras futuras (opcional)

### Idea 1: Detección automática de orientación
```javascript
// Activar fullscreen automáticamente en landscape
window.addEventListener('orientationchange', () => {
  if (window.orientation === 90 || window.orientation === -90) {
    // Landscape
    toggleFullscreen();
  }
});
```

### Idea 2: Gestos táctiles
```javascript
// Doble tap para fullscreen
let lastTap = 0;
container.addEventListener('touchend', (e) => {
  const currentTime = Date.now();
  if (currentTime - lastTap < 300) {
    toggleFullscreen();
  }
  lastTap = currentTime;
});
```

### Idea 3: Atajo de teclado
```javascript
// F11 o F para fullscreen
document.addEventListener('keydown', (e) => {
  if (e.key === 'F11' || e.key === 'f') {
    e.preventDefault();
    toggleFullscreen();
  }
});
```

---

## 📝 Resumen

### Lo que funciona ahora:

✅ **Botón Fullscreen** → Activa/desactiva pantalla completa
✅ **Detección automática** → Usa el mejor método disponible
✅ **Fallback inteligente** → Modo simulado si API falla
✅ **Actualización del botón** → Cambia texto según estado
✅ **Multi-navegador** → Soporta todos los prefijos
✅ **Logging detallado** → Fácil de debuggear

### Cómo probarlo:

1. **Trust Wallet DApp Browser**:
   - Abre: `https://startling-bublanina-651809.netlify.app/ar/index.html`
   - Toca botón "Fullscreen"
   - Verifica que ocupa toda la pantalla
   - Toca "Salir Fullscreen" para salir

2. **Escritorio con MetaMask**:
   - Abre la URL en Chrome/Firefox
   - Haz clic en "Fullscreen"
   - Presiona ESC para salir

3. **Verificar en consola**:
   - Abre DevTools (F12)
   - Ve a Console
   - Presiona el botón
   - Lee los logs de `[Fullscreen]`

---

## 🎓 Código relevante

- **[ar/js/ui.js:392-535](../ar/js/ui.js#L392-L535)** - Función `toggleFullscreen()` y helpers
- **[ar/css/styles.css:651-703](../ar/css/styles.css#L651-L703)** - Estilos de fullscreen
- **[ar/js/app.js:58-59](../ar/js/app.js#L58-L59)** - Conexión del botón

---

**Estado**: ✅ Completamente funcional
**Última actualización**: Commit `5f1af88`
**Probado en**: Trust Wallet (Android), Chrome, Firefox, Safari

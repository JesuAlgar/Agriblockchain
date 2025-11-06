# AR Plant - AgriBlockchain

Aplicación web AR con cámara, detección de objetos mediante IA (TensorFlow.js COCO-SSD) y guardado de datos en blockchain (Sepolia).

## 🚀 Inicio Rápido

### 1. Descargar MetaMask SDK (Requerido)

El SDK de MetaMask **NO** está incluido en el repositorio. Debes descargarlo antes de ejecutar la aplicación.

#### En Linux/Mac:
```bash
cd ar
./download-sdk.sh
```

#### En Windows (PowerShell):
```powershell
cd ar
.\download-sdk.ps1
```

#### Manualmente:
Si los scripts no funcionan, sigue las instrucciones en [ar/assets/README_METAMASK_SDK.md](./assets/README_METAMASK_SDK.md)

### 2. Servir la Aplicación

La app requiere HTTPS para getUserMedia (cámara) y MetaMask. Opciones:

#### Netlify (Recomendado para producción):
1. Sube la carpeta `ar/` a Netlify
2. La app estará disponible en `https://tu-sitio.netlify.app/`

#### Servidor local con HTTPS:
```bash
# Con Python (requiere certificado SSL)
cd ar
python -m http.server 8000

# Con Node.js (http-server con SSL)
npx http-server ar -p 8000 --ssl
```

### 3. Uso

1. Abre la app en **Chrome móvil** (no en el navegador de MetaMask)
2. Permite el acceso a la cámara
3. Apunta la cámara a objetos para detectarlos
4. Para guardar en blockchain:
   - Pulsa el botón "BC" (Blockchain)
   - Completa el formulario
   - Pulsa "Guardar en Blockchain"
   - Se abrirá MetaMask app para firmar
   - Vuelve a Chrome después de firmar

## 📁 Estructura del Proyecto

```
ar/
├── assets/              # Recursos estáticos
│   ├── metamask-sdk.min.js  # SDK vendorizado (debes descargarlo)
│   ├── plant.png
│   └── plant.glb
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # Aplicación principal
│   ├── camera.js       # Control de cámara
│   ├── config.js       # Configuración
│   ├── dataManager.js  # Gestión de datos y blockchain
│   ├── detector.js     # Detección con TensorFlow.js
│   ├── ui.js           # Interfaz de usuario
│   └── utils.js        # Utilidades
├── data/
│   └── planta01.json   # Datos de ejemplo
├── index.html          # Página principal
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── download-sdk.sh     # Script de descarga (Linux/Mac)
├── download-sdk.ps1    # Script de descarga (Windows)
└── README.md           # Este archivo
```

## 🔧 Configuración

### Modo de Datos

En [ar/js/config.js](./js/config.js#L46):

```javascript
blockchain: {
  mode: 'LOCAL_JSON',  // 'LOCAL_JSON' o 'BLOCKCHAIN'
  // ...
}
```

- `LOCAL_JSON`: Lee datos desde `ar/data/planta01.json`
- `BLOCKCHAIN`: Lee/escribe datos en Sepolia testnet

### Contrato Inteligente

El contrato está desplegado en Sepolia:
- Address: `0x5e76b9...` (ver config.js)
- Red: Sepolia Testnet (ChainID: 11155111)

## 🛠️ Desarrollo

### Requisitos

- Node.js (opcional, solo para scripts de descarga con npm)
- MetaMask app o extensión
- Sepolia testnet ETH (para transacciones)

### Scripts Útiles

- `download-sdk.sh` / `download-sdk.ps1`: Descarga el SDK de MetaMask
- Ver [package.json](../package.json) para más scripts (si existe)

### Service Worker

El Service Worker está configurado para:
- ✅ Cachear archivos locales (offline-first)
- ❌ NO cachear MetaMask SDK (evitar versiones obsoletas)
- ❌ NO interceptar cross-origin (CDNs, APIs)

Cache bump: `ar-planta-v4` (actualizar en [sw.js](./sw.js#L1) cuando cambien archivos)

## 🔍 Debugging

### Logs

La app usa logs con prefijos para facilitar debugging:

- `[MetaMask SDK]`: Carga y inicialización del SDK
- `[MetaMask]`: Provider y conexión
- `[Blockchain]`: Transacciones y guardado
- `[SaveModal]`: Modal de guardado

### Errores Comunes

#### "No se encontró ./assets/metamask-sdk.min.js"
**Solución**: Ejecuta `./download-sdk.sh` o `.\download-sdk.ps1`

#### "getUserMedia no funciona"
**Solución**: Usa HTTPS y Chrome móvil (no el navegador interno de MetaMask)

#### "MetaMask no está disponible"
**Solución**:
- En móvil: Instala la app de MetaMask
- En escritorio: Instala la extensión de MetaMask

#### "FetchEvent resulted in a network error"
**Solución**: El Service Worker ya está parchado para no interceptar cross-origin. Limpia cache en DevTools > Application > Storage > Clear site data.

## 🧪 Testing

### Flujo de Guardado

1. Pulsa "BC" → Modal se abre
2. Completa formulario → Pulsa "Guardar"
3. Botón se deshabilita ("Enviando...")
4. MetaMask se abre para firmar
5. Usuario firma en MetaMask
6. Vuelve a la app automáticamente
7. Confirmación de tx en consola
8. Botón se rehabilita

### Verificar en Blockchain

Después de guardar:
1. Copia el hash de la tx desde la consola
2. Visita: `https://sepolia.etherscan.io/tx/[HASH]`
3. Verifica que la tx fue confirmada

## 📝 Notas

- **PWA**: La app es una Progressive Web App (puede instalarse en móvil)
- **Offline**: Funciona offline para lecturas (si ya cacheó datos)
- **TensorFlow.js**: Usa COCO-SSD para detección de objetos (80 clases)
- **Zoom**: Controles de zoom disponibles (requiere API de zoom en móvil)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Añade nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📄 Licencia

Ver el archivo [LICENSE](../LICENSE) en la raíz del proyecto.

## 🆘 Soporte

Para problemas o preguntas:
- Revisa la [documentación de MetaMask SDK](https://docs.metamask.io/wallet/how-to/use-sdk/)
- Revisa los logs en DevTools Console
- Crea un issue en GitHub

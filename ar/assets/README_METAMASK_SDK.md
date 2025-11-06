# MetaMask SDK - Instalación Local

## ¿Por qué vendorizar el SDK?

El SDK de MetaMask se carga localmente para evitar:
- Errores CORS al cargar desde CDNs externos
- Problemas con el Service Worker interceptando peticiones cross-origin
- Fallos de red que impidan cargar el SDK
- Garantizar una versión específica y estable

## Cómo obtener el SDK

### Opción 1: Descargar desde NPM (Recomendado)

1. Instala el paquete temporalmente:
```bash
npm install @metamask/sdk
```

2. Copia el bundle UMD a tu proyecto:
```bash
# Desde la raíz del proyecto
cp node_modules/@metamask/sdk/dist/browser/umd/metamask-sdk.min.js ar/assets/
```

3. (Opcional) Desinstala el paquete si no lo necesitas en package.json:
```bash
npm uninstall @metamask/sdk
```

### Opción 2: Descargar Manualmente desde CDN Oficial

1. Descarga directamente desde el CDN oficial de MetaMask:
   ```
   https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js
   ```
2. Guarda el archivo como `ar/assets/metamask-sdk.min.js`

Alternativa con curl:
```bash
curl -L "https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js" -o ar/assets/metamask-sdk.min.js
```

### Opción 3: Build Script Automatizado

Puedes agregar un script en `package.json` para automatizar la copia:

```json
{
  "scripts": {
    "prepare-sdk": "mkdir -p ar/assets && cp node_modules/@metamask/sdk/dist/browser/umd/metamask-sdk.min.js ar/assets/"
  },
  "devDependencies": {
    "@metamask/sdk": "^0.28.0"
  }
}
```

Luego ejecuta:
```bash
npm run prepare-sdk
```

## Verificación

Después de copiar el archivo, verifica que existe:
```bash
ls -lh ar/assets/metamask-sdk.min.js
```

Deberías ver un archivo de aproximadamente 1-3 MB.

## Actualización del SDK

Para actualizar a una nueva versión:

1. Elimina el archivo antiguo
2. Sigue los pasos de "Opción 1" con la versión deseada
3. Prueba la app para asegurar compatibilidad

## Notas Importantes

- El SDK **NO** está incluido en el control de versiones (Git) para reducir el tamaño del repo
- Debes descargarlo manualmente después de clonar el proyecto
- El Service Worker está configurado para NO cachear el SDK
- Si el SDK no se encuentra, verás un error claro en consola con instrucciones

## Versión Actual

- **Fuente**: CDN oficial de MetaMask
- **Tamaño**: ~1.6 MB
- **Formato**: UMD (Universal Module Definition) para compatibilidad con navegadores
- **URL**: https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js

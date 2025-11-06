#!/bin/bash
# Script para descargar MetaMask SDK localmente

set -e

SDK_VERSION="latest"
SDK_DIR="./assets"
SDK_FILE="metamask-sdk.min.js"
TEMP_DIR="/tmp/metamask-sdk-download"

echo "================================================"
echo "MetaMask SDK Downloader"
echo "================================================"
echo ""

# Verificar si ya existe
if [ -f "$SDK_DIR/$SDK_FILE" ]; then
    echo "⚠️  El SDK ya existe en $SDK_DIR/$SDK_FILE"
    read -p "¿Deseas reemplazarlo? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operación cancelada"
        exit 0
    fi
fi

# Crear directorio de assets si no existe
mkdir -p "$SDK_DIR"

echo "📦 Descargando MetaMask SDK v$SDK_VERSION..."

# Opción 1: Intentar con npm (más confiable)
if command -v npm &> /dev/null; then
    echo "📥 Usando npm para descargar..."

    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"

    npm init -y > /dev/null 2>&1
    npm install @metamask/sdk@$SDK_VERSION > /dev/null 2>&1

    if [ -f "node_modules/@metamask/sdk/dist/browser/umd/metamask-sdk.min.js" ]; then
        cp "node_modules/@metamask/sdk/dist/browser/umd/metamask-sdk.min.js" "../$SDK_DIR/$SDK_FILE"
        cd - > /dev/null
        rm -rf "$TEMP_DIR"
        echo "✅ SDK descargado exitosamente vía npm"
    else
        cd - > /dev/null
        rm -rf "$TEMP_DIR"
        echo "❌ No se encontró el archivo UMD en el paquete npm"
        exit 1
    fi
else
    # Opción 2: Descargar desde CDN oficial de MetaMask (fallback)
    echo "⚠️  npm no disponible, intentando descarga directa desde CDN oficial..."

    SDK_CDN_URL="https://c0f4f41c-2f55-4863-921b-sdk-docs.github.io/cdn/metamask-sdk.js"

    if command -v curl &> /dev/null; then
        curl -L "$SDK_CDN_URL" -o "$SDK_DIR/$SDK_FILE"
        echo "✅ SDK descargado exitosamente vía curl"
    elif command -v wget &> /dev/null; then
        wget "$SDK_CDN_URL" -O "$SDK_DIR/$SDK_FILE"
        echo "✅ SDK descargado exitosamente vía wget"
    else
        echo "❌ No se encontró npm, curl ni wget"
        echo ""
        echo "Por favor, descarga manualmente desde:"
        echo "$SDK_CDN_URL"
        echo ""
        echo "Y coloca el archivo en: $SDK_DIR/$SDK_FILE"
        exit 1
    fi
fi

# Verificar que el archivo existe y tiene un tamaño razonable
if [ -f "$SDK_DIR/$SDK_FILE" ]; then
    SIZE=$(stat -c%s "$SDK_DIR/$SDK_FILE" 2>/dev/null || stat -f%z "$SDK_DIR/$SDK_FILE" 2>/dev/null || echo "0")
    SIZE_MB=$((SIZE / 1024 / 1024))

    if [ "$SIZE" -lt 100000 ]; then
        echo "⚠️  Advertencia: El archivo descargado es muy pequeño ($SIZE bytes)"
        echo "   Puede estar corrupto o incompleto"
        exit 1
    fi

    echo ""
    echo "================================================"
    echo "✅ Instalación completa"
    echo "================================================"
    echo "Archivo: $SDK_DIR/$SDK_FILE"
    echo "Tamaño: ${SIZE_MB} MB"
    echo ""
    echo "Ahora puedes ejecutar tu aplicación."
else
    echo "❌ Error: No se pudo descargar el SDK"
    exit 1
fi

# PowerShell Script para descargar MetaMask SDK localmente
# Uso: .\download-sdk.ps1

$ErrorActionPreference = "Stop"

$SDK_VERSION = "0.28.0"
$SDK_DIR = ".\assets"
$SDK_FILE = "metamask-sdk.min.js"
$SDK_PATH = Join-Path $SDK_DIR $SDK_FILE

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "MetaMask SDK Downloader" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya existe
if (Test-Path $SDK_PATH) {
    Write-Host "⚠️  El SDK ya existe en $SDK_PATH" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas reemplazarlo? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 0
    }
}

# Crear directorio de assets si no existe
if (-not (Test-Path $SDK_DIR)) {
    New-Item -ItemType Directory -Path $SDK_DIR -Force | Out-Null
}

Write-Host "📦 Descargando MetaMask SDK v$SDK_VERSION..." -ForegroundColor Green

# Opción 1: Intentar con npm (más confiable)
$npmPath = Get-Command npm -ErrorAction SilentlyContinue

if ($npmPath) {
    Write-Host "📥 Usando npm para descargar..." -ForegroundColor Green

    $tempDir = Join-Path $env:TEMP "metamask-sdk-download-$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    Push-Location $tempDir

    try {
        npm init -y | Out-Null
        npm install "@metamask/sdk@$SDK_VERSION" --no-save | Out-Null

        $sdkSource = "node_modules\@metamask\sdk\dist\browser\umd\metamask-sdk.min.js"
        if (Test-Path $sdkSource) {
            Copy-Item $sdkSource -Destination (Join-Path (Get-Location).Path "..\$SDK_DIR\$SDK_FILE") -Force
            Pop-Location
            Remove-Item -Path $tempDir -Recurse -Force
            Write-Host "✅ SDK descargado exitosamente vía npm" -ForegroundColor Green
        } else {
            Pop-Location
            Remove-Item -Path $tempDir -Recurse -Force
            Write-Host "❌ No se encontró el archivo UMD en el paquete npm" -ForegroundColor Red
            exit 1
        }
    } catch {
        Pop-Location
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "❌ Error al descargar con npm: $_" -ForegroundColor Red
        exit 1
    }
} else {
    # Opción 2: Descargar desde unpkg CDN (fallback)
    Write-Host "⚠️  npm no disponible, intentando descarga directa desde CDN..." -ForegroundColor Yellow

    $url = "https://unpkg.com/@metamask/sdk@$SDK_VERSION/dist/browser/umd/metamask-sdk.min.js"

    try {
        Invoke-WebRequest -Uri $url -OutFile $SDK_PATH -UseBasicParsing
        Write-Host "✅ SDK descargado exitosamente vía Web" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error al descargar desde CDN: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor, descarga manualmente desde:" -ForegroundColor Yellow
        Write-Host "https://github.com/MetaMask/metamask-sdk/releases" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Y coloca el archivo en: $SDK_PATH" -ForegroundColor Yellow
        exit 1
    }
}

# Verificar que el archivo existe y tiene un tamaño razonable
if (Test-Path $SDK_PATH) {
    $fileInfo = Get-Item $SDK_PATH
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)

    if ($fileInfo.Length -lt 100000) {
        Write-Host "⚠️  Advertencia: El archivo descargado es muy pequeño ($($fileInfo.Length) bytes)" -ForegroundColor Yellow
        Write-Host "   Puede estar corrupto o incompleto" -ForegroundColor Yellow
        exit 1
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "✅ Instalación completa" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Archivo: $SDK_PATH" -ForegroundColor White
    Write-Host "Tamaño: $sizeMB MB" -ForegroundColor White
    Write-Host ""
    Write-Host "Ahora puedes ejecutar tu aplicación." -ForegroundColor Green
} else {
    Write-Host "❌ Error: No se pudo descargar el SDK" -ForegroundColor Red
    exit 1
}

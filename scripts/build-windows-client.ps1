# Build the Windows installer (NSIS .exe) on Windows.
# From the repository root:
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-client.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root 'app')
npm ci --no-fund --no-audit
npm run dist
Write-Host "Installer: $(Resolve-Path (Join-Path (Get-Location) 'dist-pack\DeepSeek-Bot-*-win-x64.exe'))"

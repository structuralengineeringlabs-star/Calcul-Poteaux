<#
.SYNOPSIS
  Lance l'application en mode développement (rechargement automatique) et ouvre le navigateur.
  Prérequis : Node.js 18 ou plus. Arrêt : Ctrl+C.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\dev.ps1
#>
param([int]$Port = 0)

$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
if (-not $racine) { $racine = (Get-Location).Path }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js introuvable. Installez Node.js 18 ou plus : https://nodejs.org (ou utilisez apercu.ps1, sans Node.js)."
}
$version = (node -v).TrimStart('v')
if ([int]($version.Split('.')[0]) -lt 18) { throw "Node.js $version détecté : la version 18 ou plus est requise." }

Push-Location $racine
try {
  if ($Port -eq 0) {
    $paquet = Get-Content 'package.json' -Raw | ConvertFrom-Json
    if ($paquet.name -eq 'poteaux-ec2') { $Port = 3000 } else { $Port = 3001 }
  }
  if (-not (Test-Path 'node_modules')) {
    Write-Host 'Installation des dépendances (npm ci)…' -ForegroundColor Cyan
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci a échoué.' }
  }
  Write-Host "Démarrage sur http://localhost:$Port/ (Ctrl+C pour arrêter)…" -ForegroundColor Green
  npx vite --port $Port --open
} finally { Pop-Location }

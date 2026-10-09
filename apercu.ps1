<#
.SYNOPSIS
  Aperçu direct de l'application dans le navigateur, sans Node.js : petit serveur HTTP local en PowerShell.

.DESCRIPTION
  Sert le dossier « site » (application construite) sur http://localhost:<port>/ et ouvre le navigateur.
  Avec -Construire, reconstruit d'abord l'application depuis les sources (Node.js 18 ou plus requis).
  Arrêt : Ctrl+C dans cette fenêtre.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\apercu.ps1
.EXAMPLE
  .\apercu.ps1 -Port 9000
.EXAMPLE
  .\apercu.ps1 -Construire
#>
param(
  [string]$Dossier = '',
  [int]$Port = 8080,
  [switch]$Construire,
  [switch]$SansNavigateur
)

$ErrorActionPreference = 'Stop'
$racine = $PSScriptRoot
if (-not $racine) { $racine = (Get-Location).Path }

if ($Construire) {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js (npm) introuvable. Installez Node.js 18 ou plus (https://nodejs.org) ou lancez l'aperçu sans -Construire."
  }
  Push-Location $racine
  try {
    if (-not (Test-Path 'node_modules')) {
      Write-Host 'Installation des dépendances (npm ci)…' -ForegroundColor Cyan
      npm ci
      if ($LASTEXITCODE -ne 0) { throw 'npm ci a échoué.' }
    }
    Write-Host 'Construction de l''application (npm run build)…' -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'La construction a échoué.' }
  } finally { Pop-Location }
  $Dossier = Join-Path $racine 'dist'
}

if (-not $Dossier) {
  foreach ($candidat in @('site', 'dist')) {
    $c = Join-Path $racine $candidat
    if (Test-Path (Join-Path $c 'index.html')) { $Dossier = $c; break }
  }
}
if (-not $Dossier -or -not (Test-Path (Join-Path $Dossier 'index.html'))) {
  throw "Application construite introuvable (dossier « site » ou « dist »). Relancez avec -Construire."
}
$Dossier = (Resolve-Path $Dossier).Path.TrimEnd('\') + '\'

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.map' = 'application/json'
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.ico' = 'image/x-icon'
  '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.ttf' = 'font/ttf'; '.txt' = 'text/plain; charset=utf-8'
  '.webmanifest' = 'application/manifest+json'; '.pdf' = 'application/pdf'; '.wasm' = 'application/wasm'
}

# Premier port libre à partir de $Port
$ecoute = $null
for ($p = $Port; $p -lt $Port + 20; $p++) {
  $l = New-Object System.Net.HttpListener
  $l.Prefixes.Add("http://localhost:$p/")
  try { $l.Start(); $ecoute = $l; $Port = $p; break } catch { $l.Close() }
}
if (-not $ecoute) { throw "Aucun port libre entre $Port et $($Port + 19)." }

$url = "http://localhost:$Port/"
Write-Host ''
Write-Host "  Aperçu disponible : $url" -ForegroundColor Green
Write-Host "  Dossier servi     : $Dossier"
Write-Host '  Arrêt             : Ctrl+C'
Write-Host ''
if (-not $SansNavigateur) { Start-Process $url }

try {
  while ($ecoute.IsListening) {
    $tache = $ecoute.GetContextAsync()
    while (-not $tache.AsyncWaitHandle.WaitOne(200)) { }   # attente interruptible par Ctrl+C
    $ctx = $tache.GetAwaiter().GetResult()
    $rep = $ctx.Response
    try {
      $chemin = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrEmpty($chemin)) { $chemin = 'index.html' }
      $fichier = [IO.Path]::GetFullPath((Join-Path $Dossier $chemin))
      $dansDossier = $fichier.StartsWith($Dossier, [StringComparison]::OrdinalIgnoreCase)
      if (-not $dansDossier -or -not (Test-Path -LiteralPath $fichier -PathType Leaf)) {
        if ($dansDossier -and [IO.Path]::GetExtension($chemin) -eq '') { $fichier = Join-Path $Dossier 'index.html' }
        else {
          $rep.StatusCode = 404
          $rep.Close()
          Write-Host ("404 {0}" -f $ctx.Request.Url.AbsolutePath) -ForegroundColor Yellow
          continue
        }
      }
      $ext = [IO.Path]::GetExtension($fichier).ToLowerInvariant()
      $type = $types[$ext]
      if (-not $type) { $type = 'application/octet-stream' }
      $octets = [IO.File]::ReadAllBytes($fichier)
      $rep.ContentType = $type
      $rep.Headers.Add('Cache-Control', 'no-cache')
      $rep.ContentLength64 = $octets.Length
      $rep.OutputStream.Write($octets, 0, $octets.Length)
      $rep.OutputStream.Close()
      $rep.Close()
      Write-Host ("200 {0}" -f $ctx.Request.Url.AbsolutePath) -ForegroundColor DarkGray
    } catch {
      try { $rep.StatusCode = 500; $rep.Close() } catch { }
      Write-Host ("Erreur : {0}" -f $_.Exception.Message) -ForegroundColor Red
    }
  }
} finally {
  $ecoute.Stop()
  $ecoute.Close()
  Write-Host 'Serveur arrêté.'
}

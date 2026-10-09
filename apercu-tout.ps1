<#
.SYNOPSIS
  Ouvre côte à côte les aperçus des applications S.E.L. (poutres, poteaux), chacun dans sa fenêtre PowerShell.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\apercu-tout.ps1
.EXAMPLE
  .\apercu-tout.ps1 -Racine D:\SEL
#>
param([string]$Racine = 'C:\SEL')

$ErrorActionPreference = 'Stop'
$applis = @(
  @{ Nom = 'Poutres'; Dossier = Join-Path $Racine 'poutres'; Port = 8080 },
  @{ Nom = 'Poteaux'; Dossier = Join-Path $Racine 'poteaux'; Port = 8090 }
)
foreach ($a in $applis) {
  $script = Join-Path $a.Dossier 'apercu.ps1'
  if (-not (Test-Path $script)) { Write-Warning "$($a.Nom) : $script introuvable (décompresser le kit d'aperçu dans $($a.Dossier))."; continue }
  Unblock-File $script -ErrorAction SilentlyContinue
  Start-Process powershell -ArgumentList @('-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$script`"", '-Port', $a.Port)
  Write-Host "$($a.Nom) : http://localhost:$($a.Port)/" -ForegroundColor Green
}

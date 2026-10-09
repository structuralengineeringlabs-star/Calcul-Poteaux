@echo off
rem Double-cliquer pour ouvrir l'apercu de l'application (aucune installation requise).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apercu.ps1" %*
if errorlevel 1 pause

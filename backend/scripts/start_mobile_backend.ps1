$ErrorActionPreference = "Stop"

param(
    [int]$Port = 8001
)

$backendDir = Split-Path -Parent $PSScriptRoot
Set-Location $backendDir

Write-Host "Starting backend for mobile/admin integration at http://127.0.0.1:$Port/api"
Write-Host "If the port is already occupied, stop the old backend process first."

.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port $Port

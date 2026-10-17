Write-Host "Starting SecurCode..." -ForegroundColor Cyan

# Backend
Start-Process -FilePath "backend\venv\Scripts\python.exe" `
  -ArgumentList "-m", "uvicorn", "app:app", "--port", "8080", "--reload" `
  -WorkingDirectory "$PSScriptRoot\backend" `
  -WindowStyle Normal

Write-Host "Backend starting on http://localhost:8080" -ForegroundColor Green
Start-Sleep -Seconds 2

# Frontend
Start-Process -FilePath "node" `
  -ArgumentList ".\node_modules\vite\bin\vite.js", "--port", "5173" `
  -WorkingDirectory "$PSScriptRoot\frontend" `
  -WindowStyle Normal

Write-Host "Frontend starting on http://localhost:5173" -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Both servers are running in separate windows." -ForegroundColor Cyan
Write-Host "Open your browser: http://localhost:5173" -ForegroundColor Yellow
Start-Process "http://localhost:5173"

@echo off
chcp 65001 >nul
title 智慧灵山胜境 - 一键启动
echo ==========================================
echo  智慧灵山胜境 · 数字人导览系统
echo ==========================================
echo.

:: 设置路径
set BACKEND_DIR=C:\Users\11486\Desktop\ruanjianbei-main\ruanjianbei-main\backend
set FRONTEND_DIR=C:\Users\11486\Desktop\ruanjianbei-main\ruanjianbei-main\frontend
set NODE=C:\Users\11486\AppData\Local\Programs\kimi-desktop\resources\resources\runtime\node.exe

:: 先清理已有进程
echo [1/3] 清理已有进程...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

:: 启动后端
echo [2/3] 启动后端服务 (http://localhost:8000)...
start "后端服务" cmd /k "cd /d %BACKEND_DIR% && .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

:: 启动前端
echo [3/3] 启动前端页面 (http://localhost:5173)...
start "前端页面" cmd /k "cd /d %FRONTEND_DIR% && %NODE% .\node_modules\vite\bin\vite.js --host"

timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo  启动完成！
echo  后端: http://localhost:8000
echo  前端: http://localhost:5173
echo ==========================================
echo.
echo 按任意键打开浏览器...
pause >nul

start http://localhost:5173/

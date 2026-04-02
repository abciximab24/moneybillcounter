@echo off
chcp 65001 >nul
echo ========================================
echo          Git Push 快捷腳本
echo ========================================

git add .

if %errorlevel% neq 0 (
    echo [錯誤] git add 失敗
    pause
    exit /b 1
)

set /p msg=請輸入 commit message: 

if "%msg%"=="" (
    set msg=update
    echo [提示] 未輸入訊息，預設使用 "update"
)

git commit -m "%msg%"

if %errorlevel% neq 0 (
    echo [錯誤] git commit 失敗（可能沒有變更）
    pause
    exit /b 1
)

git push origin master

if %errorlevel% neq 0 (
    echo [錯誤] git push 失敗
    pause
    exit /b 1
)

echo.
echo ✅ 完成！已 push 到 origin master
echo.
pause
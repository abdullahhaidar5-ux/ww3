@echo off
rem World War 3 host tune-up. Shows what it would change, then asks before changing anything.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-WW3Host.ps1"
echo.
set /p go=Make these changes now? Windows will ask for administrator permission. Type Y and press Enter: 
if /i not "%go%"=="Y" goto end
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-WW3Host.ps1" -Apply
:end
echo.
pause

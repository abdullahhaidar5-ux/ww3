@echo off
rem World War 3 host tune-up: shows what it would change, then asks before changing anything.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-WW3Host.ps1"
echo.
set /p go=Make these changes now? Windows will ask for administrator permission. (Y/N): 
if /i not "%go%"=="Y" goto end
powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList -NoProfile -ExecutionPolicy Bypass -NoExit -File \"%~dp0Optimize-WW3Host.ps1\" -Apply"
:end

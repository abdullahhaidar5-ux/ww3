@echo off
rem Puts back the settings the World War 3 host tune-up changed.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-WW3Host.ps1" -Undo
echo.
pause

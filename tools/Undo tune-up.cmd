@echo off
rem Puts back the settings the World War 3 host tune-up changed.
powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList -NoProfile -ExecutionPolicy Bypass -NoExit -File \"%~dp0Optimize-WW3Host.ps1\" -Undo"

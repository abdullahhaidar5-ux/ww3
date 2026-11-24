@echo off
cd /d "%~dp0"
echo Launching World War 3 in Native Vulkan Forward+ ULTRA mode (SSAO + SSIL + 4-Split Shadows)...
".godot-kit\Godot_v4.4.1-stable_win64.exe" --path godot --rendering-method forward_plus --gpu-index 1 --maximized

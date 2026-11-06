@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-xampp-mysql.ps1" %*
if errorlevel 1 pause

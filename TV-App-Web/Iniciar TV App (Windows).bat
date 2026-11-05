@echo off
setlocal
cd /d "%~dp0"
title TV App

where py >nul 2>nul
if %errorlevel%==0 (
    py -3 server.py
    goto :eof
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"

@echo off
cd /d "%~dp0.."
title SDG Roma

REM 1. Inicia o Servidor de Impressao na porta 3001 minimizado
start "SDG Impressora" /min node printer-server.cjs

REM 2. Abre o Google Chrome no modo Aplicativo
set "CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_BIN%" set "CHROME_BIN=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_BIN%" set "CHROME_BIN=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_BIN%" set "CHROME_BIN=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

set "PROFILE=%LOCALAPPDATA%\SDG Roma\ChromeProfile"
set "URL=https://romacell.sdgtec.com.br"

if exist "%CHROME_BIN%" (
    start "" "%CHROME_BIN%" --app="%URL%" --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check
) else (
    start "" "%URL%"
)
exit /b 0

@echo off
title SDG Roma - Sistema PDV & Gestao
cd /d "%~dp0"
cls
echo ====================================================================
echo   SDG ROMA - INICIANDO SISTEMA WEB & SERVIDOR
echo ====================================================================

if not exist "%~dp0SDG-Roma.exe" (
    echo [SDG Roma] Compilando executavel nativo...
    set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    if not exist "%CSC%" set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
    "%CSC%" /nologo /target:winexe /optimize /platform:anycpu /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /win32icon:"%~dp0sdg_roma.ico" /out:"%~dp0SDG-Roma.exe" "%~dp0launcher\SDG-Roma.cs"
)

echo [OK] Abrindo sistema...
start "" "%~dp0SDG-Roma.exe" %*
exit /b 0

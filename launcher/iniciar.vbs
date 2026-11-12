Set WshShell = CreateObject("WScript.Shell")
strDir = "C:\Users\almei\Pictures\SDG Roma"
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd /c """ & strDir & "\launcher\iniciar.bat""", 0, False

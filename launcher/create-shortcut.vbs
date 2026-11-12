Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\SDG Roma.lnk")
oShortcut.TargetPath = "C:\Users\almei\Pictures\SDG Roma\SDG-Roma.exe"
oShortcut.WorkingDirectory = "C:\Users\almei\Pictures\SDG Roma"
oShortcut.IconLocation = "C:\Users\almei\Pictures\SDG Roma\sdg_roma.ico,0"
oShortcut.Description = "Sistema SDG Roma - PDV e Gestao"
oShortcut.Save
WScript.Echo "Atalho criado em: " & strDesktop & "\SDG Roma.lnk"

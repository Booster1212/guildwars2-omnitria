Dim shell, fso, currentDir
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = currentDir

' Launch electron.exe directly as a background process with no console window
Dim exePath, scriptPath
exePath = currentDir & "\node_modules\electron\dist\electron.exe"
scriptPath = currentDir & "\electron\main.cjs"

shell.Run """" & exePath & """ .", 0, False

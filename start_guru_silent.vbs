Set WshShell = CreateObject("WScript.Shell")
' Run the electron:dev command hidden (0)
WshShell.Run "cmd.exe /c npm run electron:dev", 0, False

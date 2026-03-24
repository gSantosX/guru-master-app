Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory & "\start.bat"
WshShell.Run "cmd.exe /c """ & strPath & """", 0, False

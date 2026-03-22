$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), "GURU MASTER.lnk")
$Shortcut = $WshShell.CreateShortcut($DesktopPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"C:\Users\ASUS\.gemini\antigravity\scratch\guru-master-app\start_hidden.vbs`""
$Shortcut.WorkingDirectory = "C:\Users\ASUS\.gemini\antigravity\scratch\guru-master-app"
$Shortcut.WindowStyle = 1
$Shortcut.Description = "GURU MASTER - AI Video Pipeline"
# Trying to find an icon, fallback to shell standard
$Shortcut.IconLocation = "shell32.dll, 25" 
$Shortcut.Save()

echo "Shortcut created on Desktop: GURU MASTER"

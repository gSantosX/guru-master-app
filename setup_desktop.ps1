$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), "GURU MASTER.lnk")
$Shortcut = $WshShell.CreateShortcut($DesktopPath)
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c `"$PSScriptRoot\start.bat`""
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.WindowStyle = 7 # Minimized to keep it clean
$Shortcut.Description = "GURU MASTER - AI Video Pipeline"
$Shortcut.IconLocation = "shell32.dll, 25" 
$Shortcut.Save()

echo "Atalho criado na Área de Trabalho: GURU MASTER"

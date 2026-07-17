Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano 2^>nul ^| findstr "":3001 LISTEN""') do taskkill /F /PID %a", 0, True
MsgBox "КарьерГид остановлен.", 64, "КарьерГид"

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Root = fso.GetParentFolderName(WScript.ScriptFullName) & "\"

' Kill old processes on port 3001
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano 2^>nul ^| findstr "":3001 LISTEN""') do taskkill /F /PID %a >nul 2^>nul", 0, True
WshShell.Run "cmd /c timeout /t 1 /nobreak >nul", 0, True

' Build frontend if dist doesn't exist
If Not fso.FolderExists(Root & "client\dist") Then
    WshShell.Run "cmd /c cd /d """ & Root & "client"" && npm run build", 1, True
End If

' Start server silently (WindowStyle=0 = hidden)
WshShell.Run "cmd /c cd /d """ & Root & "server"" && node index.js", 0, False

' Wait for server to start, then open browser
WshShell.Run "cmd /c timeout /t 3 /nobreak >nul && start http://localhost:3001", 0, False

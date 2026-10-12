@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Opening the offline file entry.
  echo To use an existing localhost save here, import its exported save file.
  pause
  start "" "%~dp0index.html"
  exit /b
)
echo Keep this window open while playing. The browser opens when the server is ready.
node server.cjs --open
pause

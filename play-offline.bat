@echo off
cd /d "%~dp0"
echo Opening Meow Courtyard without a local server.
echo This entry uses a separate save from http://localhost:5173.
echo Your existing localhost save is kept unchanged.
start "" "%~dp0index.html"

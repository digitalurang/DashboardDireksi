# Install PyInstaller and dependencies
pip install pyinstaller werkzeug flask

# Clean previous builds
if (Test-Path "build") { Remove-Item "build" -Recurse -Force }
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }

# Run PyInstaller
# --noconsole: Hides the terminal window when the app runs
# --onedir: Creates a folder (faster startup than --onefile, easier to debug)
python -m PyInstaller --noconfirm --onedir --windowed `
  --add-data "static;static/" `
  --add-data "datas;datas/" `
  --add-data "index.html;." `
  --add-data "login.html;." `
  --icon "NONE" `
  --name "DashboardDireksi" `
  app.py

Write-Host "Build complete! Check the 'dist/DashboardDireksi' folder."

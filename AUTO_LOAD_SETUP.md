# Auto-Load Feature Setup

## Overview
The auto-load feature allows you to automatically load the most recent ULTY Holdings and Market Chameleon files from your Downloads folder with a single click.

## Setup Instructions

### 1. Install Node.js (if not already installed)
- Download Node.js from https://nodejs.org/
- Install the LTS version
- Verify installation by opening Command Prompt and typing: `node --version`

### 2. Start the Server
- Double-click `start-server.bat` in this folder
- Or open Command Prompt in this folder and run: `node server.js`
- The server will start on http://localhost:8080

### 3. Use the Application
- With the server running, open http://localhost:8080 in your browser
- Or open the Index.html file directly (auto-load will still work if server is running)

## How It Works

### Auto-Load Buttons
- **Green "Auto Load Latest" button** for Holdings: Finds the newest file starting with "TidalETF_Services" in C:\Users\Chad\Downloads
- **Green "Auto Load Latest" button** for Market Data: Finds the newest file starting with "StockWatchlist_ULTY" in C:\Users\Chad\Downloads

### Manual Upload
- You can still use the "Choose File" buttons to manually select any CSV file

## File Patterns
- Holdings files: `TidalETF_Services*.csv` (e.g., TidalETF_Services.40ZZ.A4_Holdings_ULTY (12).csv)
- Market data files: `StockWatchlist_ULTY*.csv`

## Troubleshooting

### "Failed to connect to server"
- Make sure the server is running (start-server.bat)
- Check that port 8080 is not being used by another application
- Try refreshing the page

### "No files found"
- Ensure files exist in C:\Users\Chad\Downloads
- Check that file names match the expected patterns
- Files must have .csv extension

## Security Note
The server only has access to read CSV files from your Downloads folder and serve the application files. It cannot modify or delete any files.
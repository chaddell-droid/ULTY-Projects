# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ULTY NAV Nowcast Tool - A vanilla JavaScript web application for projecting ULTY ETF NAV using holdings data and market prices. The tool calculates forward NAV estimates with vega adjustments for options positions.

## Architecture

### Core Components

The application is a client-side only tool with no backend or build process. All functionality runs in the browser.

**Data Flow:**
1. User uploads CSV files via `index.html` interface
2. `file-handler.js` processes uploads and triggers data parsing
3. `data-processor.js` parses CSVs and stores in global `AppState` object
4. `calculations.js` performs NAV nowcast calculations using options pricing models
5. `visualizations.js` generates charts using Chart.js
6. `exports.js` handles CSV export functionality

### Global State Management

All application state is stored in the global `AppState` object (defined in `main.js`):
- `AppState.holdingsData` - Holdings positions from TidalETF CSV (stocks, calls, puts, cash)
- `AppState.marketData` - Market Chameleon watchlist data (prices, implied volatilities)
- `AppState.projectionChart`, `distChart`, `sensitivityChart` - Chart.js instances
- `AppState.currentNAV`, `sharesOutstanding`, `weightedMetrics` - Calculated metrics

### Key File Responsibilities

- **main.js**: Application initialization, event listeners, UI state management
- **data-processor.js**: CSV parsing, OCC option format parsing, position categorization
- **file-handler.js**: File upload handling, data validation, AppState updates
- **calculations.js**: Nowcast calculations, Black-Scholes pricing, vega adjustments
- **visualizations.js**: Chart generation for projections, distributions, sensitivity analysis
- **exports.js**: CSV export of nowcast results and position details

## Development Commands

This is a vanilla JavaScript project with no build process or package manager:

```bash
# Run locally - open index.html directly in browser or use a simple HTTP server:
python -m http.server 8000
# or
npx http-server

# No build, test, or lint commands - pure client-side JavaScript
```

## CSV Data Formats

### Holdings CSV (TidalETF)
Required columns: `StockTicker`, `SecurityName`, `CUSIP`, `Shares`, `Price`, `MarketValue`, `Weightings`

Options use OCC format in StockTicker: `AFRM 250815C00077500` (underlying, YYMMDD, C/P, strike*1000)

### Market Chameleon CSV
Required columns: `Symbol`, `Last Price`, `Chg`, `% Chg`, `IV30 Last`, `IV30 % Chg`, `Volume`

Note: Percentage changes may be in decimal format (0.01 = 1%)

## Key Functions and Locations

Critical entry points for modifications:
- `processHoldingsData()` - data-processor.js - Parses holdings CSV
- `processMarketData()` - data-processor.js - Parses market data CSV
- `calculateNowcast()` - calculations.js:8 - Main nowcast calculation
- `displayPositionDetails()` - data-processor.js:289 - Renders position tables
- `handleFileUpload()` - file-handler.js - Processes file uploads

## Options Parsing

The application handles OCC option format parsing in `data-processor.js`:
- Pattern: `^([A-Z]+)\s+(\d{6})([CP])(\d{8})$`
- Example: `AFRM 250815C00077500` = AFRM Call, Aug 15 2025, $77.50 strike
- Strike price conversion: last 8 digits / 1000

## Current Implementation Status

✅ Completed:
- File upload and CSV parsing
- Position categorization (stocks, calls, puts, cash)
- Position details display with sorting
- NAV nowcast calculations with Black-Scholes
- Vega adjustments for options positions
- Monte Carlo simulations
- Chart visualizations
- CSV export functionality

⚠️ Known Issues:
- Error handling for malformed CSV data could be improved
- No data persistence between sessions
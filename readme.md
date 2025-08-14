# ULTY NAV Nowcast Tool

## Overview
A web-based tool for projecting ULTY ETF NAV using holdings data and market prices. Calculates forward NAV estimates with vega adjustments for options positions.

## Project Structure

ULTY-Projects/
├── index.html           # Main HTML file (365 lines)
├── main.js             # UI event handlers, initialization
├── data-processor.js   # CSV parsing, position processing, displayPositionDetails()
├── file-handler.js     # File upload handling, stores data in AppState
├── calculations.js     # Nowcast calculations (TODO: implement calculateNowcast)
├── visualizations.js   # Chart generation
├── exports.js          # CSV export functionality
├── main.css            # Main styles
├── components.css      # Component-specific styles
└── visualizations.css  # Chart/visualization styles

## Key Data Flow
1. User uploads CSV files via index.html
2. file-handler.js processes uploads and calls data-processor.js
3. data-processor.js parses CSVs and stores in AppState:
   - `AppState.holdingsData` - Holdings positions (stocks, calls, puts, cash)
   - `AppState.marketData` - Market Chameleon data (prices, IVs)
4. Position details displayed via `displayPositionDetails()` in data-processor.js

## Global State
- All data stored in `AppState` object (not `window`)
- Access pattern: `AppState.holdingsData`, `AppState.marketData`

## Key Functions & Locations
- `processHoldingsData()` - data-processor.js (parses TidalETF holdings CSV)
- `processMarketData()` - data-processor.js (parses Market Chameleon CSV)
- `displayPositionDetails()` - data-processor.js:289 (shows position tables)
- `togglePositionDetails()` - main.js (show/hide position details)
- `calculateNowcast()` - calculations.js (NOT IMPLEMENTED YET)
- `handleSort()` - data-processor.js (sorts position tables)

## Current Issues/TODOs
1. ❌ calculateNowcast() function missing - main.js:117 error
2. ✅ Position details sorting implemented
3. ✅ All position types displaying (stocks, calls, puts, cash)

## CSV Format Expected
### Holdings CSV (TidalETF)
- Columns: StockTicker, SecurityName, CUSIP, Shares, Price, MarketValue, Weightings
- Options format: "AFRM 250815C00077500" (OCC format)

### Market Data CSV (Market Chameleon)
- Columns: Symbol, Last Price, Chg, % Chg, IV30 Last, IV30 % Chg, Volume
- Note: % changes sometimes in decimal format (0.01 = 1%)

## Testing
1. Load holdings CSV
2. Load Market Chameleon CSV
3. Click "Show Position Details" - should show all positions
4. Click column headers to sort
5. Calculate Nowcast button currently throws error (not implemented)


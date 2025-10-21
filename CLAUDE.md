# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ULTY NAV Nowcast Tool - A vanilla JavaScript web application for projecting ULTY ETF NAV using holdings data and market prices. The tool calculates forward NAV estimates with vega adjustments for options positions.

## Architecture

### Core Components

The application is a client-side only tool with no backend or build process. All functionality runs in the browser.

**Data Flow:**
1. User uploads CSV files OR connects to Interactive Brokers via `index.html` interface
2. `file-handler.js` processes CSV uploads OR `ib-handler.js` fetches IB account data
3. `ib-connector.js` communicates with IB Client Portal API (if using IB integration)
4. `data-processor.js` parses CSVs and stores in global `AppState` object
5. `calculations.js` performs NAV nowcast calculations using options pricing models
6. `visualizations.js` generates charts using Chart.js
7. `exports.js` handles CSV export functionality

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
- **ib-connector.js**: Interactive Brokers Client Portal API integration class
- **ib-handler.js**: IB UI integration, account connection, position fetching
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

## Data Sources

### 1. CSV File Upload (Traditional Method)

#### Holdings CSV (TidalETF)
Required columns: `StockTicker`, `SecurityName`, `CUSIP`, `Shares`, `Price`, `MarketValue`, `Weightings`

Options use OCC format in StockTicker: `AFRM 250815C00077500` (underlying, YYMMDD, C/P, strike*1000)

#### Market Chameleon CSV
Required columns: `Symbol`, `Last Price`, `Chg`, `% Chg`, `IV30 Last`, `IV30 % Chg`, `Volume`

Note: Percentage changes may be in decimal format (0.01 = 1%)

### 2. Interactive Brokers Integration (NEW)

The application now supports direct integration with Interactive Brokers accounts via the Client Portal API.

**Setup Requirements:**
- IBKR Pro account
- IB Client Portal Gateway running on https://localhost:5000
- User authenticated via gateway web interface

**Features:**
- Fetch live account positions
- Real-time portfolio data
- Automatic position categorization (stocks, calls, puts, cash)
- Integration with existing NAV nowcast calculations

**API Endpoints Used:**
- `POST /v1/api/iserver/auth/status` - Authentication check
- `GET /v1/api/portfolio/accounts` - Account list
- `GET /v1/api/portfolio/{accountId}/summary` - Account summary
- `GET /v1/api/portfolio/{accountId}/positions/0` - Position data

**Documentation:** See `IB_INTEGRATION.md` for detailed setup instructions

**Alternative:** MCP Server Integration - For advanced users, see `IB_INTEGRATION.md` for information about using the interactive-brokers-mcp server with Claude AI

## Key Functions and Locations

Critical entry points for modifications:
- `processHoldingsData()` - data-processor.js - Parses holdings CSV
- `processMarketData()` - data-processor.js - Parses market data CSV
- `calculateNowcast()` - calculations.js:8 - Main nowcast calculation
- `displayPositionDetails()` - data-processor.js:289 - Renders position tables
- `handleFileUpload()` - file-handler.js - Processes file uploads
- `connectToIB()` - ib-handler.js - Connects to IB Client Portal Gateway
- `fetchIBAccountInfo()` - ib-handler.js - Fetches IB account data
- `IBConnector.getPositions()` - ib-connector.js - API call to fetch positions
- `IBConnector.convertToHoldingsFormat()` - ib-connector.js - Converts IB data to app format

## Options Parsing

The application handles OCC option format parsing in `data-processor.js`:
- Pattern: `^([A-Z]+)\s+(\d{6})([CP])(\d{8})$`
- Example: `AFRM 250815C00077500` = AFRM Call, Aug 15 2025, $77.50 strike
- Strike price conversion: last 8 digits / 1000

## Current Implementation Status

✅ Completed:
- File upload and CSV parsing
- Interactive Brokers account integration via Client Portal API
- Position categorization (stocks, calls, puts, cash)
- Position details display with sorting
- NAV nowcast calculations with Black-Scholes
- Vega adjustments for options positions
- Monte Carlo simulations
- Chart visualizations
- CSV export functionality
- Real-time account data fetching from IB
- Automatic IB position mapping to holdings format

⚠️ Known Issues:
- Error handling for malformed CSV data could be improved
- No data persistence between sessions
- IB integration requires manual Client Portal Gateway setup
- Self-signed SSL certificates may cause browser warnings

## Interactive Brokers Integration

### How It Works

1. **Client Portal Gateway**: Users must run IB's Client Portal Gateway locally (https://localhost:5000)
2. **Authentication**: Users authenticate via the gateway's web interface
3. **Connection**: The app connects via `IBConnector` class to check auth status
4. **Account Selection**: Users select which IB account to use
5. **Data Fetching**: Positions and summary data are fetched via REST API
6. **Data Mapping**: IB position format is converted to match CSV holdings format
7. **Integration**: Data flows into existing `AppState.holdingsData` structure
8. **Calculations**: All existing NAV nowcast features work with IB data

### Class Structure

**IBConnector** (ib-connector.js):
- `checkConnection()` - Verify gateway is running and authenticated
- `getAccounts()` - Fetch list of available accounts
- `getAccountSummary(accountId)` - Get account metrics (NAV, cash, etc.)
- `getPositions(accountId)` - Get all positions for account
- `getAccountInfo(accountId)` - Combined summary + positions
- `convertToHoldingsFormat(positions)` - Map IB format to app format
- `parseSummary(summaryData)` - Extract key metrics from summary

**UI Handlers** (ib-handler.js):
- `connectToIB()` - UI handler for connection button
- `fetchIBAccountInfo()` - UI handler for fetch button
- `populateAccountSelector()` - Fill dropdown with accounts
- `categorizeIBPositions()` - Sort positions into stocks/calls/puts/cash

### MCP Server Alternative

For users who want deeper AI integration, the application documentation includes information about using the `interactive-brokers-mcp` server. This provides:
- Full IB API access through Model Context Protocol
- AI-native integration with Claude
- Advanced trading capabilities
- Automated workflows

See `IB_INTEGRATION.md` for complete setup instructions for both methods.
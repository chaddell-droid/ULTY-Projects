# Interactive Brokers Integration Setup

This document explains how to set up and use the Interactive Brokers account information feature in the ULTY NAV Nowcast Tool.

## Prerequisites

1. **Interactive Brokers Account** - You need an active IB account
2. **IB Gateway or TWS (Trader Workstation)** - Download from Interactive Brokers
3. **Node.js** - Required to run the server (already installed if you're using the auto-load feature)

## Installation

The IB integration uses the `@stoqey/ib` Node.js library, which has already been added to the project dependencies.

If you need to reinstall dependencies:
```bash
npm install
```

## IB Gateway / TWS Setup

### Step 1: Download and Install

Download IB Gateway or TWS from:
- **IB Gateway**: https://www.interactivebrokers.com/en/trading/ibgateway-stable.php
- **TWS**: https://www.interactivebrokers.com/en/trading/tws.php

**Recommendation**: Use IB Gateway (lighter weight) unless you need the full TWS features.

### Step 2: Configure API Settings

1. **Launch IB Gateway or TWS** and log in with your credentials
2. **Enable API Access**:
   - In TWS: Go to **File → Global Configuration → API → Settings**
   - In IB Gateway: Go to **Configure → Settings → API → Settings**

3. **Configure the following settings**:
   - ✅ **Enable ActiveX and Socket Clients** - CHECK THIS
   - ✅ **Allow connections from localhost only** - RECOMMENDED for security
   - **Socket port**:
     - `4001` for live trading (IB Gateway)
     - `4002` for paper trading (IB Gateway) - **DEFAULT IN CODE**
     - `7496` for live trading (TWS)
     - `7497` for paper trading (TWS)
   - ✅ **Read-Only API** - RECOMMENDED if you only want to view data (no trading)
   - **Trusted IP addresses**: Add `127.0.0.1` if prompted

4. **Click OK** and restart IB Gateway/TWS if needed

### Step 3: Keep IB Gateway/TWS Running

**IMPORTANT**: IB Gateway or TWS must be running and logged in for the integration to work.

## Server Configuration

The server is pre-configured to connect to IB Gateway on paper trading port. If you need to change settings, edit `server.js`:

```javascript
// Interactive Brokers configuration
const IB_CONFIG = {
    host: '127.0.0.1',
    port: 4002,  // Change this based on your setup:
                 // 4001 = IB Gateway Live
                 // 4002 = IB Gateway Paper (default)
                 // 7496 = TWS Live
                 // 7497 = TWS Paper
    clientId: 1  // Change if you have multiple API connections
};
```

## Usage

### 1. Start the Server

```bash
node server.js
```

The server will start on `http://localhost:8080`

You should see:
```
Server running at http://localhost:8080/
API Endpoints:
  ...
  GET http://localhost:8080/api/ib-account-info - Get Interactive Brokers account information
  GET http://localhost:8080/api/ib-connect - Connect to IB Gateway/TWS
  GET http://localhost:8080/api/ib-disconnect - Disconnect from IB Gateway/TWS

Interactive Brokers Config:
  Host: 127.0.0.1
  Port: 4002 (4001=Gateway Live, 4002=Gateway Paper, 7496=TWS Live, 7497=TWS Paper)
  Client ID: 1
```

### 2. Open the Application

Open your browser and go to: `http://localhost:8080`

### 3. Connect to IB

1. Make sure **IB Gateway or TWS is running and logged in**
2. Click the **"Connect to IB"** button in the Interactive Brokers Account section
3. The application will:
   - Connect to IB Gateway/TWS
   - Fetch your account summary
   - Fetch your current positions
   - Display all information in the UI

### 4. View Your Account Information

Once connected, you'll see:

- **Account Summary**: Net liquidation, buying power, P&L, margin requirements, etc.
- **Current Positions**: All your open positions with P&L
- **Managed Accounts**: List of accounts you can access

### 5. Refresh Data

Click **"Refresh Data"** to update the account information with the latest data from IB.

### 6. Disconnect

Click **"Disconnect"** when you're done to close the connection.

## Troubleshooting

### Connection Errors

**Error**: "Failed to connect to IB Gateway/TWS"

**Solutions**:
1. ✅ Make sure IB Gateway or TWS is running and logged in
2. ✅ Verify API settings are enabled (see Step 2 above)
3. ✅ Check that the port in `server.js` matches your IB Gateway/TWS port
4. ✅ Make sure "Enable ActiveX and Socket Clients" is checked
5. ✅ Try restarting IB Gateway/TWS
6. ✅ Check firewall settings (allow localhost connections)

### API Not Enabled

**Error**: Connection refused or timeout

**Solution**: Go to IB Gateway/TWS settings and enable API access (see Setup Step 2)

### Wrong Port

**Error**: Connection refused

**Solution**:
- Check which port your IB Gateway/TWS is using
- Update the `port` value in `server.js` IB_CONFIG
- Restart the Node.js server

### Read-Only Permissions

If you see limited data or get permission errors:
1. Check your API permissions in IB Gateway/TWS settings
2. Make sure your account has permission to access the data
3. For testing, try disabling "Read-Only API" (allows full access)

### Multiple Connections

**Error**: "Client ID already in use"

**Solution**:
- Each API connection needs a unique client ID
- If you're running multiple applications, change `clientId` in `server.js` to a different number (1-32)
- Or disconnect other API applications

## API Endpoints

You can also access IB data directly via API:

### Get Account Information
```bash
curl http://localhost:8080/api/ib-account-info
```

Response:
```json
{
  "success": true,
  "data": {
    "accounts": ["DU123456"],
    "summary": {
      "NetLiquidation": 100000.00,
      "TotalCashValue": 50000.00,
      "BuyingPower": 200000.00,
      ...
    },
    "positions": [
      {
        "symbol": "AAPL",
        "position": 100,
        "avgCost": 150.00,
        "marketValue": 17500.00,
        ...
      }
    ],
    "lastUpdated": "2025-10-21T12:34:56.789Z"
  }
}
```

### Manual Connect
```bash
curl http://localhost:8080/api/ib-connect
```

### Disconnect
```bash
curl http://localhost:8080/api/ib-disconnect
```

## Security Notes

- **localhost only**: The default configuration only accepts connections from localhost (127.0.0.1)
- **Read-Only API**: Consider enabling read-only mode if you only need to view account data
- **Client ID**: Use unique client IDs for each application
- **Paper Trading**: Use paper trading port (4002) for testing

## Support

For IB API issues, refer to:
- IB API Documentation: https://interactivebrokers.github.io/tws-api/
- @stoqey/ib Library: https://github.com/stoqey/ib

For application issues, check the browser console and server logs for error messages.

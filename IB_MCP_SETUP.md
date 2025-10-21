# Interactive Brokers MCP Server Setup Guide

This guide explains how to use the Interactive Brokers (IB) MCP server to access your IB account data directly from Claude Code.

## What is the IB MCP Server?

The Interactive Brokers MCP (Model Context Protocol) server allows Claude Code to interact with your Interactive Brokers account to:

- **Get Account Information**: View account balances, cash positions, and account summary
- **Get Positions**: See current stock and option positions with P&L data
- **Get Market Data**: Access real-time prices, bid/ask spreads, and market information
- **Place Orders**: Execute market, limit, and stop orders (use with caution!)
- **Monitor Orders**: Check order status and view open orders

## Setup Status

✅ **MCP Server Installed**: Located at `/home/user/ULTY-Projects/interactive-brokers-mcp/`
✅ **Built Successfully**: TypeScript compiled to JavaScript
✅ **MCP Configuration Created**: `.claude/mcp.json` configured
✅ **Environment Template Created**: `.env.ib.example` available

## Quick Start

### 1. Configure Your IB Credentials

Copy the environment template and add your credentials:

```bash
cp .env.ib.example .env.ib
```

Edit `.env.ib` and set:
- `IB_USERNAME`: Your Interactive Brokers username
- `IB_PASSWORD_AUTH`: Your Interactive Brokers password
- `IB_PAPER_TRADING`: Set to `true` for paper trading (recommended!)

**IMPORTANT**: The `.env.ib` file is gitignored and will NOT be committed.

### 2. Update MCP Configuration (Optional)

The MCP server is configured in `.claude/mcp.json`. The default configuration uses:
- **Browser OAuth mode**: Opens a web browser for authentication
- **Paper trading**: Safe testing environment

To use headless mode (automatic login without browser), edit `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "interactive-brokers": {
      "command": "node",
      "args": ["/home/user/ULTY-Projects/interactive-brokers-mcp/dist/index.js"],
      "env": {
        "IB_HEADLESS_MODE": "true",
        "IB_USERNAME": "your_username",
        "IB_PASSWORD_AUTH": "your_password",
        "IB_PAPER_TRADING": "true"
      }
    }
  }
}
```

### 3. Restart Claude Code

After configuration, restart Claude Code to load the MCP server. You should see the Interactive Brokers MCP server available.

## Available MCP Tools

Once configured, you can ask Claude to use these tools:

### 1. `get_account_info`
Retrieves your account information and balances.

**Usage**: "Get my IB account information"

**Returns**:
- Account ID
- Cash balance
- Net liquidation value
- Available funds
- Buying power

### 2. `get_positions`
Gets your current positions with P&L data.

**Usage**: "Show my current IB positions"

**Parameters**:
- `accountId`: Your IB account ID (from get_account_info)

**Returns**:
- Position details (symbol, quantity, average cost)
- Market value and P&L
- Unrealized gains/losses

### 3. `get_market_data`
Retrieves real-time market data for a symbol.

**Usage**: "Get market data for AAPL"

**Parameters**:
- `symbol`: Stock ticker (e.g., "AAPL", "MSFT")
- `exchange`: Optional exchange (e.g., "SMART", "NASDAQ")

**Returns**:
- Last price
- Bid/ask prices and sizes
- Volume
- Daily high/low

### 4. `place_order`
Places a trade order.

**Usage**: "Place a limit order to buy 10 shares of AAPL at $150"

**Parameters**:
- `accountId`: Your IB account ID
- `symbol`: Stock ticker
- `action`: "BUY" or "SELL"
- `orderType`: "MKT" (market), "LMT" (limit), or "STP" (stop)
- `quantity`: Number of shares
- `price`: Limit price (required for LMT orders)
- `stopPrice`: Stop price (required for STP orders)

**⚠️ WARNING**: This places real orders! Always use paper trading first.

### 5. `get_order_status`
Checks the status of a specific order.

**Usage**: "Check the status of order 12345"

**Parameters**:
- `orderId`: The order ID to check

### 6. `get_live_orders`
Gets all open/live orders.

**Usage**: "Show all my open IB orders"

**Returns**: List of all pending and partially filled orders

## Configuration Options

### Browser vs Headless Mode

**Browser Mode (Default - Recommended)**:
- Opens web browser for Interactive Brokers OAuth login
- More secure for accounts with 2FA
- Easier to handle two-factor authentication
- Set: `IB_HEADLESS_MODE=false`

**Headless Mode**:
- Automatic login without browser
- Useful for automation and scripts
- Still supports 2FA (will wait for mobile approval)
- Set: `IB_HEADLESS_MODE=true` + provide username/password

### Paper Trading vs Live Trading

**Paper Trading (Recommended)**:
- Uses IB's paper trading environment
- No real money at risk
- Perfect for testing and development
- Set: `IB_PAPER_TRADING=true`

**Live Trading**:
- Real money and real trades
- **HIGH RISK** - test thoroughly first!
- Set: `IB_PAPER_TRADING=false`

## Integration with ULTY NAV Nowcast Tool

This MCP server can enhance the ULTY NAV Nowcast Tool by:

1. **Automatic Data Fetching**: Instead of uploading CSV files, fetch holdings directly from IB
2. **Real-Time Market Data**: Get live prices and implied volatilities
3. **Position Synchronization**: Ensure NAV calculations use current positions
4. **Automated Updates**: Refresh data on demand without manual file uploads

### Example Integration Workflow

```javascript
// Future integration idea (not yet implemented):
// 1. Fetch IB positions → Transform to holdings format
// 2. Get market data for all symbols → Update AppState.marketData
// 3. Run existing NAV nowcast calculations
// 4. Display results with real-time data
```

## Security Best Practices

🔒 **Critical Security Guidelines**:

1. **Never commit credentials** - `.env.ib` is gitignored
2. **Use paper trading first** - Test everything before going live
3. **Enable 2FA** on your IB account
4. **Run locally only** - Never deploy to public servers
5. **Review all orders** - Double-check before execution
6. **Monitor positions** - Regularly check your account
7. **Use read-only tools first** - Start with get_account_info and get_positions

## Troubleshooting

### MCP Server Not Appearing

1. Check that `.claude/mcp.json` exists and is valid JSON
2. Restart Claude Code completely
3. Check logs for errors

### Authentication Fails

1. Verify your credentials in `.env.ib` or `.claude/mcp.json`
2. Try browser mode first (set `IB_HEADLESS_MODE=false`)
3. Complete any 2FA challenges
4. Check that you're using the correct paper/live trading setting

### Gateway Connection Issues

1. Ensure IB Gateway is running (the MCP server starts it automatically)
2. Check firewall settings
3. Verify port 4001 (live) or 4002 (paper) are available
4. Look for Java process running IB Gateway

### Cannot Place Orders

1. Confirm you're authenticated (run `get_account_info` first)
2. Verify account has trading permissions
3. Check market hours (orders may be queued outside trading hours)
4. Ensure sufficient funds/buying power

## MCP Server Architecture

```
Claude Code
    ↓
MCP Protocol (JSON-RPC)
    ↓
Interactive Brokers MCP Server
    ↓
IB Gateway (TWS Gateway)
    ↓
Interactive Brokers API
    ↓
Your IB Account
```

## Files and Directories

```
ULTY-Projects/
├── .claude/
│   └── mcp.json                    # MCP server configuration for Claude Code
├── interactive-brokers-mcp/        # IB MCP server (cloned repository)
│   ├── dist/                       # Compiled JavaScript
│   ├── src/                        # TypeScript source code
│   ├── ib-gateway/                 # IB Gateway binaries
│   └── package.json                # Node.js dependencies
├── .env.ib.example                 # Environment template (safe to commit)
├── .env.ib                         # Your credentials (gitignored - DO NOT COMMIT)
└── IB_MCP_SETUP.md                 # This documentation file
```

## Next Steps

1. **Set up credentials**: Copy `.env.ib.example` to `.env.ib` and configure
2. **Restart Claude Code**: Load the MCP server
3. **Test connection**: Ask Claude to "Get my IB account information"
4. **Explore positions**: Request "Show my current IB positions"
5. **Get market data**: Try "Get market data for AAPL"
6. **Plan integration**: Think about how to integrate with the ULTY NAV tool

## Support and Resources

- **MCP Server Repository**: https://github.com/code-rabi/interactive-brokers-mcp
- **IB API Documentation**: https://interactivebrokers.github.io/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Issues**: Report problems at the GitHub repository

## Disclaimer

⚠️ **IMPORTANT WARNINGS**:

- This is an **unofficial** MCP server, NOT affiliated with Interactive Brokers
- Software is in **Alpha state** and may have bugs
- Trading involves **substantial financial risk**
- **No warranty** provided - use at your own risk
- This is **NOT financial advice**
- Always test with **paper trading** before live trading

---

**Last Updated**: 2025-10-21
**MCP Server Version**: 1.0.0
**Status**: Installed and Configured

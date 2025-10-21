# Interactive Brokers Integration Guide

This document explains how to integrate Interactive Brokers account data with the ULTY NAV Nowcast Tool.

## Overview

The application supports two methods for fetching Interactive Brokers account data:

1. **Direct Client Portal API** (Browser-based)
2. **MCP Server Integration** (Server-based, more advanced)

---

## Method 1: Direct Client Portal API (Recommended for Simple Use)

This method uses Interactive Brokers' Client Portal Web API directly from the browser.

### Prerequisites

- **IBKR Pro Account** (required for API access)
- **IB Client Portal Gateway** installed and running
- Modern web browser with CORS support

### Setup Instructions

#### 1. Download Client Portal Gateway

1. Visit [Interactive Brokers API Downloads](https://www.interactivebrokers.com/en/trading/ib-api.php)
2. Download the **Client Portal Gateway** package
3. Extract to a folder on your computer

#### 2. Start Client Portal Gateway

**Windows:**
```bash
cd path\to\clientportal.gw
bin\run.bat root\conf.yaml
```

**Mac/Linux:**
```bash
cd path/to/clientportal.gw
bin/run.sh root/conf.yaml
```

The gateway will start on `https://localhost:5000` by default.

#### 3. Authenticate

1. Open a browser to `https://localhost:5000`
2. Accept the self-signed certificate warning (this is normal for localhost)
3. Log in with your IBKR credentials
4. Keep the gateway running in the background

#### 4. Use in ULTY NAV Tool

1. Open the ULTY NAV Nowcast Tool in your browser
2. In the **Interactive Brokers Account** section, click **Connect to IB**
3. Select your account from the dropdown
4. Click **Fetch Account Data**
5. Your positions will be loaded automatically

### How It Works

The application:
1. Connects to your local Client Portal Gateway at `https://localhost:5000`
2. Fetches your account list via `/portfolio/accounts`
3. Retrieves positions via `/portfolio/{accountId}/positions`
4. Converts IB position data to the app's holdings format
5. Categorizes positions (stocks, calls, puts, cash)
6. Enables NAV nowcast calculations with your live portfolio

### Limitations

- Requires manual authentication (cannot be fully automated)
- Gateway must be running while using the application
- Self-signed SSL certificate warnings on first connection
- Only works with IBKR Pro accounts

---

## Method 2: MCP Server Integration (Advanced)

For more advanced use cases, you can use the **interactive-brokers-mcp** server, which provides AI-native integration through Anthropic's Model Context Protocol.

### About MCP

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is a protocol by Anthropic that enables AI assistants like Claude to securely connect to external data sources and tools.

### MCP Server Repository

**GitHub:** https://github.com/code-rabi/interactive-brokers-mcp

This community-developed MCP server provides:
- Full Interactive Brokers API integration
- Account management and position tracking
- Real-time market data
- Order management (market, limit, stop orders)
- Pre-configured IB Gateway and Java runtime
- Simple npx-based deployment

### Setup Instructions

#### 1. Install Prerequisites

```bash
# Node.js 18+ required
node --version
```

#### 2. Run MCP Server

```bash
# Run directly with npx (no installation needed)
npx @code-rabi/interactive-brokers-mcp
```

#### 3. Configure Claude Desktop

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "interactive-brokers": {
      "command": "npx",
      "args": ["@code-rabi/interactive-brokers-mcp"],
      "env": {
        "IB_ACCOUNT": "your-account-id",
        "IB_HOST": "localhost",
        "IB_PORT": "7497"
      }
    }
  }
}
```

#### 4. Use with ULTY NAV Tool

When using Claude with the MCP server:

1. Ask Claude to fetch your IB positions
2. Claude will retrieve data via MCP
3. You can export the data and import it into the ULTY NAV tool
4. Or use Claude to analyze your portfolio directly

### MCP Server Features

**Account Management:**
- Get account summary
- Check balances
- View positions

**Market Data:**
- Real-time quotes
- Historical data
- Contract details

**Order Management:**
- Place market orders
- Place limit orders
- Place stop orders
- Cancel orders
- Modify orders

**Portfolio Analysis:**
- Position breakdown
- P&L calculations
- Risk metrics

### Advantages of MCP

- **AI-Native**: Designed for Claude integration
- **Automated**: Can be fully scripted with AI assistance
- **Comprehensive**: Access to full IB API capabilities
- **Secure**: Follows MCP security best practices
- **Maintained**: Community-supported with regular updates

### When to Use Each Method

**Use Direct Client Portal API when:**
- You want browser-based access
- You need simple position viewing
- You prefer minimal setup
- You're using the web interface

**Use MCP Server when:**
- You want Claude AI integration
- You need programmatic access
- You want to automate workflows
- You need advanced trading features

---

## API Endpoints Reference

### Direct Client Portal API

**Base URL:** `https://localhost:5000/v1/api`

**Key Endpoints:**
- `POST /iserver/auth/status` - Check authentication
- `GET /portfolio/accounts` - List accounts
- `GET /portfolio/{accountId}/summary` - Account summary
- `GET /portfolio/{accountId}/positions/0` - Get positions

**Documentation:** https://interactivebrokers.github.io/cpwebapi/

---

## Troubleshooting

### Connection Failed

**Problem:** Cannot connect to Client Portal Gateway

**Solutions:**
- Verify gateway is running on port 5000
- Check that you've authenticated via https://localhost:5000
- Accept SSL certificate in browser
- Ensure firewall allows localhost connections

### No Accounts Found

**Problem:** Connected but no accounts appear

**Solutions:**
- Verify you have an IBKR Pro account (not Lite)
- Log out and log in again to the gateway
- Restart the Client Portal Gateway
- Check account status in Account Management

### Positions Not Loading

**Problem:** Account connects but positions don't load

**Solutions:**
- Ensure you have open positions in your account
- Check that market data permissions are active
- Verify account permissions in IB Account Management
- Try refreshing the account data

### CORS Errors

**Problem:** Browser blocks requests due to CORS

**Solutions:**
- Client Portal Gateway should handle CORS automatically
- If issues persist, check gateway configuration
- Ensure using HTTPS (not HTTP)
- Try in a different browser

---

## Security Considerations

### Client Portal Gateway

- Runs locally on your machine
- Uses HTTPS with self-signed certificate
- No data sent to external servers
- Session expires after period of inactivity

### MCP Server

- Follows MCP security protocol
- Credentials stored locally
- Encrypted communication
- Audit logging available

### Best Practices

- Never share your IBKR credentials
- Use strong account passwords
- Enable two-factor authentication
- Keep Client Portal Gateway updated
- Monitor API activity in IBKR account management
- Log out when not in use

---

## Support and Resources

### Official IB Resources

- [IB API Documentation](https://www.interactivebrokers.com/campus/ibkr-api-page/)
- [Client Portal API Docs](https://interactivebrokers.github.io/cpwebapi/)
- [IB Support](https://www.interactivebrokers.com/en/support/contact.php)

### MCP Resources

- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP Server Repository](https://github.com/code-rabi/interactive-brokers-mcp)
- [Anthropic Documentation](https://docs.anthropic.com/)

### ULTY NAV Tool

For issues specific to this application:
- Check console for error messages
- Verify CSV format compatibility
- Ensure market data is loaded
- Review calculation parameters

---

## Disclaimer

This integration is provided as-is for informational and analysis purposes.

- Not affiliated with or endorsed by Interactive Brokers
- Not financial advice
- Use at your own risk
- Verify all data before making trading decisions
- Past performance does not guarantee future results

Trading involves risk and you may lose your entire investment. Consult with a licensed financial advisor before making investment decisions.

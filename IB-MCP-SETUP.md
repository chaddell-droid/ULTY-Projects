# Interactive Brokers MCP Server - Setup Guide

## Installation Complete! ✓

The Interactive Brokers MCP server has been configured for Claude Code.

## Current Configuration

**Location**: `~/.config/claude-code/mcp.json`

**Mode**: Browser-based OAuth (recommended)

```json
{
  "mcpServers": {
    "interactive-brokers": {
      "command": "npx",
      "args": ["-y", "interactive-brokers-mcp"]
    }
  }
}
```

## How It Works

1. **First Use**: When you first interact with the IB MCP server, a browser window will open automatically
2. **Authentication**: Log in with your Interactive Brokers credentials
3. **OAuth Authorization**: Complete the OAuth flow to authorize the connection
4. **Ready**: The server will be connected and ready to use

## Available Tools

Once connected, you'll have access to these MCP tools:

| Tool | Description |
|------|-------------|
| `get_account_info` | Retrieve account information and balances |
| `get_positions` | Get current positions and P&L |
| `get_market_data` | Real-time market data for symbols |
| `place_order` | Place market, limit, or stop orders |
| `get_order_status` | Check order execution status |
| `get_live_orders` | Get all live/open orders |

## Example Usage

After restarting Claude Code, you can use commands like:

- "Get my Interactive Brokers account information"
- "Show my current positions"
- "Get market data for AAPL"
- "What are my open orders?"

## Alternative: Headless Mode Configuration

If you prefer automated authentication without browser interaction, edit `~/.config/claude-code/mcp.json`:

```json
{
  "mcpServers": {
    "interactive-brokers": {
      "command": "npx",
      "args": ["-y", "interactive-brokers-mcp"],
      "env": {
        "IB_HEADLESS_MODE": "true",
        "IB_USERNAME": "your_ib_username",
        "IB_PASSWORD_AUTH": "your_ib_password",
        "IB_PAPER_TRADING": "true"
      }
    }
  }
}
```

**⚠️ Security Warning**: Never commit credentials to version control. Store them securely.

## Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `IB_HEADLESS_MODE` | Enable headless authentication | `false` |
| `IB_USERNAME` | Interactive Brokers username | - |
| `IB_PASSWORD_AUTH` | Interactive Brokers password | - |
| `IB_PAPER_TRADING` | Use paper trading account | `false` |
| `IB_AUTH_TIMEOUT` | Authentication timeout (ms) | - |

## Important Warnings

- **Financial Risk**: Trading involves substantial risk. Always test with paper trading first
- **Security**: Only run locally, never on public servers
- **Unofficial**: This is a community project, not endorsed by Interactive Brokers
- **Alpha Software**: May not work perfectly in all scenarios

## Testing the Setup

To verify the MCP server is working:

1. **Restart Claude Code** to load the new MCP configuration
2. **Check MCP status**: The server should appear in available MCP servers
3. **Test a simple command**: Try "Get my Interactive Brokers account info"

## Troubleshooting

**Authentication fails:**
- Ensure you're using valid IB credentials
- Complete any 2FA requirements
- Try paper trading mode first: `"IB_PAPER_TRADING": "true"`

**Server not starting:**
- Check Node.js version: `node --version` (requires 18+)
- Verify the config file syntax is valid JSON
- Check Claude Code logs for error messages

**Browser doesn't open (OAuth mode):**
- Make sure you're in a graphical environment
- Try headless mode if on a server
- Check firewall settings

## Next Steps

1. **Restart Claude Code** to activate the MCP server
2. **Paper Trading**: Start with paper trading to test safely
3. **Review Tools**: Familiarize yourself with the available tools
4. **Monitor**: Keep an eye on operations, especially orders

## Resources

- GitHub Repository: https://github.com/code-rabi/interactive-brokers-mcp
- Local Clone: `/home/user/ULTY-Projects/interactive-brokers-mcp/`
- Interactive Brokers: https://www.interactivebrokers.com

---

*Setup completed on: 2025-10-21*

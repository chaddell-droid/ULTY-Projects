# Interactive Brokers MCP Integration - Simple Guide

## You're Right - This Should Be Simple!

The MCP server handles all the complexity. Here's how it actually works:

## What is MCP?

**Model Context Protocol (MCP)** lets Claude directly access your Interactive Brokers account. Once configured, you can just ask Claude to fetch your positions - no web UI needed.

## Setup (One-Time)

### Step 1: Add MCP Server to Claude Desktop

1. **Open Claude Desktop settings**
2. **Add this configuration:**

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

3. **Restart Claude Desktop**

### Step 2: First Authentication

When you first use the IB MCP server:
1. A browser window will automatically open
2. You'll log in to Interactive Brokers via OAuth
3. Authorize the connection
4. That's it - you're connected!

## How to Use It

### Simple Approach - Just Ask Claude!

Once the MCP server is configured, you can ask Claude:

```
"Fetch my Interactive Brokers positions and export them to a CSV file"
```

Claude will:
1. Connect to your IB account via MCP
2. Fetch your positions
3. Format them as CSV
4. Save the file

Then you can:
1. Upload that CSV to the ULTY NAV tool
2. Or have Claude directly calculate NAV using the position data

### Example Workflow

**You:** "Get my IB portfolio positions"

**Claude:** *Uses MCP to fetch positions from IB*
```
Here are your current positions:
- AAPL: 100 shares @ $150.00
- TSLA Call 250815C00300000: 5 contracts
- ...
```

**You:** "Export these to CSV format compatible with ULTY NAV tool"

**Claude:** *Creates CSV file in the correct format*
```
Created: ib_positions_2025-10-21.csv
```

**You:** "Now calculate the NAV nowcast"

**Claude:** *Processes the data and calculates NAV*

## Why This is Better Than the Web UI

### The Web UI Approach (What I Built):
- ❌ Requires running Client Portal Gateway
- ❌ Manual authentication every session
- ❌ Browser-based with CORS issues
- ❌ Complex setup with SSL certificates
- ❌ Multiple moving parts

### The MCP Approach (What You Should Use):
- ✅ OAuth authentication (one-time setup)
- ✅ No manual gateway management
- ✅ Just ask Claude in natural language
- ✅ Works directly in Claude Desktop
- ✅ Can export to any format needed
- ✅ Single command setup

## Alternative: Use IB CSV Export

**Even Simpler:**

1. Log in to IB Account Management
2. Go to Reports → Flex Queries
3. Create a position report
4. Download as CSV
5. Upload to ULTY NAV tool

No programming required!

## When to Use Each Approach

### Use MCP Server When:
- You want to automate portfolio analysis
- You need real-time data frequently
- You're comfortable with Claude Desktop
- You want AI-assisted trading workflows

### Use Web UI Integration When:
- You need a standalone web application
- You want to share with non-technical users
- You prefer browser-based tools
- You don't want to configure MCP

### Use Manual CSV Export When:
- One-time analysis
- You prefer manual control
- Simplest possible workflow
- No technical setup

## Recommended Workflow for You

Since you're already using Claude Code:

1. **Configure MCP server in Claude Desktop** (5 minutes)
2. **Ask Claude to fetch your IB positions** (1 command)
3. **Have Claude export to CSV** (or directly calculate NAV)
4. **Use the data however you want**

No need for:
- Client Portal Gateway
- Web servers
- Custom JavaScript integration
- SSL certificates
- Port management

## Quick Start Commands

### In Claude Desktop (with MCP configured):

```
You: "Connect to my Interactive Brokers account and show me my current positions"

You: "Export my IB positions to CSV format for the ULTY NAV tool"

You: "Fetch my IB portfolio and calculate the current NAV nowcast"
```

That's it!

## Summary

**What I built (Web UI):** Useful if you want a standalone tool, but complex setup.

**What you should use (MCP):** Just ask Claude - it's literally that simple.

**Simplest option:** Export CSV from IB Account Management manually.

---

You were right to call this out - I overcomplicated it! The MCP server is specifically designed to make this easy.

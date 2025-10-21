// Interactive Brokers Handler - UI integration for IB connector

// Global IB connector instance
let ibConnector = null;

/**
 * Initialize IB connector on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    if (!ibConnector) {
        ibConnector = new IBConnector();
    }
});

/**
 * Connect to Interactive Brokers Client Portal Gateway
 */
async function connectToIB() {
    if (!ibConnector) {
        ibConnector = new IBConnector();
    }

    const connectBtn = document.getElementById('ibConnectBtn');
    const ibInfo = document.getElementById('ibInfo');
    const ibBox = document.getElementById('ibBox');

    // Update UI to show connecting state
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';
    showStatus('info', 'Connecting to IB Client Portal Gateway...');

    try {
        // Check connection and authentication
        const statusResult = await ibConnector.checkConnection();

        if (!statusResult.success) {
            throw new Error(statusResult.message || statusResult.error);
        }

        if (!statusResult.authenticated) {
            showStatus('error', 'Not authenticated. Please log in to IB Client Portal Gateway first.');
            ibInfo.textContent = 'Not authenticated - Please log in to Client Portal Gateway';
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect to IB';
            return;
        }

        // Get accounts
        const accountsResult = await ibConnector.getAccounts();

        if (!accountsResult.success) {
            throw new Error(accountsResult.error || 'Failed to fetch accounts');
        }

        if (!accountsResult.accounts || accountsResult.accounts.length === 0) {
            showStatus('error', 'No accounts found');
            ibInfo.textContent = 'No accounts found';
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect to IB';
            return;
        }

        // Update UI with successful connection
        ibBox.classList.add('active');
        ibInfo.textContent = `Connected - ${accountsResult.accounts.length} account(s) found`;

        // Populate account selector
        populateAccountSelector(accountsResult.accounts);

        // Hide connect button, show fetch button
        connectBtn.style.display = 'none';
        document.getElementById('ibFetchBtn').style.display = 'inline-block';
        document.getElementById('ibAccountSelect').style.display = 'block';

        showStatus('success', `Connected to IB! Found ${accountsResult.accounts.length} account(s)`);
    } catch (error) {
        console.error('IB connection error:', error);
        showStatus('error', `Failed to connect: ${error.message}`);
        ibInfo.textContent = `Connection failed: ${error.message}`;
        connectBtn.disabled = false;
        connectBtn.textContent = 'Retry Connection';
    }
}

/**
 * Populate account selector dropdown
 */
function populateAccountSelector(accounts) {
    const selector = document.getElementById('accountSelector');
    selector.innerHTML = '';

    accounts.forEach(accountId => {
        const option = document.createElement('option');
        option.value = accountId;
        option.textContent = accountId;
        selector.appendChild(option);
    });

    // Set the connector's default account to the first one
    if (accounts.length > 0) {
        ibConnector.accountId = accounts[0];
    }
}

/**
 * Fetch account information from IB
 */
async function fetchIBAccountInfo() {
    if (!ibConnector) {
        showStatus('error', 'IB Connector not initialized');
        return;
    }

    const fetchBtn = document.getElementById('ibFetchBtn');
    const ibInfo = document.getElementById('ibInfo');
    const accountSelector = document.getElementById('accountSelector');
    const selectedAccount = accountSelector.value;

    if (!selectedAccount) {
        showStatus('error', 'No account selected');
        return;
    }

    // Update UI to show fetching state
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Fetching...';
    showStatus('info', `Fetching account data for ${selectedAccount}...`);

    try {
        // Fetch account info (summary + positions)
        const result = await ibConnector.getAccountInfo(selectedAccount);

        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch account info');
        }

        // Parse summary metrics
        const metrics = ibConnector.parseSummary(result.summary);

        // Convert positions to holdings format
        const holdingsData = ibConnector.convertToHoldingsFormat(result.positions);

        // Categorize positions (same as CSV holdings)
        const categorizedData = categorizeIBPositions(holdingsData.positions);

        // Update AppState with IB data
        AppState.holdingsData = {
            positions: holdingsData.positions,
            stocks: categorizedData.stocks,
            calls: categorizedData.calls,
            puts: categorizedData.puts,
            cash: categorizedData.cash,
            netAssets: metrics.netLiquidation || holdingsData.netAssets,
            sharesOutstanding: 0, // Not available from IB
            totalMarketValue: holdingsData.totalMarketValue,
            ibMetrics: metrics,
            source: 'IB'
        };

        // Store globally for compatibility
        window.holdingsData = AppState.holdingsData;

        // Update UI
        ibInfo.textContent = `Data loaded - NAV: $${metrics.netLiquidation?.toLocaleString() || holdingsData.netAssets.toLocaleString()}`;
        document.getElementById('holdingsBox').classList.add('active');
        document.getElementById('holdingsInfo').textContent = `IB Account ${selectedAccount} (${result.positions.length} positions)`;

        // Display holdings summary
        displayHoldingsSummary();

        // If market data is loaded, calculate weighted metrics
        if (AppState.marketData) {
            displayPerformanceMetrics();
            calculateWeightedMetrics();
        }

        // Enable calculate button
        if (AppState.marketData) {
            document.getElementById('calculateBtn').disabled = false;
            document.getElementById('calculateBtn').textContent = 'Calculate Nowcast';
            showStatus('success', `IB account loaded! ${result.positions.length} positions imported`);
        } else {
            showStatus('success', `IB account loaded! ${result.positions.length} positions imported. Load market data to enable calculations.`);
        }

        // Reset button state
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Refresh Account Data';
    } catch (error) {
        console.error('IB fetch error:', error);
        showStatus('error', `Failed to fetch account data: ${error.message}`);
        ibInfo.textContent = `Fetch failed: ${error.message}`;
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Retry Fetch';
    }
}

/**
 * Categorize IB positions into stocks, calls, puts, and cash
 */
function categorizeIBPositions(positions) {
    const stocks = [];
    const calls = [];
    const puts = [];
    const cash = [];

    positions.forEach(position => {
        switch (position.positionType) {
            case 'stock':
                stocks.push(position);
                break;
            case 'call':
                calls.push(position);
                break;
            case 'put':
                puts.push(position);
                break;
            case 'cash':
                cash.push(position);
                break;
            default:
                // If unknown, categorize as stock
                stocks.push(position);
        }
    });

    return {
        stocks,
        calls,
        puts,
        cash
    };
}

/**
 * Get current IB connection status
 */
function getIBConnectionStatus() {
    if (!ibConnector) {
        return { connected: false, authenticated: false };
    }

    return {
        connected: true,
        authenticated: ibConnector.isAuthenticated,
        accountId: ibConnector.accountId
    };
}

// Make functions globally available
window.connectToIB = connectToIB;
window.fetchIBAccountInfo = fetchIBAccountInfo;
window.getIBConnectionStatus = getIBConnectionStatus;

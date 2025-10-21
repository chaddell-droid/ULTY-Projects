// Interactive Brokers Account Handler
// Manages IB account information fetching and display

const IBHandler = {
    connected: false,
    accountData: null,

    /**
     * Initialize IB handler with event listeners
     */
    init() {
        const connectBtn = document.getElementById('ibConnectBtn');
        const disconnectBtn = document.getElementById('ibDisconnectBtn');
        const refreshBtn = document.getElementById('ibRefreshBtn');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.fetchAccountInfo());
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.fetchAccountInfo());
        }
    },

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('ibStatus');
        if (statusElement) {
            statusElement.className = `ib-status ib-status-${type}`;
            statusElement.innerHTML = `<p>${message}</p>`;
            statusElement.style.display = 'block';
        }
    },

    /**
     * Update button visibility based on connection state
     */
    updateButtons(connected) {
        const connectBtn = document.getElementById('ibConnectBtn');
        const disconnectBtn = document.getElementById('ibDisconnectBtn');
        const refreshBtn = document.getElementById('ibRefreshBtn');

        if (connectBtn) connectBtn.style.display = connected ? 'none' : 'inline-block';
        if (disconnectBtn) disconnectBtn.style.display = connected ? 'inline-block' : 'none';
        if (refreshBtn) refreshBtn.style.display = connected ? 'inline-block' : 'none';
    },

    /**
     * Fetch account information from IB
     */
    async fetchAccountInfo() {
        this.showStatus('Connecting to Interactive Brokers...', 'loading');

        try {
            const response = await fetch('http://localhost:8080/api/ib-account-info');
            const result = await response.json();

            if (result.success) {
                this.connected = true;
                this.accountData = result.data;
                this.updateButtons(true);
                this.displayAccountData(result.data);
                this.showStatus(`✓ Connected - Last updated: ${new Date(result.data.lastUpdated).toLocaleString()}`, 'success');
            } else {
                this.connected = false;
                this.updateButtons(false);
                this.showStatus(`❌ Error: ${result.error}<br><small>${result.details || ''}</small>`, 'error');
            }
        } catch (error) {
            this.connected = false;
            this.updateButtons(false);
            this.showStatus(`❌ Connection Error: ${error.message}<br><small>Make sure the server is running and IB Gateway/TWS is active</small>`, 'error');
        }
    },

    /**
     * Disconnect from IB
     */
    async disconnect() {
        this.showStatus('Disconnecting from Interactive Brokers...', 'loading');

        try {
            const response = await fetch('http://localhost:8080/api/ib-disconnect');
            const result = await response.json();

            this.connected = false;
            this.accountData = null;
            this.updateButtons(false);

            // Hide data section
            const dataElement = document.getElementById('ibData');
            if (dataElement) dataElement.style.display = 'none';

            this.showStatus('Disconnected from IB', 'info');
        } catch (error) {
            this.showStatus(`❌ Error disconnecting: ${error.message}`, 'error');
        }
    },

    /**
     * Display account data in the UI
     */
    displayAccountData(data) {
        // Show the data section
        const dataElement = document.getElementById('ibData');
        if (dataElement) dataElement.style.display = 'block';

        // Display account summary
        this.displayAccountSummary(data.summary);

        // Display positions
        this.displayPositions(data.positions);

        // Display managed accounts
        this.displayAccounts(data.accounts);
    },

    /**
     * Display account summary
     */
    displayAccountSummary(summary) {
        const summaryGrid = document.getElementById('ibSummaryGrid');
        if (!summaryGrid) return;

        // Convert summary object to array for display
        const summaryItems = Object.entries(summary).map(([key, value]) => {
            // Format the key name
            const label = this.formatLabel(key);

            // Format the value
            let formattedValue = value;
            if (typeof value === 'number') {
                formattedValue = this.formatCurrency(value);
            }

            return { label, value: formattedValue };
        });

        // Create summary grid HTML
        summaryGrid.innerHTML = summaryItems.map(item => `
            <div class="ib-summary-item">
                <span class="ib-summary-label">${item.label}</span>
                <span class="ib-summary-value">${item.value}</span>
            </div>
        `).join('');
    },

    /**
     * Display positions table
     */
    displayPositions(positions) {
        const positionsTable = document.getElementById('ibPositionsTable');
        if (!positionsTable) return;

        if (!positions || positions.length === 0) {
            positionsTable.innerHTML = '<p>No positions found</p>';
            return;
        }

        // Create table
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Type</th>
                        <th>Position</th>
                        <th>Avg Cost</th>
                        <th>Market Price</th>
                        <th>Market Value</th>
                        <th>P&L</th>
                    </tr>
                </thead>
                <tbody>
                    ${positions.map(pos => `
                        <tr>
                            <td>${pos.contract?.symbol || pos.symbol || 'N/A'}</td>
                            <td>${pos.contract?.secType || pos.secType || 'N/A'}</td>
                            <td>${pos.position || 0}</td>
                            <td>${this.formatCurrency(pos.avgCost || 0)}</td>
                            <td>${this.formatCurrency(pos.marketPrice || 0)}</td>
                            <td>${this.formatCurrency(pos.marketValue || 0)}</td>
                            <td class="${(pos.unrealizedPNL || 0) >= 0 ? 'positive' : 'negative'}">
                                ${this.formatCurrency(pos.unrealizedPNL || 0)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        positionsTable.innerHTML = tableHTML;
    },

    /**
     * Display managed accounts
     */
    displayAccounts(accounts) {
        const accountsList = document.getElementById('ibAccountsList');
        if (!accountsList) return;

        if (!accounts || accounts.length === 0) {
            accountsList.innerHTML = '<p>No managed accounts found</p>';
            return;
        }

        accountsList.innerHTML = `
            <div class="ib-accounts-list">
                ${accounts.map(account => `
                    <div class="ib-account-item">${account}</div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Format label from camelCase to Title Case
     */
    formatLabel(str) {
        // Convert camelCase to spaces
        const spacedStr = str.replace(/([A-Z])/g, ' $1').trim();
        // Capitalize first letter of each word
        return spacedStr.charAt(0).toUpperCase() + spacedStr.slice(1);
    },

    /**
     * Format number as currency
     */
    formatCurrency(value) {
        if (typeof value !== 'number') return value;

        const formatted = Math.abs(value).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        return value < 0 ? `-${formatted}` : formatted;
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => IBHandler.init());
} else {
    IBHandler.init();
}

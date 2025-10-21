// Interactive Brokers Client Portal API Connector
// Connects to local IB Client Portal Gateway to fetch account and position data

class IBConnector {
    constructor() {
        // Default Client Portal Gateway URL
        this.baseUrl = 'https://localhost:5000/v1/api';
        this.accountId = null;
        this.isAuthenticated = false;
        this.sslVerify = false; // Client Portal Gateway uses self-signed cert
    }

    /**
     * Check if Client Portal Gateway is running and user is authenticated
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/iserver/auth/status`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.isAuthenticated = data.authenticated || false;

            return {
                success: true,
                authenticated: this.isAuthenticated,
                message: data.message || 'Connected to Client Portal Gateway'
            };
        } catch (error) {
            return {
                success: false,
                authenticated: false,
                error: error.message,
                message: 'Failed to connect to Client Portal Gateway. Make sure it is running on https://localhost:5000'
            };
        }
    }

    /**
     * Get list of available accounts
     */
    async getAccounts() {
        try {
            const response = await fetch(`${this.baseUrl}/portfolio/accounts`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const accounts = await response.json();

            if (accounts && accounts.length > 0) {
                // Store the first account as default
                this.accountId = accounts[0];
            }

            return {
                success: true,
                accounts: accounts,
                defaultAccount: this.accountId
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                accounts: []
            };
        }
    }

    /**
     * Get account summary information
     */
    async getAccountSummary(accountId = null) {
        const account = accountId || this.accountId;

        if (!account) {
            return {
                success: false,
                error: 'No account ID specified'
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/portfolio/${account}/summary`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const summary = await response.json();

            return {
                success: true,
                accountId: account,
                summary: summary
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get positions for an account
     */
    async getPositions(accountId = null) {
        const account = accountId || this.accountId;

        if (!account) {
            return {
                success: false,
                error: 'No account ID specified'
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/portfolio/${account}/positions/0`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const positions = await response.json();

            return {
                success: true,
                accountId: account,
                positions: positions
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all account information (summary + positions)
     */
    async getAccountInfo(accountId = null) {
        const account = accountId || this.accountId;

        if (!account) {
            return {
                success: false,
                error: 'No account ID specified'
            };
        }

        try {
            // Fetch both summary and positions in parallel
            const [summaryResult, positionsResult] = await Promise.all([
                this.getAccountSummary(account),
                this.getPositions(account)
            ]);

            if (!summaryResult.success || !positionsResult.success) {
                throw new Error(summaryResult.error || positionsResult.error);
            }

            return {
                success: true,
                accountId: account,
                summary: summaryResult.summary,
                positions: positionsResult.positions
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Convert IB position data to holdings format compatible with existing app
     */
    convertToHoldingsFormat(ibPositions) {
        const positions = [];
        let totalMarketValue = 0;

        if (!ibPositions || ibPositions.length === 0) {
            return {
                positions: [],
                totalMarketValue: 0,
                sharesOutstanding: 0,
                netAssets: 0
            };
        }

        ibPositions.forEach(position => {
            const ticker = position.contractDesc || position.ticker || '';
            const secType = position.assetClass || '';
            const quantity = parseFloat(position.position || 0);
            const marketPrice = parseFloat(position.mktPrice || 0);
            const marketValue = parseFloat(position.mktValue || 0);

            // Determine position type
            let positionType = 'stock';
            if (secType === 'OPT' || position.contractDesc?.includes('OPT')) {
                // Check if it's a call or put based on right field
                const right = position.right || position.putOrCall || '';
                positionType = right === 'C' ? 'call' : right === 'P' ? 'put' : 'option';
            } else if (secType === 'CASH' || ticker === 'USD' || ticker === 'CASH') {
                positionType = 'cash';
            }

            const positionData = {
                ticker: ticker,
                name: position.contractDesc || ticker,
                cusip: position.cusip || '',
                shares: quantity,
                price: marketPrice,
                marketValue: marketValue,
                weight: 0, // Will be calculated later
                positionType: positionType,
                underlying: position.underlyingSymbol || ticker,
                ibData: position // Store original IB data for reference
            };

            // For options, add additional fields
            if (positionType === 'call' || positionType === 'put') {
                positionData.strike = parseFloat(position.strike || 0);
                positionData.expiry = position.expiry || '';
                positionData.multiplier = parseFloat(position.multiplier || 100);
            }

            positions.push(positionData);
            totalMarketValue += Math.abs(marketValue);
        });

        // Calculate weights
        positions.forEach(pos => {
            pos.weight = totalMarketValue > 0 ? (Math.abs(pos.marketValue) / totalMarketValue) * 100 : 0;
        });

        return {
            positions: positions,
            totalMarketValue: totalMarketValue,
            sharesOutstanding: 0, // Not available from IB positions
            netAssets: totalMarketValue
        };
    }

    /**
     * Parse IB summary data to extract key metrics
     */
    parseSummary(summaryData) {
        const metrics = {};

        if (!summaryData) return metrics;

        summaryData.forEach(item => {
            const key = item.key || '';
            const value = item.value || '';

            // Extract important metrics
            switch (key) {
                case 'NetLiquidation':
                    metrics.netLiquidation = parseFloat(value);
                    break;
                case 'TotalCashValue':
                    metrics.totalCash = parseFloat(value);
                    break;
                case 'GrossPositionValue':
                    metrics.grossPositionValue = parseFloat(value);
                    break;
                case 'EquityWithLoanValue':
                    metrics.equity = parseFloat(value);
                    break;
                case 'AvailableFunds':
                    metrics.availableFunds = parseFloat(value);
                    break;
            }
        });

        return metrics;
    }
}

// Create global instance
window.IBConnector = IBConnector;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IBConnector;
}

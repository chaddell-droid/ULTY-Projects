// Data Processor - Functions for processing holdings and market data
// Add this near the top of data-processor.js with other state variables
const sortState = {
    stocks: { column: null, ascending: true },
    calls: { column: null, ascending: true },
    puts: { column: null, ascending: true },
    cash: { column: null, ascending: true }
};
// Process holdings data
function processHoldingsData(data) {
    const processed = {
        positions: [],
        totalValue: 0,
        netAssets: 0,
        sharesOutstanding: 0,
        stocks: [],
        calls: [],
        puts: [],
        cash: []
    };

    console.log('Processing holdings data, total rows:', data.length);

    data.forEach(row => {
        if (!row.StockTicker || row.StockTicker === '') return;
        
        const ticker = row.StockTicker.trim();
        const securityName = (row.SecurityName || '').trim();
        
        const position = {
            ticker: ticker,
            cusip: row.CUSIP,
            name: securityName,
            shares: parseFloat(row.Shares) || 0,
            price: parseFloat(row.Price) || 0,
            marketValue: parseFloat(row.MarketValue) || 0,
            weight: parseFloat(row.Weightings) || 0,
            type: 'stock', // Default
            underlying: ticker, // Default to ticker
            expiration: null,
            strike: null
        };

        // Debug logging
        console.log('Processing position:', ticker, 'Name:', securityName);

        // Try multiple patterns for options
        // Standard OCC format: "AFRM 250815C00077500"
        let optionMatch = ticker.match(/^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/);
        
        // If that doesn't match, try with more flexible spacing
        if (!optionMatch) {
            optionMatch = ticker.match(/^([A-Z]+)\s*(\d{6})([CP])(\d{5,8})$/);
        }
        
        // Also check if the security name contains option indicators
        const nameHasCall = securityName.toLowerCase().includes(' call') || 
                           securityName.toLowerCase().includes('call opt') ||
                           securityName.toLowerCase().includes('cll opt');
        const nameHasPut = securityName.toLowerCase().includes(' put') || 
                          securityName.toLowerCase().includes('put opt');
        
        if (optionMatch) {
            // This is an option based on ticker format
            position.underlying = optionMatch[1]; // e.g., "AFRM"
            const dateStr = optionMatch[2]; // e.g., "250815"
            position.type = optionMatch[3] === 'C' ? 'call' : 'put';
            const strikeStr = optionMatch[4]; // e.g., "00077500"
            
            // Parse expiration date (YYMMDD)
            const year = 2000 + parseInt(dateStr.substr(0, 2));
            const month = parseInt(dateStr.substr(2, 2));
            const day = parseInt(dateStr.substr(4, 2));
            position.expiration = new Date(year, month - 1, day);
            
            // Parse strike price (last 8 digits represent price * 1000)
            // Format is like 00077500 which means $77.50
            if (strikeStr.length === 8) {
                position.strike = parseInt(strikeStr) / 1000;
            } else if (strikeStr.length === 6) {
                position.strike = parseInt(strikeStr) / 100;
            } else if (strikeStr.length === 5) {
                position.strike = parseInt(strikeStr) / 10;
            } else {
                // Assume it's already in dollar format
                position.strike = parseFloat(strikeStr);
            }
            
            // Calculate days to expiration
            const today = new Date();
            const timeDiff = position.expiration - today;
            position.daysToExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            console.log(`Identified option: ${position.underlying} ${position.type} strike:${position.strike} exp:${position.expiration}`);
            
            if (position.type === 'call') {
                processed.calls.push(position);
            } else {
                processed.puts.push(position);
            }
        } else if (nameHasCall || nameHasPut) {
            // Fallback: check security name for options
            position.type = nameHasCall ? 'call' : 'put';
            
            // Try to extract underlying from ticker (usually first part before space or number)
            const underlyingMatch = ticker.match(/^([A-Z]+)/);
            if (underlyingMatch) {
                position.underlying = underlyingMatch[1];
            }
            
            console.log(`Identified option by name: ${position.underlying} ${position.type}`);
            
            if (position.type === 'call') {
                processed.calls.push(position);
            } else {
                processed.puts.push(position);
            }
        } else {
            // Not an option, check if it's cash/money market
            const nameLower = securityName.toLowerCase();
            if (nameLower.includes('money market') || 
                nameLower.includes('cash') || 
                nameLower.includes('sweep') ||
                ticker.toLowerCase().includes('mm') ||
                ticker.toLowerCase().includes('cash')) {
                position.type = 'cash';
                processed.cash.push(position);
                console.log(`Identified cash/MM: ${ticker}`);
            } else {
                // It's a regular stock position
                processed.stocks.push(position);
                console.log(`Identified stock: ${ticker}`);
            }
        }

        processed.positions.push(position);
        processed.totalValue += position.marketValue;
        
        // Capture fund-level data
        if (row.NetAssets) {
            processed.netAssets = parseFloat(row.NetAssets);
        }
        if (row.SharesOutstanding) {
            processed.sharesOutstanding = parseInt(row.SharesOutstanding);
            AppState.sharesOutstanding = processed.sharesOutstanding;
        }
    });

    // Calculate current NAV
    if (processed.sharesOutstanding > 0) {
        AppState.currentNAV = processed.netAssets / processed.sharesOutstanding;
    }

    console.log('Processing complete:');
    console.log('- Stocks:', processed.stocks.length);
    console.log('- Calls:', processed.calls.length);
    console.log('- Puts:', processed.puts.length);
    console.log('- Cash:', processed.cash.length);
    console.log('- Total positions:', processed.positions.length);

    return processed;
}

// Process market data
function processMarketData(data) {
    const processed = {};
    
    data.forEach(row => {
        if (!row.Symbol) return;
        
        const symbol = row.Symbol.trim();
        
        // Debug logging for IV columns
        console.log(`Processing ${symbol} - IV30 Last: ${row['IV30 Last']}, IV30 % Chg: ${row['IV30 % Chg']}, % Chg: ${row['% Chg']}`);
        
        const lastPrice = parseFloat(row['Last Price']) || 0;
        const priceChange = parseFloat(row.Chg) || 0;
        let changePercent = parseFloat(row['% Chg']) || 0;
        
        // Check if the percentage seems to be in decimal format (e.g., 0.0134 instead of 1.34)
        // If the absolute change is greater than 0.10 and the % change is less than 0.10, it's probably decimal
        if (Math.abs(priceChange) > 0.10 && Math.abs(changePercent) < 0.10 && changePercent !== 0) {
            console.log(`${symbol}: Converting decimal to percentage - ${changePercent} -> ${changePercent * 100}`);
            changePercent = changePercent * 100;
        }
        
        // Alternative: Calculate % change from price and change if it seems wrong
        if (lastPrice > 0 && priceChange !== 0) {
            const calculatedPercent = (priceChange / (lastPrice - priceChange)) * 100;
            // If the parsed % is way off from calculated, use calculated
            if (Math.abs(calculatedPercent - changePercent) > 1 && Math.abs(changePercent) < 0.5) {
                console.log(`${symbol}: Using calculated % change - ${calculatedPercent.toFixed(2)}% instead of ${changePercent}%`);
                changePercent = calculatedPercent;
            }
        }
        
        processed[symbol] = {
            name: row.Name,
            lastPrice: lastPrice,
            change: priceChange,
            changePercent: changePercent,
            volume: parseInt(row.Volume) || 0,
            iv30: parseFloat(row['IV30 Last']) || parseFloat(row['IV30']) || 30,
            ivChange: parseFloat(row['IV30 % Chg']) || parseFloat(row['IV30 Chg']) || 0,
            ivChangeAbs: parseFloat(row['IV30 Chg']) || 0, // Absolute IV change
            iv30Prev: parseFloat(row['IV30 Prev']) || 0, // Previous IV if available
            volatility1Day: parseFloat(row['1-Day Volatility']) || 0,
            volatility20Day: parseFloat(row['20-Day Volatility']) || 0,
            optionVolume: parseInt(row['Option Volume']) || 0,
            putCallRatio: parseFloat(row['Put\\Call OI Ratio']) || parseFloat(row['Put/Call OI Ratio']) || 1,
            yearToDate: parseFloat(row.YTD) || 0,
            oneYear: parseFloat(row['1 Year']) || 0
        };
        
        // Calculate IV change if we have current and previous
        if (processed[symbol].iv30Prev > 0 && processed[symbol].ivChange === 0) {
            const prevIV = processed[symbol].iv30Prev;
            const currIV = processed[symbol].iv30;
            processed[symbol].ivChange = ((currIV - prevIV) / prevIV) * 100;
        }
        
        // Similarly check IV change for decimal format
        if (Math.abs(processed[symbol].ivChange) < 0.10 && processed[symbol].ivChange !== 0) {
            console.log(`${symbol}: Converting IV decimal to percentage - ${processed[symbol].ivChange} -> ${processed[symbol].ivChange * 100}`);
            processed[symbol].ivChange = processed[symbol].ivChange * 100;
        }
    });
    
    return processed;
}

// Display holdings summary
function displayHoldingsSummary() {
    if (!AppState.holdingsData) return;
    
    const summaryHTML = `
        <div class="summary-item">
            <div class="label">Total Positions</div>
            <div class="value">${AppState.holdingsData.positions.length}</div>
        </div>
        <div class="summary-item">
            <div class="label">Net Assets</div>
            <div class="value">${(AppState.holdingsData.netAssets / 1000000).toFixed(2)}M</div>
        </div>
        <div class="summary-item">
            <div class="label">Current NAV</div>
            <div class="value">${AppState.currentNAV.toFixed(2)}</div>
        </div>
        <div class="summary-item">
            <div class="label">Shares Outstanding</div>
            <div class="value">${(AppState.holdingsData.sharesOutstanding / 1000).toFixed(0)}K</div>
        </div>
        <div class="summary-item">
            <div class="label">Total Market Value</div>
            <div class="value">${(AppState.holdingsData.totalValue / 1000000).toFixed(2)}M</div>
        </div>
    `;
    
    document.getElementById('summaryGrid').innerHTML = summaryHTML;
    document.getElementById('dataSummary').classList.add('active');
    document.getElementById('fileDetails').classList.add('active');

    // Update position cards
    const stockValue = AppState.holdingsData.stocks.reduce((sum, p) => sum + p.marketValue, 0);
    const callValue = AppState.holdingsData.calls.reduce((sum, p) => sum + p.marketValue, 0);
    const putValue = AppState.holdingsData.puts.reduce((sum, p) => sum + p.marketValue, 0);
    const cashValue = AppState.holdingsData.cash ? AppState.holdingsData.cash.reduce((sum, p) => sum + p.marketValue, 0) : 0;

    // Stock card
    document.getElementById('stockCount').textContent = AppState.holdingsData.stocks.length;
    document.getElementById('stockValue').textContent = `${(stockValue / 1000000).toFixed(2)}M`;
    document.getElementById('stockWeight').textContent = `${((stockValue / AppState.holdingsData.totalValue) * 100).toFixed(1)}%`;

    // Call card
    document.getElementById('callCount').textContent = AppState.holdingsData.calls.length;
    document.getElementById('callValue').textContent = `${(callValue / 1000000).toFixed(2)}M`;
    document.getElementById('callWeight').textContent = `${((callValue / AppState.holdingsData.totalValue) * 100).toFixed(1)}%`;

    // Put card
    document.getElementById('putCount').textContent = AppState.holdingsData.puts.length;
    document.getElementById('putValue').textContent = `${(putValue / 1000000).toFixed(2)}M`;
    document.getElementById('putWeight').textContent = `${((putValue / AppState.holdingsData.totalValue) * 100).toFixed(1)}%`;

    // Cash card
    document.getElementById('cashCount').textContent = AppState.holdingsData.cash ? AppState.holdingsData.cash.length : 0;
    document.getElementById('cashValue').textContent = `${(cashValue / 1000000).toFixed(2)}M`;
    document.getElementById('cashWeight').textContent = `${((cashValue / AppState.holdingsData.totalValue) * 100).toFixed(1)}%`;
    document.getElementById('cashYield').textContent = 'N/A'; // Could calculate if yield data available
}

function displayPositionDetails() {
    console.log('Displaying position details...');
    
    const container = document.getElementById('positionDetailsTable');
    if (!container || !AppState.holdingsData) return;
    
    const data = AppState.holdingsData;
    let html = '';
    
    // Helper function to create sortable header
    function createSortableHeader(type, column, text) {
        const sortIcon = sortState[type].column === column 
            ? (sortState[type].ascending ? ' ▲' : ' ▼') 
            : ' ⇅';
        return `<th onclick="handleSort('${type}', '${column}')" style="cursor: pointer; user-select: none;">
                    ${text}${sortIcon}
                </th>`;
    }
    
    // STOCKS SECTION
    if (data.stocks && data.stocks.length > 0) {
        // Sort data if a column is selected
        let stocksToDisplay = sortState.stocks.column 
            ? sortTableData(data.stocks, sortState.stocks.column, sortState.stocks.ascending, 'stocks')
            : data.stocks;
            
        html += `
            <div class="position-section">
                <h4>📈 Stock Positions (${data.stocks.length})</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            ${createSortableHeader('stocks', 'ticker', 'Ticker')}
                            ${createSortableHeader('stocks', 'name', 'Name')}
                            ${createSortableHeader('stocks', 'shares', 'Shares')}
                            ${createSortableHeader('stocks', 'price', 'Price')}
                            ${createSortableHeader('stocks', 'marketValue', 'Market Value')}
                            ${createSortableHeader('stocks', 'weight', 'Weight')}
                            ${createSortableHeader('stocks', 'iv30', 'IV30')}
                            ${createSortableHeader('stocks', 'ivChange', 'IV Chg')}
                            ${createSortableHeader('stocks', 'dayChange', '% Chg')}
                        </tr>
                    </thead>
                    <tbody>`;
        
        stocksToDisplay.forEach(stock => {
            // Get market data for this stock
            const marketData = AppState.marketData ? AppState.marketData[stock.ticker] : null;
            const iv30 = marketData ? marketData.iv30 : '-';
            const ivChange = marketData ? marketData.ivChange : '-';
            const dayChange = marketData ? marketData.changePercent : '-';
            
            // Color coding for changes
            const dayChangeColor = dayChange !== '-' ? (dayChange >= 0 ? 'green' : 'red') : 'inherit';
            const ivChangeColor = ivChange !== '-' ? (ivChange >= 0 ? 'green' : 'red') : 'inherit';
            
            html += `
                <tr>
                    <td>${stock.ticker}</td>
                    <td>${stock.name || '-'}</td>
                    <td>${stock.shares.toLocaleString()}</td>
                    <td>$${stock.price.toFixed(2)}</td>
                    <td>$${stock.marketValue.toLocaleString()}</td>
                    <td>${stock.weight.toFixed(2)}%</td>
                    <td>${iv30 !== '-' ? iv30.toFixed(1) + '%' : '-'}</td>
                    <td style="color: ${ivChangeColor}">${ivChange !== '-' ? (ivChange >= 0 ? '+' : '') + ivChange.toFixed(2) + '%' : '-'}</td>
                    <td style="color: ${dayChangeColor}">${dayChange !== '-' ? (dayChange >= 0 ? '+' : '') + dayChange.toFixed(2) + '%' : '-'}</td>
                </tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    // CALLS SECTION
    if (data.calls && data.calls.length > 0) {
        // Sort data if a column is selected
        let callsToDisplay = sortState.calls.column 
            ? sortTableData(data.calls, sortState.calls.column, sortState.calls.ascending, 'calls')
            : data.calls;
            
        html += `
            <div class="position-section">
                <h4>📞 Call Options (${data.calls.length})</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            ${createSortableHeader('calls', 'underlying', 'Underlying')}
                            ${createSortableHeader('calls', 'strike', 'Strike')}
                            ${createSortableHeader('calls', 'expiration', 'Expiry')}
                            ${createSortableHeader('calls', 'daysToExpiry', 'DTE')}
                            ${createSortableHeader('calls', 'shares', 'Contracts')}
                            ${createSortableHeader('calls', 'price', 'Price')}
                            ${createSortableHeader('calls', 'marketValue', 'Market Value')}
                            ${createSortableHeader('calls', 'weight', 'Weight')}
                        </tr>
                    </thead>
                    <tbody>`;
        
        callsToDisplay.forEach(call => {
            const expiryDate = call.expiration ? 
                new Date(call.expiration).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '-';
            const dte = call.daysToExpiry || '-';
            
            html += `
                <tr>
                    <td>${call.underlying || call.ticker}</td>
                    <td>$${call.strike ? call.strike.toFixed(2) : '-'}</td>
                    <td>${expiryDate}</td>
                    <td>${dte}</td>
                    <td>${call.shares.toLocaleString()}</td>
                    <td>$${call.price.toFixed(2)}</td>
                    <td>$${call.marketValue.toLocaleString()}</td>
                    <td>${call.weight.toFixed(2)}%</td>
                </tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    // PUTS SECTION
    if (data.puts && data.puts.length > 0) {
        // Sort data if a column is selected
        let putsToDisplay = sortState.puts.column 
            ? sortTableData(data.puts, sortState.puts.column, sortState.puts.ascending, 'puts')
            : data.puts;
            
        html += `
            <div class="position-section">
                <h4>📉 Put Options (${data.puts.length})</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            ${createSortableHeader('puts', 'underlying', 'Underlying')}
                            ${createSortableHeader('puts', 'strike', 'Strike')}
                            ${createSortableHeader('puts', 'expiration', 'Expiry')}
                            ${createSortableHeader('puts', 'daysToExpiry', 'DTE')}
                            ${createSortableHeader('puts', 'shares', 'Contracts')}
                            ${createSortableHeader('puts', 'price', 'Price')}
                            ${createSortableHeader('puts', 'marketValue', 'Market Value')}
                            ${createSortableHeader('puts', 'weight', 'Weight')}
                        </tr>
                    </thead>
                    <tbody>`;
        
        putsToDisplay.forEach(put => {
            const expiryDate = put.expiration ? 
                new Date(put.expiration).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '-';
            const dte = put.daysToExpiry || '-';
            
            html += `
                <tr>
                    <td>${put.underlying || put.ticker}</td>
                    <td>$${put.strike ? put.strike.toFixed(2) : '-'}</td>
                    <td>${expiryDate}</td>
                    <td>${dte}</td>
                    <td>${put.shares.toLocaleString()}</td>
                    <td>$${put.price.toFixed(2)}</td>
                    <td>$${put.marketValue.toLocaleString()}</td>
                    <td>${put.weight.toFixed(2)}%</td>
                </tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    // CASH SECTION (if needed)
    if (data.cash && data.cash.length > 0) {
        let cashToDisplay = sortState.cash.column 
            ? sortTableData(data.cash, sortState.cash.column, sortState.cash.ascending, 'cash')
            : data.cash;
            
        html += `
            <div class="position-section">
                <h4>💰 Cash & Other (${data.cash.length})</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            ${createSortableHeader('cash', 'name', 'Name')}
                            ${createSortableHeader('cash', 'shares', 'Amount')}
                            ${createSortableHeader('cash', 'marketValue', 'Market Value')}
                            ${createSortableHeader('cash', 'weight', 'Weight')}
                        </tr>
                    </thead>
                    <tbody>`;
        
        cashToDisplay.forEach(cash => {
            html += `
                <tr>
                    <td>Cash/MM</td>
                    <td>${cash.name || cash.ticker}</td>
                    <td>${cash.shares.toLocaleString()}</td>
                    <td>$${cash.marketValue.toLocaleString()}</td>
                    <td>${cash.weight.toFixed(2)}%</td>
                </tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    container.innerHTML = html;
}

// Add this sorting helper function
function sortTableData(data, column, ascending, type) {
    return [...data].sort((a, b) => {
        let aVal, bVal;
        
        // Get values based on column
        switch(column) {
            case 'ticker':
            case 'underlying':
                aVal = a.underlying || a.ticker || '';
                bVal = b.underlying || b.ticker || '';
                break;
            case 'name':
                aVal = a.name || '';
                bVal = b.name || '';
                break;
            case 'shares':
                aVal = parseFloat(a.shares) || 0;
                bVal = parseFloat(b.shares) || 0;
                break;
            case 'price':
                aVal = parseFloat(a.price) || 0;
                bVal = parseFloat(b.price) || 0;
                break;
            case 'marketValue':
                aVal = parseFloat(a.marketValue) || 0;
                bVal = parseFloat(b.marketValue) || 0;
                break;
            case 'weight':
                aVal = parseFloat(a.weight) || 0;
                bVal = parseFloat(b.weight) || 0;
                break;
            case 'strike':
                aVal = parseFloat(a.strike) || 0;
                bVal = parseFloat(b.strike) || 0;
                break;
            case 'expiration':
                aVal = a.expiration ? new Date(a.expiration).getTime() : 0;
                bVal = b.expiration ? new Date(b.expiration).getTime() : 0;
                break;
            case 'daysToExpiry':
                aVal = a.daysToExpiry || 0;
                bVal = b.daysToExpiry || 0;
                break;
            case 'iv30':
                // Get IV from market data
                aVal = AppState.marketData && AppState.marketData[a.ticker] ? AppState.marketData[a.ticker].iv30 : 0;
                bVal = AppState.marketData && AppState.marketData[b.ticker] ? AppState.marketData[b.ticker].iv30 : 0;
                break;
            case 'ivChange':
                // Get IV change from market data
                aVal = AppState.marketData && AppState.marketData[a.ticker] ? AppState.marketData[a.ticker].ivChange : 0;
                bVal = AppState.marketData && AppState.marketData[b.ticker] ? AppState.marketData[b.ticker].ivChange : 0;
                break;
            case 'dayChange':
                // Get day change from market data
                aVal = AppState.marketData && AppState.marketData[a.ticker] ? AppState.marketData[a.ticker].changePercent : 0;
                bVal = AppState.marketData && AppState.marketData[b.ticker] ? AppState.marketData[b.ticker].changePercent : 0;
                break;
            default:
                aVal = a[column] || '';
                bVal = b[column] || '';
        }
        
        // Compare values
        if (typeof aVal === 'string') {
            return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
            return ascending ? aVal - bVal : bVal - aVal;
        }
    });
}

// Add click handler function
function handleSort(type, column) {
    console.log(`Sorting ${type} by ${column}`);
    
    // Toggle sort direction if same column, otherwise default to ascending
    if (sortState[type].column === column) {
        sortState[type].ascending = !sortState[type].ascending;
    } else {
        sortState[type].column = column;
        sortState[type].ascending = true;
    }
    
    // Redisplay with current sort
    displayPositionDetails();
}

// Make it globally accessible
window.handleSort = handleSort;
// Display performance metrics when market data is loaded
function displayPerformanceMetrics() {
    if (!AppState.holdingsData || !AppState.marketData) return;
    
    // Calculate metrics for each position that has market data
    let totalMarketMove = 0;
    let totalIVChange = 0;
    let positionsWithData = 0;
    
    AppState.holdingsData.positions.forEach(position => {
        const symbol = position.underlying || position.ticker;
        const marketData = AppState.marketData[symbol];
        
        if (marketData) {
            totalMarketMove += (marketData.changePercent || 0) * position.weight;
            totalIVChange += (marketData.iv30Change || 0) * position.weight;
            positionsWithData++;
        }
    });
    
    // Update the summary display if it exists
    const summaryGrid = document.getElementById('summaryGrid');
    if (summaryGrid && positionsWithData > 0) {
        // Add performance metrics to the existing summary
        const perfMetricsHTML = `
            <div class="summary-item">
                <div class="label">Market Move</div>
                <div class="value">${totalMarketMove >= 0 ? '+' : ''}${totalMarketMove.toFixed(2)}%</div>
            </div>
            <div class="summary-item">
                <div class="label">IV Change</div>
                <div class="value">${totalIVChange >= 0 ? '+' : ''}${totalIVChange.toFixed(1)}%</div>
            </div>
        `;
        
        // Check if performance metrics already exist, if not append them
        if (!summaryGrid.querySelector('.perf-metrics')) {
            const perfDiv = document.createElement('div');
            perfDiv.className = 'perf-metrics';
            perfDiv.innerHTML = perfMetricsHTML;
            summaryGrid.appendChild(perfDiv);
        }
    }
    
    console.log(`Performance metrics calculated for ${positionsWithData} positions`);
}

// Make functions globally available
window.processHoldingsData = processHoldingsData;
window.processMarketData = processMarketData;
window.displayHoldingsSummary = displayHoldingsSummary;
window.displayPositionDetails = displayPositionDetails;
window.displayPerformanceMetrics = displayPerformanceMetrics;
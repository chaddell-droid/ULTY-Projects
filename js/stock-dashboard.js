// Stock Dashboard - Moving average calculations for custom watchlists

const StockDashboardState = {
    rows: [],
    loading: false,
    maxSymbols: 25
};

const VALID_SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,15}$/;

// Initialize listeners once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    renderStockGrid();
    updateStockDashboardStatus('info', 'Enter ticker symbols to load moving averages and export them to Excel.');

    const inputEl = document.getElementById('stockSymbolsInput');
    if (inputEl) {
        inputEl.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                fetchMovingAverages();
            }
        });
    }
});

// Parse user input into a list of valid ticker symbols
function parseSymbolInput(rawValue) {
    const tokens = (rawValue || '')
        .split(/[\s,]+/)
        .map(token => token.trim().toUpperCase())
        .filter(Boolean);

    const validSymbols = [];
    const invalidSymbols = [];

    tokens.forEach(token => {
        if (!VALID_SYMBOL_PATTERN.test(token)) {
            if (!invalidSymbols.includes(token)) {
                invalidSymbols.push(token);
            }
            return;
        }

        if (!validSymbols.includes(token)) {
            validSymbols.push(token);
        }
    });

    let truncated = false;
    if (validSymbols.length > StockDashboardState.maxSymbols) {
        validSymbols.length = StockDashboardState.maxSymbols;
        truncated = true;
    }

    return { validSymbols, invalidSymbols, truncated };
}

// Fetch moving average data for the provided symbols
async function fetchMovingAverages() {
    const inputEl = document.getElementById('stockSymbolsInput');
    const rawValue = inputEl ? inputEl.value : '';
    const { validSymbols, invalidSymbols, truncated } = parseSymbolInput(rawValue);

    if (!validSymbols.length) {
        updateStockDashboardStatus('error', 'Please enter at least one valid stock symbol.');
        StockDashboardState.rows = [];
        renderStockGrid();
        updateExportButtonState();
        return;
    }

    const loadingMessages = ['Loading price history...'];
    if (invalidSymbols.length) {
        loadingMessages.push(`Ignoring invalid entries: ${invalidSymbols.join(', ')}.`);
    }
    if (truncated) {
        loadingMessages.push(`Only the first ${StockDashboardState.maxSymbols} symbols were used to avoid rate limits.`);
    }

    updateStockDashboardStatus('info', loadingMessages.join(' '));
    setDashboardLoading(true);

    try {
        const errors = [];
        const responses = await Promise.all(validSymbols.map(async symbol => {
            try {
                return await requestSymbolHistory(symbol);
            } catch (error) {
                errors.push({ symbol, message: error.message });
                console.error(`Stock dashboard: failed to load ${symbol}`, error);
                return null;
            }
        }));

        StockDashboardState.rows = responses.filter(Boolean);
        renderStockGrid();
        updateExportButtonState();

        if (StockDashboardState.rows.length > 0) {
            let successMessage = `Loaded moving averages for ${StockDashboardState.rows.length} symbol${StockDashboardState.rows.length === 1 ? '' : 's'}.`;
            if (errors.length) {
                const failedSymbols = errors.map(err => err.symbol).join(', ');
                successMessage += ` Unable to load data for: ${failedSymbols}.`;
            }
            updateStockDashboardStatus('success', successMessage);
        } else {
            const failedSymbols = errors.length ? errors.map(err => err.symbol).join(', ') : validSymbols.join(', ');
            updateStockDashboardStatus('error', `Unable to retrieve market data for ${failedSymbols}. Please try again later.`);
        }
    } catch (error) {
        console.error('Stock dashboard: unexpected error', error);
        updateStockDashboardStatus('error', 'An unexpected error occurred while loading data. Please try again.');
    } finally {
        setDashboardLoading(false);
    }
}

// Retrieve historical price data for a single symbol
async function requestSymbolHistory(symbol) {
    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=1y&interval=1d&includePrePost=false&events=div%2Csplit`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`(${response.status}) ${response.statusText || 'Unable to reach data provider'}`);
    }

    const payload = await response.json();
    if (payload?.chart?.error) {
        throw new Error(payload.chart.error.description || 'Data provider returned an error');
    }

    const result = payload?.chart?.result && payload.chart.result[0];
    const quote = result?.indicators?.quote && result.indicators.quote[0];
    if (!result || !quote) {
        throw new Error('No price history returned');
    }

    const closes = quote.close || [];
    const timestamps = result.timestamp || [];
    const points = [];

    for (let i = 0; i < closes.length; i++) {
        const close = closes[i];
        if (!isFiniteNumber(close)) {
            continue;
        }
        const time = timestamps[i] ? timestamps[i] * 1000 : null;
        points.push({ close, time });
    }

    if (!points.length) {
        throw new Error('No closing prices available');
    }

    const lastPoint = points[points.length - 1];

    return {
        symbol,
        price: lastPoint.close,
        asOf: lastPoint.time,
        ma9: calculateMovingAverage(points, 9),
        ma21: calculateMovingAverage(points, 21),
        ma50: calculateMovingAverage(points, 50),
        ma200: calculateMovingAverage(points, 200)
    };
}

// Calculate the moving average for the latest available period
function calculateMovingAverage(points, period) {
    const values = [];
    for (let i = points.length - 1; i >= 0 && values.length < period; i--) {
        const price = points[i].close;
        if (isFiniteNumber(price)) {
            values.push(price);
        }
    }

    if (values.length < period) {
        return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return total / period;
}

// Render the dashboard grid
function renderStockGrid() {
    const grid = document.getElementById('stockGrid');
    if (!grid) {
        return;
    }

    if (!StockDashboardState.rows.length) {
        grid.innerHTML = '<div class="stock-dashboard-empty">Add ticker symbols above to calculate moving averages and see them here.</div>';
        return;
    }

    const cards = StockDashboardState.rows.map(createStockCard).join('');
    grid.innerHTML = cards;
}

// Generate the markup for a single stock card
function createStockCard(row) {
    const maCells = [9, 21, 50, 200]
        .map(period => renderMovingAverageCell(period, row[`ma${period}`], row.price))
        .join('');

    return `
        <div class="stock-card">
            <div class="stock-card-header">
                <span class="stock-symbol">${row.symbol}</span>
                <span class="stock-price">${formatCurrency(row.price)}</span>
            </div>
            <div class="stock-updated">${formatAsOf(row.asOf)}</div>
            <div class="stock-ma-grid">
                ${maCells}
            </div>
        </div>
    `;
}

function renderMovingAverageCell(period, average, price) {
    const diffInfo = describeDifference(price, average);
    return `
        <div class="ma-card">
            <div class="ma-label">${period}-Day MA</div>
            <div class="ma-value">${formatCurrency(average)}</div>
            <div class="ma-diff ${diffInfo.className}">${diffInfo.text}</div>
        </div>
    `;
}

function describeDifference(price, average) {
    const diff = calculatePercentDifference(price, average);
    if (diff === null) {
        return { text: 'Insufficient data', className: 'neutral' };
    }

    if (Math.abs(diff) < 0.01) {
        return { text: 'Aligned with price', className: 'neutral' };
    }

    const direction = diff > 0 ? 'Above' : 'Below';
    return {
        text: `${direction} by ${Math.abs(diff).toFixed(2)}%`,
        className: diff > 0 ? 'positive' : 'negative'
    };
}

// Export the dashboard data to an Excel workbook
function exportMovingAverages() {
    if (StockDashboardState.loading) {
        return;
    }

    if (!StockDashboardState.rows.length) {
        updateStockDashboardStatus('error', 'Load some symbols before exporting.');
        return;
    }

    if (typeof XLSX === 'undefined') {
        updateStockDashboardStatus('error', 'Excel export library is unavailable. Please check your connection and try again.');
        return;
    }

    const header = [
        'Symbol',
        'Last Close',
        'As Of',
        '9-Day MA',
        '21-Day MA',
        '50-Day MA',
        '200-Day MA',
        'Price vs 9-Day %',
        'Price vs 21-Day %',
        'Price vs 50-Day %',
        'Price vs 200-Day %'
    ];

    const rows = StockDashboardState.rows.map(row => [
        row.symbol,
        safeNumber(row.price),
        row.asOf ? new Date(row.asOf) : '',
        safeNumber(row.ma9),
        safeNumber(row.ma21),
        safeNumber(row.ma50),
        safeNumber(row.ma200),
        formatPercentDifference(row.price, row.ma9),
        formatPercentDifference(row.price, row.ma21),
        formatPercentDifference(row.price, row.ma50),
        formatPercentDifference(row.price, row.ma200)
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    worksheet['!cols'] = [
        { wch: 10 },
        { wch: 12 },
        { wch: 16 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Moving Averages');

    const fileDate = new Date().toISOString().split('T')[0];
    const filename = `stock-moving-averages-${fileDate}.xlsx`;
    XLSX.writeFile(workbook, filename);

    updateStockDashboardStatus('success', `Exported moving average data to ${filename}.`);
}

function updateStockDashboardStatus(type, message) {
    const statusEl = document.getElementById('stockDashboardStatus');
    if (!statusEl) {
        return;
    }

    statusEl.className = 'stock-dashboard-status';
    if (!message) {
        statusEl.textContent = '';
        return;
    }

    const statusType = type || 'info';
    statusEl.classList.add(statusType);
    statusEl.textContent = message;
}

function setDashboardLoading(isLoading) {
    StockDashboardState.loading = isLoading;
    const loadBtn = document.getElementById('loadMovingAveragesBtn');

    if (loadBtn) {
        if (isLoading) {
            if (!loadBtn.dataset.originalText) {
                loadBtn.dataset.originalText = loadBtn.textContent || 'Load Averages';
            }
            loadBtn.textContent = 'Loading...';
        } else if (loadBtn.dataset.originalText) {
            loadBtn.textContent = loadBtn.dataset.originalText;
        }
        loadBtn.disabled = isLoading;
    }

    updateExportButtonState();
}

function updateExportButtonState() {
    const exportBtn = document.getElementById('exportMovingAveragesBtn');
    if (!exportBtn) {
        return;
    }

    exportBtn.disabled = StockDashboardState.loading || !StockDashboardState.rows.length;
}

function calculatePercentDifference(price, average) {
    if (!isFiniteNumber(price) || !isFiniteNumber(average) || average === 0) {
        return null;
    }

    return ((price - average) / average) * 100;
}

function safeNumber(value) {
    if (!isFiniteNumber(value)) {
        return '';
    }
    return Number(value.toFixed(4));
}

function formatPercentDifference(price, average) {
    const diff = calculatePercentDifference(price, average);
    if (diff === null) {
        return '';
    }

    const rounded = diff.toFixed(2);
    return `${diff > 0 ? '+' : ''}${rounded}%`;
}

function formatCurrency(value) {
    if (!isFiniteNumber(value)) {
        return '—';
    }
    return `$${value.toFixed(2)}`;
}

function formatAsOf(timestamp) {
    if (!timestamp) {
        return 'Last close: —';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return 'Last close: —';
    }

    return `Last close: ${date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })}`;
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

// Expose functions for global access
window.fetchMovingAverages = fetchMovingAverages;
window.exportMovingAverages = exportMovingAverages;
window.StockDashboardState = StockDashboardState;

// Stock Moving Average Dashboard Logic

const StockDashboardState = {
    data: [],
    loading: false
};

const SYMBOL_PATTERN = /^[A-Za-z0-9.\-^=]{1,15}$/;
const MAX_SYMBOLS = 25;

const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.getElementById('fetchMovingAverages');
    const exportButton = document.getElementById('exportMovingAverages');
    const input = document.getElementById('symbolInput');

    if (fetchButton) {
        fetchButton.addEventListener('click', handleFetchMovingAverages);
    }

    if (exportButton) {
        exportButton.addEventListener('click', exportMovingAveragesToExcel);
    }

    if (input) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleFetchMovingAverages();
            }
        });
    }
});

function handleFetchMovingAverages() {
    const input = document.getElementById('symbolInput');
    if (!input) {
        return;
    }

    const rawSymbols = input.value
        .split(',')
        .map(symbol => symbol.trim().toUpperCase())
        .filter(Boolean);

    const uniqueSymbols = Array.from(new Set(rawSymbols));

    if (uniqueSymbols.length === 0) {
        setDashboardStatus('error', 'Enter one or more ticker symbols separated by commas.');
        renderPlaceholderState();
        return;
    }

    const validSymbols = uniqueSymbols.filter(symbol => SYMBOL_PATTERN.test(symbol));
    const invalidSymbols = uniqueSymbols.filter(symbol => !SYMBOL_PATTERN.test(symbol));

    if (validSymbols.length === 0) {
        setDashboardStatus('error', 'Enter one or more valid ticker symbols (letters, numbers, ".", "-", "^").');
        renderPlaceholderState();
        return;
    }

    const truncatedSymbols = validSymbols.length > MAX_SYMBOLS ? validSymbols.slice(MAX_SYMBOLS) : [];
    const symbolsToQuery = validSymbols.slice(0, MAX_SYMBOLS);

    const noteParts = [];
    if (invalidSymbols.length) {
        noteParts.push(`ignoring ${invalidSymbols.join(', ')}`);
    }
    if (truncatedSymbols.length) {
        noteParts.push(`processing only the first ${symbolsToQuery.length} tickers`);
    }

    const suffix = noteParts.length ? ` (${noteParts.join('; ')})` : '';

    setLoadingState(true);
    setDashboardStatus('loading', `Fetching data for ${symbolsToQuery.join(', ')}${suffix}.`);
    renderLoadingState(symbolsToQuery.length);

    fetch(`/api/moving-averages?symbols=${encodeURIComponent(symbolsToQuery.join(','))}`)
        .then(response => response.json())
        .then(payload => handleMovingAverageResponse(payload))
        .catch(error => {
            console.error('Error fetching moving averages:', error);
            setDashboardStatus('error', 'We ran into an issue fetching data. Please try again shortly.');
            renderErrorState('Unable to retrieve moving averages right now.');
            StockDashboardState.data = [];
            updateExportButtonState();
        })
        .finally(() => {
            setLoadingState(false);
        });
}

function handleMovingAverageResponse(payload) {
    if (!payload || payload.success === false) {
        const message = payload && payload.error ? payload.error : 'Unable to retrieve moving averages.';
        setDashboardStatus('error', message);
        renderErrorState('No data returned from the moving average service.');
        StockDashboardState.data = [];
        updateExportButtonState();
        return;
    }

    const results = Array.isArray(payload.data) ? payload.data : [];
    const validResults = results.filter(item => item && !item.error && item.movingAverages);
    const errorResults = results.filter(item => item && item.error);

    StockDashboardState.data = validResults;

    renderMovingAverageGrid(results);
    updateExportButtonState();

    const meta = payload.meta || {};
    const invalidSymbols = Array.isArray(meta.invalidSymbols) ? meta.invalidSymbols : [];
    const truncatedSymbols = Array.isArray(meta.truncatedSymbols) ? meta.truncatedSymbols : [];

    const messageSegments = [];
    if (validResults.length) {
        messageSegments.push(`Loaded moving averages for ${validResults.length} symbol${validResults.length === 1 ? '' : 's'}.`);
    }
    if (errorResults.length) {
        const missingSymbols = errorResults
            .map(item => item.symbol)
            .filter(Boolean);
        if (missingSymbols.length) {
            messageSegments.push(`No recent pricing data for ${missingSymbols.join(', ')}.`);
        } else {
            messageSegments.push(`Unable to calculate data for ${errorResults.length} symbol${errorResults.length === 1 ? '' : 's'}.`);
        }
    }
    if (invalidSymbols.length) {
        messageSegments.push(`Ignored invalid ticker${invalidSymbols.length === 1 ? '' : 's'}: ${invalidSymbols.join(', ')}.`);
    }
    if (truncatedSymbols.length) {
        messageSegments.push(`Skipped additional symbol${truncatedSymbols.length === 1 ? '' : 's'} due to the 25 ticker limit: ${truncatedSymbols.join(', ')}.`);
    }

    const statusType = validResults.length && !errorResults.length ? 'success' : validResults.length ? 'info' : 'error';
    const fallbackMessage = validResults.length ? 'Moving averages loaded.' : 'No moving average data returned.';

    setDashboardStatus(statusType, messageSegments.join(' ') || fallbackMessage);

    if (!results.length) {
        renderErrorState('No price history was returned for the requested symbols.');
    }
}

function renderMovingAverageGrid(items) {
    const grid = document.getElementById('movingAverageGrid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    if (!items.length) {
        renderPlaceholderState();
        return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        if (!item) {
            return;
        }

        if (item.error) {
            fragment.appendChild(createErrorCard(item.symbol, item.error));
        } else {
            fragment.appendChild(createDataCard(item));
        }
    });

    grid.appendChild(fragment);
}

function createDataCard(item) {
    const card = document.createElement('div');
    card.className = 'ma-card';

    const price = Number(item.lastPrice);
    const movingAverages = item.movingAverages || {};
    const trend = determineTrend(movingAverages, price);

    const footerSegments = [];
    if (Number.isFinite(Number(item.historyLength))) {
        const history = Number(item.historyLength);
        footerSegments.push(`${history} data point${history === 1 ? '' : 's'}`);
    }
    if (item.lastUpdated) {
        footerSegments.push(formatDateTime(item.lastUpdated));
    }

    card.innerHTML = `
        <div class="ma-card-header">
            <div class="ma-card-heading">
                <span class="ma-symbol">${item.symbol || '—'}</span>
                <span class="ma-trend ma-trend--${trend.className}">${trend.label}</span>
            </div>
            <span class="ma-price">${formatCurrency(price)}</span>
        </div>
        <div class="ma-card-body">
            ${createMetricRow('9-Day MA', movingAverages.ma9, price)}
            ${createMetricRow('21-Day MA', movingAverages.ma21, price)}
            ${createMetricRow('50-Day MA', movingAverages.ma50, price)}
            ${createMetricRow('200-Day MA', movingAverages.ma200, price)}
        </div>
        <div class="ma-card-footer">
            ${footerSegments.length ? footerSegments.map(text => `<span>${text}</span>`).join('<span class="ma-footer-divider">•</span>') : '<span>Latest data unavailable</span>'}
        </div>
    `;

    return card;
}

function createErrorCard(symbol, message) {
    const card = document.createElement('div');
    card.className = 'ma-card ma-card--error';

    const safeMessage = message || 'No pricing data is currently available for this ticker.';

    card.innerHTML = `
        <div class="ma-card-header">
            <span class="ma-symbol">${symbol || 'Unknown'}</span>
            <span class="ma-error-badge">Data Unavailable</span>
        </div>
        <p class="ma-error-message">${safeMessage}</p>
    `;

    return card;
}

function renderLoadingState(symbolCount) {
    const grid = document.getElementById('movingAverageGrid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    const cardsToRender = Math.min(Math.max(symbolCount, 1), 6);

    for (let i = 0; i < cardsToRender; i += 1) {
        const card = document.createElement('div');
        card.className = 'ma-card ma-card--loading';
        card.innerHTML = `
            <div class="ma-skeleton ma-skeleton--title"></div>
            <div class="ma-skeleton ma-skeleton--price"></div>
            <div class="ma-skeleton ma-skeleton--line"></div>
            <div class="ma-skeleton ma-skeleton--line short"></div>
            <div class="ma-skeleton ma-skeleton--line"></div>
            <div class="ma-skeleton ma-skeleton--line short"></div>
        `;
        grid.appendChild(card);
    }
}

function renderPlaceholderState() {
    renderErrorState('Enter one or more comma-separated tickers and click “Calculate Moving Averages” to populate the dashboard.');
}

function renderErrorState(message) {
    const grid = document.getElementById('movingAverageGrid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'ma-placeholder';
    placeholder.textContent = message;
    grid.appendChild(placeholder);
}

function setLoadingState(isLoading) {
    const fetchButton = document.getElementById('fetchMovingAverages');
    const exportButton = document.getElementById('exportMovingAverages');

    StockDashboardState.loading = isLoading;

    if (fetchButton) {
        fetchButton.disabled = isLoading;
        fetchButton.textContent = isLoading ? 'Loading…' : 'Calculate Moving Averages';
    }

    if (exportButton && isLoading) {
        exportButton.disabled = true;
    }
}

function updateExportButtonState() {
    const exportButton = document.getElementById('exportMovingAverages');
    if (!exportButton) {
        return;
    }

    exportButton.disabled = !Array.isArray(StockDashboardState.data) || StockDashboardState.data.length === 0;
}

function setDashboardStatus(type, message) {
    const statusEl = document.getElementById('stockDashboardStatus');
    if (!statusEl) {
        return;
    }

    if (!message) {
        statusEl.style.display = 'none';
        statusEl.className = 'ma-status';
        statusEl.textContent = '';
        return;
    }

    const icons = {
        loading: '⏳',
        success: '✅',
        error: '⚠️',
        info: 'ℹ️'
    };

    statusEl.style.display = 'flex';
    statusEl.className = `ma-status ma-status--${['loading', 'success', 'error', 'info'].includes(type) ? type : 'info'}`;

    statusEl.innerHTML = '';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'ma-status-icon';
    iconSpan.textContent = icons[type] || icons.info;

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    statusEl.appendChild(iconSpan);
    statusEl.appendChild(textSpan);
}

function createMetricRow(label, value, price) {
    const formattedValue = formatCurrency(value);
    const deltaMarkup = buildDeltaMarkup(value, price);

    return `
        <div class="ma-metric">
            <span class="ma-label">${label}</span>
            <div class="ma-values">
                <span class="ma-value">${formattedValue}</span>
                ${deltaMarkup}
            </div>
        </div>
    `;
}

function buildDeltaMarkup(value, price) {
    const numericValue = Number(value);
    const numericPrice = Number(price);

    if (!Number.isFinite(numericValue) || !Number.isFinite(numericPrice) || numericValue === 0) {
        return '';
    }

    const diff = ((numericPrice - numericValue) / numericValue) * 100;

    if (!Number.isFinite(diff)) {
        return '';
    }

    const className = diff >= 0 ? 'positive' : 'negative';
    const formatted = `${diff >= 0 ? '+' : ''}${Math.abs(diff) < 0.01 ? diff.toFixed(4) : diff.toFixed(2)}%`;

    return `<span class="ma-delta ${className}">${formatted}</span>`;
}

function determineTrend(movingAverages, price) {
    const numericPrice = Number(price);
    const ma50 = Number(movingAverages && movingAverages.ma50);
    const ma200 = Number(movingAverages && movingAverages.ma200);

    const hasPrice = Number.isFinite(numericPrice);
    const has50 = Number.isFinite(ma50);
    const has200 = Number.isFinite(ma200);

    if (hasPrice && has50 && has200) {
        if (numericPrice >= ma50 && ma50 >= ma200) {
            return { label: 'Strong Uptrend', className: 'positive' };
        }
        if (numericPrice >= ma50 && ma50 < ma200) {
            return { label: 'Short-Term Strength', className: 'positive' };
        }
        if (numericPrice < ma50 && ma50 < ma200) {
            return { label: 'Downtrend Risk', className: 'negative' };
        }
        return { label: 'Mixed Signals', className: 'neutral' };
    }

    if (hasPrice && has50) {
        return numericPrice >= ma50
            ? { label: 'Above 50 DMA', className: 'positive' }
            : { label: 'Below 50 DMA', className: 'negative' };
    }

    return { label: 'Signal Pending', className: 'neutral' };
}

function formatCurrency(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 'N/A';
    }
    return currencyFormatter.format(numeric);
}

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Updated time unavailable';
    }
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

function exportMovingAveragesToExcel() {
    if (!Array.isArray(StockDashboardState.data) || StockDashboardState.data.length === 0) {
        setDashboardStatus('error', 'Load moving averages before exporting to Excel.');
        return;
    }

    if (typeof XLSX === 'undefined') {
        setDashboardStatus('error', 'Excel export library is not available. Check your connection and try again.');
        return;
    }

    const headers = ['Symbol', 'Last Price', '9 Day MA', '21 Day MA', '50 Day MA', '200 Day MA', 'Last Updated', 'Data Points'];
    const rows = StockDashboardState.data.map(item => [
        item.symbol || '',
        toNumberOrBlank(item.lastPrice),
        toNumberOrBlank(item.movingAverages && item.movingAverages.ma9),
        toNumberOrBlank(item.movingAverages && item.movingAverages.ma21),
        toNumberOrBlank(item.movingAverages && item.movingAverages.ma50),
        toNumberOrBlank(item.movingAverages && item.movingAverages.ma200),
        formatDateForExport(item.lastUpdated),
        Number.isFinite(Number(item.historyLength)) ? Number(item.historyLength) : ''
    ]);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Moving Averages');

    const isoDate = new Date().toISOString().split('T')[0];
    const filename = `moving-averages-${isoDate}.xlsx`;
    XLSX.writeFile(workbook, filename);

    setDashboardStatus('success', `Excel export generated (${filename}).`);
}

function toNumberOrBlank(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : '';
}

function formatDateForExport(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

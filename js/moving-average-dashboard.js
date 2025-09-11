const ORATS_BASE_URL = 'https://api.orats.io/data/prices';

async function fetchDailyPrices(symbol, apiKey) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 20); // fetch ~20 years for monthly averages
    const url = `${ORATS_BASE_URL}?symbol=${symbol}&start=${start.toISOString().slice(0,10)}&end=${end.toISOString().slice(0,10)}`;
    const response = await fetch(url, {
        headers: {
            'x-api-key': apiKey
        }
    });
    if (!response.ok) {
        throw new Error(`ORATS API error for ${symbol}: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    // Expecting array of {date: 'YYYY-MM-DD', close: Number}
    return data;
}

function calculateSMA(data, window) {
    if (data.length < window) return null;
    let sum = 0;
    for (let i = data.length - window; i < data.length; i++) {
        sum += data[i].close;
    }
    return sum / window;
}

function resample(data, period) {
    const groups = {};
    for (const item of data) {
        const d = new Date(item.date);
        let key;
        if (period === 'week') {
            const year = d.getUTCFullYear();
            const oneJan = new Date(Date.UTC(year, 0, 1));
            const week = Math.floor((d - oneJan) / (7 * 24 * 3600 * 1000));
            key = `${year}-W${week}`;
        } else if (period === 'month') {
            key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        }
        groups[key] = item; // last entry for period stays
    }
    return Object.values(groups);
}

function analyzeSymbol(dailyData) {
    const currentPrice = dailyData[dailyData.length - 1].close;
    const daily = {
        ma9: calculateSMA(dailyData, 9),
        ma21: calculateSMA(dailyData, 21),
        ma50: calculateSMA(dailyData, 50),
        ma200: calculateSMA(dailyData, 200)
    };
    const weeklyData = resample(dailyData, 'week');
    const weekly = {
        ma9: calculateSMA(weeklyData, 9),
        ma21: calculateSMA(weeklyData, 21),
        ma50: calculateSMA(weeklyData, 50),
        ma200: calculateSMA(weeklyData, 200)
    };
    const monthlyData = resample(dailyData, 'month');
    const monthly = {
        ma9: calculateSMA(monthlyData, 9),
        ma21: calculateSMA(monthlyData, 21),
        ma50: calculateSMA(monthlyData, 50),
        ma200: calculateSMA(monthlyData, 200)
    };
    return { currentPrice, daily, weekly, monthly };
}

function formatPrice(value) {
    return value != null ? value.toFixed(2) : 'N/A';
}

function formatMA(ma, price) {
    if (ma == null) return 'N/A';
    const status = price >= ma ? '↑' : '↓';
    return `${ma.toFixed(2)} ${status}`;
}

function renderResults(results) {
    const container = document.getElementById('results');
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Symbol</th><th>Timeframe</th><th>Price</th><th>MA9</th><th>MA21</th><th>MA50</th><th>MA200</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    results.forEach(r => {
        ['daily', 'weekly', 'monthly'].forEach(tf => {
            const ma = r[tf];
            const row = document.createElement('tr');
            row.innerHTML = `<td>${r.symbol}</td><td>${tf}</td><td>${formatPrice(r.currentPrice)}</td>` +
                `<td>${formatMA(ma.ma9, r.currentPrice)}</td>` +
                `<td>${formatMA(ma.ma21, r.currentPrice)}</td>` +
                `<td>${formatMA(ma.ma50, r.currentPrice)}</td>` +
                `<td>${formatMA(ma.ma200, r.currentPrice)}</td>`;
            tbody.appendChild(row);
        });
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

document.getElementById('loadButton').addEventListener('click', async () => {
    const symbols = document.getElementById('symbolsInput').value
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const results = [];
    for (const symbol of symbols) {
        try {
            const prices = await fetchDailyPrices(symbol, apiKey);
            const analysis = analyzeSymbol(prices);
            results.push({ symbol, ...analysis });
        } catch (err) {
            console.error(err);
        }
    }
    renderResults(results);
});

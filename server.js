// Simple Node.js server to handle file auto-loading
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { IBApiNext, IBApiNextError } = require('@stoqey/ib');

const PORT = 8080;
const DOWNLOADS_DIR = 'C:\\Users\\Chad\\Downloads';
const MOVING_AVERAGE_SYMBOL_REGEX = /^[A-Za-z0-9.\-^=]{1,15}$/;
const MAX_MOVING_AVERAGE_SYMBOLS = 25;

// Interactive Brokers configuration
const IB_CONFIG = {
    host: '127.0.0.1',
    port: 4002,  // 4001 for live, 4002 for paper trading (Gateway), 7496 for TWS live, 7497 for TWS paper
    clientId: 1
};

// IB API instance (lazy-loaded)
let ibApi = null;
let ibConnected = false;
let ibConnectionInProgress = false;

// CORS headers to allow browser access
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Function to find the most recent file matching a pattern
function findMostRecentFile(directory, pattern) {
    try {
        const files = fs.readdirSync(directory);
        const matchingFiles = files.filter(file =>
            file.startsWith(pattern) && file.toLowerCase().endsWith('.csv')
        );
        
        if (matchingFiles.length === 0) {
            return null;
        }
        
        // Get file stats and sort by modified time
        const filesWithStats = matchingFiles.map(file => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                path: filePath,
                modified: stats.mtime
            };
        });
        
        // Sort by modified time (newest first)
        filesWithStats.sort((a, b) => b.modified - a.modified);
        
        return filesWithStats[0];
    } catch (error) {
        console.error('Error finding files:', error);
        return null;
    }
}

function calculateSMA(history, windowSize) {
    if (!Array.isArray(history) || history.length < windowSize) {
        return null;
    }

    const recentHistory = history.slice(-windowSize);
    const total = recentHistory.reduce((acc, entry) => acc + Number(entry.close || 0), 0);

    if (!Number.isFinite(total)) {
        return null;
    }

    return Number((total / windowSize).toFixed(2));
}

function fetchSymbolMovingAverages(symbol) {
    return new Promise((resolve) => {
        const requestUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false&events=div%2Csplit`;

        const request = https.get(requestUrl, (apiRes) => {
            let rawData = '';

            apiRes.on('data', (chunk) => {
                rawData += chunk;
            });

            apiRes.on('end', () => {
                if (apiRes.statusCode !== 200) {
                    resolve({
                        symbol,
                        error: `Received status ${apiRes.statusCode} from data provider.`
                    });
                    return;
                }

                try {
                    const parsed = JSON.parse(rawData);
                    const chart = parsed && parsed.chart && Array.isArray(parsed.chart.result)
                        ? parsed.chart.result[0]
                        : null;

                    if (!chart || !Array.isArray(chart.timestamp)) {
                        resolve({ symbol, error: 'No price history returned.' });
                        return;
                    }

                    const closeValues = chart.indicators
                        && Array.isArray(chart.indicators.quote)
                        && chart.indicators.quote[0]
                        ? chart.indicators.quote[0].close || []
                        : [];

                    const timestamps = chart.timestamp;
                    const history = [];

                    for (let i = 0; i < timestamps.length; i += 1) {
                        const close = closeValues[i];
                        if (close !== null && close !== undefined) {
                            history.push({
                                timestamp: timestamps[i],
                                close: Number(close)
                            });
                        }
                    }

                    if (!history.length) {
                        resolve({ symbol, error: 'Price history missing closing values.' });
                        return;
                    }

                    const movingAverages = {
                        ma9: calculateSMA(history, 9),
                        ma21: calculateSMA(history, 21),
                        ma50: calculateSMA(history, 50),
                        ma200: calculateSMA(history, 200)
                    };

                    const lastEntry = history[history.length - 1];

                    resolve({
                        symbol,
                        lastPrice: Number(Number(lastEntry.close).toFixed(2)),
                        lastUpdated: new Date(lastEntry.timestamp * 1000).toISOString(),
                        historyLength: history.length,
                        movingAverages
                    });
                } catch (err) {
                    console.error(`Error parsing data for ${symbol}:`, err.message);
                    resolve({ symbol, error: 'Unable to parse data response.' });
                }
            });
        });

        request.on('error', (err) => {
            console.error(`Error fetching data for ${symbol}:`, err.message);
            resolve({ symbol, error: 'Unable to reach data provider.' });
        });

        request.setTimeout(8000, () => {
            request.destroy(new Error('Request timed out'));
        });
    });
}

// Interactive Brokers connection and data retrieval functions
async function connectToIB() {
    if (ibConnected) {
        return { success: true, message: 'Already connected' };
    }

    if (ibConnectionInProgress) {
        return { success: false, error: 'Connection already in progress' };
    }

    try {
        ibConnectionInProgress = true;

        if (!ibApi) {
            ibApi = new IBApiNext({
                host: IB_CONFIG.host,
                port: IB_CONFIG.port,
                clientId: IB_CONFIG.clientId
            });

            // Set up error handler
            ibApi.on('error', (err, data) => {
                console.error('IB API Error:', err, data);
            });

            // Set up disconnection handler
            ibApi.on('disconnected', () => {
                console.log('Disconnected from IB Gateway/TWS');
                ibConnected = false;
            });
        }

        await ibApi.connect();
        ibConnected = true;
        ibConnectionInProgress = false;

        console.log('Successfully connected to Interactive Brokers');
        return { success: true, message: 'Connected to IB' };
    } catch (error) {
        ibConnectionInProgress = false;
        ibConnected = false;
        console.error('Failed to connect to IB:', error);
        return {
            success: false,
            error: error.message || 'Failed to connect to IB Gateway/TWS',
            details: 'Make sure IB Gateway or TWS is running and accepting API connections'
        };
    }
}

async function getIBAccountInfo() {
    try {
        // Connect if not already connected
        if (!ibConnected) {
            const connectionResult = await connectToIB();
            if (!connectionResult.success) {
                return connectionResult;
            }
        }

        // Get account summary
        const accountSummary = await ibApi.getAccountSummary('All', [
            'NetLiquidation',
            'TotalCashValue',
            'GrossPositionValue',
            'BuyingPower',
            'AvailableFunds',
            'ExcessLiquidity',
            'Cushion',
            'InitMarginReq',
            'MaintMarginReq',
            'RealizedPnL',
            'UnrealizedPnL'
        ]);

        // Get positions
        const positions = await ibApi.getPositions();

        // Get managed accounts
        const accounts = await ibApi.getManagedAccounts();

        return {
            success: true,
            data: {
                accounts: accounts || [],
                summary: accountSummary || {},
                positions: positions || [],
                lastUpdated: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Error fetching IB account info:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch account information',
            details: 'Check IB Gateway/TWS connection and API settings'
        };
    }
}

async function disconnectFromIB() {
    if (ibApi && ibConnected) {
        try {
            await ibApi.disconnect();
            ibConnected = false;
            return { success: true, message: 'Disconnected from IB' };
        } catch (error) {
            console.error('Error disconnecting from IB:', error);
            return { success: false, error: error.message };
        }
    }
    return { success: true, message: 'Not connected' };
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }
    
    // Serve static files
    if (pathname === '/' || pathname === '/index.html') {
        fs.readFile(path.join(__dirname, 'Index.html'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            }
        });
        return;
    }
    
    // Serve CSS files
    if (pathname.startsWith('/css/')) {
        const cssPath = path.join(__dirname, pathname);
        fs.readFile(cssPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, {'Content-Type': 'text/css'});
                res.end(data);
            }
        });
        return;
    }
    
    // Serve JS files
    if (pathname.startsWith('/js/')) {
        const jsPath = path.join(__dirname, pathname);
        fs.readFile(jsPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, {'Content-Type': 'application/javascript'});
                res.end(data);
            }
        });
        return;
    }
    
    // API endpoint to get the most recent holdings file
    if (pathname === '/api/latest-holdings') {
        const file = findMostRecentFile(DOWNLOADS_DIR, 'TidalETF_Services');
        
        if (file) {
            const content = fs.readFileSync(file.path, 'utf8');
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
                success: true,
                filename: file.name,
                content: content,
                modified: file.modified
            }));
        } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({
                success: false,
                error: 'No TidalETF_Services files found in Downloads folder'
            }));
        }
        return;
    }
    
    // API endpoint to get the most recent Market Chameleon file
    if (pathname === '/api/latest-chameleon') {
        const file = findMostRecentFile(DOWNLOADS_DIR, 'StockWatchlist_ULTY');

        if (file) {
            const content = fs.readFileSync(file.path, 'utf8');
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
                success: true,
                filename: file.name,
                content: content,
                modified: file.modified
            }));
        } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({
                success: false,
                error: 'No StockWatchlist_ULTY files found in Downloads folder'
            }));
        }
        return;
    }

    if (pathname === '/api/moving-averages') {
        const { symbols } = parsedUrl.query || {};

        if (!symbols) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({
                success: false,
                error: 'Please provide a comma-separated list of ticker symbols.'
            }));
            return;
        }

        const rawSymbols = symbols
            .split(',')
            .map(symbol => symbol.trim().toUpperCase())
            .filter(Boolean);

        const uniqueSymbols = Array.from(new Set(rawSymbols));
        const validSymbols = uniqueSymbols.filter(symbol => MOVING_AVERAGE_SYMBOL_REGEX.test(symbol));
        const invalidSymbols = uniqueSymbols.filter(symbol => !MOVING_AVERAGE_SYMBOL_REGEX.test(symbol));

        if (validSymbols.length === 0) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({
                success: false,
                error: 'No valid ticker symbols were provided.'
            }));
            return;
        }

        const truncatedSymbols = validSymbols.length > MAX_MOVING_AVERAGE_SYMBOLS
            ? validSymbols.slice(MAX_MOVING_AVERAGE_SYMBOLS)
            : [];

        const symbolsToProcess = validSymbols.slice(0, MAX_MOVING_AVERAGE_SYMBOLS);

        Promise.all(symbolsToProcess.map(symbol => fetchSymbolMovingAverages(symbol)))
            .then(results => {
                res.writeHead(200, corsHeaders);
                res.end(JSON.stringify({
                    success: true,
                    data: results,
                    meta: {
                        requested: uniqueSymbols,
                        accepted: symbolsToProcess,
                        invalidSymbols,
                        truncatedSymbols,
                        counts: {
                            requested: uniqueSymbols.length,
                            accepted: symbolsToProcess.length,
                            invalid: invalidSymbols.length,
                            truncated: truncatedSymbols.length
                        }
                    }
                }));
            })
            .catch(error => {
                console.error('Error retrieving moving averages:', error);
                res.writeHead(500, corsHeaders);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to retrieve moving average data.'
                }));
            });
        return;
    }

    // API endpoint to get IB account information
    if (pathname === '/api/ib-account-info') {
        getIBAccountInfo()
            .then(result => {
                const statusCode = result.success ? 200 : 500;
                res.writeHead(statusCode, corsHeaders);
                res.end(JSON.stringify(result));
            })
            .catch(error => {
                console.error('Error in IB account info endpoint:', error);
                res.writeHead(500, corsHeaders);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Internal server error',
                    details: error.message
                }));
            });
        return;
    }

    // API endpoint to manually connect to IB
    if (pathname === '/api/ib-connect') {
        connectToIB()
            .then(result => {
                const statusCode = result.success ? 200 : 500;
                res.writeHead(statusCode, corsHeaders);
                res.end(JSON.stringify(result));
            })
            .catch(error => {
                console.error('Error in IB connect endpoint:', error);
                res.writeHead(500, corsHeaders);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Internal server error',
                    details: error.message
                }));
            });
        return;
    }

    // API endpoint to disconnect from IB
    if (pathname === '/api/ib-disconnect') {
        disconnectFromIB()
            .then(result => {
                const statusCode = result.success ? 200 : 500;
                res.writeHead(statusCode, corsHeaders);
                res.end(JSON.stringify(result));
            })
            .catch(error => {
                console.error('Error in IB disconnect endpoint:', error);
                res.writeHead(500, corsHeaders);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Internal server error',
                    details: error.message
                }));
            });
        return;
    }

    // Default 404
    res.writeHead(404);
    res.end('Not found');
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Open http://localhost:${PORT}/ in your browser`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET http://localhost:${PORT}/api/latest-holdings - Get latest TidalETF file`);
    console.log(`  GET http://localhost:${PORT}/api/latest-chameleon - Get latest Market Chameleon file`);
    console.log(`  GET http://localhost:${PORT}/api/moving-averages?symbols=AAPL,MSFT - Get moving averages for tickers`);
    console.log(`  GET http://localhost:${PORT}/api/ib-account-info - Get Interactive Brokers account information`);
    console.log(`  GET http://localhost:${PORT}/api/ib-connect - Connect to IB Gateway/TWS`);
    console.log(`  GET http://localhost:${PORT}/api/ib-disconnect - Disconnect from IB Gateway/TWS`);
    console.log(`\nInteractive Brokers Config:`);
    console.log(`  Host: ${IB_CONFIG.host}`);
    console.log(`  Port: ${IB_CONFIG.port} (4001=Gateway Live, 4002=Gateway Paper, 7496=TWS Live, 7497=TWS Paper)`);
    console.log(`  Client ID: ${IB_CONFIG.clientId}`);
});

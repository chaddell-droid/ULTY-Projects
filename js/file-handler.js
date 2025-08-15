// File Handler - File upload and CSV parsing functions

// Handle file upload
function handleFileUpload(event, source) {
    const file = event.target.files[0];
    if (!file) return;

    const boxId = source === 'holdings' ? 'holdingsBox' : 'chameleonBox';
    const infoId = source === 'holdings' ? 'holdingsInfo' : 'chameleonInfo';
    const fileType = source === 'holdings' ? 'Holdings' : 'Market Chameleon';
    
    document.getElementById(boxId).classList.add('active');
    document.getElementById(infoId).textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

    // Show initial status
    showStatus('info', `Reading ${fileType} file...`);

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Step 1: Parse CSV
            showStatus('info', `Parsing ${fileType} CSV data...`);
            const content = e.target.result;
            const data = parseCSV(content);
            showStatus('info', `Parsed ${data.length} rows from ${fileType} file`);
            
            if (source === 'holdings') {
                // Step 2: Process holdings data
                showStatus('info', 'Processing holdings positions...');
                AppState.holdingsData = processHoldingsData(data);
                window.holdingsData = AppState.holdingsData;
                
                // Step 3: Categorize positions
                const summary = AppState.holdingsData;
                showStatus('info', `Categorized ${summary.stocks.length} stocks, ${summary.calls.length} calls, ${summary.puts.length} puts, ${summary.cash.length} cash positions`);
                
                // Step 4: Display summary
                showStatus('info', 'Generating holdings summary...');
                displayHoldingsSummary();
                
                // Step 5: Calculate NAV
                if (summary.sharesOutstanding > 0) {
                    const nav = (summary.netAssets / summary.sharesOutstanding).toFixed(2);
                    showStatus('success', `Holdings loaded successfully! NAV: $${nav}`);
                } else {
                    showStatus('success', 'Holdings loaded successfully!');
                }
            } else {
                // Step 2: Process market data
                showStatus('info', 'Processing market data...');
                AppState.marketData = processMarketData(data);
                window.marketData = AppState.marketData;
                
                const symbols = Object.keys(AppState.marketData).length;
                showStatus('info', `Processed ${symbols} symbols from market data`);
                
                if (AppState.holdingsData) {
                    // Step 3: Calculate performance metrics
                    showStatus('info', 'Calculating performance metrics...');
                    displayPerformanceMetrics();
                    
                    // Step 4: Calculate weighted metrics
                    showStatus('info', 'Calculating weighted portfolio metrics...');
                    calculateWeightedMetrics();
                    
                    // Step 5: Match positions with market data
                    let matched = 0;
                    AppState.holdingsData.positions.forEach(position => {
                        const symbol = position.underlying || position.ticker;
                        if (AppState.marketData[symbol]) matched++;
                    });
                    
                    showStatus('success', `Market data loaded! Matched ${matched}/${AppState.holdingsData.positions.length} positions`);
                } else {
                    showStatus('success', `Market data loaded! ${symbols} symbols ready`);
                }
            }
            
            // Enable calculate button if both files are loaded
            if (AppState.holdingsData && AppState.marketData) {
                showStatus('info', 'Enabling nowcast calculations...');
                document.getElementById('calculateBtn').disabled = false;
                document.getElementById('calculateBtn').textContent = 'Calculate Nowcast';
                
                // Final recalculation
                showStatus('info', 'Finalizing weighted metrics...');
                calculateWeightedMetrics();
                
                // Show validation section and run validation
                checkAndShowValidation();
                
                setTimeout(() => {
                    showStatus('success', 'All data loaded! Ready to calculate nowcast');
                }, 500);
            }
        } catch (error) {
            showStatus('error', `Error parsing ${fileType} file: ${error.message}`);
            console.error('File processing error:', error);
        }
    };

    reader.onerror = function() {
        showStatus('error', `Failed to read ${fileType} file`);
    };

    reader.readAsText(file);
}

// Parse CSV content
function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    return data;
}

// Auto-load functions for latest files
async function autoLoadHoldingsFile() {
    showStatus('info', 'Searching for latest TidalETF_Services file...');
    
    try {
        const response = await fetch('http://localhost:8080/api/latest-holdings');
        const data = await response.json();
        
        if (data.success) {
            showStatus('info', `Found file: ${data.filename}`);
            
            // Process the CSV content
            const csvData = parseCSV(data.content);
            
            // Update UI to show file is loaded
            document.getElementById('holdingsBox').classList.add('active');
            document.getElementById('holdingsInfo').textContent = `${data.filename} (Auto-loaded)`;
            
            // Process the data
            AppState.holdingsData = processHoldingsData(csvData);
            window.holdingsData = AppState.holdingsData;
            
            // Display summary
            displayHoldingsSummary();
            
            // Show success with NAV if available
            if (AppState.holdingsData.sharesOutstanding > 0) {
                const nav = (AppState.holdingsData.netAssets / AppState.holdingsData.sharesOutstanding).toFixed(2);
                showStatus('success', `Holdings auto-loaded! NAV: $${nav}`);
            } else {
                showStatus('success', 'Holdings file auto-loaded successfully!');
            }
            
            // Enable calculate button if both files are loaded
            if (AppState.holdingsData && AppState.marketData) {
                document.getElementById('calculateBtn').disabled = false;
                document.getElementById('calculateBtn').textContent = 'Calculate Nowcast';
                calculateWeightedMetrics();
                
                // Show validation section and run validation
                checkAndShowValidation();
            }
        } else {
            showStatus('error', data.error || 'Failed to load holdings file');
        }
    } catch (error) {
        console.error('Error auto-loading holdings:', error);
        showStatus('error', 'Failed to connect to server. Make sure server.js is running on port 8080');
    }
}

async function autoLoadChameleonFile() {
    showStatus('info', 'Searching for latest StockWatchlist_ULTY file...');
    
    try {
        const response = await fetch('http://localhost:8080/api/latest-chameleon');
        const data = await response.json();
        
        if (data.success) {
            showStatus('info', `Found file: ${data.filename}`);
            
            // Process the CSV content
            const csvData = parseCSV(data.content);
            
            // Update UI to show file is loaded
            document.getElementById('chameleonBox').classList.add('active');
            document.getElementById('chameleonInfo').textContent = `${data.filename} (Auto-loaded)`;
            
            // Process the data
            AppState.marketData = processMarketData(csvData);
            window.marketData = AppState.marketData;
            
            const symbols = Object.keys(AppState.marketData).length;
            
            if (AppState.holdingsData) {
                // Calculate performance metrics
                showStatus('info', 'Calculating performance metrics...');
                displayPerformanceMetrics();
                
                // Calculate weighted metrics
                showStatus('info', 'Calculating weighted portfolio metrics...');
                calculateWeightedMetrics();
                
                // Match positions with market data
                let matched = 0;
                AppState.holdingsData.positions.forEach(position => {
                    const symbol = position.underlying || position.ticker;
                    if (AppState.marketData[symbol]) matched++;
                });
                
                showStatus('success', `Market data auto-loaded! Matched ${matched}/${AppState.holdingsData.positions.length} positions`);
            } else {
                showStatus('success', `Market data auto-loaded! ${symbols} symbols ready`);
            }
            
            // Enable calculate button if both files are loaded
            if (AppState.holdingsData && AppState.marketData) {
                document.getElementById('calculateBtn').disabled = false;
                document.getElementById('calculateBtn').textContent = 'Calculate Nowcast';
                calculateWeightedMetrics();
                
                // Show validation section and run validation
                checkAndShowValidation();
                
                setTimeout(() => {
                    showStatus('success', 'All data loaded! Ready to calculate nowcast');
                }, 500);
            }
        } else {
            showStatus('error', data.error || 'Failed to load market data file');
        }
    } catch (error) {
        console.error('Error auto-loading market data:', error);
        showStatus('error', 'Failed to connect to server. Make sure server.js is running on port 8080');
    }
}

// Make functions globally available
window.handleFileUpload = handleFileUpload;
window.parseCSV = parseCSV;
window.autoLoadHoldingsFile = autoLoadHoldingsFile;
window.autoLoadChameleonFile = autoLoadChameleonFile;
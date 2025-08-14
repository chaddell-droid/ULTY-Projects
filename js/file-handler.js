// File Handler - File upload and CSV parsing functions

// Handle file upload
function handleFileUpload(event, source) {
    const file = event.target.files[0];
    if (!file) return;

    const boxId = source === 'holdings' ? 'holdingsBox' : 'chameleonBox';
    const infoId = source === 'holdings' ? 'holdingsInfo' : 'chameleonInfo';
    
    document.getElementById(boxId).classList.add('active');
    document.getElementById(infoId).textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const data = parseCSV(content);
            
            if (source === 'holdings') {
                AppState.holdingsData = processHoldingsData(data);
                displayHoldingsSummary();
            } else {
                AppState.marketData = processMarketData(data);
                if (AppState.holdingsData) {
                    displayPerformanceMetrics();
                    calculateWeightedMetrics();
                }
            }
            
            showStatus('success', `${source === 'holdings' ? 'Holdings' : 'Market Chameleon'} data loaded successfully`);
            
            // Enable calculate button if both files are loaded
            if (AppState.holdingsData && AppState.marketData) {
                document.getElementById('calculateBtn').disabled = false;
                document.getElementById('calculateBtn').textContent = 'Calculate Nowcast';
                calculateWeightedMetrics();
            }
        } catch (error) {
            showStatus('error', `Error parsing ${source} file: ${error.message}`);
        }
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

// Make functions globally available
window.handleFileUpload = handleFileUpload;
window.parseCSV = parseCSV;
// Data Validator - Functions to validate data coverage between holdings and market data

function validateDataCoverage() {
    console.log('Starting data coverage validation...');
    
    // Check if both datasets are loaded
    if (!AppState.holdingsData) {
        showStatus('error', 'Please load Holdings data first');
        return;
    }
    
    if (!AppState.marketData) {
        showStatus('error', 'Please load Market Chameleon data first');
        return;
    }
    
    // Show validation section
    const validationSection = document.getElementById('validationSection');
    if (validationSection) {
        validationSection.style.display = 'block';
    }
    
    // Show processing status
    showStatus('info', 'Checking data coverage...');
    
    // Collect all unique stock symbols from holdings (excluding options and cash)
    const stockSymbols = new Set();
    const missingSymbols = [];
    const foundSymbols = [];
    const ignoredSymbols = [];
    
    // Process stocks from holdings
    AppState.holdingsData.stocks.forEach(position => {
        const symbol = position.ticker;
        
        // Skip cash and money market funds
        if (symbol === 'FGXXX' || symbol === 'Cash&Other' || symbol.includes('MM')) {
            ignoredSymbols.push({
                symbol: symbol,
                name: position.name,
                reason: 'Cash/Money Market'
            });
            return;
        }
        
        stockSymbols.add(symbol);
        
        // Check if symbol exists in market data
        if (AppState.marketData[symbol]) {
            foundSymbols.push({
                symbol: symbol,
                name: position.name,
                weight: position.weight,
                marketValue: position.marketValue
            });
        } else {
            missingSymbols.push({
                symbol: symbol,
                name: position.name,
                weight: position.weight,
                marketValue: position.marketValue
            });
        }
    });
    
    // Calculate coverage statistics
    const totalStocks = stockSymbols.size;
    const coveredStocks = foundSymbols.length;
    const missingStocks = missingSymbols.length;
    const coveragePercent = totalStocks > 0 ? ((coveredStocks / totalStocks) * 100).toFixed(1) : 0;
    
    // Calculate weight coverage
    const totalWeight = foundSymbols.reduce((sum, s) => sum + s.weight, 0) + 
                       missingSymbols.reduce((sum, s) => sum + s.weight, 0);
    const coveredWeight = foundSymbols.reduce((sum, s) => sum + s.weight, 0);
    const weightCoveragePercent = totalWeight > 0 ? ((coveredWeight / totalWeight) * 100).toFixed(1) : 0;
    
    // Display results
    const resultsDiv = document.getElementById('validationResults');
    if (resultsDiv) {
        let resultsHTML = '';
        let resultsClass = 'success';
        
        // Determine status
        if (missingStocks === 0) {
            resultsClass = 'success';
            resultsHTML = '<h5>✅ All stock positions have market data!</h5>';
        } else if (missingStocks <= 3) {
            resultsClass = 'warning';
            resultsHTML = `<h5>⚠️ Missing market data for ${missingStocks} stock position${missingStocks > 1 ? 's' : ''}</h5>`;
        } else {
            resultsClass = 'error';
            resultsHTML = `<h5>❌ Missing market data for ${missingStocks} stock positions</h5>`;
        }
        
        // Add coverage statistics
        resultsHTML += `
            <div class="coverage-stats">
                <div class="coverage-stat">
                    <div class="stat-value">${coveragePercent}%</div>
                    <div class="stat-label">Symbol Coverage</div>
                </div>
                <div class="coverage-stat">
                    <div class="stat-value">${weightCoveragePercent}%</div>
                    <div class="stat-label">Weight Coverage</div>
                </div>
                <div class="coverage-stat">
                    <div class="stat-value">${coveredStocks}/${totalStocks}</div>
                    <div class="stat-label">Stocks Matched</div>
                </div>
                <div class="coverage-stat">
                    <div class="stat-value">${ignoredSymbols.length}</div>
                    <div class="stat-label">Cash/MMF Ignored</div>
                </div>
            </div>
        `;
        
        // List missing symbols if any
        if (missingStocks > 0) {
            resultsHTML += '<h6 style="margin-top: 15px;">Missing Symbols:</h6>';
            resultsHTML += '<ul class="missing-symbols-list">';
            
            // Sort by weight (highest first)
            missingSymbols.sort((a, b) => b.weight - a.weight);
            
            missingSymbols.forEach(item => {
                resultsHTML += `<li><strong>${item.symbol}</strong> - ${item.name} (${item.weight.toFixed(2)}% weight)</li>`;
            });
            resultsHTML += '</ul>';
            
            resultsHTML += '<p style="margin-top: 15px; font-size: 0.9em; color: #666;">';
            resultsHTML += 'To fix: Add these symbols to your Market Chameleon watchlist and re-download the data.';
            resultsHTML += '</p>';
        }
        
        // Show extra market data symbols (optional)
        const marketSymbols = Object.keys(AppState.marketData);
        const extraSymbols = marketSymbols.filter(symbol => !stockSymbols.has(symbol));
        
        if (extraSymbols.length > 0) {
            resultsHTML += `<details style="margin-top: 15px;">`;
            resultsHTML += `<summary style="cursor: pointer; color: #666;">Additional market data symbols not in holdings (${extraSymbols.length})</summary>`;
            resultsHTML += '<ul class="missing-symbols-list" style="margin-top: 10px;">';
            extraSymbols.forEach(symbol => {
                resultsHTML += `<li>${symbol}</li>`;
            });
            resultsHTML += '</ul>';
            resultsHTML += '</details>';
        }
        
        resultsDiv.className = `validation-results ${resultsClass}`;
        resultsDiv.innerHTML = resultsHTML;
    }
    
    // Update status message
    if (missingStocks === 0) {
        showStatus('success', 'Data validation complete - Full coverage!');
    } else {
        showStatus('warning', `Data validation complete - ${missingStocks} symbol${missingStocks > 1 ? 's' : ''} missing`);
    }
    
    // Log detailed results to console
    console.log('=== DATA VALIDATION RESULTS ===');
    console.log(`Total Stocks: ${totalStocks}`);
    console.log(`Covered: ${coveredStocks} (${coveragePercent}%)`);
    console.log(`Missing: ${missingStocks}`);
    console.log(`Weight Coverage: ${weightCoveragePercent}%`);
    if (missingSymbols.length > 0) {
        console.log('Missing Symbols:', missingSymbols);
    }
    console.log('================================');
}

// Function to show validation section when both files are loaded
function checkAndShowValidation() {
    if (AppState.holdingsData && AppState.marketData) {
        const validationSection = document.getElementById('validationSection');
        if (validationSection) {
            validationSection.style.display = 'block';
            
            // Auto-run validation
            setTimeout(() => {
                validateDataCoverage();
            }, 500);
        }
    }
}

// Export functions
window.validateDataCoverage = validateDataCoverage;
window.checkAndShowValidation = checkAndShowValidation;
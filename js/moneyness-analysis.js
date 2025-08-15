// Moneyness Analysis - Functions for analyzing call option moneyness and risk
// Provides comprehensive analysis of call portfolio risk profile

// Moneyness categories and thresholds
const MONEYNESS_CATEGORIES = {
    DEEP_OTM: { min: -Infinity, max: -10, label: 'Deep OTM', color: '#4CAF50', risk: 'Low' },
    OTM: { min: -10, max: -2, label: 'OTM', color: '#8BC34A', risk: 'Low-Med' },
    ATM: { min: -2, max: 2, label: 'ATM', color: '#FFC107', risk: 'High' },
    ITM: { min: 2, max: 10, label: 'ITM', color: '#FF9800', risk: 'High' },
    DEEP_ITM: { min: 10, max: Infinity, label: 'Deep ITM', color: '#F44336', risk: 'Very High' }
};

// Calculate moneyness for a call option
function calculateMoneyness(call, marketData) {
    if (!call.underlying || !call.strike || !marketData[call.underlying]) {
        return null;
    }
    
    const currentPrice = marketData[call.underlying].lastPrice;
    if (!currentPrice || currentPrice <= 0) {
        return null;
    }
    
    // Moneyness = (Stock Price - Strike Price) / Strike Price * 100
    // Positive = ITM, Negative = OTM, Near 0 = ATM
    const moneyness = ((currentPrice - call.strike) / call.strike) * 100;
    
    return {
        moneyness: moneyness,
        currentPrice: currentPrice,
        strike: call.strike,
        category: getMoneynessCategory(moneyness),
        isITM: moneyness > 0,
        isOTM: moneyness < 0,
        isATM: Math.abs(moneyness) <= 2
    };
}

// Get moneyness category based on percentage
function getMoneynessCategory(moneynessPercent) {
    for (const [key, category] of Object.entries(MONEYNESS_CATEGORIES)) {
        if (moneynessPercent > category.min && moneynessPercent <= category.max) {
            return { key, ...category };
        }
    }
    return { key: 'UNKNOWN', label: 'Unknown', color: '#999', risk: 'Unknown' };
}

// Analyze entire call portfolio
function analyzeCallPortfolioMoneyness() {
    console.log('Starting call portfolio moneyness analysis...');
    
    if (!AppState.holdingsData || !AppState.marketData) {
        console.warn('Holdings or market data not available for moneyness analysis');
        return null;
    }
    
    const calls = AppState.holdingsData.calls || [];
    if (calls.length === 0) {
        console.warn('No call options found in portfolio');
        return null;
    }
    
    const analysis = {
        totalCalls: calls.length,
        totalCallValue: 0,
        weightedMoneyness: 0,
        weightedDaysToExpiry: 0,
        categories: {},
        positions: [],
        riskMetrics: {
            atmRisk: 0,
            itmRisk: 0,
            overallRisk: 'Low'
        }
    };
    
    // Initialize category tracking
    Object.keys(MONEYNESS_CATEGORIES).forEach(key => {
        analysis.categories[key] = {
            ...MONEYNESS_CATEGORIES[key],
            count: 0,
            totalValue: 0,
            totalWeight: 0,
            positions: []
        };
    });
    
    let totalWeight = 0;
    let validPositions = 0;
    
    // Analyze each call position
    calls.forEach(call => {
        const moneynessData = calculateMoneyness(call, AppState.marketData);
        
        if (moneynessData) {
            const positionData = {
                ...call,
                ...moneynessData,
                riskLevel: moneynessData.category.risk
            };
            
            analysis.positions.push(positionData);
            
            // Update category data
            const categoryKey = moneynessData.category.key;
            if (analysis.categories[categoryKey]) {
                analysis.categories[categoryKey].count++;
                analysis.categories[categoryKey].totalValue += call.marketValue;
                analysis.categories[categoryKey].totalWeight += call.weight;
                analysis.categories[categoryKey].positions.push(positionData);
            }
            
            // Calculate weighted metrics
            analysis.weightedMoneyness += moneynessData.moneyness * call.weight;
            analysis.weightedDaysToExpiry += (call.daysToExpiry || 0) * call.weight;
            totalWeight += call.weight;
            validPositions++;
        }
        
        analysis.totalCallValue += call.marketValue;
    });
    
    // Finalize weighted calculations
    if (totalWeight > 0) {
        analysis.weightedMoneyness = analysis.weightedMoneyness / totalWeight;
        analysis.weightedDaysToExpiry = analysis.weightedDaysToExpiry / totalWeight;
    }
    
    // Calculate risk metrics
    analysis.riskMetrics = calculateRiskMetrics(analysis);
    
    console.log('Call portfolio moneyness analysis complete:', analysis);
    return analysis;
}

// Calculate overall portfolio risk metrics
function calculateRiskMetrics(analysis) {
    const categories = analysis.categories;
    const totalValue = analysis.totalCallValue;
    
    if (totalValue === 0) {
        return { atmRisk: 0, itmRisk: 0, overallRisk: 'Low' };
    }
    
    // ATM risk (high gamma risk)
    const atmRisk = (categories.ATM.totalValue / totalValue) * 100;
    
    // ITM risk (exercise risk)
    const itmRisk = ((categories.ITM.totalValue + categories.DEEP_ITM.totalValue) / totalValue) * 100;
    
    // Overall risk assessment
    let overallRisk = 'Low';
    if (itmRisk > 30 || atmRisk > 20) {
        overallRisk = 'High';
    } else if (itmRisk > 15 || atmRisk > 10) {
        overallRisk = 'Medium';
    }
    
    return {
        atmRisk: atmRisk,
        itmRisk: itmRisk,
        overallRisk: overallRisk,
        weightedMoneyness: analysis.weightedMoneyness
    };
}

// Display moneyness analysis results
function displayMoneynessAnalysis() {
    console.log('Displaying moneyness analysis...');
    
    const analysis = analyzeCallPortfolioMoneyness();
    if (!analysis) {
        // Hide moneyness section if no data
        const moneynessSection = document.getElementById('moneynessSection');
        if (moneynessSection) {
            moneynessSection.style.display = 'none';
        }
        return;
    }
    
    // Show and populate moneyness section
    const moneynessSection = document.getElementById('moneynessSection');
    if (moneynessSection) {
        moneynessSection.style.display = 'block';
        
        // Update summary cards
        updateMoneynessSummaryCards(analysis);
        
        // Update distribution bar
        updateMoneynessDistribution(analysis);
        
        // Update category cards
        updateMoneynessCategories(analysis);
        
        // Update position heatmap
        updatePositionHeatmap(analysis);
        
        // Update risk gauge
        updateRiskGauge(analysis.riskMetrics);
        
        // Update detailed table
        updateMoneynessTable(analysis);
        
        console.log('Moneyness analysis display complete');
    } else {
        console.warn('Moneyness section element not found');
    }
}

// Update summary cards
function updateMoneynessSummaryCards(analysis) {
    // Total Calls
    const totalCallsEl = document.getElementById('totalCallsCount');
    if (totalCallsEl) totalCallsEl.textContent = analysis.totalCalls;
    
    // Weighted Moneyness
    const weightedMoneynessEl = document.getElementById('weightedMoneyness');
    if (weightedMoneynessEl) {
        const moneyness = analysis.weightedMoneyness;
        const color = moneyness > 0 ? '#F44336' : '#4CAF50';
        weightedMoneynessEl.innerHTML = `<span style="color: ${color}">${moneyness >= 0 ? '+' : ''}${moneyness.toFixed(2)}%</span>`;
    }
    
    // Call Value
    const callValueEl = document.getElementById('totalCallValue');
    if (callValueEl) callValueEl.textContent = `$${(analysis.totalCallValue / 1000000).toFixed(2)}M`;
    
    // Average Days to Expiry
    const avgDTEEl = document.getElementById('avgDaysToExpiry');
    if (avgDTEEl) avgDTEEl.textContent = Math.round(analysis.weightedDaysToExpiry);
}

// Update moneyness distribution bar
function updateMoneynessDistribution(analysis) {
    const distributionBar = document.getElementById('moneynessDistributionBar');
    if (!distributionBar) return;
    
    const totalValue = analysis.totalCallValue;
    let html = '';
    
    Object.entries(analysis.categories).forEach(([key, category]) => {
        const percentage = totalValue > 0 ? (category.totalValue / totalValue) * 100 : 0;
        if (percentage > 0) {
            html += `
                <div class="distribution-segment" 
                     style="width: ${percentage}%; background-color: ${category.color};"
                     title="${category.label}: ${percentage.toFixed(1)}% ($${(category.totalValue/1000000).toFixed(2)}M)">
                    ${percentage > 8 ? category.label : ''}
                </div>
            `;
        }
    });
    
    distributionBar.innerHTML = html;
}

// Update category breakdown cards
function updateMoneynessCategories(analysis) {
    Object.entries(analysis.categories).forEach(([key, category]) => {
        const cardEl = document.getElementById(`category${key}`);
        if (cardEl) {
            const countEl = cardEl.querySelector('.category-count');
            const valueEl = cardEl.querySelector('.category-value');
            const weightEl = cardEl.querySelector('.category-weight');
            
            if (countEl) countEl.textContent = category.count;
            if (valueEl) valueEl.textContent = `$${(category.totalValue / 1000000).toFixed(2)}M`;
            if (weightEl) weightEl.textContent = `${category.totalWeight.toFixed(1)}%`;
        }
    });
}

// Update position heatmap
function updatePositionHeatmap(analysis) {
    const heatmapEl = document.getElementById('positionHeatmap');
    if (!heatmapEl) return;
    
    let html = '';
    analysis.positions.forEach(position => {
        const intensity = Math.min(Math.abs(position.moneyness) / 20, 1); // Scale 0-1
        const color = position.moneyness > 0 ? 
            `rgba(244, 67, 54, ${0.3 + intensity * 0.7})` : // Red for ITM
            `rgba(76, 175, 80, ${0.3 + intensity * 0.7})`; // Green for OTM
        
        html += `
            <div class="heatmap-cell" 
                 style="background-color: ${color};"
                 title="${position.underlying}: ${position.moneyness.toFixed(1)}% (${position.category.label})">
                <div class="cell-ticker">${position.underlying}</div>
                <div class="cell-moneyness">${position.moneyness >= 0 ? '+' : ''}${position.moneyness.toFixed(1)}%</div>
            </div>
        `;
    });
    
    heatmapEl.innerHTML = html;
}

// Update risk gauge
function updateRiskGauge(riskMetrics) {
    const gaugeNeedle = document.getElementById('riskGaugeNeedle');
    const riskLabel = document.getElementById('riskGaugeLabel');
    
    if (gaugeNeedle && riskLabel) {
        // Calculate needle position based on overall risk
        let rotation = 0;
        switch (riskMetrics.overallRisk) {
            case 'Low': rotation = -60; break;
            case 'Medium': rotation = 0; break;
            case 'High': rotation = 60; break;
        }
        
        gaugeNeedle.style.transform = `rotate(${rotation}deg)`;
        riskLabel.textContent = `${riskMetrics.overallRisk} Risk`;
        riskLabel.className = `risk-label risk-${riskMetrics.overallRisk.toLowerCase()}`;
    }
}

// Update detailed moneyness table
function updateMoneynessTable(analysis) {
    const tableBody = document.getElementById('moneynessTableBody');
    if (!tableBody) return;
    
    let html = '';
    
    // Sort positions by moneyness (ITM first, then by absolute value)
    const sortedPositions = [...analysis.positions].sort((a, b) => {
        if (a.isITM && !b.isITM) return -1;
        if (!a.isITM && b.isITM) return 1;
        return Math.abs(b.moneyness) - Math.abs(a.moneyness);
    });
    
    sortedPositions.forEach(position => {
        const statusColor = position.isITM ? '#F44336' : 
                           position.isATM ? '#FFC107' : '#4CAF50';
        
        html += `
            <tr>
                <td>${position.underlying}</td>
                <td>$${position.currentPrice.toFixed(2)}</td>
                <td>$${position.strike.toFixed(2)}</td>
                <td style="color: ${statusColor}; font-weight: bold;">
                    ${position.moneyness >= 0 ? '+' : ''}${position.moneyness.toFixed(2)}%
                </td>
                <td>
                    <span class="moneyness-badge" style="background-color: ${position.category.color};">
                        ${position.category.label}
                    </span>
                </td>
                <td>${position.daysToExpiry || '-'}</td>
                <td>${position.weight.toFixed(2)}%</td>
                <td>$${position.marketValue.toLocaleString()}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Test function for moneyness calculations
function testMoneynessCalculations() {
    console.log('=== MONEYNESS CALCULATION TESTS ===');
    
    // Create sample market data
    const testMarketData = {
        'AAPL': { lastPrice: 150.00 },
        'MSFT': { lastPrice: 300.00 },
        'GOOGL': { lastPrice: 2800.00 },
        'TSLA': { lastPrice: 200.00 }
    };
    
    // Create sample call options with different moneyness scenarios
    const testCalls = [
        { underlying: 'AAPL', strike: 140, ticker: 'AAPL 250815C00140000', marketValue: 100000, weight: 2.5, daysToExpiry: 30 }, // ITM (+7.1%)
        { underlying: 'MSFT', strike: 310, ticker: 'MSFT 250815C00310000', marketValue: 150000, weight: 3.0, daysToExpiry: 45 }, // OTM (-3.2%)
        { underlying: 'GOOGL', strike: 2900, ticker: 'GOOGL 250815C02900000', marketValue: 200000, weight: 4.0, daysToExpiry: 15 }, // OTM (-3.4%)
        { underlying: 'TSLA', strike: 190, ticker: 'TSLA 250815C00190000', marketValue: 75000, weight: 1.5, daysToExpiry: 60 } // ITM (+5.3%)
    ];
    
    // Test individual moneyness calculations
    testCalls.forEach((call, index) => {
        const result = calculateMoneyness(call, testMarketData);
        if (result) {
            console.log(`Test ${index + 1} - ${call.underlying}:`);
            console.log(`  Current Price: $${result.currentPrice}`);
            console.log(`  Strike: $${result.strike}`);
            console.log(`  Moneyness: ${result.moneyness.toFixed(2)}%`);
            console.log(`  Category: ${result.category.label} (${result.category.risk} Risk)`);
            console.log(`  ITM: ${result.isITM}, OTM: ${result.isOTM}, ATM: ${result.isATM}`);
            console.log('---');
        }
    });
    
    // Test edge cases
    console.log('=== EDGE CASE TESTS ===');
    
    // Test ATM scenarios
    const atmTest = { underlying: 'AAPL', strike: 150, ticker: 'AAPL_ATM', marketValue: 50000, weight: 1.0, daysToExpiry: 30 };
    const atmResult = calculateMoneyness(atmTest, testMarketData);
    console.log(`ATM Test: ${atmResult.moneyness.toFixed(2)}% - ${atmResult.category.label}`);
    
    // Test Deep ITM
    const deepItmTest = { underlying: 'AAPL', strike: 120, ticker: 'AAPL_DEEP_ITM', marketValue: 80000, weight: 1.5, daysToExpiry: 30 };
    const deepItmResult = calculateMoneyness(deepItmTest, testMarketData);
    console.log(`Deep ITM Test: ${deepItmResult.moneyness.toFixed(2)}% - ${deepItmResult.category.label}`);
    
    // Test Deep OTM
    const deepOtmTest = { underlying: 'AAPL', strike: 180, ticker: 'AAPL_DEEP_OTM', marketValue: 20000, weight: 0.5, daysToExpiry: 30 };
    const deepOtmResult = calculateMoneyness(deepOtmTest, testMarketData);
    console.log(`Deep OTM Test: ${deepOtmResult.moneyness.toFixed(2)}% - ${deepOtmResult.category.label}`);
    
    console.log('=== PORTFOLIO ANALYSIS TEST ===');
    
    // Create temporary test state
    const originalHoldingsData = AppState.holdingsData;
    const originalMarketData = AppState.marketData;
    
    // Set test data
    AppState.holdingsData = { calls: testCalls };
    AppState.marketData = testMarketData;
    
    // Run portfolio analysis
    const portfolioAnalysis = analyzeCallPortfolioMoneyness();
    
    if (portfolioAnalysis) {
        console.log('Portfolio Analysis Results:');
        console.log(`  Total Calls: ${portfolioAnalysis.totalCalls}`);
        console.log(`  Total Call Value: $${portfolioAnalysis.totalCallValue.toLocaleString()}`);
        console.log(`  Weighted Moneyness: ${portfolioAnalysis.weightedMoneyness.toFixed(2)}%`);
        console.log(`  Weighted DTE: ${portfolioAnalysis.weightedDaysToExpiry.toFixed(0)} days`);
        console.log(`  Overall Risk: ${portfolioAnalysis.riskMetrics.overallRisk}`);
        console.log(`  ATM Risk: ${portfolioAnalysis.riskMetrics.atmRisk.toFixed(1)}%`);
        console.log(`  ITM Risk: ${portfolioAnalysis.riskMetrics.itmRisk.toFixed(1)}%`);
        
        console.log('Category Breakdown:');
        Object.entries(portfolioAnalysis.categories).forEach(([key, category]) => {
            if (category.count > 0) {
                console.log(`  ${category.label}: ${category.count} positions, $${category.totalValue.toLocaleString()}, ${category.totalWeight.toFixed(1)}% weight`);
            }
        });
    }
    
    // Restore original state
    AppState.holdingsData = originalHoldingsData;
    AppState.marketData = originalMarketData;
    
    console.log('=== MONEYNESS TESTS COMPLETE ===');
    return true;
}

// Export functions to make them globally accessible
window.analyzeCallPortfolioMoneyness = analyzeCallPortfolioMoneyness;
window.displayMoneynessAnalysis = displayMoneynessAnalysis;
window.calculateMoneyness = calculateMoneyness;
window.getMoneynessCategory = getMoneynessCategory;
window.testMoneynessCalculations = testMoneynessCalculations;
// calculations.js - Complete implementation with all helper functions

// Global variables for calculation state
let currentNAV = 0;
let sharesOutstanding = 0;
let weightedMetrics = {};

function calculateNowcast() {
    console.log('Calculate Nowcast clicked');
    
    // Check if data is loaded
    if (!AppState.holdingsData || !AppState.marketData) {
        alert('Please load both Holdings and Market Chameleon data files first.');
        return;
    }

    // Show initial status
    showStatus('info', 'Starting nowcast calculation...');

    try {
        // Get holdings data
        const holdingsData = AppState.holdingsData;
        const marketData = AppState.marketData;
        
        // Show data validation status
        showStatus('info', 'Validating holdings and market data...');
        
        // Calculate current NAV from holdings
        currentNAV = holdingsData.netAssets / holdingsData.sharesOutstanding;
        sharesOutstanding = holdingsData.sharesOutstanding;
        
        // Get parameters from the UI
        const spotPrice = parseFloat(document.getElementById('spotPrice')?.value) || 6.08;
        const dividendAmount = parseFloat(document.getElementById('dividendAmount')?.value) || 0.10;
        const projectionDays = parseFloat(document.getElementById('projectionDays')?.value) || 1;
        const scenarioType = document.getElementById('scenarioType')?.value || 'base';
        const vegaCoverage = parseFloat(document.getElementById('vegaCoverage')?.value) / 100 || 0.248;
        const termFactor = parseFloat(document.getElementById('termFactor')?.value) || 0.92;
        const marketMoveOverride = parseFloat(document.getElementById('marketMove')?.value);
        const ivOverride = parseFloat(document.getElementById('ivOverride')?.value);
        const numSimulations = parseInt(document.getElementById('simulations')?.value) || 1000;
        const confidenceLevel = parseFloat(document.getElementById('confidenceLevel')?.value) || 90;
        const correlationFactor = parseFloat(document.getElementById('correlationFactor')?.value) || 0.7;
        
        // Vega parameters
        const vegaSlope = -0.0554; // per 100 vol pts (negative because short vega)
        
        console.log('=== NOWCAST CALCULATION ===');
        console.log('Current NAV:', currentNAV.toFixed(4));
        console.log('Shares Outstanding:', sharesOutstanding);
        console.log('Spot Price:', spotPrice);
        
        // ========== STEP 1: Price-only move of equity sleeve ==========
        showStatus('info', 'Step 1: Calculating price-only equity moves...');
        console.log('\nStep 1: Price-only move of equity sleeve');
        
        let basketReturn = 0;
        let totalEquityWeight = 0;
        let weightedIV30 = 0;
        let weightedIVChange = 0;
        
        // Check for market move override
        if (marketMoveOverride && !isNaN(marketMoveOverride)) {
            basketReturn = marketMoveOverride / 100;
            console.log(`Using market move override: ${marketMoveOverride}%`);
        } else {
            // Calculate weighted basket return (stocks only, ignore cash/MMF)
            holdingsData.stocks.forEach(position => {
                // Skip money market funds or cash-like positions
                if (position.ticker === 'FGXXX' || position.ticker.includes('MM')) {
                    console.log(`Skipping ${position.ticker} (MMF/Cash)`);
                    return;
                }
                
                const mktData = marketData[position.ticker];
                if (mktData) {
                    const returnPct = mktData.changePercent / 100; // Convert to decimal
                    const contribution = position.weight * returnPct / 100;
                    basketReturn += contribution;
                    totalEquityWeight += position.weight;
                    
                    // Also gather IV data for step 2
                    weightedIV30 += position.weight * (mktData.iv30 || 30);
                    weightedIVChange += position.weight * (mktData.ivChange || 0);
                    
                    console.log(`${position.ticker}: weight=${position.weight.toFixed(2)}%, return=${(returnPct * 100).toFixed(2)}%, contrib=${(contribution * 100).toFixed(4)}%`);
                }
            });
        }
        
        // Handle IV overrides
        if (ivOverride && !isNaN(ivOverride)) {
            const currentIV = totalEquityWeight > 0 ? weightedIV30 / totalEquityWeight : 30;
            weightedIVChange = ((ivOverride - currentIV) / currentIV) * 100 * totalEquityWeight;
            console.log(`Using IV override: ${ivOverride}% (change: ${(weightedIVChange / totalEquityWeight).toFixed(2)}%)`);
        }
        
        // Normalize IV metrics by equity weight
        if (totalEquityWeight > 0) {
            weightedIV30 = weightedIV30 / totalEquityWeight;
            weightedIVChange = weightedIVChange / totalEquityWeight;
        }
        
        // Calculate price-only NAV
        const navPriceOnly = currentNAV * (1 + basketReturn);
        console.log(`Basket return: ${(basketReturn * 100).toFixed(3)}%`);
        console.log(`NAV₀ = ${currentNAV.toFixed(4)} → NAV_px = ${navPriceOnly.toFixed(4)}`);
        
        // ========== STEP 2: IV/term-structure adjustment (short-vega) ==========
        showStatus('info', 'Step 2: Calculating volatility adjustments...');
        console.log('\nStep 2: IV/term-structure adjustment');
        console.log(`Weighted IV30: ${weightedIV30.toFixed(1)}%`);
        console.log(`Weighted IV30 change: ${weightedIVChange.toFixed(2)}%`);
        
        // Calculate short-tenor vol change (scale 30d to ~7d)
        const deltaIV7 = (weightedIV30 / 100) * (weightedIVChange / 100) * termFactor;
        console.log(`Term structure factor: ${termFactor}`);
        console.log(`ΔIV₇ (vol pts): ${(deltaIV7 * 100).toFixed(3)}`);
        
        // Calculate vega P&L (book is short vega)
        const vegaPnL = vegaSlope * deltaIV7;
        console.log(`Vega P&L (per notional): ${(vegaPnL * 100).toFixed(3)}%`);
        
        // Apply effective coverage fraction
        const adjustedVegaPnL = vegaCoverage * vegaPnL;
        console.log(`Effective coverage: ${(vegaCoverage * 100).toFixed(1)}%`);
        console.log(`Adjusted vega P&L: ${(adjustedVegaPnL * 100).toFixed(3)}%`);
        
        // Apply vega adjustment to price-only NAV
        const navWithIV = navPriceOnly * (1 + adjustedVegaPnL);
        console.log(`NAV_IV = ${navWithIV.toFixed(4)} (${adjustedVegaPnL >= 0 ? '+' : ''}${(adjustedVegaPnL * 100).toFixed(3)}% from vega)`);
        
        // ========== STEP 3: Premium/Discount calculation ==========
        showStatus('info', 'Step 3: Calculating premium/discount...');
        const premium = (spotPrice / navWithIV - 1) * 100;
        console.log(`\nStep 3: Premium/Discount`);
        console.log(`Spot price: ${spotPrice.toFixed(2)}`);
        console.log(`Premium/Discount: ${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%`);
        
        // Ex-dividend calculation if applicable
        let exDivNAV = navWithIV;
        let impliedExDivOpen = spotPrice;
        
        if (dividendAmount > 0) {
            exDivNAV = navWithIV - dividendAmount;
            impliedExDivOpen = exDivNAV * (1 + premium / 100);
            console.log(`\nEx-dividend adjustment:`);
            console.log(`Dividend: ${dividendAmount.toFixed(2)}`);
            console.log(`Ex-div NAV: ${exDivNAV.toFixed(4)}`);
            console.log(`Implied ex-div open: ${impliedExDivOpen.toFixed(2)}`);
        }
        
        // ========== Monte Carlo Simulation for Confidence Bands ==========
        showStatus('info', `Running ${numSimulations} Monte Carlo simulations...`);
        const projectedNAVs = [];
        
        // Simplified simulation focusing on basket moves
        for (let sim = 0; sim < numSimulations; sim++) {
            // Generate random market factor
            const marketFactor = gaussianRandom() * Math.sqrt(projectionDays);
            
            // Use actual volatility for simulation
            const dailyVol = (weightedIV30 / 100) / Math.sqrt(252);
            const simulatedReturn = marketFactor * dailyVol * correlationFactor;
            
            // Apply to NAV
            const simNAV = navWithIV * (1 + simulatedReturn);
            projectedNAVs.push(simNAV);
        }
        
        // Calculate statistics
        projectedNAVs.sort((a, b) => a - b);
        const meanNAV = navWithIV; // Use calculated NAV as mean
        const medianNAV = projectedNAVs[Math.floor(numSimulations / 2)];
        
        const lowerPercentile = (100 - confidenceLevel) / 2;
        const upperPercentile = 100 - lowerPercentile;
        const lowerBound = projectedNAVs[Math.floor(numSimulations * lowerPercentile / 100)];
        const upperBound = projectedNAVs[Math.floor(numSimulations * upperPercentile / 100)];
        
        const var5 = currentNAV - projectedNAVs[Math.floor(numSimulations * 0.05)];
        const probAbove = projectedNAVs.filter(nav => nav > currentNAV).length / numSimulations;
        
        // Log values before updating results
        console.log('Preparing results object with values:');
        console.log('currentNAV:', currentNAV);
        console.log('navWithIV:', navWithIV);
        console.log('navPriceOnly:', navPriceOnly);
        console.log('basketReturn:', basketReturn);
        console.log('adjustedVegaPnL:', adjustedVegaPnL);
        console.log('lowerBound:', lowerBound);
        console.log('upperBound:', upperBound);
        
        // Update results display
        updateNowcastResults({
            currentNAV: currentNAV || 0,
            projectedNAV: navWithIV || 0,
            navPriceOnly: navPriceOnly || 0,
            basketReturn: (basketReturn * 100) || 0,
            vegaImpact: (adjustedVegaPnL * 100) || 0,
            premium: premium || 0,
            exDivNAV: exDivNAV || 0,
            impliedOpen: impliedExDivOpen || 0,
            weightedIV: weightedIV30 || 0,
            ivChange: weightedIVChange || 0,
            spotPrice: spotPrice || 0,
            dividendAmount: dividendAmount || 0,
            lowerBound: lowerBound || 0,
            upperBound: upperBound || 0,
            var5: var5 || 0,
            probAbove: probAbove || 0
        });
        
        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.classList.add('active');
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('Results section shown');
        } else {
            console.error('Results section element not found!');
        }
        
        // Create visualization if function exists
        if (typeof window.createNowcastVisualization === 'function') {
            const vizResults = {
                currentNAV: currentNAV,
                navWithIV: navWithIV,
                navPriceOnly: navPriceOnly,
                basketReturn: basketReturn,
                adjustedVegaPnL: adjustedVegaPnL,
                premium: premium,
                weightedIV30: weightedIV30,
                weightedIVChange: weightedIVChange,
                lowerBound: lowerBound,
                upperBound: upperBound,
                spotPrice: spotPrice,
                exDivNAV: exDivNAV,
                impliedExDivOpen: impliedExDivOpen,
                dividendAmount: dividendAmount
            };
            window.createNowcastVisualization(vizResults);
            console.log('Created nowcast visualization');
        }
        
        // Log final summary
        console.log('\n========== NOWCAST SUMMARY ==========');
        console.log(`Starting NAV: ${currentNAV.toFixed(4)}`);
        console.log(`Basket Return: ${(basketReturn * 100).toFixed(3)}%`);
        console.log(`Price-Only NAV: ${navPriceOnly.toFixed(4)}`);
        console.log(`Vega Impact: ${(adjustedVegaPnL * 100).toFixed(3)}%`);
        console.log(`Final Nowcast NAV: ${navWithIV.toFixed(4)}`);
        console.log(`NAV Change: ${(((navWithIV - currentNAV) / currentNAV) * 100).toFixed(3)}%`);
        console.log(`Current ULTY Price: ${spotPrice.toFixed(2)}`);
        console.log(`Premium/Discount: ${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%`);
        if (dividendAmount > 0) {
            console.log(`Ex-Div NAV: ${exDivNAV.toFixed(4)}`);
            console.log(`Implied Ex-Div Open: ${impliedExDivOpen.toFixed(2)}`);
        }
        console.log('=====================================\n');
        
        // Create charts if functions exist (check in window scope)
        if (typeof window.createProjectionChart === 'function') {
            window.createProjectionChart(currentNAV, projectionDays, projectedNAVs);
        } else {
            console.log('Chart function createProjectionChart not found - skipping');
        }
        
        if (typeof window.createDistributionChart === 'function') {
            window.createDistributionChart(projectedNAVs, currentNAV);
        } else {
            console.log('Chart function createDistributionChart not found - skipping');
        }
        
        // Display moneyness analysis if function exists
        if (typeof window.displayMoneynessAnalysis === 'function') {
            console.log('Running moneyness analysis...');
            window.displayMoneynessAnalysis();
        } else {
            console.log('Moneyness analysis function not found - skipping');
        }
        
        // Show success message with final NAV
        const finalMessage = `Nowcast completed! Projected NAV: $${navWithIV.toFixed(2)} (${basketReturn >= 0 ? '+' : ''}${(basketReturn * 100).toFixed(2)}%)`;
        showStatus('success', finalMessage);
        
    } catch (error) {
        console.error('Error in nowcast calculation:', error);
        console.error('Stack trace:', error.stack);
        showStatus('error', `Calculation error: ${error.message}`);
    }
}

// Helper function to update the results display
function updateNowcastResults(results) {
    console.log('Updating nowcast results with:', results);
    
    // Check if results object has required properties
    if (!results || !results.projectedNAV || !results.currentNAV) {
        console.error('Invalid results object:', results);
        showStatus('error', 'Failed to update results - invalid data');
        return;
    }
    
    // Update main result cards
    const projectedNavEl = document.getElementById('projectedNav');
    if (projectedNavEl) {
        projectedNavEl.textContent = `$${results.projectedNAV.toFixed(4)}`;
    } else {
        console.warn('Element not found: projectedNav');
    }
    
    const navChangeEl = document.getElementById('navChange');
    if (navChangeEl) {
        const change = ((results.projectedNAV - results.currentNAV) / results.currentNAV) * 100;
        navChangeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(3)}%`;
    } else {
        console.warn('Element not found: navChange');
    }
    
    const priceOnlyNavEl = document.getElementById('priceOnlyNav');
    if (priceOnlyNavEl) priceOnlyNavEl.textContent = `$${results.navPriceOnly.toFixed(4)}`;
    
    const vegaImpactEl = document.getElementById('vegaImpact');
    if (vegaImpactEl) vegaImpactEl.textContent = `${results.vegaImpact >= 0 ? '+' : ''}${results.vegaImpact.toFixed(3)}%`;
    
    const premiumDiscEl = document.getElementById('premiumDisc');
    if (premiumDiscEl) premiumDiscEl.textContent = `${results.premium >= 0 ? '+' : ''}${results.premium.toFixed(2)}%`;
    
    const exDivNavEl = document.getElementById('exDivNav');
    if (exDivNavEl) exDivNavEl.textContent = `$${results.exDivNAV.toFixed(4)}`;
    
    const confRangeEl = document.getElementById('confRange');
    if (confRangeEl) {
        confRangeEl.textContent = `$${results.lowerBound.toFixed(2)} - $${results.upperBound.toFixed(2)}`;
    } else {
        console.warn('Element not found: confRange');
    }
    
    const var5El = document.getElementById('var5');
    if (var5El) {
        var5El.textContent = `$${results.var5.toFixed(3)}`;
    } else {
        console.warn('Element not found: var5');
    }
    
    const probAboveEl = document.getElementById('probAbove');
    if (probAboveEl) {
        probAboveEl.textContent = `${(results.probAbove * 100).toFixed(1)}%`;
    } else {
        console.warn('Element not found: probAbove');
    }
    
    const expectedDistEl = document.getElementById('expectedDist');
    if (expectedDistEl) {
        expectedDistEl.textContent = results.dividendAmount > 0 ? `$${results.dividendAmount.toFixed(2)}` : 'N/A';
    } else {
        console.warn('Element not found: expectedDist');
    }
    
    // Update breakdown table elements
    const startingNavEl = document.getElementById('startingNav');
    if (startingNavEl) startingNavEl.textContent = `$${results.currentNAV.toFixed(4)}`;
    
    const basketRetEl = document.getElementById('basketRet');
    if (basketRetEl) basketRetEl.textContent = `${results.basketReturn >= 0 ? '+' : ''}${results.basketReturn.toFixed(3)}%`;
    
    const basketImpactEl = document.getElementById('basketImpact');
    if (basketImpactEl) basketImpactEl.textContent = `$${(results.navPriceOnly - results.currentNAV).toFixed(4)}`;
    
    const weightedIV30El = document.getElementById('weightedIV30');
    if (weightedIV30El) weightedIV30El.textContent = `${results.weightedIV.toFixed(1)}%`;
    
    const ivChgEl = document.getElementById('ivChg');
    if (ivChgEl) ivChgEl.textContent = `${results.ivChange >= 0 ? '+' : ''}${results.ivChange.toFixed(2)}%`;
    
    const vegaImpEl = document.getElementById('vegaImp');
    if (vegaImpEl) vegaImpEl.textContent = `$${(results.projectedNAV - results.navPriceOnly).toFixed(4)}`;
    
    const currentPriceEl = document.getElementById('currentPrice');
    if (currentPriceEl) currentPriceEl.textContent = `$${results.spotPrice.toFixed(2)}`;
    
    const premDiscEl = document.getElementById('premDisc');
    if (premDiscEl) premDiscEl.textContent = `${results.premium >= 0 ? '+' : ''}${results.premium.toFixed(2)}%`;
    
    // Handle ex-dividend row
    const exDivRow = document.getElementById('exDivRow');
    if (exDivRow) {
        if (results.dividendAmount > 0) {
            exDivRow.style.display = '';
            const exDivAmountEl = document.getElementById('exDivAmount');
            if (exDivAmountEl) exDivAmountEl.textContent = `-$${results.dividendAmount.toFixed(2)}`;
            const impliedOpenEl = document.getElementById('impliedOpen');
            if (impliedOpenEl) impliedOpenEl.textContent = `$${results.impliedOpen.toFixed(2)}`;
        } else {
            exDivRow.style.display = 'none';
        }
    }
    
    // Generate and update summary text
    const summaryContent = generateNowcastSummary(results);
    const summaryEl = document.getElementById('summaryContent');
    if (summaryEl) summaryEl.textContent = summaryContent;
}

// Generate nowcast summary text
function generateNowcastSummary(results) {
    let summary = '=== NOWCAST SUMMARY ===\n';
    summary += `Starting NAV: $${results.currentNAV.toFixed(4)}\n`;
    summary += `Basket Return: ${results.basketReturn >= 0 ? '+' : ''}${results.basketReturn.toFixed(3)}%\n`;
    summary += `Price-Only NAV: $${results.navPriceOnly.toFixed(4)}\n`;
    summary += `Vega Impact: ${results.vegaImpact >= 0 ? '+' : ''}${results.vegaImpact.toFixed(3)}%\n`;
    summary += `Nowcast NAV: $${results.projectedNAV.toFixed(4)}\n`;
    summary += `NAV Change: ${((results.projectedNAV - results.currentNAV) / results.currentNAV * 100).toFixed(3)}%\n`;
    summary += `Current Price: $${results.spotPrice.toFixed(2)}\n`;
    summary += `Premium/Discount: ${results.premium >= 0 ? '+' : ''}${results.premium.toFixed(2)}%\n`;
    
    if (results.dividendAmount > 0) {
        summary += `Ex-Div NAV: $${results.exDivNAV.toFixed(4)}\n`;
        summary += `Implied Ex-Div Open: $${results.impliedOpen.toFixed(2)}\n`;
    }
    
    summary += '=======================';
    return summary;
}

// Helper function for Gaussian random numbers (Box-Muller transform)
function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Helper function to show status messages
function showStatus(type, message) {
    console.log(`Status (${type}): ${message}`);
    
    // Try to show in UI if element exists
    const statusEl = document.getElementById('statusMessage');
    if (statusEl) {
        statusEl.className = `status-message ${type}`;
        statusEl.textContent = message;
        statusEl.style.display = 'block';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// Copy nowcast summary to clipboard
function copyNowcastSummary() {
    const summaryEl = document.getElementById('summaryContent');
    if (summaryEl) {
        navigator.clipboard.writeText(summaryEl.textContent)
            .then(() => showStatus('success', 'Summary copied to clipboard!'))
            .catch(err => showStatus('error', 'Failed to copy summary'));
    }
}

// Handle scenario type changes
function handleScenarioChange() {
    const scenarioType = document.getElementById('scenarioType')?.value;
    const marketMoveInput = document.getElementById('marketMove');
    const ivInput = document.getElementById('ivOverride');
    
    if (!scenarioType || !marketMoveInput || !ivInput) return;
    
    switch(scenarioType) {
        case 'base':
            marketMoveInput.value = '';
            ivInput.value = '';
            marketMoveInput.placeholder = 'Use live data';
            ivInput.placeholder = 'Use live data';
            break;
        case 'bullish':
            marketMoveInput.value = '2';
            ivInput.value = '';
            break;
        case 'bearish':
            marketMoveInput.value = '-2';
            ivInput.value = '';
            break;
        case 'volatile':
            marketMoveInput.value = '0';
            const currentIV = weightedMetrics.iv || 30;
            ivInput.value = (currentIV * 1.5).toFixed(1);
            break;
        case 'custom':
            // Don't change values for custom
            break;
    }
}

// Calculate weighted metrics (called after data is loaded)
function calculateWeightedMetrics() {
    if (!AppState.holdingsData || !AppState.marketData) return;
    
    let weightedIV = 0, weightedChange = 0, weighted20DayVol = 0, weightedIVChange = 0;
    let totalWeight = 0;
    let minIV = Infinity, maxIV = -Infinity;
    let minChange = Infinity, maxChange = -Infinity;
    let minIVChange = Infinity, maxIVChange = -Infinity;
    
    // Focus on stocks only for weighted metrics (exclude options and cash)
    AppState.holdingsData.stocks.forEach(position => {
        // Skip cash and money market positions
        if (position.ticker === 'FGXXX' || position.ticker === 'Cash&Other' || position.ticker.includes('MM')) {
            return;
        }
        
        const dataSymbol = position.ticker;
        const mktData = AppState.marketData[dataSymbol];
        
        if (mktData) {
            const iv = mktData.iv30 || 30;
            const change = mktData.changePercent || 0;
            const vol20 = mktData.volatility20Day || 0;
            const ivChg = mktData.ivChange || 0;
            
            // Calculate weighted values
            weightedIV += iv * position.weight;
            weightedChange += change * position.weight;
            weighted20DayVol += vol20 * position.weight;
            weightedIVChange += ivChg * position.weight;
            totalWeight += position.weight;
            
            // Track min/max values
            minIV = Math.min(minIV, iv);
            maxIV = Math.max(maxIV, iv);
            minChange = Math.min(minChange, change);
            maxChange = Math.max(maxChange, change);
            minIVChange = Math.min(minIVChange, ivChg);
            maxIVChange = Math.max(maxIVChange, ivChg);
        }
    });
    
    if (totalWeight > 0) {
        weightedMetrics = {
            iv: weightedIV / totalWeight,
            change: weightedChange / totalWeight,
            vol20Day: weighted20DayVol / totalWeight,
            ivChange: weightedIVChange / totalWeight,
            minIV: minIV === Infinity ? 0 : minIV,
            maxIV: maxIV === -Infinity ? 0 : maxIV,
            minChange: minChange === Infinity ? 0 : minChange,
            maxChange: maxChange === -Infinity ? 0 : maxChange,
            minIVChange: minIVChange === Infinity ? 0 : minIVChange,
            maxIVChange: maxIVChange === -Infinity ? 0 : maxIVChange
        };
        
        // Store in AppState for global access
        AppState.weightedMetrics = weightedMetrics;
        
        // Update display if elements exist
        updateWeightedMetricsDisplay();
    }
}

// Update weighted metrics display
function updateWeightedMetricsDisplay() {
    // Weighted IV
    const weightedIVEl = document.getElementById('weightedIV');
    if (weightedIVEl) {
        const iv = weightedMetrics.iv.toFixed(1);
        const ivChg = weightedMetrics.ivChange;
        const ivChgColor = ivChg >= 0 ? 'green' : 'red';
        weightedIVEl.innerHTML = `${iv}% <span style="color: ${ivChgColor}; font-size: 0.9em;">(${ivChg >= 0 ? '+' : ''}${ivChg.toFixed(2)}%)</span>`;
    }
    
    // Min/Max IV
    const minIVEl = document.getElementById('minIV');
    if (minIVEl) minIVEl.textContent = `${weightedMetrics.minIV.toFixed(1)}%`;
    
    const maxIVEl = document.getElementById('maxIV');
    if (maxIVEl) maxIVEl.textContent = `${weightedMetrics.maxIV.toFixed(1)}%`;
    
    // Weighted Change
    const weightedChangeEl = document.getElementById('weightedChange');
    if (weightedChangeEl) {
        const change = weightedMetrics.change;
        weightedChangeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    }
    
    // Min/Max Change
    const minChangeEl = document.getElementById('minChange');
    if (minChangeEl) minChangeEl.textContent = `${weightedMetrics.minChange >= 0 ? '+' : ''}${weightedMetrics.minChange.toFixed(2)}%`;
    
    const maxChangeEl = document.getElementById('maxChange');
    if (maxChangeEl) maxChangeEl.textContent = `${weightedMetrics.maxChange >= 0 ? '+' : ''}${weightedMetrics.maxChange.toFixed(2)}%`;
    
    // 20-Day Vol
    const weighted20DayVolEl = document.getElementById('weighted20DayVol');
    if (weighted20DayVolEl) weighted20DayVolEl.textContent = `${weightedMetrics.vol20Day.toFixed(1)}%`;
    
    // Log metrics to console for debugging
    console.log('Weighted Portfolio Metrics:', {
        'Weighted IV': `${weightedMetrics.iv.toFixed(1)}%`,
        'IV Change': `${weightedMetrics.ivChange >= 0 ? '+' : ''}${weightedMetrics.ivChange.toFixed(2)}%`,
        'Price Change': `${weightedMetrics.change >= 0 ? '+' : ''}${weightedMetrics.change.toFixed(2)}%`,
        'IV Range': `${weightedMetrics.minIV.toFixed(1)}% - ${weightedMetrics.maxIV.toFixed(1)}%`,
        'Change Range': `${weightedMetrics.minChange.toFixed(2)}% - ${weightedMetrics.maxChange.toFixed(2)}%`
    });
}

// Export functions to make them globally accessible
window.calculateNowcast = calculateNowcast;
window.copyNowcastSummary = copyNowcastSummary;
window.handleScenarioChange = handleScenarioChange;
window.calculateWeightedMetrics = calculateWeightedMetrics;

// Connect scenario dropdown if it exists
document.addEventListener('DOMContentLoaded', function() {
    const scenarioSelect = document.getElementById('scenarioType');
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', handleScenarioChange);
    }
});

// Also export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        calculateNowcast,
        updateNowcastResults,
        generateNowcastSummary,
        copyNowcastSummary,
        handleScenarioChange,
        calculateWeightedMetrics
    };
}
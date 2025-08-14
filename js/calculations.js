// Calculations - NAV nowcast and financial calculations

let isCalculating = false;

function calculateNowcast() {
    // Prevent multiple simultaneous calculations
    if (isCalculating) {
        console.log('Calculation already in progress...');
        return;
    }
    
    try {
        isCalculating = true;
        
        if (!AppState.holdingsData || !AppState.marketData) {
            showStatus('error', 'Please load both holdings and market data files');
            isCalculating = false;
            return;
        }

        const projectionDays = parseFloat(document.getElementById('projectionDays').value) || 1;
        const marketMoveOverride = parseFloat(document.getElementById('marketMove').value);
        const ivOverride = parseFloat(document.getElementById('ivOverride').value);
        const numSimulations = parseInt(document.getElementById('simulations').value) || 1000;
        const confidenceLevel = parseFloat(document.getElementById('confidenceLevel').value) || 90;
        const correlationFactor = parseFloat(document.getElementById('correlationFactor').value) || 0.7;
        
        const vegaSlope = -0.0554;
        const effectiveCoverage = parseFloat(document.getElementById('vegaCoverage')?.value) / 100 || 0.248;
        const termStructureFactor = parseFloat(document.getElementById('termFactor')?.value) || 0.92;

        console.log('=== NOWCAST CALCULATION ===');
        console.log('Step 1: Price-only move of equity sleeve');
        
        let basketReturn = 0;
        let totalEquityWeight = 0;
        let weightedIV30 = 0;
        let weightedIVChange = 0;
        
        if (marketMoveOverride && !isNaN(marketMoveOverride)) {
            basketReturn = marketMoveOverride / 100;
            console.log(`Using market move override: ${marketMoveOverride}%`);
        } else {
            AppState.holdingsData.stocks.forEach(position => {
                if (position.ticker === 'FGXXX' || position.ticker.includes('MM')) {
                    console.log(`Skipping ${position.ticker} (MMF/Cash)`);
                    return;
                }
                
                const mktData = AppState.marketData[position.ticker];
                if (mktData) {
                    const returnPct = mktData.changePercent / 100;
                    const contribution = position.weight * returnPct / 100;
                    basketReturn += contribution;
                    totalEquityWeight += position.weight;
                    
                    weightedIV30 += position.weight * (mktData.iv30 || 30);
                    weightedIVChange += position.weight * (mktData.ivChange || 0);
                    
                    console.log(`${position.ticker}: weight=${position.weight.toFixed(2)}%, return=${(returnPct * 100).toFixed(2)}%, contrib=${(contribution * 100).toFixed(4)}%`);
                }
            });
        }
        
        if (ivOverride && !isNaN(ivOverride)) {
            const currentIV = weightedIV30 / totalEquityWeight;
            weightedIVChange = ((ivOverride - currentIV) / currentIV) * 100 * totalEquityWeight;
            console.log(`Using IV override: ${ivOverride}% (change: ${(weightedIVChange / totalEquityWeight).toFixed(2)}%)`);
        }
        
        if (totalEquityWeight > 0) {
            weightedIV30 = weightedIV30 / totalEquityWeight;
            weightedIVChange = weightedIVChange / totalEquityWeight;
        }
        
        const navPriceOnly = AppState.currentNAV * (1 + basketReturn);
        console.log(`Basket return: ${(basketReturn * 100).toFixed(3)}%`);
        console.log(`NAV₀ = ${AppState.currentNAV.toFixed(4)} → NAV_px = ${navPriceOnly.toFixed(4)}`);
        
        console.log('\nStep 2: IV/term-structure adjustment');
        console.log(`Weighted IV30: ${weightedIV30.toFixed(1)}%`);
        console.log(`Weighted IV30 change: ${weightedIVChange.toFixed(2)}%`);
        
        const deltaIV7 = (weightedIV30 / 100) * (weightedIVChange / 100) * termStructureFactor;
        console.log(`Term structure factor: ${termStructureFactor}`);
        console.log(`ΔIV₇ (vol pts): ${(deltaIV7 * 100).toFixed(3)}`);
        
        const vegaPnL = vegaSlope * deltaIV7;
        console.log(`Vega P&L (per notional): ${(vegaPnL * 100).toFixed(3)}%`);
        
        const adjustedVegaPnL = effectiveCoverage * vegaPnL;
        console.log(`Effective coverage: ${(effectiveCoverage * 100).toFixed(1)}%`);
        console.log(`Adjusted vega P&L: ${(adjustedVegaPnL * 100).toFixed(3)}%`);
        
        const navWithIV = navPriceOnly * (1 + adjustedVegaPnL);
        console.log(`NAV_IV = ${navWithIV.toFixed(4)} (${adjustedVegaPnL >= 0 ? '+' : ''}${(adjustedVegaPnL * 100).toFixed(3)}% from vega)`);
        
        const spotPrice = parseFloat(document.getElementById('spotPrice')?.value) || AppState.currentNAV;
        const premium = (spotPrice / navWithIV - 1) * 100;
        console.log(`\nStep 3: Premium/Discount`);
        console.log(`Spot price: ${spotPrice.toFixed(2)}`);
        console.log(`Premium/Discount: ${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%`);
        
        const dividendAmount = parseFloat(document.getElementById('dividendAmount')?.value) || 0;
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
        
        const projectedNAVs = [];
        
        for (let sim = 0; sim < numSimulations; sim++) {
            const marketFactor = gaussianRandom() * Math.sqrt(projectionDays);
            const dailyVol = (weightedIV30 / 100) / Math.sqrt(252);
            const simulatedReturn = marketFactor * dailyVol * correlationFactor;
            const simNAV = navWithIV * (1 + simulatedReturn);
            projectedNAVs.push(simNAV);
        }
        
        projectedNAVs.sort((a, b) => a - b);
        const lowerPercentile = (100 - confidenceLevel) / 2;
        const upperPercentile = 100 - lowerPercentile;
        const lowerBound = projectedNAVs[Math.floor(numSimulations * lowerPercentile / 100)];
        const upperBound = projectedNAVs[Math.floor(numSimulations * upperPercentile / 100)];
        const var5 = AppState.currentNAV - projectedNAVs[Math.floor(numSimulations * 0.05)];
        const probAbove = projectedNAVs.filter(nav => nav > AppState.currentNAV).length / numSimulations;
        
        // Update display
        document.getElementById('projectedNav').textContent = `${navWithIV.toFixed(4)}`;
        document.getElementById('navChange').textContent = `${(((navWithIV - AppState.currentNAV) / AppState.currentNAV) * 100).toFixed(3)}%`;
        document.getElementById('priceOnlyNav').textContent = `${navPriceOnly.toFixed(4)}`;
        document.getElementById('vegaImpact').textContent = `${adjustedVegaPnL >= 0 ? '+' : ''}${(adjustedVegaPnL * 100).toFixed(3)}%`;
        document.getElementById('premiumDisc').textContent = `${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%`;
        document.getElementById('exDivNav').textContent = dividendAmount > 0 ? `${exDivNAV.toFixed(4)}` : 'N/A';
        document.getElementById('confRange').textContent = `${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}`;
        document.getElementById('var5').textContent = `${var5.toFixed(3)}`;
        
        // Update breakdown
        document.getElementById('startingNav').textContent = `${AppState.currentNAV.toFixed(4)}`;
        document.getElementById('basketRet').textContent = `${basketReturn >= 0 ? '+' : ''}${(basketReturn * 100).toFixed(3)}%`;
        document.getElementById('basketImpact').textContent = `${(navPriceOnly - AppState.currentNAV).toFixed(4)}`;
        document.getElementById('weightedIV30').textContent = `${weightedIV30.toFixed(1)}%`;
        document.getElementById('ivChg').textContent = `${weightedIVChange >= 0 ? '+' : ''}${weightedIVChange.toFixed(2)}%`;
        document.getElementById('vegaImp').textContent = `${(navWithIV - navPriceOnly).toFixed(4)}`;
        document.getElementById('currentPrice').textContent = `${spotPrice.toFixed(2)}`;
        document.getElementById('premDisc').textContent = `${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%`;
        
        // Handle ex-dividend row
        const exDivRow = document.getElementById('exDivRow');
        if (exDivRow) {
            if (dividendAmount > 0) {
                exDivRow.style.display = '';
                document.getElementById('exDivAmount').textContent = `-${dividendAmount.toFixed(2)}`;
                document.getElementById('impliedOpen').textContent = `${impliedExDivOpen.toFixed(2)}`;
            } else {
                exDivRow.style.display = 'none';
            }
        }
        
        // Update summary
        const summaryText = `
ULTY NAV NOWCAST - ${new Date().toLocaleString()}
================================================
Current NAV:      ${AppState.currentNAV.toFixed(4)}
Projected NAV:    ${navWithIV.toFixed(4)}
Change:           ${((navWithIV - AppState.currentNAV) / AppState.currentNAV * 100) >= 0 ? '+' : ''}${((navWithIV - AppState.currentNAV) / AppState.currentNAV * 100).toFixed(3)}%

Components:
- Basket Return:  ${basketReturn >= 0 ? '+' : ''}${(basketReturn * 100).toFixed(3)}%
- Vega Impact:    ${adjustedVegaPnL >= 0 ? '+' : ''}${(adjustedVegaPnL * 100).toFixed(3)}%
- Premium/Disc:   ${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%

${confidenceLevel}% Confidence Range: ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}
`;
        document.getElementById('summaryContent').textContent = summaryText;
        
        // Create visualization
        createNowcastVisualization({
            currentNAV: AppState.currentNAV,
            navWithIV,
            navPriceOnly,
            basketReturn,
            adjustedVegaPnL,
            premium,
            weightedIV30,
            weightedIVChange,
            lowerBound,
            upperBound,
            spotPrice,
            exDivNAV,
            impliedExDivOpen,
            dividendAmount
        });
        
        // Create moneyness analysis
        createMoneynessAnalysis();
        
        document.getElementById('resultsSection').classList.add('active');
        showStatus('success', 'Nowcast calculation completed');
        
        console.log('\n========== NOWCAST SUMMARY ==========');
        console.log(`Starting NAV: ${AppState.currentNAV.toFixed(4)}`);
        console.log(`Final Nowcast NAV: ${navWithIV.toFixed(4)}`);
        console.log('=====================================\n');
        
    } catch (error) {
        console.error('Error in nowcast calculation:', error);
        showStatus('error', `Calculation error: ${error.message}`);
    } finally {
        isCalculating = false;
    }
}

function calculateWeightedMetrics() {
    if (!AppState.holdingsData || !AppState.marketData) return;
    
    let weightedIV = 0, weightedChange = 0, weighted20DayVol = 0;
    let minIV = Infinity, maxIV = -Infinity;
    let minChange = Infinity, maxChange = -Infinity;
    let min20Day = Infinity, max20Day = -Infinity;
    let totalWeight = 0;
    
    AppState.holdingsData.positions.forEach(position => {
        const dataSymbol = position.underlying || position.ticker;
        const mktData = AppState.marketData[dataSymbol];
        
        if (mktData) {
            const iv = mktData.iv30 || 30;
            const change = mktData.changePercent || 0;
            const vol20 = mktData.volatility20Day || 0;
            
            weightedIV += iv * position.weight;
            weightedChange += change * position.weight;
            weighted20DayVol += vol20 * position.weight;
            totalWeight += position.weight;
            
            minIV = Math.min(minIV, iv);
            maxIV = Math.max(maxIV, iv);
            minChange = Math.min(minChange, change);
            maxChange = Math.max(maxChange, change);
            min20Day = Math.min(min20Day, vol20);
            max20Day = Math.max(max20Day, vol20);
        }
    });
    
    if (totalWeight > 0) {
        AppState.weightedMetrics = {
            iv: weightedIV / totalWeight,
            change: weightedChange / totalWeight,
            vol20Day: weighted20DayVol / totalWeight
        };
        
        document.getElementById('weightedIV').textContent = `${AppState.weightedMetrics.iv.toFixed(1)}%`;
        document.getElementById('minIV').textContent = `${minIV.toFixed(1)}%`;
        document.getElementById('maxIV').textContent = `${maxIV.toFixed(1)}%`;
        document.getElementById('weightedChange').textContent = `${AppState.weightedMetrics.change >= 0 ? '+' : ''}${AppState.weightedMetrics.change.toFixed(2)}%`;
        document.getElementById('minChange').textContent = `${minChange.toFixed(2)}%`;
        document.getElementById('maxChange').textContent = `${maxChange >= 0 ? '+' : ''}${maxChange.toFixed(2)}%`;
        document.getElementById('weighted20DayVol').textContent = `${AppState.weightedMetrics.vol20Day.toFixed(1)}%`;
        document.getElementById('min20DayVol').textContent = `${min20Day.toFixed(1)}%`;
        document.getElementById('max20DayVol').textContent = `${max20Day.toFixed(1)}%`;
    }
}

function displayPerformanceMetrics() {
    if (!AppState.holdingsData || !AppState.marketData) return;
    
    document.getElementById('performanceSection').classList.add('active');
    
    let totalChange = 0;
    let totalIV = 0;
    let totalVolume = 0;
    let weightSum = 0;
    let totalContribution = 0;
    
    AppState.holdingsData.stocks.forEach(position => {
        const mktData = AppState.marketData[position.ticker];
        if (mktData) {
            const contribution = (mktData.changePercent || 0) * (position.weight / 100);
            totalContribution += contribution;
            totalChange += mktData.changePercent * position.weight;
            totalIV += mktData.iv30 * position.weight;
            totalVolume += mktData.volume || 0;
            weightSum += position.weight;
        }
    });
    
    const avgChange = weightSum > 0 ? totalChange / weightSum : 0;
    const avgIV = weightSum > 0 ? totalIV / weightSum : 30;
    
    const performanceHTML = `
        <div class="perf-metric ${totalContribution >= 0 ? 'positive' : 'negative'}">
            <div class="metric-title">Portfolio Impact</div>
            <div class="metric-value">${totalContribution >= 0 ? '+' : ''}${totalContribution.toFixed(2)}%</div>
        </div>
        <div class="perf-metric ${avgChange >= 0 ? 'positive' : 'negative'}">
            <div class="metric-title">Weighted Change</div>
            <div class="metric-value">${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%</div>
        </div>
        <div class="perf-metric">
            <div class="metric-title">Weighted IV</div>
            <div class="metric-value">${avgIV.toFixed(1)}%</div>
        </div>
        <div class="perf-metric">
            <div class="metric-title">Total Volume</div>
            <div class="metric-value">${(totalVolume / 1000000).toFixed(1)}M</div>
        </div>
        <div class="perf-metric">
            <div class="metric-title">Active Positions</div>
            <div class="metric-value">${AppState.holdingsData.stocks.length}</div>
        </div>
    `;
    
    document.getElementById('performanceGrid').innerHTML = performanceHTML;
    
    updatePositionCardIVs();
    
    const tbody = document.getElementById('stockPerformanceBody');
    let tableHTML = '';
    
    const stockSymbols = new Set(AppState.holdingsData.stocks.map(p => p.ticker));
    
    stockSymbols.forEach(symbol => {
        const stockPosition = AppState.holdingsData.stocks.find(p => p.ticker === symbol);
        const mktData = AppState.marketData[symbol] || {};
        
        const contribution = (mktData.changePercent || 0) * (stockPosition.weight / 100);
        
        let ivChangeDisplay = '0.00';
        let ivChangeClass = '';
        if (mktData.ivChange !== 0 && mktData.ivChange !== undefined) {
            ivChangeDisplay = mktData.ivChange.toFixed(2);
            ivChangeClass = mktData.ivChange >= 0 ? 'positive' : 'negative';
        } else if (mktData.ivChangeAbs !== 0 && mktData.ivChangeAbs !== undefined) {
            ivChangeDisplay = mktData.ivChangeAbs.toFixed(2);
            ivChangeClass = mktData.ivChangeAbs >= 0 ? 'positive' : 'negative';
        }
        
        tableHTML += `
            <tr style="font-weight: bold;">
                <td>${symbol}</td>
                <td>${(mktData.lastPrice || stockPosition.price).toFixed(2)}</td>
                <td class="${mktData.change >= 0 ? 'positive' : 'negative'}">${mktData.change >= 0 ? '+' : ''}${(mktData.change || 0).toFixed(2)}</td>
                <td class="${mktData.changePercent >= 0 ? 'positive' : 'negative'}">${mktData.changePercent >= 0 ? '+' : ''}${(mktData.changePercent || 0).toFixed(2)}%</td>
                <td>${((mktData.volume || 0) / 1000).toFixed(0)}K</td>
                <td>${(mktData.iv30 || 30).toFixed(1)}%</td>
                <td class="${ivChangeClass}">${ivChangeDisplay !== '0.00' ? (parseFloat(ivChangeDisplay) >= 0 ? '+' : '') : ''}${ivChangeDisplay}%</td>
                <td>${stockPosition.weight.toFixed(2)}%</td>
                <td class="${contribution >= 0 ? 'positive' : 'negative'}" style="font-weight: bold;">${contribution >= 0 ? '+' : ''}${contribution.toFixed(3)}%</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = tableHTML;
}

function updatePositionCardIVs() {
    if (!AppState.holdingsData || !AppState.marketData) return;
    
    let stockIV = 0, stockWeight = 0;
    let callIV = 0, callWeight = 0;
    let putIV = 0, putWeight = 0;
    
    AppState.holdingsData.stocks.forEach(p => {
        const mkt = AppState.marketData[p.ticker];
        if (mkt) {
            stockIV += (mkt.iv30 || 30) * p.weight;
            stockWeight += p.weight;
        }
    });
    
    AppState.holdingsData.calls.forEach(p => {
        const mkt = AppState.marketData[p.underlying];
        if (mkt) {
            callIV += (mkt.iv30 || 30) * p.weight;
            callWeight += p.weight;
        }
    });
    
    AppState.holdingsData.puts.forEach(p => {
        const mkt = AppState.marketData[p.underlying];
        if (mkt) {
            putIV += (mkt.iv30 || 30) * p.weight;
            putWeight += p.weight;
        }
    });
    
    document.getElementById('stockAvgIV').textContent = stockWeight > 0 ? `${(stockIV / stockWeight).toFixed(1)}%` : 'N/A';
    document.getElementById('callAvgIV').textContent = callWeight > 0 ? `${(callIV / callWeight).toFixed(1)}%` : 'N/A';
    document.getElementById('putAvgIV').textContent = putWeight > 0 ? `${(putIV / putWeight).toFixed(1)}%` : 'N/A';
}

// Export functions
window.calculateNowcast = calculateNowcast;
window.calculateWeightedMetrics = calculateWeightedMetrics;
window.displayPerformanceMetrics = displayPerformanceMetrics;
window.updatePositionCardIVs = updatePositionCardIVs;
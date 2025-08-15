// Visualizations - Chart and visualization functions

function createNowcastVisualization(results) {
    const {
        currentNAV,
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
    } = results;

    const navChange = ((navWithIV - currentNAV) / currentNAV) * 100;
    const navChangeAbs = navWithIV - currentNAV;

    let visualContainer = document.getElementById('nowcastVisualization');
    if (!visualContainer) {
        visualContainer = document.createElement('div');
        visualContainer.id = 'nowcastVisualization';
        visualContainer.className = 'nowcast-visual';
        
        const summaryElement = document.querySelector('.nowcast-summary');
        if (summaryElement) {
            summaryElement.parentNode.insertBefore(visualContainer, summaryElement.nextSibling);
        }
    }

    visualContainer.innerHTML = `
        <h3 style="color: #333; margin-bottom: 25px; text-align: center;">
            📊 Nowcast Visualization Dashboard
        </h3>

        <!-- NAV Change Gauge -->
        <div class="nowcast-gauge">
            <svg class="gauge-svg" viewBox="0 0 300 150">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#dc3545;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#ffc107;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#28a745;stop-opacity:1" />
                    </linearGradient>
                </defs>
                
                <path d="M 30 120 A 120 120 0 0 1 270 120" 
                      class="gauge-background" />
                
                <path d="M 30 120 A 120 120 0 0 1 270 120" 
                      class="gauge-fill"
                      stroke="url(#gaugeGradient)"
                      stroke-dasharray="0 377"
                      id="gaugeFill" />
                
                <text x="150" y="90" text-anchor="middle" 
                      font-size="28" font-weight="bold" fill="#333">
                    ${navChange >= 0 ? '+' : ''}${navChange.toFixed(2)}%
                </text>
                <text x="150" y="110" text-anchor="middle" 
                      font-size="14" fill="#666">
                    NAV Change
                </text>
                
                <line x1="150" y1="120" x2="150" y2="40" 
                      stroke="#333" stroke-width="3"
                      class="gauge-needle"
                      id="gaugeNeedle" />
                <circle cx="150" cy="120" r="8" fill="#333" />
            </svg>
            <div class="gauge-labels">
                <span>-5%</span>
                <span>0%</span>
                <span>+5%</span>
            </div>
        </div>

        <!-- Key Metrics Grid -->
        <div class="nowcast-metrics-visual">
            <div class="metric-visual ${navChange >= 0 ? 'positive' : 'negative'}">
                <div class="metric-visual-header">
                    <span class="metric-visual-title">Projected NAV</span>
                    <div class="metric-visual-icon">💰</div>
                </div>
                <div class="metric-visual-value animated-number">
                    $${navWithIV.toFixed(4)}
                </div>
                <div class="metric-visual-change">
                    From $${currentNAV.toFixed(4)} 
                    (${navChange >= 0 ? '+' : ''}${navChangeAbs.toFixed(4)})
                </div>
                <div class="metric-visual-bar">
                    <div class="metric-visual-bar-fill" 
                         style="width: ${Math.min(100, Math.abs(navChange) * 20)}%"></div>
                </div>
            </div>

            <div class="metric-visual">
                <div class="metric-visual-header">
                    <span class="metric-visual-title">Basket Return</span>
                    <div class="metric-visual-icon">📈</div>
                </div>
                <div class="metric-visual-value" style="color: ${basketReturn >= 0 ? '#28a745' : '#dc3545'}">
                    ${basketReturn >= 0 ? '+' : ''}${(basketReturn * 100).toFixed(3)}%
                </div>
                <div class="metric-visual-change">
                    Price Impact: $${(navPriceOnly - currentNAV).toFixed(4)}
                </div>
                <div class="metric-visual-bar">
                    <div class="metric-visual-bar-fill" 
                         style="width: ${Math.min(100, Math.abs(basketReturn * 100) * 20)}%;
                                background: ${basketReturn >= 0 ? '#28a745' : '#dc3545'}"></div>
                </div>
            </div>

            <div class="metric-visual">
                <div class="metric-visual-header">
                    <span class="metric-visual-title">Vega Impact</span>
                    <div class="metric-visual-icon">🎯</div>
                </div>
                <div class="metric-visual-value" style="color: ${adjustedVegaPnL >= 0 ? '#28a745' : '#dc3545'}">
                    ${adjustedVegaPnL >= 0 ? '+' : ''}${(adjustedVegaPnL * 100).toFixed(3)}%
                </div>
                <div class="metric-visual-change">
                    IV: ${weightedIV30.toFixed(1)}% (${weightedIVChange >= 0 ? '+' : ''}${weightedIVChange.toFixed(2)}%)
                </div>
                <div class="metric-visual-bar">
                    <div class="metric-visual-bar-fill" 
                         style="width: ${Math.min(100, Math.abs(adjustedVegaPnL * 100) * 20)}%;
                                background: ${adjustedVegaPnL >= 0 ? '#28a745' : '#dc3545'}"></div>
                </div>
            </div>

            <div class="metric-visual">
                <div class="metric-visual-header">
                    <span class="metric-visual-title">Premium/Discount</span>
                    <div class="metric-visual-icon">💱</div>
                </div>
                <div class="metric-visual-value" style="color: ${premium >= 0 ? '#ffc107' : '#17a2b8'}">
                    ${premium >= 0 ? '+' : ''}${premium.toFixed(2)}%
                </div>
                <div class="metric-visual-change">
                    Price: $${spotPrice.toFixed(2)} vs NAV: $${navWithIV.toFixed(4)}
                </div>
                <div class="metric-visual-bar">
                    <div class="metric-visual-bar-fill" 
                         style="width: ${Math.min(100, Math.abs(premium) * 10)}%;
                                background: ${premium >= 0 ? '#ffc107' : '#17a2b8'}"></div>
                </div>
            </div>
        </div>

        <!-- Waterfall Chart -->
        <div class="waterfall-chart">
            <h4 style="color: #333; margin-bottom: 20px;">NAV Bridge Analysis</h4>
            <canvas id="waterfallChart" height="100"></canvas>
        </div>

        <!-- Timeline View -->
        <div class="nowcast-timeline">
            <h4 style="color: #333; margin-bottom: 20px;">Calculation Steps</h4>
            
            <div class="timeline-item">
                <div class="timeline-icon" style="background: #e9ecef;">
                    <span>1️⃣</span>
                </div>
                <div class="timeline-content">
                    <div class="timeline-label">Starting NAV</div>
                    <div class="timeline-value">$${currentNAV.toFixed(4)}</div>
                </div>
            </div>

            <div class="timeline-item">
                <div class="timeline-icon" style="background: ${basketReturn >= 0 ? '#d4edda' : '#f8d7da'};">
                    <span>2️⃣</span>
                </div>
                <div class="timeline-content">
                    <div class="timeline-label">After Basket Return (${basketReturn >= 0 ? '+' : ''}${(basketReturn * 100).toFixed(3)}%)</div>
                    <div class="timeline-value">$${navPriceOnly.toFixed(4)}</div>
                </div>
            </div>

            <div class="timeline-item">
                <div class="timeline-icon" style="background: ${adjustedVegaPnL >= 0 ? '#d4edda' : '#f8d7da'};">
                    <span>3️⃣</span>
                </div>
                <div class="timeline-content">
                    <div class="timeline-label">After Vega Adjustment (${adjustedVegaPnL >= 0 ? '+' : ''}${(adjustedVegaPnL * 100).toFixed(3)}%)</div>
                    <div class="timeline-value">$${navWithIV.toFixed(4)}</div>
                </div>
            </div>

            ${dividendAmount > 0 ? `
            <div class="timeline-item">
                <div class="timeline-icon" style="background: #fff3cd;">
                    <span>4️⃣</span>
                </div>
                <div class="timeline-content">
                    <div class="timeline-label">Ex-Dividend NAV (-$${dividendAmount.toFixed(2)})</div>
                    <div class="timeline-value">$${exDivNAV.toFixed(4)}</div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    setTimeout(() => {
        animateGauge(navChange);
    }, 100);

    createWaterfallChart(results);
    animateNumbers();
}

function createMoneynessAnalysis() {
    console.log('Creating moneyness analysis...');
    
    if (!AppState.holdingsData || !AppState.marketData) {
        console.log('Missing holdings or market data');
        return;
    }

    const callPositions = AppState.holdingsData.calls || [];
    console.log(`Found ${callPositions.length} call positions`);
    
    if (callPositions.length === 0) {
        console.log('No call positions to analyze');
        return;
    }

    // Calculate moneyness for each call position
    const moneynessData = callPositions.map(call => {
        const underlying = call.underlying;
        const mktData = AppState.marketData[underlying];
        
        if (!mktData || !call.strike) {
            return null;
        }

        const stockPrice = mktData.lastPrice || 0;
        const strike = call.strike;
        const moneyness = (stockPrice / strike - 1) * 100;
        
        let category;
        if (moneyness < -10) {
            category = 'deep-otm';
        } else if (moneyness < -2) {
            category = 'otm';
        } else if (moneyness >= -2 && moneyness <= 2) {
            category = 'atm';
        } else if (moneyness > 2 && moneyness <= 10) {
            category = 'itm';
        } else {
            category = 'deep-itm';
        }

        return {
            underlying,
            strike,
            stockPrice,
            moneyness,
            category,
            weight: call.weight,
            marketValue: call.marketValue,
            daysToExpiry: call.daysToExpiry,
            expiration: call.expiration
        };
    }).filter(x => x !== null);

    // Calculate aggregate statistics
    const totalCallValue = moneynessData.reduce((sum, c) => sum + c.marketValue, 0);
    const categories = {
        'deep-otm': { count: 0, value: 0, weight: 0 },
        'otm': { count: 0, value: 0, weight: 0 },
        'atm': { count: 0, value: 0, weight: 0 },
        'itm': { count: 0, value: 0, weight: 0 },
        'deep-itm': { count: 0, value: 0, weight: 0 }
    };

    moneynessData.forEach(call => {
        categories[call.category].count++;
        categories[call.category].value += call.marketValue;
        categories[call.category].weight += call.weight;
    });

    // Calculate weighted average moneyness
    const totalWeight = moneynessData.reduce((sum, c) => sum + c.weight, 0);
    const weightedMoneyness = totalWeight > 0 ? 
        moneynessData.reduce((sum, c) => sum + c.moneyness * c.weight, 0) / totalWeight : 0;

    // Create or update the moneyness container
    let moneynessContainer = document.getElementById('moneynessAnalysis');
    if (!moneynessContainer) {
        moneynessContainer = document.createElement('div');
        moneynessContainer.id = 'moneynessAnalysis';
        moneynessContainer.className = 'moneyness-section';
        
        const visualContainer = document.getElementById('nowcastVisualization');
        if (visualContainer) {
            visualContainer.parentNode.insertBefore(moneynessContainer, visualContainer.nextSibling);
        }
    }

    // Build the moneyness HTML
    moneynessContainer.innerHTML = `
        <div class="moneyness-header">
            <h3 style="color: #333; margin: 0;">📊 Call Portfolio Moneyness Analysis</h3>
            <button class="export-btn" onclick="exportMoneynessData()" style="background: #667eea;">
                Export Analysis
            </button>
        </div>

        <!-- Summary Cards -->
        <div class="moneyness-grid">
            <div class="moneyness-card">
                <div class="moneyness-label">Total Calls</div>
                <div class="moneyness-value">${callPositions.length}</div>
                <div class="moneyness-subtitle">Positions</div>
            </div>
            <div class="moneyness-card">
                <div class="moneyness-label">Weighted Moneyness</div>
                <div class="moneyness-value" style="color: ${weightedMoneyness < 0 ? '#28a745' : '#dc3545'}">
                    ${weightedMoneyness >= 0 ? '+' : ''}${weightedMoneyness.toFixed(1)}%
                </div>
                <div class="moneyness-subtitle">${weightedMoneyness < 0 ? 'OTM' : 'ITM'}</div>
            </div>
            <div class="moneyness-card">
                <div class="moneyness-label">Call Value</div>
                <div class="moneyness-value">${(totalCallValue / 1000000).toFixed(2)}M</div>
                <div class="moneyness-subtitle">Market Value</div>
            </div>
            <div class="moneyness-card">
                <div class="moneyness-label">Avg Days to Expiry</div>
                <div class="moneyness-value">${Math.round(moneynessData.reduce((sum, c) => sum + (c.daysToExpiry || 0), 0) / moneynessData.length)}</div>
                <div class="moneyness-subtitle">Days</div>
            </div>
        </div>

        <!-- Distribution Bar -->
        <h4 style="margin-top: 30px; color: #333;">Moneyness Distribution by Value</h4>
        <div class="moneyness-distribution">
            ${Object.entries(categories).map(([cat, data]) => {
                const percentage = (data.value / totalCallValue * 100);
                if (percentage > 0) {
                    return `<div class="moneyness-segment ${cat}" style="width: ${percentage}%">
                        ${percentage > 10 ? `${percentage.toFixed(0)}%` : ''}
                    </div>`;
                }
                return '';
            }).join('')}
        </div>
        
        <!-- Legend -->
        <div style="display: flex; justify-content: center; gap: 20px; margin: 15px 0; font-size: 0.9em;">
            <span><span style="display: inline-block; width: 12px; height: 12px; background: #28a745; border-radius: 2px;"></span> Deep OTM (&lt;-10%)</span>
            <span><span style="display: inline-block; width: 12px; height: 12px; background: #20c997; border-radius: 2px;"></span> OTM (-10% to -2%)</span>
            <span><span style="display: inline-block; width: 12px; height: 12px; background: #ffc107; border-radius: 2px;"></span> ATM (-2% to +2%)</span>
            <span><span style="display: inline-block; width: 12px; height: 12px; background: #fd7e14; border-radius: 2px;"></span> ITM (+2% to +10%)</span>
            <span><span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 2px;"></span> Deep ITM (&gt;+10%)</span>
        </div>

        <!-- Category Cards -->
        <div class="moneyness-grid" style="margin-top: 20px;">
            ${Object.entries(categories).map(([cat, data]) => {
                const labels = {
                    'deep-otm': 'Deep OTM',
                    'otm': 'Out of Money',
                    'atm': 'At the Money',
                    'itm': 'In the Money',
                    'deep-itm': 'Deep ITM'
                };
                return `
                    <div class="moneyness-card ${cat}">
                        <div class="moneyness-label">${labels[cat]}</div>
                        <div class="moneyness-value">${data.count}</div>
                        <div class="moneyness-subtitle">
                            ${(data.value / 1000000).toFixed(2)}M | ${data.weight.toFixed(1)}%
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Heatmap -->
        <h4 style="margin-top: 30px; color: #333;">Position Heatmap</h4>
        <div class="moneyness-heatmap">
            ${moneynessData.sort((a, b) => b.moneyness - a.moneyness).map(call => {
                let bgColor;
                if (call.moneyness < -10) bgColor = '#28a745';
                else if (call.moneyness < -5) bgColor = '#20c997';
                else if (call.moneyness < 0) bgColor = '#17a2b8';
                else if (call.moneyness < 5) bgColor = '#ffc107';
                else if (call.moneyness < 10) bgColor = '#fd7e14';
                else bgColor = '#dc3545';
                
                return `
                    <div class="heatmap-cell" style="background: ${bgColor}; color: white;"
                         title="${call.underlying}: Stock ${call.stockPrice.toFixed(2)} / Strike ${call.strike.toFixed(2)}">
                        <div class="heatmap-ticker">${call.underlying}</div>
                        <div class="heatmap-moneyness">${call.moneyness.toFixed(0)}%</div>
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Risk Gauge -->
        <div style="text-align: center; margin-top: 30px;">
            <h4 style="color: #333;">Portfolio Risk Level</h4>
            <div class="risk-gauge">
                <svg class="risk-gauge-bg" viewBox="0 0 250 125">
                    <defs>
                        <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:#28a745;stop-opacity:1" />
                            <stop offset="50%" style="stop-color:#ffc107;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#dc3545;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <path d="M 25 100 A 100 100 0 0 1 225 100" 
                          fill="none" stroke="url(#riskGradient)" stroke-width="20" />
                </svg>
                <div class="risk-gauge-needle" id="riskNeedle"></div>
                <div class="risk-gauge-center"></div>
            </div>
            <div class="risk-labels">
                <span>Low Risk<br/><small>(Deep OTM)</small></span>
                <span>Medium<br/><small>(ATM)</small></span>
                <span>High Risk<br/><small>(ITM)</small></span>
            </div>
        </div>

        <!-- Detailed Table -->
        <h4 style="margin-top: 30px; color: #333;">Call Position Details</h4>
        <div style="overflow-x: auto;">
            <table class="moneyness-table">
                <thead>
                    <tr>
                        <th>Underlying</th>
                        <th>Stock Price</th>
                        <th>Strike</th>
                        <th>Moneyness</th>
                        <th>Status</th>
                        <th>Days to Expiry</th>
                        <th>Weight</th>
                        <th>Market Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${moneynessData.sort((a, b) => b.weight - a.weight).map(call => `
                        <tr>
                            <td><strong>${call.underlying}</strong></td>
                            <td>${call.stockPrice.toFixed(2)}</td>
                            <td>${call.strike.toFixed(2)}</td>
                            <td style="color: ${call.moneyness < 0 ? '#28a745' : '#dc3545'}">
                                ${call.moneyness >= 0 ? '+' : ''}${call.moneyness.toFixed(1)}%
                            </td>
                            <td>
                                <span class="moneyness-badge ${call.category}">
                                    ${call.category.replace('-', ' ').toUpperCase()}
                                </span>
                            </td>
                            <td>${call.daysToExpiry || 'N/A'}</td>
                            <td>${call.weight.toFixed(2)}%</td>
                            <td>${(call.marketValue / 1000).toFixed(0)}K</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Animate the risk gauge
    setTimeout(() => {
        const riskScore = Math.max(0, Math.min(100, (weightedMoneyness + 10) * 5));
        const angle = (riskScore / 100) * 180 - 90;
        const needle = document.getElementById('riskNeedle');
        if (needle) {
            needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        }
    }, 100);
}

function createWaterfallChart(results) {
    const canvas = document.getElementById('waterfallChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const data = [
        { label: 'Starting NAV', value: results.currentNAV, type: 'start' },
        { label: 'Basket Return', value: results.navPriceOnly - results.currentNAV, type: 'change' },
        { label: 'Vega Impact', value: results.navWithIV - results.navPriceOnly, type: 'change' },
        { label: 'Final NAV', value: results.navWithIV, type: 'end' }
    ];
    
    if (window.nowcastWaterfallChart) {
        window.nowcastWaterfallChart.destroy();
    }
    
    window.nowcastWaterfallChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'NAV Bridge',
                data: data.map((d, i) => {
                    if (d.type === 'start' || d.type === 'end') {
                        return d.value;
                    } else {
                        let cumulative = data[0].value;
                        for (let j = 1; j <= i; j++) {
                            if (data[j].type === 'change') {
                                cumulative += data[j].value;
                            }
                        }
                        return [cumulative - d.value, cumulative];
                    }
                }),
                backgroundColor: data.map(d => {
                    if (d.type === 'start') return '#667eea';
                    if (d.type === 'end') return '#764ba2';
                    return d.value >= 0 ? '#28a745' : '#dc3545';
                }),
                borderColor: data.map(d => {
                    if (d.type === 'start') return '#5568d3';
                    if (d.type === 'end') return '#6a3d9a';
                    return d.value >= 0 ? '#218838' : '#c82333';
                }),
                borderWidth: 2,
                barPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            if (Array.isArray(value)) {
                                const change = value[1] - value[0];
                                return `Change: ${change >= 0 ? '+' : ''}$${change.toFixed(4)}`;
                            }
                            return `Value: $${value.toFixed(4)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'NAV ($)' }
                }
            }
        }
    });
}

function animateGauge(changePercent) {
    const maxChange = 5;
    const normalizedChange = Math.max(-maxChange, Math.min(maxChange, changePercent));
    const angle = ((normalizedChange + maxChange) / (maxChange * 2)) * 180 - 90;
    
    const needle = document.getElementById('gaugeNeedle');
    if (needle) {
        needle.style.transform = `rotate(${angle}deg)`;
        needle.style.transformOrigin = '150px 120px';
    }
    
    const fill = document.getElementById('gaugeFill');
    if (fill) {
        const dashLength = 377 * ((normalizedChange + maxChange) / (maxChange * 2));
        fill.style.strokeDasharray = `${dashLength} 377`;
    }
}

function animateNumbers() {
    const elements = document.querySelectorAll('.animated-number');
    elements.forEach(el => {
        const finalText = el.textContent;
        const finalValue = parseFloat(finalText.replace(/[^0-9.-]/g, ''));
        const prefix = finalText.match(/^[^0-9.-]*/)[0];
        const suffix = finalText.match(/[^0-9.-]*$/)[0];
        const decimals = (finalText.match(/\.(\d+)/) || [0, ''])[1].length;
        
        let startValue = finalValue * 0.9;
        const duration = 1000;
        const startTime = Date.now();
        
        function update() {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const currentValue = startValue + (finalValue - startValue) * progress;
            
            el.textContent = prefix + currentValue.toFixed(decimals) + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        update();
    });
}

// Create projection chart
function createProjectionChart(currentNAV, projectionDays, projectedNAVs) {
    console.log('Creating projection chart with', projectedNAVs.length, 'simulations');
    
    // Get or create container for chart
    let chartContainer = document.getElementById('projectionChart');
    if (!chartContainer) {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            chartContainer = document.createElement('div');
            chartContainer.id = 'projectionChart';
            chartContainer.innerHTML = '<canvas id="projectionCanvas"></canvas>';
            chartContainer.style.marginTop = '20px';
            chartContainer.style.height = '300px';
            resultsSection.appendChild(chartContainer);
        }
    }
    
    // For now, just log that we would create the chart
    console.log('Projection chart would show NAV from', currentNAV, 'over', projectionDays, 'days');
}

// Create distribution chart
function createDistributionChart(projectedNAVs, currentNAV) {
    console.log('Creating distribution chart for', projectedNAVs.length, 'NAV projections');
    
    // Get or create container for chart
    let chartContainer = document.getElementById('distributionChart');
    if (!chartContainer) {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            chartContainer = document.createElement('div');
            chartContainer.id = 'distributionChart';
            chartContainer.innerHTML = '<canvas id="distributionCanvas"></canvas>';
            chartContainer.style.marginTop = '20px';
            chartContainer.style.height = '300px';
            resultsSection.appendChild(chartContainer);
        }
    }
    
    // For now, just log that we would create the chart
    console.log('Distribution chart would show NAV distribution around', currentNAV);
}

// Export functions
window.createProjectionChart = createProjectionChart;
window.createDistributionChart = createDistributionChart;
window.createNowcastVisualization = createNowcastVisualization;
window.createMoneynessAnalysis = createMoneynessAnalysis;
window.createWaterfallChart = createWaterfallChart;
window.animateGauge = animateGauge;
window.animateNumbers = animateNumbers;
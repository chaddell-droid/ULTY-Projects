// Main JavaScript - Application initialization and global state

// Global State
const AppState = {
    holdingsData: null,
    marketData: null,
    projectionChart: null,
    distChart: null,
    sensitivityChart: null,
    currentNAV: 0,
    sharesOutstanding: 0,
    weightedMetrics: {}
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('ULTY NAV Nowcast Tool initialized');
    
    // Initialize event listeners only once
    if (!window.eventListenersInitialized) {
        initializeEventListeners();
        window.eventListenersInitialized = true;
    }
});

// Initialize all event listeners
function initializeEventListeners() {
    // File upload handlers
    document.getElementById('holdingsFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'holdings');
    });

    document.getElementById('chameleonFile').addEventListener('change', function(e) {
        handleFileUpload(e, 'chameleon');
    });

    // Scenario type change handler
    document.getElementById('scenarioType').addEventListener('change', function(e) {
        const marketMoveInput = document.getElementById('marketMove');
        const ivInput = document.getElementById('ivOverride');
        
        if (e.target.value === 'base') {
            marketMoveInput.value = '';
            ivInput.value = '';
            marketMoveInput.placeholder = 'Use live data';
            ivInput.placeholder = 'Use live data';
        } else if (e.target.value === 'bullish') {
            marketMoveInput.value = '2';
            ivInput.value = '';
        } else if (e.target.value === 'bearish') {
            marketMoveInput.value = '-2';
            ivInput.value = '';
        } else if (e.target.value === 'volatile') {
            marketMoveInput.value = '0';
            ivInput.value = (AppState.weightedMetrics.iv || 30) * 1.5;
        }
    });
}

// Show status message
function showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status-message ${type}`;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

// Toggle position details
function togglePositionDetails(evt) {
    const details = document.getElementById('positionDetailsTable');
    const btn = evt ? evt.target : document.querySelector('.toggle-details-btn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    
    if (details && btn) {
        if (details.style.display === 'none' || details.style.display === '') {
            details.style.display = 'block';
            btn.textContent = 'Hide Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'inline-block';
            // Populate the tables when showing them
            if (AppState.holdingsData) {
                displayPositionDetails();
            }
        } else {
            details.style.display = 'none';
            btn.textContent = 'Show Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'none';
        }
    }
}

// Recalculate performance
function recalculatePerformance() {
    if (AppState.holdingsData && AppState.marketData) {
        displayPerformanceMetrics();
        calculateWeightedMetrics();
        showStatus('success', 'Performance metrics recalculated');
    } else {
        showStatus('error', 'Please load both data files first');
    }
}

// Helper function for Gaussian random numbers (Box-Muller transform)
function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
function togglePositionDetails(event) {
    const details = document.getElementById('positionDetailsTable');
    const btn = event ? event.target : document.querySelector('.toggle-details-btn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    
    if (details) {
        if (details.style.display === 'none' || details.style.display === '') {
            // Show the details
            details.style.display = 'block';
            btn.textContent = 'Hide Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'inline-block';
            
            // Generate and insert the position details HTML
            generatePositionDetailsHTML();
        } else {
            // Hide the details
            details.style.display = 'none';
            btn.textContent = 'Show Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'none';
        }
    }
}

function generatePositionDetailsHTML() {
    const container = document.getElementById('positionDetailsTable');
    if (!container || !window.holdingsData) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Add your position details HTML here
    // This depends on your data structure
    container.innerHTML = `
        <div class="position-section">
            <h4>Stock Positions</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Shares</th>
                        <th>Price</th>
                        <th>Value</th>
                        <th>Weight</th>
                    </tr>
                </thead>
                <tbody id="stockDetailsBody">
                    <!-- Stock rows will go here -->
                </tbody>
            </table>
        </div>
        <!-- Add similar sections for calls, puts, cash -->
    `;
    
    // Populate the tables with data
    populatePositionTables();
}
function togglePositionDetails(event) {
    const details = document.getElementById('positionDetailsTable');
    const btn = event ? event.target : document.querySelector('.toggle-details-btn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    
    if (details) {
        if (details.style.display === 'none' || details.style.display === '') {
            // Show the details
            details.style.display = 'block';
            btn.textContent = 'Hide Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'inline-block';
            
            // Call your existing function to generate the HTML
            generatePositionDetailsHTML();
        } else {
            // Hide the details
            details.style.display = 'none';
            btn.textContent = 'Show Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'none';
        }
    }
}

// Function to toggle position details visibility
function togglePositionDetails(event) {
    const details = document.getElementById('positionDetailsTable');
    const btn = event ? event.target : document.querySelector('.toggle-details-btn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    
    if (details) {
        if (details.style.display === 'none' || details.style.display === '') {
            // Show the details
            details.style.display = 'block';
            btn.textContent = 'Hide Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'inline-block';
            
            // Generate the position details if we have data
            if (window.holdingsData) {
                displayPositionDetails();  // This should match whatever function name you're using
            }
        } else {
            // Hide the details
            details.style.display = 'none';
            btn.textContent = 'Show Position Details';
            if (exportAllBtn) exportAllBtn.style.display = 'none';
        }
    }
}

// Function to display position details
function displayPositionDetails() {
    const container = document.getElementById('positionDetailsTable');
    if (!container || !window.holdingsData) return;
    
    const data = window.holdingsData;
    let html = '';
    
    // Generate HTML for each position type
    if (data.stocks && data.stocks.length > 0) {
        html += createPositionTable('Stock Positions', data.stocks, ['ticker', 'name', 'shares', 'price', 'marketValue', 'weight']);
    }
    if (data.calls && data.calls.length > 0) {
        html += createPositionTable('Call Options', data.calls, ['underlying', 'strike', 'expiration', 'shares', 'price', 'marketValue', 'weight']);
    }
    if (data.puts && data.puts.length > 0) {
        html += createPositionTable('Put Options', data.puts, ['underlying', 'strike', 'expiration', 'shares', 'price', 'marketValue', 'weight']);
    }
    if (data.cash && data.cash.length > 0) {
        html += createPositionTable('Cash & Other', data.cash, ['ticker', 'name', 'shares', 'marketValue', 'weight']);
    }
    
    container.innerHTML = html || '<p>No position data available.</p>';
}

// Helper function to create position tables
function createPositionTable(title, positions, fields) {
    let html = `<div class="position-section"><h4>${title}</h4><table class="data-table"><thead><tr>`;
    
    // Add headers based on fields
    const headers = {
        'ticker': 'Ticker',
        'name': 'Name',
        'underlying': 'Underlying',
        'strike': 'Strike',
        'expiration': 'Expiry',
        'shares': 'Shares/Contracts',
        'price': 'Price',
        'marketValue': 'Market Value',
        'weight': 'Weight'
    };
    
    fields.forEach(field => {
        html += `<th>${headers[field] || field}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    positions.forEach(position => {
        html += '<tr>';
        fields.forEach(field => {
            let value = position[field];
            if (field === 'price' || field === 'strike') {
                value = value ? `$${parseFloat(value).toFixed(2)}` : '-';
            } else if (field === 'marketValue') {
                value = `$${parseFloat(value).toLocaleString()}`;
            } else if (field === 'weight') {
                value = `${parseFloat(value).toFixed(2)}%`;
            } else if (field === 'shares') {
                value = parseInt(value).toLocaleString();
            } else if (field === 'expiration') {
                value = value ? new Date(value).toLocaleDateString() : '-';
            }
            html += `<td>${value || '-'}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    return html;
}

// Make sure it's globally accessible
window.togglePositionDetails = togglePositionDetails;
// Make functions globally available
window.togglePositionDetails = togglePositionDetails;
window.recalculatePerformance = recalculatePerformance;
window.calculateNowcast = calculateNowcast;
window.copyNowcastSummary = copyNowcastSummary;
window.exportAllPositions = exportAllPositions;
window.exportMoneynessData = exportMoneynessData;
window.exportToCSV = exportToCSV;
window.AppState = AppState;
window.showStatus = showStatus;
window.gaussianRandom = gaussianRandom;
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
    
    // Different timeouts for different message types
    let timeout = 5000; // Default for success/error
    if (type === 'info') {
        timeout = 2000; // Shorter for info messages during processing
    }
    
    // Clear any existing timeout
    if (statusEl.timeoutId) {
        clearTimeout(statusEl.timeoutId);
    }
    
    // Set new timeout
    statusEl.timeoutId = setTimeout(() => {
        statusEl.style.display = 'none';
    }, timeout);
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

// Make functions globally available
window.togglePositionDetails = togglePositionDetails;
window.recalculatePerformance = recalculatePerformance;
// window.calculateNowcast = calculateNowcast;
window.copyNowcastSummary = copyNowcastSummary;
window.exportAllPositions = exportAllPositions;
window.exportMoneynessData = exportMoneynessData;
window.exportToCSV = exportToCSV;
window.AppState = AppState;
window.showStatus = showStatus;
window.gaussianRandom = gaussianRandom;
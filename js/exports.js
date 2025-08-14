// Exports - Data export functionality

function exportToCSV(positionType) {
    if (!AppState.holdingsData) {
        showStatus('error', 'No data available to export');
        return;
    }

    let csvContent = '';
    let filename = '';
    const date = new Date().toISOString().split('T')[0];

    switch(positionType) {
        case 'stocks':
            csvContent = generateStocksCSV();
            filename = `ULTY_Stock_Positions_${date}.csv`;
            break;
        case 'calls':
            csvContent = generateCallsCSV();
            filename = `ULTY_Call_Options_${date}.csv`;
            break;
        case 'puts':
            csvContent = generatePutsCSV();
            filename = `ULTY_Put_Options_${date}.csv`;
            break;
        case 'cash':
            csvContent = generateCashCSV();
            filename = `ULTY_Cash_Positions_${date}.csv`;
            break;
        default:
            showStatus('error', 'Invalid position type');
            return;
    }

    downloadCSV(csvContent, filename);
    showStatus('success', `Exported ${filename}`);
}

function generateStocksCSV() {
    let csv = 'Ticker,Security Name,CUSIP,Shares,Price,Market Value,Weight(%),Current NAV,As of Date\n';
    
    AppState.holdingsData.stocks.forEach(position => {
        csv += `"${position.ticker}",`;
        csv += `"${position.name.replace(/"/g, '""')}",`;
        csv += `"${position.cusip || ''}",`;
        csv += `${position.shares},`;
        csv += `${position.price.toFixed(2)},`;
        csv += `${position.marketValue.toFixed(2)},`;
        csv += `${position.weight.toFixed(4)},`;
        csv += `${AppState.currentNAV.toFixed(2)},`;
        csv += `"${new Date().toLocaleDateString()}"\n`;
    });

    // Add summary row
    const totalValue = AppState.holdingsData.stocks.reduce((sum, p) => sum + p.marketValue, 0);
    const totalWeight = AppState.holdingsData.stocks.reduce((sum, p) => sum + p.weight, 0);
    csv += `\nTotal,,,${AppState.holdingsData.stocks.length} positions,,${totalValue.toFixed(2)},${totalWeight.toFixed(2)},,\n`;

    return csv;
}

function generateCallsCSV() {
    let csv = 'Underlying,Strike,Expiry,Days to Expiry,Contracts,Price,Market Value,Weight(%),Type,Current NAV,As of Date\n';
    
    AppState.holdingsData.calls.forEach(position => {
        const expiryDate = position.expiration ? 
            position.expiration.toLocaleDateString('en-US') : 'N/A';
        const dte = position.daysToExpiry !== null && position.daysToExpiry !== undefined ? 
            position.daysToExpiry : 'N/A';
        
        csv += `"${position.underlying}",`;
        csv += `${position.strike ? position.strike.toFixed(2) : 'N/A'},`;
        csv += `"${expiryDate}",`;
        csv += `${dte},`;
        csv += `${position.shares},`;
        csv += `${position.price.toFixed(2)},`;
        csv += `${position.marketValue.toFixed(2)},`;
        csv += `${position.weight.toFixed(4)},`;
        csv += `"CALL",`;
        csv += `${AppState.currentNAV.toFixed(2)},`;
        csv += `"${new Date().toLocaleDateString()}"\n`;
    });

    // Add summary row
    const totalValue = AppState.holdingsData.calls.reduce((sum, p) => sum + p.marketValue, 0);
    const totalWeight = AppState.holdingsData.calls.reduce((sum, p) => sum + p.weight, 0);
    csv += `\nTotal,,,${AppState.holdingsData.calls.length} positions,,${totalValue.toFixed(2)},${totalWeight.toFixed(2)},,,\n`;

    return csv;
}

function generatePutsCSV() {
    let csv = 'Underlying,Strike,Expiry,Days to Expiry,Contracts,Price,Market Value,Weight(%),Type,Current NAV,As of Date\n';
    
    AppState.holdingsData.puts.forEach(position => {
        const expiryDate = position.expiration ? 
            position.expiration.toLocaleDateString('en-US') : 'N/A';
        const dte = position.daysToExpiry !== null && position.daysToExpiry !== undefined ? 
            position.daysToExpiry : 'N/A';
        
        csv += `"${position.underlying}",`;
        csv += `${position.strike ? position.strike.toFixed(2) : 'N/A'},`;
        csv += `"${expiryDate}",`;
        csv += `${dte},`;
        csv += `${position.shares},`;
        csv += `${position.price.toFixed(2)},`;
        csv += `${position.marketValue.toFixed(2)},`;
        csv += `${position.weight.toFixed(4)},`;
        csv += `"PUT",`;
        csv += `${AppState.currentNAV.toFixed(2)},`;
        csv += `"${new Date().toLocaleDateString()}"\n`;
    });

    // Add summary row
    const totalValue = AppState.holdingsData.puts.reduce((sum, p) => sum + p.marketValue, 0);
    const totalWeight = AppState.holdingsData.puts.reduce((sum, p) => sum + p.weight, 0);
    csv += `\nTotal,,,${AppState.holdingsData.puts.length} positions,,${totalValue.toFixed(2)},${totalWeight.toFixed(2)},,,\n`;

    return csv;
}

function generateCashCSV() {
    let csv = 'Type,Security Name,Ticker,CUSIP,Shares/Units,Price,Market Value,Weight(%),Current NAV,As of Date\n';
    
    if (AppState.holdingsData.cash && AppState.holdingsData.cash.length > 0) {
        AppState.holdingsData.cash.forEach(position => {
            csv += `"Cash/MM",`;
            csv += `"${position.name.replace(/"/g, '""')}",`;
            csv += `"${position.ticker}",`;
            csv += `"${position.cusip || ''}",`;
            csv += `${position.shares},`;
            csv += `${position.price.toFixed(2)},`;
            csv += `${position.marketValue.toFixed(2)},`;
            csv += `${position.weight.toFixed(4)},`;
            csv += `${AppState.currentNAV.toFixed(2)},`;
            csv += `"${new Date().toLocaleDateString()}"\n`;
        });

        // Add summary row
        const totalValue = AppState.holdingsData.cash.reduce((sum, p) => sum + p.marketValue, 0);
        const totalWeight = AppState.holdingsData.cash.reduce((sum, p) => sum + p.weight, 0);
        csv += `\nTotal,,,${AppState.holdingsData.cash.length} positions,,${totalValue.toFixed(2)},${totalWeight.toFixed(2)},,\n`;
    } else {
        csv += 'No cash positions,,,,,,,,\n';
    }

    return csv;
}

function downloadCSV(csvContent, filename) {
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a temporary link element
    const link = document.createElement('a');
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Set the link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    URL.revokeObjectURL(url);
}

function exportAllPositions() {
    if (!AppState.holdingsData) {
        showStatus('error', 'No data available to export');
        return;
    }

    const date = new Date().toISOString().split('T')[0];
    let csv = 'ULTY NAV Holdings - All Positions Export\n';
    csv += `Export Date: ${new Date().toLocaleDateString()}\n`;
    csv += `Current NAV: ${AppState.currentNAV.toFixed(2)}\n`;
    csv += `Total Positions: ${AppState.holdingsData.positions.length}\n`;
    csv += `Net Assets: ${(AppState.holdingsData.netAssets / 1000000).toFixed(2)}M\n`;
    csv += `Shares Outstanding: ${(AppState.holdingsData.sharesOutstanding / 1000).toFixed(0)}K\n\n`;

    // Add summary section
    csv += '=== POSITION SUMMARY ===\n';
    csv += 'Type,Count,Market Value,Weight(%)\n';
    
    const stockValue = AppState.holdingsData.stocks.reduce((sum, p) => sum + p.marketValue, 0);
    const stockWeight = AppState.holdingsData.stocks.reduce((sum, p) => sum + p.weight, 0);
    csv += `Stocks,${AppState.holdingsData.stocks.length},${stockValue.toFixed(2)},${stockWeight.toFixed(2)}\n`;
    
    const callValue = AppState.holdingsData.calls.reduce((sum, p) => sum + p.marketValue, 0);
    const callWeight = AppState.holdingsData.calls.reduce((sum, p) => sum + p.weight, 0);
    csv += `Call Options,${AppState.holdingsData.calls.length},${callValue.toFixed(2)},${callWeight.toFixed(2)}\n`;
    
    const putValue = AppState.holdingsData.puts.reduce((sum, p) => sum + p.marketValue, 0);
    const putWeight = AppState.holdingsData.puts.reduce((sum, p) => sum + p.weight, 0);
    csv += `Put Options,${AppState.holdingsData.puts.length},${putValue.toFixed(2)},${putWeight.toFixed(2)}\n`;
    
    const cashValue = AppState.holdingsData.cash ? AppState.holdingsData.cash.reduce((sum, p) => sum + p.marketValue, 0) : 0;
    const cashWeight = AppState.holdingsData.cash ? AppState.holdingsData.cash.reduce((sum, p) => sum + p.weight, 0) : 0;
    csv += `Cash & Other,${AppState.holdingsData.cash ? AppState.holdingsData.cash.length : 0},${cashValue.toFixed(2)},${cashWeight.toFixed(2)}\n\n`;

    // Add Stock Positions
    csv += '=== STOCK POSITIONS ===\n';
    csv += 'Ticker,Security Name,CUSIP,Shares,Price,Market Value,Weight(%)\n';
    AppState.holdingsData.stocks.forEach(position => {
        csv += `"${position.ticker}","${position.name.replace(/"/g, '""')}","${position.cusip || ''}",${position.shares},${position.price.toFixed(2)},${position.marketValue.toFixed(2)},${position.weight.toFixed(4)}\n`;
    });
    csv += '\n';

    // Add Call Options
    csv += '=== CALL OPTIONS ===\n';
    csv += 'Underlying,Strike,Expiry,DTE,Contracts,Price,Market Value,Weight(%)\n';
    AppState.holdingsData.calls.forEach(position => {
        const expiryDate = position.expiration ? position.expiration.toLocaleDateString('en-US') : 'N/A';
        const dte = position.daysToExpiry !== null && position.daysToExpiry !== undefined ? position.daysToExpiry : 'N/A';
        csv += `"${position.underlying}",${position.strike ? position.strike.toFixed(2) : 'N/A'},"${expiryDate}",${dte},${position.shares},${position.price.toFixed(2)},${position.marketValue.toFixed(2)},${position.weight.toFixed(4)}\n`;
    });
    csv += '\n';

    // Add Put Options
    csv += '=== PUT OPTIONS ===\n';
    csv += 'Underlying,Strike,Expiry,DTE,Contracts,Price,Market Value,Weight(%)\n';
    AppState.holdingsData.puts.forEach(position => {
        const expiryDate = position.expiration ? position.expiration.toLocaleDateString('en-US') : 'N/A';
        const dte = position.daysToExpiry !== null && position.daysToExpiry !== undefined ? position.daysToExpiry : 'N/A';
        csv += `"${position.underlying}",${position.strike ? position.strike.toFixed(2) : 'N/A'},"${expiryDate}",${dte},${position.shares},${position.price.toFixed(2)},${position.marketValue.toFixed(2)},${position.weight.toFixed(4)}\n`;
    });
    csv += '\n';

    // Add Cash Positions
    csv += '=== CASH & OTHER ===\n';
    csv += 'Type,Security Name,Ticker,CUSIP,Shares/Units,Price,Market Value,Weight(%)\n';
    if (AppState.holdingsData.cash && AppState.holdingsData.cash.length > 0) {
        AppState.holdingsData.cash.forEach(position => {
            csv += `"Cash/MM","${position.name.replace(/"/g, '""')}","${position.ticker}","${position.cusip || ''}",${position.shares},${position.price.toFixed(2)},${position.marketValue.toFixed(2)},${position.weight.toFixed(4)}\n`;
        });
    } else {
        csv += 'No cash positions\n';
    }

    const filename = `ULTY_All_Positions_${date}.csv`;
    downloadCSV(csv, filename);
    showStatus('success', `Exported all positions to ${filename}`);
}

function copyNowcastSummary() {
    const content = document.getElementById('summaryContent').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showStatus('success', 'Summary copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showStatus('error', 'Failed to copy to clipboard');
    });
}

function exportMoneynessData() {
    const moneynessEl = document.getElementById('moneynessAnalysis');
    if (!moneynessEl) {
        showStatus('error', 'No moneyness analysis to export');
        return;
    }
    
    const content = moneynessEl.innerText;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ULTY_Moneyness_Analysis_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('success', 'Moneyness analysis exported');
}

// Export functions
window.exportToCSV = exportToCSV;
window.exportAllPositions = exportAllPositions;
window.copyNowcastSummary = copyNowcastSummary;
window.exportMoneynessData = exportMoneynessData;
window.downloadCSV = downloadCSV;
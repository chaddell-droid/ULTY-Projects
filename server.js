// Simple Node.js server to handle file auto-loading
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const DOWNLOADS_DIR = 'C:\\Users\\Chad\\Downloads';

// CORS headers to allow browser access
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Function to find the most recent file matching a pattern
function findMostRecentFile(directory, pattern) {
    try {
        const files = fs.readdirSync(directory);
        const matchingFiles = files.filter(file => 
            file.startsWith(pattern) && file.toLowerCase().endsWith('.csv')
        );
        
        if (matchingFiles.length === 0) {
            return null;
        }
        
        // Get file stats and sort by modified time
        const filesWithStats = matchingFiles.map(file => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                path: filePath,
                modified: stats.mtime
            };
        });
        
        // Sort by modified time (newest first)
        filesWithStats.sort((a, b) => b.modified - a.modified);
        
        return filesWithStats[0];
    } catch (error) {
        console.error('Error finding files:', error);
        return null;
    }
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }
    
    // Serve static files
    if (pathname === '/' || pathname === '/index.html') {
        fs.readFile(path.join(__dirname, 'Index.html'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            }
        });
        return;
    }
    
    // Serve CSS files
    if (pathname.startsWith('/css/')) {
        const cssPath = path.join(__dirname, pathname);
        fs.readFile(cssPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, {'Content-Type': 'text/css'});
                res.end(data);
            }
        });
        return;
    }
    
    // Serve JS files
    if (pathname.startsWith('/js/')) {
        const jsPath = path.join(__dirname, pathname);
        fs.readFile(jsPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, {'Content-Type': 'application/javascript'});
                res.end(data);
            }
        });
        return;
    }
    
    // API endpoint to get the most recent holdings file
    if (pathname === '/api/latest-holdings') {
        const file = findMostRecentFile(DOWNLOADS_DIR, 'TidalETF_Services');
        
        if (file) {
            const content = fs.readFileSync(file.path, 'utf8');
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
                success: true,
                filename: file.name,
                content: content,
                modified: file.modified
            }));
        } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({
                success: false,
                error: 'No TidalETF_Services files found in Downloads folder'
            }));
        }
        return;
    }
    
    // API endpoint to get the most recent Market Chameleon file
    if (pathname === '/api/latest-chameleon') {
        const file = findMostRecentFile(DOWNLOADS_DIR, 'StockWatchlist_ULTY');
        
        if (file) {
            const content = fs.readFileSync(file.path, 'utf8');
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
                success: true,
                filename: file.name,
                content: content,
                modified: file.modified
            }));
        } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({
                success: false,
                error: 'No StockWatchlist_ULTY files found in Downloads folder'
            }));
        }
        return;
    }
    
    // Default 404
    res.writeHead(404);
    res.end('Not found');
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Open http://localhost:${PORT}/ in your browser`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET http://localhost:${PORT}/api/latest-holdings - Get latest TidalETF file`);
    console.log(`  GET http://localhost:${PORT}/api/latest-chameleon - Get latest Market Chameleon file`);
});
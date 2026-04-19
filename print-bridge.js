/**
 * Banana Sushi — Local Print Bridge
 *
 * Run this script ONCE on the restaurant PC:
 *   node print-bridge.js
 *
 * How to find the printer IP:
 *   Hold the Feed button while powering on the Epson → it prints a status
 *   page. Look for the IP address line and set PRINTER_HOST below.
 */

const http = require('http');
const net  = require('net');

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_PORT  = 9191;           // port the browser calls (localhost:9191)
const PRINTER_HOST = '192.168.1.x';  // ← replace with your Epson's IP address
const PRINTER_PORT = 9100;           // standard raw print port (do not change)
// ─────────────────────────────────────────────────────────────────────────────

function sendToEpson(data) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Printer at ${PRINTER_HOST}:${PRINTER_PORT} did not respond within 5 s`));
    }, 5000);

    socket.connect(PRINTER_PORT, PRINTER_HOST, () => {
      socket.write(data, (err) => {
        clearTimeout(timer);
        socket.end();
        if (err) reject(err); else resolve();
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

const server = http.createServer((req, res) => {
  // Allow requests from the Vercel dashboard (HTTPS → localhost HTTP is permitted by browsers)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Length');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      const data = Buffer.concat(chunks);
      console.log(`[${new Date().toLocaleTimeString()}] Received ${data.length} bytes — sending to printer...`);

      try {
        await sendToEpson(data);
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Printed successfully`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Printer error: ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(BRIDGE_PORT, '127.0.0.1', () => {
  console.log('');
  console.log('🖨️  Banana Sushi Print Bridge');
  console.log(`   Listening : http://localhost:${BRIDGE_PORT}`);
  console.log(`   Printer   : ${PRINTER_HOST}:${PRINTER_PORT}`);
  console.log('');
  console.log('   Keep this window open while the restaurant is operating.');
  console.log('   Click the "ESC/POS" button in the dashboard to print.');
  console.log('');
});

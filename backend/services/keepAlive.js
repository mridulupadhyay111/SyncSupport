const https = require('https');
const http = require('http');

/**
 * Self-Ping Keep-Alive Daemon
 * Prevents free tier backend services (e.g. Render, Koyeb, Glitch) from spinning down 
 * after periods of inactivity by self-pinging the /api/health endpoint every 10 minutes.
 */
const startKeepAlive = () => {
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  const sendPing = () => {
    // Priority: BACKEND_URL > RENDER_EXTERNAL_URL > SERVER_URL > Localhost fallback
    const baseUrl = process.env.BACKEND_URL || 
                    process.env.RENDER_EXTERNAL_URL || 
                    process.env.SERVER_URL;

    const urlToPing = baseUrl 
      ? `${baseUrl.replace(/\/$/, '')}/api/health` 
      : `http://localhost:${process.env.PORT || 5000}/api/health`;

    console.log(`[Keep-Alive] Heartbeat pinging health endpoint: ${urlToPing}`);

    const client = urlToPing.startsWith('https') ? https : http;

    const req = client.get(urlToPing, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[Keep-Alive Ping OK] Status ${res.statusCode} at ${new Date().toLocaleTimeString()}`);
      } else {
        console.warn(`[Keep-Alive Ping Warning] Received status ${res.statusCode}`);
      }
    });

    req.on('error', (err) => {
      console.warn(`[Keep-Alive Ping Error] ${err.message}`);
    });

    // Set request timeout to prevent hanging connections
    req.setTimeout(10000, () => {
      req.destroy();
      console.warn('[Keep-Alive Ping Timeout] Request timed out.');
    });
  };

  // Run initial keep-alive ping 30 seconds after server start
  setTimeout(sendPing, 30 * 1000);

  // Set recurring interval ping every 10 minutes
  const intervalId = setInterval(sendPing, PING_INTERVAL_MS);

  // Unref interval to allow process to exit cleanly if stopped
  if (intervalId.unref) {
    intervalId.unref();
  }
};

module.exports = startKeepAlive;

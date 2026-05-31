/**
 * Server-Sent Events (SSE) Broadcast Registry Manager
 * Optimized for Render's architecture to stream live updates to Vercel clients.
 */

let clients = [];

// Initialize a heartbeat interval to keep the connections alive
// Cloud load balancers (Render, Heroku, etc.) terminate silent requests after 30s
setInterval(() => {
  clients.forEach((client) => {
    client.res.write(':\n\n'); // SSE comment heartbeat pin
  });
}, 15000);

export const sseManager = {
  /**
   * Register a new client connection stream
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   */
  addClient(req, res) {
    const origin = req.headers.origin || '*';

    // Set SSE-compliant response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx/Reverse Proxies (critical for Render)
    });

    // Write initial connection success event
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Live stream connected' })}\n\n`);

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    console.log(`SSE Client Connected. Active connections: ${clients.length}`);

    // Clean up when client disconnects
    req.on('close', () => {
      clients = clients.filter((c) => c.id !== clientId);
      console.log(`SSE Client Disconnected. Active connections: ${clients.length}`);
    });
  },

  /**
   * Broadcast a real-time event with a payload to all connected viewer streams
   * @param {string} event Name of the event to trigger
   * @param {Object} data JSON serializable data payload
   */
  broadcast(event, data) {
    if (clients.length === 0) return;

    const payload = JSON.stringify(data);
    clients.forEach((client) => {
      try {
        client.res.write(`event: ${event}\ndata: ${payload}\n\n`);
      } catch (err) {
        console.error(`Failed to send SSE broadcast to client ${client.id}:`, err.message);
      }
    });
    console.log(`SSE Broadcasted '${event}' to ${clients.length} active client streams.`);
  },
};

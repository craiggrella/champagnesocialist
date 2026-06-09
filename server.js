require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { transformTextStream, storeStatus } = require('./lib/groq');

const app = express();

app.use(cors());
app.use(express.json());
// Absolute path so static files resolve regardless of the process CWD
// (relative 'public' breaks on Vercel's serverless runtime).
app.use(express.static(path.join(__dirname, 'public')));

// Streaming endpoint: streams plain-text deltas as they arrive so the client
// can render the response with a typewriter effect.
app.post('/transform-stream', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    await transformTextStream(req.body?.text, (delta) => res.write(delta));
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(error.status || 500).json({ error: error.message || 'Failed to transform text' });
    } else {
      res.end();
    }
  }
});

// Health check — reports which recent-response store is active (redis vs the
// in-memory fallback) and how many items it holds. Exposes no secrets.
app.get('/healthz', async (req, res) => {
  try {
    res.json({ ok: true, ...(await storeStatus()) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Explicit root route so "/" always serves the page, even if static middleware
// ordering changes.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Only listen when run directly (local dev). On Vercel the app is imported.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

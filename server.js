require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// MusicAPI search endpoint proxy
app.post('/api/search', async (req, res) => {
  try {
    const { query, type = 'track', sources = ['spotify'] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const clientId = process.env.MUSICAPI_CLIENT_ID;
    const clientSecret = process.env.MUSICAPI_CLIENT_SECRET;

    if (!clientId) {
      return res.status(500).json({ error: 'MUSICAPI_CLIENT_ID is not configured' });
    }

    // Use Basic Auth if Secret is available, otherwise fall back to Token Auth
    const authHeader = clientSecret
      ? 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      : `Token ${clientId}`;

    const response = await fetch('https://api.musicapi.com/public/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        track: query,
        type,
        sources
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fallback to index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start local listener only outside production / Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless execution
module.exports = app;

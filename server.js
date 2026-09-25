require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// MusicAPI Search Proxy Endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const clientId = process.env.MUSICAPI_CLIENT_ID;
    const clientSecret = process.env.MUSICAPI_CLIENT_SECRET;

    if (!clientId) {
      console.error('Missing MUSICAPI_CLIENT_ID in environment variables');
      return res.status(500).json({ error: 'MUSICAPI_CLIENT_ID is not configured in Vercel' });
    }

    // Use Basic Auth if Client Secret is available; fallback to Token Auth
    const authHeader = clientSecret
      ? 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      : `Token ${clientId}`;

    // MusicAPI search expects nested track details or search parameters
    const response = await fetch('https://api.musicapi.com/public/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        track: {
          name: query.trim()
        },
        sources: ['spotify']
      })
    });

    const rawData = await response.json();

    if (!response.ok) {
      console.error('MusicAPI Error Response:', rawData);
      return res.status(response.status).json(rawData);
    }

    // Normalize results across different API return shapes
    let tracks = [];
    if (Array.isArray(rawData)) {
      tracks = rawData;
    } else if (Array.isArray(rawData.tracks)) {
      tracks = rawData.tracks;
    } else if (Array.isArray(rawData.results)) {
      tracks = rawData.results;
    } else if (Array.isArray(rawData.data)) {
      tracks = rawData.data;
    }

    res.json(tracks);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Root path handler
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Listen locally; Vercel handles invocation in production
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parsing
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

    // Basic Auth with Client ID & Client Secret
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

    // Send the raw data directly so the client can extract the platform-specific tracks
    res.json(rawData);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasClientId: !!process.env.MUSICAPI_CLIENT_ID,
    hasClientSecret: !!process.env.MUSICAPI_CLIENT_SECRET
  });
});

// Serve frontend root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Local dev listener
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;

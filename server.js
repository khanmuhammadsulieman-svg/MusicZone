require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// MusicAPI Search Route
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Direct credentials fallback to avoid environment variable lookup failures
    const clientId = process.env.MUSICAPI_CLIENT_ID || '179a2da2-8780-4249-8024-274ab29914f8';
    const clientSecret = process.env.MUSICAPI_CLIENT_SECRET || '5f1dd3e4-e052-4197-b1d7-dcdecb19e331';

    // Basic Auth header matching MusicAPI specification
    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // Request to MusicAPI search endpoint
    const targetUrl = `https://api.musicapi.com/public/search?track=${encodeURIComponent(query.trim())}&sources=spotify`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
      }
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText };
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Server execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Send index.html for root navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Run local listener only when outside Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;

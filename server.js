require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// YouTube Music Search Proxy Endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const clientId = process.env.MUSICAPI_CLIENT_ID || '179a2da2-8780-4249-8024-274ab29914f8';
    const clientSecret = process.env.MUSICAPI_CLIENT_SECRET || '5f1dd3e4-e052-4197-b1d7-dcdecb19e331';

    // Basic Auth header for MusicAPI
    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // Query MusicAPI specifically for YouTube results
    const targetUrl = `https://api.musicapi.com/public/search?track=${encodeURIComponent(query.trim())}&sources=youtube`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MusicAPI YouTube Search Error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Diagnostic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasClientId: !!process.env.MUSICAPI_CLIENT_ID,
    hasClientSecret: !!process.env.MUSICAPI_CLIENT_SECRET,
    serverTime: new Date().toISOString()
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server locally; Vercel handles invocation in production
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;

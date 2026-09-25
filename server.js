require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MusicAPI Search Proxy
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const clientId = process.env.MUSICAPI_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'MUSICAPI_CLIENT_ID is missing from environment variables' });
    }

    // MusicAPI public search uses GET with query parameters
    const searchUrl = new URL('https://api.musicapi.com/public/search');
    searchUrl.searchParams.append('track', query.trim());
    searchUrl.searchParams.append('sources', 'spotify');

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${clientId}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MusicAPI Error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Diagnostic check to verify Vercel environment variables
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasClientId: !!process.env.MUSICAPI_CLIENT_ID,
    hasClientSecret: !!process.env.MUSICAPI_CLIENT_SECRET
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;

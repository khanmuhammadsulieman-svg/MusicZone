require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const clientId = process.env.MUSICAPI_CLIENT_ID || '179a2da2-8780-4249-8024-274ab29914f8';
    const clientSecret = process.env.MUSICAPI_CLIENT_SECRET || '5f1dd3e4-e052-4197-b1d7-dcdecb19e331';
    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const searchUrl = `https://api.musicapi.com/public/search?track=${encodeURIComponent(query.trim())}&sources=youtube`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
      }
    });

    const data = await response.json();
    console.log('MusicAPI YouTube response:', data);
    res.json(data);
  } catch (error) {
    console.error('Server proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Search endpoint proxy
app.post('/api/search', async (req, res) => {
  try {
    const { query, type = 'track', sources = ['spotify'] } = req.body;

    const response = await fetch('https://api.musicapi.com/public/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.MUSICAPI_CLIENT_ID}`
      },
      body: JSON.stringify({
        track: query,
        type,
        sources
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

module.exports = async function handler(req, res) {
  // Handle CORS natively
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body || {};
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
    return res.status(200).json(data);
  } catch (error) {
    console.error('Search proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const query = (body && body.query) || (req.query && req.query.query) || '';
    if (!query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // 1. Primary Attempt: Official YouTube Data API v3
    if (apiKey) {
      // NOTE: Removed &videoCategoryId=10 so regional/Coke Studio/Bollywood songs appear reliably
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query.trim())}&key=${apiKey}`;

      try {
        const response = await fetch(ytUrl);
        const data = await response.json();

        if (response.ok && Array.isArray(data.items) && data.items.length > 0) {
          const tracks = data.items
            .filter((item) => item.id && item.id.videoId)
            .map((item) => ({
              id: item.id.videoId,
              title: item.snippet.title,
              artist: item.snippet.channelTitle,
              image:
                (item.snippet.thumbnails.high && item.snippet.thumbnails.high.url) ||
                (item.snippet.thumbnails.medium && item.snippet.thumbnails.medium.url) ||
                item.snippet.thumbnails.default.url
            }));

          return res.status(200).json(tracks);
        } else {
          console.warn('YouTube API returned no items or error:', data.error || data);
        }
      } catch (ytErr) {
        console.error('YouTube API fetch error:', ytErr);
      }
    }

    // 2. High-Availability Fallback: Fetch directly from Public YouTube Search Engine
    // This ensures your users ALWAYS see results even if API quota is 100% exhausted
    const fallbackUrl = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query.trim())}`;
    const fallbackRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}&sp=EgIQAQ%253D%253D`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    const html = await fallbackRes.text();
    const videoRegex = /"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"(.*?)"\}\].*?"ownerText":\{"runs":\[\{"text":"(.*?)"\}/g;

    const fallbackTracks = [];
    const seenIds = new Set();
    let match;

    while ((match = videoRegex.exec(html)) !== null && fallbackTracks.length < 20) {
      const id = match[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        fallbackTracks.push({
          id: id,
          title: match[2].replace(/\\u0026/g, '&'),
          artist: match[3].replace(/\\u0026/g, '&'),
          image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        });
      }
    }

    if (fallbackTracks.length > 0) {
      return res.status(200).json(fallbackTracks);
    }

    return res.status(200).json([]);
  } catch (error) {
    console.error('Search proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
};

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

    const { action, videoId, query } = body || {};

    // 1. Action: Stream Resolver (Direct audio stream for lockscreen & background play)
    if (action === 'stream' && videoId) {
      const pipedInstances = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.private.coffee',
        'https://pipedapi.tokhmi.xyz'
      ];

      for (const instance of pipedInstances) {
        try {
          const resp = await fetch(`${instance}/streams/${videoId}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.audioStreams && data.audioStreams.length > 0) {
              // Select standard audio stream (m4a / opus)
              const stream = data.audioStreams[0];
              return res.status(200).json({ url: stream.url, duration: data.duration });
            }
          }
        } catch (e) {
          // try next instance
        }
      }

      // Fallback if third-party audio resolvers are slow
      return res.status(200).json({ url: null });
    }

    // 2. Action: Search Proxy
    const searchQuery = query || (req.query && req.query.query) || '';
    if (!searchQuery.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (apiKey) {
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(searchQuery.trim())}&key=${apiKey}`;
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
        }
      } catch (err) {}
    }

    // High availability scraping fallback
    const fallbackRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery.trim())}&sp=EgIQAQ%253D%253D`,
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

    return res.status(200).json(fallbackTracks);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

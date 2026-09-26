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

    // 1. Direct High-Bitrate Audio Stream Resolver
    if (action === 'stream' && videoId) {
      const audioSources = [
        `https://inv.tux.pizza/latest_version?id=${videoId}&itag=140`,
        `https://invidious.nerdvpn.de/latest_version?id=${videoId}&itag=140`,
        `https://invidious.jing.rocks/latest_version?id=${videoId}&itag=140`,
        `https://yt.artemislena.eu/latest_version?id=${videoId}&itag=140`
      ];

      for (const streamUrl of audioSources) {
        try {
          const testRes = await fetch(streamUrl, { method: 'HEAD' });
          if (testRes.ok || testRes.status === 302 || testRes.status === 200) {
            return res.status(200).json({ url: streamUrl });
          }
        } catch (e) {
          // try next mirror
        }
      }

      // Direct fallback audio stream
      return res.status(200).json({
        url: `https://inv.tux.pizza/latest_version?id=${videoId}&itag=140`
      });
    }

    // 2. Search Handler
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

    // HTML Search Fallback
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

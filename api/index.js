const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee'
];
const INVIDIOUS = ['https://inv.nadeko.net', 'https://yewtu.be'];

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function fromPiped(base, id) {
  const d = await getJson(`${base}/streams/${id}`);
  const list = (d.audioStreams || []).filter((a) => a.url && /mp4|m4a|webm|opus/i.test(a.mimeType || ''));
  if (!list.length) throw new Error('no audio');
  // Prefer m4a (best compatibility on Android/iOS), then highest bitrate
  list.sort((a, b) => (/mp4/.test(b.mimeType) - /mp4/.test(a.mimeType)) || (b.bitrate - a.bitrate));
  return { url: list[0].url, mime: list[0].mimeType, duration: d.duration || 0 };
}

async function fromInvidious(base, id) {
  const d = await getJson(`${base}/api/v1/videos/${id}?local=true&fields=lengthSeconds,adaptiveFormats`);
  const list = (d.adaptiveFormats || []).filter((f) => f.url && /^audio\//.test(f.type || ''));
  if (!list.length) throw new Error('no audio');
  list.sort((a, b) => (/mp4/.test(b.type) - /mp4/.test(a.type)) || (parseInt(b.bitrate) - parseInt(a.bitrate)));
  const url = list[0].url.startsWith('http') ? list[0].url : base + list[0].url;
  return { url, mime: list[0].type.split(';')[0], duration: d.lengthSeconds || 0 };
}

async function resolveAudio(id) {
  const tasks = [
    ...PIPED.map((b) => fromPiped(b, id)),
    ...INVIDIOUS.map((b) => fromInvidious(b, id))
  ];
  try {
    return await Promise.any(tasks);
  } catch (e) {
    return null;
  }
}

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

    const { action, query } = body || {};
    const q = req.query || {};

    // Audio stream resolver: returns a playable audio URL for a YouTube video id
    if (action === 'audio' || q.action === 'audio') {
      const id = String((body && body.id) || q.id || '');
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
      const result = await resolveAudio(id);
      if (!result) return res.status(502).json({ error: 'No audio stream found' });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    }

    // Direct ping response
    if (action === 'stream') {
      return res.status(200).json({ status: 'ok' });
    }

    const searchQuery = query || (req.query && req.query.query) || '';
    if (!searchQuery.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // 1. YouTube Data API v3 Search
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

    // 2. High-Resilience Fallback Scraper with Strict JSON Filtering
    const fallbackRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery.trim())}&sp=EgIQAQ%253D%253D`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

        let cleanTitle = match[2]
          .replace(/\\u0026/g, '&')
          .replace(/\\"/g, '"')
          .replace(/\\/g, '');

        let rawArtist = match[3]
          .replace(/\\u0026/g, '&')
          .replace(/\\"/g, '"')
          .replace(/\\/g, '');

        // Remove YouTube navigation endpoint parameters or leaked JSON metadata
        let cleanArtist = rawArtist.split('","')[0].split('",')[0].split('"')[0].trim();
        if (cleanArtist.includes('navigationEndpoint') || cleanArtist.includes('{')) {
          cleanArtist = 'Trending Music';
        }

        fallbackTracks.push({
          id: id,
          title: cleanTitle,
          artist: cleanArtist || 'YouTube Music',
          image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        });
      }
    }

    return res.status(200).json(fallbackTracks);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

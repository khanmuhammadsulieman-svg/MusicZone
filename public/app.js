let currentQueue = [];
let currentIndex = -1;
let isPlaying = false;
let currentTimeSec = 0;
let totalDurationSec = 240; // Default estimate until updated
let playbackTicker = null;

// DOM Mini-Player Elements
const contentFeed = document.getElementById('contentFeed');
const searchInput = document.getElementById('searchInput');
const ytPlayerIframe = document.getElementById('ytPlayerIframe');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackArtist = document.getElementById('currentTrackArtist');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const chips = document.querySelectorAll('.chip');
const playlistButtons = document.querySelectorAll('.playlist-btn');
const footerTrigger = document.getElementById('footerTrackTrigger');

// Fullscreen Modal Elements
const fullscreenModal = document.getElementById('fullscreenModal');
const fsCloseBtn = document.getElementById('fsCloseBtn');
const fsTrackArt = document.getElementById('fsTrackArt');
const fsTrackTitle = document.getElementById('fsTrackTitle');
const fsTrackArtist = document.getElementById('fsTrackArtist');
const fsProgressBar = document.getElementById('fsProgressBar');
const fsProgressFill = document.getElementById('fsProgressFill');
const fsCurrentTime = document.getElementById('fsCurrentTime');
const fsDuration = document.getElementById('fsDuration');
const fsPlayBtn = document.getElementById('fsPlayBtn');
const fsPrevBtn = document.getElementById('fsPrevBtn');
const fsNextBtn = document.getElementById('fsNextBtn');

// Featured Artists
const featuredArtists = [
  { name: 'Arijit Singh', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
  { name: 'Atif Aslam', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
  { name: 'Sidhu Moose Wala', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300' },
  { name: 'Rahat Fateh Ali Khan', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
  { name: 'Ali Zafar', img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300' },
  { name: 'Shreya Ghoshal', img: 'https://images.unsplash.com/photo-1520523839898-50712825e617?w=300' }
];

function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Fetch tracks from backend
async function fetchTracks(query) {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Fetch error:', err);
    return [];
  }
}

function createSection(title, tracks) {
  const section = document.createElement('section');
  section.className = 'feed-section';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `<h2 class="section-title">${title}</h2>`;

  const grid = document.createElement('div');
  grid.className = 'music-grid';

  tracks.forEach((track) => {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${track.image}" alt="${track.title}" loading="lazy" />
        <button class="card-play-btn"><i class="fa-solid fa-play"></i></button>
      </div>
      <div class="card-title">${track.title}</div>
      <div class="card-sub">${track.artist}</div>
    `;

    card.addEventListener('click', () => {
      currentQueue = tracks;
      const idx = tracks.findIndex(t => t.id === track.id);
      loadTrack(idx);
    });

    grid.appendChild(card);
  });

  section.appendChild(header);
  section.appendChild(grid);
  return section;
}

function createArtistsSection() {
  const section = document.createElement('section');
  section.className = 'feed-section';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `<h2 class="section-title">Popular Artists</h2>`;

  const grid = document.createElement('div');
  grid.className = 'music-grid';

  featuredArtists.forEach((artist) => {
    const card = document.createElement('div');
    card.className = 'music-card artist-card';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${artist.img}" alt="${artist.name}" loading="lazy" />
        <button class="card-play-btn"><i class="fa-solid fa-play"></i></button>
      </div>
      <div class="card-title">${artist.name}</div>
      <div class="card-sub">Artist</div>
    `;

    card.addEventListener('click', async () => {
      const tracks = await fetchTracks(`${artist.name} songs`);
      if (tracks.length > 0) {
        currentQueue = tracks;
        loadTrack(0);
      }
    });

    grid.appendChild(card);
  });

  section.appendChild(header);
  section.appendChild(grid);
  return section;
}

async function loadHomeFeed() {
  contentFeed.innerHTML = '<div style="color:#b3b3b3; padding:20px;">Loading MUZiFY Feed...</div>';

  const [trending, latest] = await Promise.all([
    fetchTracks('Top Hits 2026'),
    fetchTracks('New Music Releases 2026')
  ]);

  contentFeed.innerHTML = '';
  if (trending.length > 0) contentFeed.appendChild(createSection('Trending Hits', trending));
  contentFeed.appendChild(createArtistsSection());
  if (latest.length > 0) contentFeed.appendChild(createSection('Latest Releases', latest));
}

// Category Tabs
chips.forEach((chip) => {
  chip.addEventListener('click', async () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const tab = chip.getAttribute('data-tab');
    contentFeed.innerHTML = '<div style="color:#b3b3b3; padding:20px;">Loading...</div>';

    if (tab === 'all') {
      loadHomeFeed();
    } else if (tab === 'trending') {
      const tracks = await fetchTracks('Trending Music Global');
      contentFeed.innerHTML = '';
      contentFeed.appendChild(createSection('Trending Global', tracks));
    } else if (tab === 'latest') {
      const tracks = await fetchTracks('New Official Music 2026');
      contentFeed.innerHTML = '';
      contentFeed.appendChild(createSection('Latest Releases', tracks));
    } else if (tab === 'artists') {
      contentFeed.innerHTML = '';
      contentFeed.appendChild(createArtistsSection());
    }
  });
});

playlistButtons.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const q = btn.getAttribute('data-query');
    contentFeed.innerHTML = `<div style="color:#b3b3b3; padding:20px;">Fetching ${q}...</div>`;
    const tracks = await fetchTracks(q);
    contentFeed.innerHTML = '';
    contentFeed.appendChild(createSection(q, tracks));
    if (tracks.length > 0) {
      currentQueue = tracks;
      loadTrack(0);
    }
  });
});

// Update Real-Time Timeline Progress
function startTimeline() {
  clearInterval(playbackTicker);
  currentTimeSec = 0;
  totalDurationSec = 220; // 3m 40s default until stream reports length

  durationEl.textContent = formatTime(totalDurationSec);
  fsDuration.textContent = formatTime(totalDurationSec);

  playbackTicker = setInterval(() => {
    if (!isPlaying) return;
    currentTimeSec++;
    const pct = Math.min((currentTimeSec / totalDurationSec) * 100, 100);

    progressFill.style.width = `${pct}%`;
    fsProgressFill.style.width = `${pct}%`;

    currentTimeEl.textContent = formatTime(currentTimeSec);
    fsCurrentTime.textContent = formatTime(currentTimeSec);

    // Auto next when finished
    if (currentTimeSec >= totalDurationSec) {
      if (currentIndex < currentQueue.length - 1) {
        loadTrack(currentIndex + 1);
      }
    }
  }, 1000);
}

// Load and Play Selected Track
function loadTrack(index) {
  if (index < 0 || index >= currentQueue.length) return;
  currentIndex = index;
  const track = currentQueue[index];

  document.body.classList.add('has-active-player');

  // Mini Bar Info
  currentTrackTitle.textContent = track.title;
  currentTrackArtist.textContent = track.artist;

  // Fullscreen Modal Info
  fsTrackTitle.textContent = track.title;
  fsTrackArtist.textContent = track.artist;
  fsTrackArt.src = track.image;

  // Start Playback via Direct YouTube Iframe
  ytPlayerIframe.src = `https://www.youtube.com/embed/${track.id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  isPlaying = true;

  playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  fsPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

  startTimeline();
}

// Play / Pause Toggling
function togglePlayback() {
  if (!ytPlayerIframe.src) return;
  if (isPlaying) {
    ytPlayerIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    fsPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    isPlaying = false;
  } else {
    ytPlayerIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    fsPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    isPlaying = true;
  }
}

playBtn.addEventListener('click', togglePlayback);
fsPlayBtn.addEventListener('click', togglePlayback);

// Previous / Next
prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});
fsPrevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < currentQueue.length - 1) loadTrack(currentIndex + 1);
});
fsNextBtn.addEventListener('click', () => {
  if (currentIndex < currentQueue.length - 1) loadTrack(currentIndex + 1);
});

// Click Timeline Scrubber to Seek
function seekTimeline(e, barEl) {
  const rect = barEl.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  currentTimeSec = Math.floor(pct * totalDurationSec);

  progressFill.style.width = `${pct * 100}%`;
  fsProgressFill.style.width = `${pct * 100}%`;

  currentTimeEl.textContent = formatTime(currentTimeSec);
  fsCurrentTime.textContent = formatTime(currentTimeSec);

  ytPlayerIframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func: 'seekTo', args: [currentTimeSec, true] }),
    '*'
  );
}

progressBar.addEventListener('click', (e) => seekTimeline(e, progressBar));
fsProgressBar.addEventListener('click', (e) => seekTimeline(e, fsProgressBar));

// Open & Close Spotify Fullscreen Mode
footerTrigger.addEventListener('click', () => {
  if (currentIndex >= 0) {
    fullscreenModal.classList.add('active');
  }
});

fsCloseBtn.addEventListener('click', () => {
  fullscreenModal.classList.remove('active');
});

// Search handler
let debounceTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  const q = e.target.value.trim();
  if (q.length > 1) {
    debounceTimer = setTimeout(async () => {
      contentFeed.innerHTML = '<div style="color:#b3b3b3; padding:20px;">Searching...</div>';
      const results = await fetchTracks(q);
      contentFeed.innerHTML = '';
      contentFeed.appendChild(createSection(`Results for "${q}"`, results));
    }, 400);
  } else if (q.length === 0) {
    loadHomeFeed();
  }
});

document.getElementById('navHome').addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('navHome').classList.add('active');
  loadHomeFeed();
});

loadHomeFeed();

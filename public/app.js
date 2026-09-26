let currentQueue = [];
let currentIndex = -1;
let suggestedQueue = [];
let isPlaying = false;
let currentTimeSec = 0;
let totalDurationSec = 220;
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

// Navigation Elements (Synced between Desktop Sidebar & Mobile Tabs)
const navHomeButtons = document.querySelectorAll('.nav-home-btn');
const navExploreButtons = document.querySelectorAll('.nav-explore-btn');
const navLibraryButtons = document.querySelectorAll('.nav-library-btn');

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
const fsQueueList = document.getElementById('fsQueueList');
const fsCategoryBadge = document.getElementById('fsCategoryBadge');

// Curated Artists
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

// Smart Language & Genre Detection
function detectLanguageAndGenre(track) {
  const text = `${track.title} ${track.artist}`.toLowerCase();

  if (text.includes('punjabi') || text.includes('sidhu') || text.includes('ap dhillon') || text.includes('karan aujla') || text.includes('diljit')) {
    return { query: 'Top Punjabi Songs Hits', label: 'Punjabi Hits' };
  }
  if (text.includes('coke studio') || text.includes('rahat') || text.includes('ali zafar') || text.includes('nusrat') || text.includes('sufi') || text.includes('qawwali') || text.includes('wadali')) {
    return { query: 'Coke Studio Sufi Classics', label: 'Sufi / Coke Studio' };
  }
  if (text.includes('arijit') || text.includes('shreya') || text.includes('atif') || text.includes('hindi') || text.includes('bollywood') || text.includes('t-series')) {
    return { query: 'Romantic Hindi Bollywood Songs', label: 'Hindi Romantic' };
  }
  if (text.includes('lofi') || text.includes('chill') || text.includes('slowed') || text.includes('reverb')) {
    return { query: 'Chill Lo-Fi Beats Aesthetic', label: 'Lo-Fi Chill' };
  }
  if (text.includes('urdu') || text.includes('ost') || text.includes('pakistani')) {
    return { query: 'Pakistani Drama OST Songs', label: 'Urdu OSTs' };
  }

  const cleanArtist = track.artist.replace(/topic|vevo|official|music/gi, '').trim();
  return { query: `${cleanArtist || track.title} songs`, label: `${cleanArtist || 'Related'} Radio` };
}

// Recommendations
async function fetchSmartSuggestions(track) {
  const category = detectLanguageAndGenre(track);
  fsCategoryBadge.textContent = category.label;
  fsQueueList.innerHTML = '<div class="queue-loading">Finding matching songs...</div>';

  const results = await fetchTracks(category.query);
  suggestedQueue = results.filter(t => t.id !== track.id);

  fsQueueList.innerHTML = '';
  if (suggestedQueue.length === 0) {
    fsQueueList.innerHTML = '<div class="queue-loading">No recommendations found.</div>';
    return;
  }

  suggestedQueue.slice(0, 8).forEach((item) => {
    const row = document.createElement('div');
    row.className = 'queue-item';
    row.innerHTML = `
      <img src="${item.image}" alt="${item.title}" loading="lazy" />
      <div class="queue-item-info">
        <div class="queue-item-title">${item.title}</div>
        <div class="queue-item-artist">${item.artist}</div>
      </div>
      <button class="queue-item-play-btn"><i class="fa-solid fa-play"></i></button>
    `;

    row.addEventListener('click', () => {
      currentQueue.splice(currentIndex + 1, 0, item);
      loadTrack(currentIndex + 1);
    });

    fsQueueList.appendChild(row);
  });
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

// Category Tabs Handlers
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

// Quick Playlists Click
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

// Timeline progress
function startTimeline() {
  clearInterval(playbackTicker);
  currentTimeSec = 0;
  totalDurationSec = 220;

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

    if (currentTimeSec >= totalDurationSec) {
      if (currentIndex < currentQueue.length - 1) {
        loadTrack(currentIndex + 1);
      } else if (suggestedQueue.length > 0) {
        const nextSuggested = suggestedQueue.shift();
        currentQueue.push(nextSuggested);
        loadTrack(currentQueue.length - 1);
      }
    }
  }, 1000);
}

function loadTrack(index) {
  if (index < 0 || index >= currentQueue.length) return;
  currentIndex = index;
  const track = currentQueue[index];

  document.body.classList.add('has-active-player');

  currentTrackTitle.textContent = track.title;
  currentTrackArtist.textContent = track.artist;

  fsTrackTitle.textContent = track.title;
  fsTrackArtist.textContent = track.artist;
  fsTrackArt.src = track.image;

  ytPlayerIframe.src = `https://www.youtube.com/embed/${track.id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  isPlaying = true;

  playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  fsPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

  startTimeline();
  fetchSmartSuggestions(track);
}

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

playBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  togglePlayback();
});
fsPlayBtn.addEventListener('click', togglePlayback);

prevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});
fsPrevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentIndex < currentQueue.length - 1) {
    loadTrack(currentIndex + 1);
  } else if (suggestedQueue.length > 0) {
    const nextSuggested = suggestedQueue.shift();
    currentQueue.push(nextSuggested);
    loadTrack(currentQueue.length - 1);
  }
});
fsNextBtn.addEventListener('click', () => {
  if (currentIndex < currentQueue.length - 1) {
    loadTrack(currentIndex + 1);
  } else if (suggestedQueue.length > 0) {
    const nextSuggested = suggestedQueue.shift();
    currentQueue.push(nextSuggested);
    loadTrack(currentQueue.length - 1);
  }
});

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

footerTrigger.addEventListener('click', () => {
  if (currentIndex >= 0) {
    fullscreenModal.classList.add('active');
  }
});

fsCloseBtn.addEventListener('click', () => {
  fullscreenModal.classList.remove('active');
});

// Tab navigation handler
function activateTab(tabName) {
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => el.classList.remove('active'));

  if (tabName === 'home') {
    navHomeButtons.forEach(btn => btn.classList.add('active'));
    loadHomeFeed();
  } else if (tabName === 'explore') {
    navExploreButtons.forEach(btn => btn.classList.add('active'));
    contentFeed.innerHTML = '<div style="color:#b3b3b3; padding:20px;">Exploring Trending Music...</div>';
    fetchTracks('Viral Hits Worldwide 2026').then(tracks => {
      contentFeed.innerHTML = '';
      contentFeed.appendChild(createSection('Trending Worldwide', tracks));
      contentFeed.appendChild(createArtistsSection());
    });
  } else if (tabName === 'library') {
    navLibraryButtons.forEach(btn => btn.classList.add('active'));
    contentFeed.innerHTML = `
      <div style="padding: 10px 0;">
        <h2 style="font-size: 1.4rem; font-weight:700; margin-bottom:16px;">Your Library</h2>
        <div class="playlist-quick-list" style="max-width:400px;">
          <button class="playlist-btn" data-query="Top Global Hits 2026" style="padding:14px; background: #181818; border-radius:8px; margin-bottom:8px;"><i class="fa-solid fa-fire" style="color:#1db954;"></i> Top Global Hits</button>
          <button class="playlist-btn" data-query="Coke Studio Pakistan" style="padding:14px; background: #181818; border-radius:8px; margin-bottom:8px;"><i class="fa-solid fa-record-vinyl" style="color:#1db954;"></i> Coke Studio</button>
          <button class="playlist-btn" data-query="Punjabi Hits 2026" style="padding:14px; background: #181818; border-radius:8px; margin-bottom:8px;"><i class="fa-solid fa-music" style="color:#1db954;"></i> Punjabi Hits</button>
          <button class="playlist-btn" data-query="Chill Lofi Beats" style="padding:14px; background: #181818; border-radius:8px; margin-bottom:8px;"><i class="fa-solid fa-mug-saucer" style="color:#1db954;"></i> Lo-Fi Chill</button>
        </div>
      </div>
    `;
    document.querySelectorAll('.playlist-quick-list .playlist-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const q = btn.getAttribute('data-query');
        const tracks = await fetchTracks(q);
        contentFeed.innerHTML = '';
        contentFeed.appendChild(createSection(q, tracks));
        if (tracks.length > 0) {
          currentQueue = tracks;
          loadTrack(0);
        }
      });
    });
  }
}

navHomeButtons.forEach(btn => btn.addEventListener('click', () => activateTab('home')));
navExploreButtons.forEach(btn => btn.addEventListener('click', () => activateTab('explore')));
navLibraryButtons.forEach(btn => btn.addEventListener('click', () => activateTab('library')));

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

loadHomeFeed();

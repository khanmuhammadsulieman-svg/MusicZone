let ytPlayer = null;
let ytReady = false;
let pendingVideoId = null;
let currentQueue = [];
let currentIndex = -1;
let progressTimer = null;

// DOM Elements
const contentFeed = document.getElementById('contentFeed');
const searchInput = document.getElementById('searchInput');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentTrackThumb = document.getElementById('currentTrackThumb');
const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackArtist = document.getElementById('currentTrackArtist');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const chips = document.querySelectorAll('.chip');
const playlistButtons = document.querySelectorAll('.playlist-btn');

// Featured Artists
const featuredArtists = [
  { name: 'Arijit Singh', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
  { name: 'Atif Aslam', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
  { name: 'Sidhu Moose Wala', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300' },
  { name: 'Rahat Fateh Ali Khan', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
  { name: 'Ali Zafar', img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300' },
  { name: 'Shreya Ghoshal', img: 'https://images.unsplash.com/photo-1520523839898-50712825e617?w=300' }
];

// YouTube Embedded Audio Initializer
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('playerMount', {
    height: '120',
    width: '200',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      enablejsapi: 1
    },
    events: {
      onReady: () => {
        ytReady = true;
        if (volumeSlider) ytPlayer.setVolume(Number(volumeSlider.value) || 80);
        if (pendingVideoId) {
          playVideoId(pendingVideoId);
          pendingVideoId = null;
        }
      },
      onError: (e) => {
        console.warn('YouTube Error:', e.data);
        if (e.data === 150 || e.data === 101 || e.data === 100 || e.data === 2) {
          if (currentIndex < currentQueue.length - 1) {
            loadTrack(currentIndex + 1);
          }
        }
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          startProgress();
        } else if (event.data === YT.PlayerState.PAUSED) {
          playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          clearInterval(progressTimer);
        } else if (event.data === YT.PlayerState.ENDED) {
          clearInterval(progressTimer);
          if (currentIndex < currentQueue.length - 1) {
            loadTrack(currentIndex + 1);
          } else {
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          }
        }
      }
    }
  });
};

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

function playVideoId(videoId) {
  try {
    if (!ytPlayer || !ytReady || typeof ytPlayer.loadVideoById !== 'function') {
      pendingVideoId = videoId;
      return;
    }
    ytPlayer.loadVideoById({
      videoId: videoId,
      startSeconds: 0
    });
    ytPlayer.unMute();
    ytPlayer.setVolume(Number(volumeSlider.value) || 80);
    ytPlayer.playVideo();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } catch (err) {
    console.error('Play error:', err);
  }
}

function loadTrack(index) {
  if (index < 0 || index >= currentQueue.length) return;
  currentIndex = index;
  const track = currentQueue[index];

  document.body.classList.add('has-active-player');

  currentTrackTitle.textContent = track.title;
  currentTrackArtist.textContent = track.artist;
  currentTrackThumb.src = track.image;

  playVideoId(track.id);
}

playBtn.addEventListener('click', () => {
  if (!ytPlayer || !ytReady) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  } else {
    ytPlayer.unMute();
    ytPlayer.playVideo();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < currentQueue.length - 1) loadTrack(currentIndex + 1);
});

function startProgress() {
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (ytPlayer && ytReady && ytPlayer.getCurrentTime) {
      const cur = ytPlayer.getCurrentTime();
      const dur = ytPlayer.getDuration();
      if (dur > 0) {
        progressFill.style.width = `${(cur / dur) * 100}%`;
        currentTimeEl.textContent = formatTime(cur);
        durationEl.textContent = formatTime(dur);
      }
    }
  }, 500);
}

progressBar.addEventListener('click', (e) => {
  if (!ytPlayer || !ytReady) return;
  const dur = ytPlayer.getDuration();
  if (dur > 0) {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    ytPlayer.seekTo(pct * dur, true);
  }
});

volumeSlider.addEventListener('input', (e) => {
  if (ytPlayer && ytReady) {
    ytPlayer.setVolume(Number(e.target.value));
    if (Number(e.target.value) > 0) ytPlayer.unMute();
  }
});

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

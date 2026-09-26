let ytPlayer = null;
let ytReady = false;

const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');
const trackList = document.getElementById('trackList');
const albumArt = document.getElementById('albumArt');
const trackTitle = document.getElementById('trackTitle');
const artistName = document.getElementById('artistName');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');

let queue = [];
let currentIndex = -1;
let progressTimer = null;

// Initialize YouTube Iframe Player
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('ytPlayerContainer', {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0
    },
    events: {
      onReady: () => {
        ytReady = true;
        ytPlayer.setVolume(80);
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          startProgressTracker();
        } else if (event.data === YT.PlayerState.PAUSED) {
          playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          clearInterval(progressTimer);
        } else if (event.data === YT.PlayerState.ENDED) {
          clearInterval(progressTimer);
          if (currentIndex < queue.length - 1) {
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
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Extract tracks from MusicAPI YouTube structure
function extractYouTubeTracks(data) {
  let items = [];

  if (Array.isArray(data)) {
    data.forEach(entry => {
      if (entry.youtube) items.push(entry.youtube);
      else items.push(entry);
    });
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.youtube)) items = data.youtube;
    else if (Array.isArray(data.tracks)) items = data.tracks;
    else if (Array.isArray(data.results)) items = data.results;
  }

  return items.map(track => {
    // Extract video ID from youtube URL or id field
    let videoId = track.id || track.videoId || '';
    if (track.url && track.url.includes('v=')) {
      videoId = track.url.split('v=')[1].split('&')[0];
    }

    return {
      id: videoId,
      title: track.title || track.name || 'Unknown Track',
      artist: Array.isArray(track.artists)
        ? track.artists.map(a => (typeof a === 'string' ? a : a.name)).join(', ')
        : (track.artist || track.channelTitle || 'YouTube Artist'),
      image: track.imageUrl || (track.images && track.images[0] && track.images[0].url) || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600')
    };
  });
}

// Fetch tracks from API proxy
async function searchTracks(query) {
  try {
    const res = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log('API response:', data);

    queue = extractYouTubeTracks(data);
    renderQueue();
  } catch (err) {
    console.error('Search request failed:', err);
  }
}

// Render queue list in sidebar
function renderQueue() {
  trackList.innerHTML = '';

  if (queue.length === 0) {
    trackList.innerHTML = '<li class="empty-state">No tracks found.</li>';
    return;
  }

  queue.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = `track-item ${index === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <img src="${track.image}" alt="${track.title}" />
      <div class="track-details">
        <h4>${track.title}</h4>
        <p>${track.artist}</p>
      </div>
    `;
    li.addEventListener('click', () => loadTrack(index));
    trackList.appendChild(li);
  });
}

// Play selected track via YouTube Player
function loadTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentIndex = index;
  const track = queue[index];

  trackTitle.textContent = track.title;
  artistName.textContent = track.artist;
  albumArt.src = track.image;

  if (ytPlayer && ytReady && track.id) {
    ytPlayer.loadVideoById(track.id);
  }

  renderQueue();
}

// Play / Pause Toggle
playBtn.addEventListener('click', () => {
  if (!ytPlayer || !ytReady) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

// Skip buttons
prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < queue.length - 1) loadTrack(currentIndex + 1);
});

// Progress Tracker
function startProgressTracker() {
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (ytPlayer && ytReady && ytPlayer.getCurrentTime) {
      const current = ytPlayer.getCurrentTime();
      const total = ytPlayer.getDuration();
      if (total > 0) {
        progressFill.style.width = `${(current / total) * 100}%`;
        currentTimeEl.textContent = formatTime(current);
        durationEl.textContent = formatTime(total);
      }
    }
  }, 500);
}

// Seek bar click
progressBar.addEventListener('click', (e) => {
  if (!ytPlayer || !ytReady) return;
  const total = ytPlayer.getDuration();
  if (total > 0) {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    ytPlayer.seekTo(percent * total, true);
  }
});

// Volume control
volumeSlider.addEventListener('input', (e) => {
  if (ytPlayer && ytReady) {
    ytPlayer.setVolume(e.target.value);
  }
});

// Debounced search
let debounceTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimeout);
  const q = e.target.value.trim();
  if (q.length > 1) {
    debounceTimeout = setTimeout(() => searchTracks(q), 350);
  }
});

// Initial search
searchTracks('trending songs');

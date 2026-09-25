const audio = document.getElementById('audioSource');
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

function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Extract tracks regardless of how MusicAPI structures the response
function normalizeTracks(data) {
  let rawList = [];

  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === 'object') {
    // If grouped by provider (e.g. data.spotify, data.youtube, etc.)
    if (Array.isArray(data.spotify)) {
      rawList = data.spotify;
    } else if (Array.isArray(data.tracks)) {
      rawList = data.tracks;
    } else if (Array.isArray(data.results)) {
      rawList = data.results;
    } else {
      // Collect any nested arrays found in values
      Object.values(data).forEach(val => {
        if (Array.isArray(val)) rawList.push(...val);
      });
    }
  }

  return rawList.map(item => {
    // Resolve track title
    const title = item.title || item.name || 'Unknown Title';

    // Resolve artist names
    let artists = 'Unknown Artist';
    if (Array.isArray(item.artists)) {
      artists = item.artists.map(a => (typeof a === 'string' ? a : a.name)).join(', ');
    } else if (Array.isArray(item.artistNames)) {
      artists = item.artistNames.join(', ');
    } else if (typeof item.artist === 'string') {
      artists = item.artist;
    }

    // Resolve artwork
    const image = item.imageUrl || 
                  (item.album && item.album.imageUrl) || 
                  (item.album && item.album.images && item.album.images[0] && item.album.images[0].url) || 
                  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600';

    // Resolve audio preview stream
    const audioUrl = item.audioUrl || item.previewUrl || item.preview_url || '';

    return { title, artists, image, audioUrl };
  });
}

async function searchTracks(query) {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log('Search response data:', data);

    queue = normalizeTracks(data);
    renderQueue();
  } catch (err) {
    console.error('Search request failed:', err);
  }
}

function renderQueue() {
  trackList.innerHTML = '';

  if (queue.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.style.color = '#94a3b8';
    emptyLi.style.padding = '10px';
    emptyLi.textContent = 'No tracks found.';
    trackList.appendChild(emptyLi);
    return;
  }

  queue.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = `track-item ${index === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <img src="${track.image}" alt="${track.title}" />
      <div class="track-details">
        <h4>${track.title}</h4>
        <p>${track.artists}</p>
      </div>
    `;
    li.addEventListener('click', () => loadTrack(index));
    trackList.appendChild(li);
  });
}

function loadTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentIndex = index;
  const track = queue[index];

  trackTitle.textContent = track.title;
  artistName.textContent = track.artists;
  albumArt.src = track.image;

  if (track.audioUrl) {
    audio.src = track.audioUrl;
    audio.play().catch(e => console.warn('Autoplay prevented:', e));
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    alert('No 30-second audio stream available for this track.');
  }

  renderQueue();
}

playBtn.addEventListener('click', () => {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    audio.pause();
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < queue.length - 1) loadTrack(currentIndex + 1);
});

audio.addEventListener('timeupdate', () => {
  if (audio.duration) {
    const progress = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = `${progress}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  }
});

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  audio.currentTime = (clickX / rect.width) * audio.duration;
});

volumeSlider.addEventListener('input', (e) => {
  audio.volume = e.target.value;
});

let debounceTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimeout);
  const q = e.target.value.trim();
  if (q.length > 1) {
    debounceTimeout = setTimeout(() => searchTracks(q), 350);
  }
});

// Perform initial search on load
searchTracks('Starboy');

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

// Normalize MusicAPI YouTube responses
function extractYouTubeTracks(data) {
  let list = [];

  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item.youtube) list.push(item.youtube);
      else list.push(item);
    });
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.youtube)) {
      list = data.youtube;
    } else if (Array.isArray(data.results)) {
      list = data.results;
    } else {
      Object.values(data).forEach(val => {
        if (Array.isArray(val)) list.push(...val);
      });
    }
  }

  return list.map(item => ({
    title: item.title || item.name || 'Untitled Video',
    artist: (Array.isArray(item.artists) ? item.artists.map(a => typeof a === 'string' ? a : a.name).join(', ') : item.artist) || item.channelTitle || 'YouTube Music',
    image: item.imageUrl || (item.thumbnails && item.thumbnails.high ? item.thumbnails.high.url : '') || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600',
    id: item.id || item.videoId || ''
  }));
}

async function searchTracks(query) {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log('YouTube search response:', data);

    queue = extractYouTubeTracks(data);
    renderQueue();
  } catch (err) {
    console.error('Search request failed:', err);
  }
}

function renderQueue() {
  trackList.innerHTML = '';

  if (queue.length === 0) {
    const empty = document.createElement('li');
    empty.style.color = '#94a3b8';
    empty.style.padding = '12px';
    empty.textContent = 'No tracks found.';
    trackList.appendChild(empty);
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

function loadTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentIndex = index;
  const track = queue[index];

  trackTitle.textContent = track.title;
  artistName.textContent = track.artist;
  albumArt.src = track.image;

  renderQueue();
}

playBtn.addEventListener('click', () => {
  // If track loaded, handle play state
  if (currentIndex === -1 && queue.length > 0) {
    loadTrack(0);
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < queue.length - 1) loadTrack(currentIndex + 1);
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

// Initial query
searchTracks('coke studio');

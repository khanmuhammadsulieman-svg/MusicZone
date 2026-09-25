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

function extractTracks(data) {
  let list = [];

  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item.spotify) list.push(item.spotify);
      else if (item.youtube) list.push(item.youtube);
      else list.push(item);
    });
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.spotify)) list = data.spotify;
    else if (Array.isArray(data.tracks)) list = data.tracks;
    else if (Array.isArray(data.results)) list = data.results;
  }

  return list.map(item => ({
    title: item.title || item.name || 'Unknown Track',
    artists: Array.isArray(item.artists)
      ? item.artists.map(a => (typeof a === 'string' ? a : a.name)).join(', ')
      : (item.artist || 'Unknown Artist'),
    image: item.imageUrl || (item.album && item.album.imageUrl) || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600',
    audioUrl: item.audioUrl || item.previewUrl || item.preview_url || ''
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
    console.log('Search response:', data);

    queue = extractTracks(data);
    renderQueue();
  } catch (err) {
    console.error('Search failed:', err);
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
    audio.play().catch(e => console.warn('Autoplay restricted:', e));
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    alert('Audio preview not available for this track.');
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

searchTracks('rahat');

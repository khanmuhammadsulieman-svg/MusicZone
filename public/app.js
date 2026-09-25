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

// Format seconds into MM:SS
function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Fetch tracks via backend proxy
async function searchTracks(query) {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    
    // MusicAPI returns tracks matching the search
    if (Array.isArray(data)) {
      queue = data;
    } else if (data.tracks) {
      queue = data.tracks;
    }
    
    renderQueue();
  } catch (err) {
    console.error('Search failed:', err);
  }
}

// Render tracks list in sidebar
function renderQueue() {
  trackList.innerHTML = '';
  queue.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = `track-item ${index === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <img src="${track.imageUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100'}" alt="${track.name}" />
      <div class="track-details">
        <h4>${track.name}</h4>
        <p>${track.artistNames ? track.artistNames.join(', ') : 'Unknown Artist'}</p>
      </div>
    `;
    li.addEventListener('click', () => loadTrack(index));
    trackList.appendChild(li);
  });
}

// Load and play selected track
function loadTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentIndex = index;
  const track = queue[index];

  trackTitle.textContent = track.name;
  artistName.textContent = track.artistNames ? track.artistNames.join(', ') : 'Unknown Artist';
  albumArt.src = track.imageUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600';

  if (track.previewUrl) {
    audio.src = track.previewUrl;
    audio.play();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    alert('No 30s audio preview stream available for this track.');
  }

  renderQueue();
}

// Play / Pause toggle
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

// Skip buttons
prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < queue.length - 1) loadTrack(currentIndex + 1);
});

// Progress bar updates
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

// Volume control
volumeSlider.addEventListener('input', (e) => {
  audio.volume = e.target.value;
});

// Debounced live search
let debounceTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimeout);
  const q = e.target.value.trim();
  if (q.length > 2) {
    debounceTimeout = setTimeout(() => searchTracks(q), 400);
  }
});

// Initial sample search
searchTracks('Midnight');

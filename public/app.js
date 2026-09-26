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
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      origin: window.location.origin
    },
    events: {
      onReady: () => {
        ytReady = true;
        if (volumeSlider) {
          ytPlayer.setVolume(Number(volumeSlider.value));
        }
      },
      onError: (e) => {
        console.warn('YouTube Player Error:', e.data);
        // Error 150/101 means copyright owner restricted external playback
        if (e.data === 150 || e.data === 101) {
          alert('Playback restricted by copyright holder on third-party sites. Skipping to next song...');
          if (currentIndex < queue.length - 1) {
            loadTrack(currentIndex + 1);
          }
        }
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.PLAYING) {
          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          albumArt.style.opacity = '0';
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

async function searchTracks(query) {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log('Search results:', data);

    queue = Array.isArray(data) ? data : [];
    renderQueue();
  } catch (err) {
    console.error('Search request failed:', err);
  }
}

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

function loadTrack(index) {
  if (index < 0 || index >= queue.length) return;
  currentIndex = index;
  const track = queue[index];

  trackTitle.textContent = track.title;
  artistName.textContent = track.artist;
  albumArt.src = track.image;
  albumArt.style.opacity = '1';

  if (ytPlayer && ytReady && track.id) {
    ytPlayer.loadVideoById({
      videoId: track.id,
      startSeconds: 0
    });
    ytPlayer.unMute();
    ytPlayer.setVolume(Number(volumeSlider.value));
    ytPlayer.playVideo();
  }

  renderQueue();
}

playBtn.addEventListener('click', () => {
  if (!ytPlayer || !ytReady) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.unMute();
    ytPlayer.playVideo();
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < queue.length - 1) loadTrack(currentIndex + 1);
});

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

progressBar.addEventListener('click', (e) => {
  if (!ytPlayer || !ytReady) return;
  const total = ytPlayer.getDuration();
  if (total > 0) {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    ytPlayer.seekTo(percent * total, true);
  }
});

volumeSlider.addEventListener('input', (e) => {
  if (ytPlayer && ytReady) {
    ytPlayer.setVolume(Number(e.target.value));
    if (e.target.value > 0) {
      ytPlayer.unMute();
    }
  }
});

let debounceTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimeout);
  const q = e.target.value.trim();
  if (q.length > 1) {
    debounceTimeout = setTimeout(() => searchTracks(q), 350);
  }
});

searchTracks('trending songs');

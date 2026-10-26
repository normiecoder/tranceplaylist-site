// ============================
// TRIPPY TOE TRANCE — PLAYER
// ============================

(function () {
  'use strict';

  // --- Config ---
  const PLAYLIST_ID = 'PLpP1m5Ek9D1Zbw2kOyB9apJacCHRU-1C-';
  const ONLINE_MIN = 15;
  const ONLINE_MAX = 80;
  const ONLINE_UPDATE_INTERVAL = 30000; // 30s

  // --- State ---
  let ytPlayer = null;
  let isPlaying = false;
  let userWantsPlay = false;
  let isShuffled = false;
  let currentVolume = 100;
  let previousVolume = 100;
  let isMuted = false;
  let currentIndex = 0;
  let playlist = []; // Array of video IDs
  let trackTitles = {}; // videoId -> title (loaded dynamically)
  let progressRAF = null;

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const els = {
    btnPlay: $('#btn-play'),
    btnPrev: $('#btn-prev'),
    btnNext: $('#btn-next'),
    btnShuffle: $('#btn-shuffle'),
    btnVolume: $('#btn-volume'),
    volumeSlider: $('#volume-slider'),
    volumeIcon: $('#volume-icon'),
    playIcon: $('#play-icon'),
    trackName: $('#player-track-name'),
    trackArtist: $('#player-track-artist'),
    thumbWrap: $('#player-thumb-wrap'),
    thumb: $('#player-thumb'),
    thumbPlaceholder: $('#player-thumb-placeholder'),
    timeCurrent: $('#player-time-current'),
    timeTotal: $('#player-time-total'),
    progressBar: $('#player-progress-bar'),
    progressFill: $('#player-progress-fill'),
    onlineCount: $('#online-count'),
    clockTime: $('#clock-time'),
    clockAmpm: $('#clock-ampm'),
  };

  // --- YouTube IFrame API ---
  function loadYTAPI() {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  window.onYouTubeIframeAPIReady = function () {
    initPlayer();
  };

  function initPlayer() {
    ytPlayer = new YT.Player('yt-player', {
      height: '200',
      width: '200',
      playerVars: {
        listType: 'playlist',
        list: PLAYLIST_ID,
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        origin: window.location.origin,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });
  }

  function onPlayerReady() {
    // Give YT a moment to load playlist data
    setTimeout(() => {
      playlist = ytPlayer.getPlaylist() || [];
    }, 1500);
  }

  function onPlayerStateChange(event) {
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
      isPlaying = true;
      userWantsPlay = true;
      updatePlayIcon();
      updateTrackInfo();
      startProgressLoop();
      els.thumbWrap.classList.add('is-playing');
    } else if (state === YT.PlayerState.PAUSED) {
      isPlaying = false;
      updatePlayIcon();
      stopProgressLoop();
      els.thumbWrap.classList.remove('is-playing');
    } else if (state === YT.PlayerState.ENDED) {
      isPlaying = false;
      updatePlayIcon();
      stopProgressLoop();
      els.thumbWrap.classList.remove('is-playing');
      if (userWantsPlay && ytPlayer) {
        ytPlayer.nextVideo();
      }
    } else if (state === YT.PlayerState.CUED || state === -1 /* UNSTARTED */) {
      updateTrackInfo();
      if (userWantsPlay && ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
      }
    }
  }

  function onPlayerError(event) {
    console.warn('YouTube Player Error code:', event.data, '- Video unplayable or restricted from embedding. Auto-skipping to next track.');
    stopProgressLoop();
    els.thumbWrap.classList.remove('is-playing');
    
    // Automatically skip unplayable video after a brief delay
    setTimeout(() => {
      if (ytPlayer && typeof ytPlayer.nextVideo === 'function') {
        ytPlayer.nextVideo();
        if (userWantsPlay) {
          ytPlayer.playVideo();
        }
      }
    }, 600);
  }

  // --- Track info ---
  function updateTrackInfo() {
    if (!ytPlayer || typeof ytPlayer.getVideoData !== 'function') return;

    const data = ytPlayer.getVideoData();
    const idx = ytPlayer.getPlaylistIndex();

    if (data && data.title) {
      els.trackName.textContent = data.title;
      els.trackArtist.textContent = data.author || 'Trippy Toe Trance';
      trackTitles[data.video_id] = data.title;
    }

    // Update thumbnail
    if (data && data.video_id) {
      const thumbUrl = `https://img.youtube.com/vi/${data.video_id}/mqdefault.jpg`;
      els.thumb.src = thumbUrl;
      els.thumb.alt = data.title || 'Track artwork';
      els.thumb.style.display = 'block';
      els.thumbPlaceholder.style.display = 'none';
    }

    updateDuration();
  }

  function updateDuration() {
    if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    const dur = ytPlayer.getDuration();
    if (dur > 0) {
      els.timeTotal.textContent = formatTime(dur);
    }
  }

  // --- Progress ---
  function startProgressLoop() {
    stopProgressLoop();
    function tick() {
      if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
      const current = ytPlayer.getCurrentTime();
      const duration = ytPlayer.getDuration();
      if (duration > 0) {
        const pct = (current / duration) * 100;
        els.progressFill.style.width = pct + '%';
        els.timeCurrent.textContent = formatTime(current);
        els.timeTotal.textContent = formatTime(duration);
      }
      progressRAF = requestAnimationFrame(tick);
    }
    progressRAF = requestAnimationFrame(tick);
  }

  function stopProgressLoop() {
    if (progressRAF) {
      cancelAnimationFrame(progressRAF);
      progressRAF = null;
    }
  }

  // --- Controls ---
  function togglePlay() {
    if (!ytPlayer) return;

    if (isPlaying) {
      userWantsPlay = false;
      ytPlayer.pauseVideo();
    } else {
      userWantsPlay = true;
      ytPlayer.playVideo();
    }
  }

  function playNext() {
    if (!ytPlayer) return;
    userWantsPlay = true;
    ytPlayer.nextVideo();
    setTimeout(() => {
      if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
      }
      updateTrackInfo();
    }, 300);
  }

  function playPrev() {
    if (!ytPlayer) return;
    userWantsPlay = true;
    ytPlayer.previousVideo();
    setTimeout(() => {
      if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
      }
      updateTrackInfo();
    }, 300);
  }

  function toggleShuffle() {
    if (!ytPlayer) return;
    isShuffled = !isShuffled;
    ytPlayer.setShuffle(isShuffled);
    els.btnShuffle.classList.toggle('player__btn--active', isShuffled);

    setTimeout(() => {
      playlist = ytPlayer.getPlaylist() || [];
    }, 500);
  }

  function toggleMute() {
    if (!ytPlayer) return;

    if (isMuted) {
      isMuted = false;
      currentVolume = previousVolume > 0 ? previousVolume : 100;
      ytPlayer.unMute();
      ytPlayer.setVolume(currentVolume);
      els.volumeSlider.value = currentVolume;
    } else {
      isMuted = true;
      previousVolume = currentVolume;
      ytPlayer.mute();
      els.volumeSlider.value = 0;
    }
    updateVolumeIcon();
  }

  function onVolumeInput(e) {
    if (!ytPlayer) return;
    const val = parseInt(e.target.value, 10);
    currentVolume = val;

    if (val === 0) {
      isMuted = true;
      ytPlayer.mute();
    } else {
      if (isMuted) {
        isMuted = false;
        ytPlayer.unMute();
      }
      ytPlayer.setVolume(val);
    }
    updateVolumeIcon();
  }

  function updateVolumeIcon() {
    if (isMuted || currentVolume === 0) {
      els.volumeIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
      els.btnVolume.classList.add('player__btn--active');
    } else if (currentVolume < 50) {
      els.volumeIcon.innerHTML = '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>';
      els.btnVolume.classList.remove('player__btn--active');
    } else {
      els.volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
      els.btnVolume.classList.remove('player__btn--active');
    }
  }

  function updatePlayIcon() {
    if (isPlaying) {
      els.playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      els.btnPlay.setAttribute('aria-label', 'Pause');
      els.btnPlay.setAttribute('title', 'Pause');
    } else {
      els.playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      els.btnPlay.setAttribute('aria-label', 'Play');
      els.btnPlay.setAttribute('title', 'Play');
    }
  }

  // --- Seek via progress bar ---
  function onProgressBarClick(e) {
    if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    const rect = els.progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const duration = ytPlayer.getDuration();
    if (duration > 0) {
      ytPlayer.seekTo(pct * duration, true);
    }
  }



  // --- Live Clock ---
  function initClock() {
    function updateClock() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // convert 0 to 12
      
      if (els.clockTime) els.clockTime.textContent = `${hours}:${minutes}:${seconds}`;
      if (els.clockAmpm) els.clockAmpm.textContent = ampm;
    }

    updateClock();
    setInterval(updateClock, 1000);
  }

  // --- Online counter (simulated) ---
  function initOnlineCounter() {
    let current = randomInRange(ONLINE_MIN, ONLINE_MAX);
    els.onlineCount.textContent = current;

    setInterval(() => {
      const drift = randomInRange(-5, 5);
      current = Math.max(ONLINE_MIN, Math.min(ONLINE_MAX, current + drift));
      els.onlineCount.textContent = current;
    }, ONLINE_UPDATE_INTERVAL);
  }

  // --- Keyboard shortcuts ---
  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        playNext();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        playPrev();
        break;
      case 'KeyS':
        e.preventDefault();
        toggleShuffle();
        break;
    }
  }

  // --- Utils ---
  function formatTime(secs) {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Init ---
  function init() {
    loadYTAPI();
    initOnlineCounter();
    initClock();

    // Event listeners
    els.btnPlay.addEventListener('click', togglePlay);
    els.btnNext.addEventListener('click', playNext);
    els.btnPrev.addEventListener('click', playPrev);
    els.btnShuffle.addEventListener('click', toggleShuffle);
    els.btnVolume.addEventListener('click', toggleMute);
    els.volumeSlider.addEventListener('input', onVolumeInput);
    els.progressBar.addEventListener('click', onProgressBarClick);

    document.addEventListener('keydown', onKeyDown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Sounds list and their paths
const SOUND_FILES = {
  'heavy-rain': '/assets/sounds/heavy-rain.ogg',
  'forest-rain': '/assets/sounds/forest-rain.ogg',
  'wind': '/assets/sounds/wind.ogg',
  'stream': '/assets/sounds/stream.ogg',
  'fireplace': '/assets/sounds/fireplace.ogg',
  'thunderstorm': '/assets/sounds/thunderstorm.ogg'
};

// Preset Configurations (volumes for each sound from 0 to 100)
const PRESETS = {
  'cozy-fire': {
    'fireplace': 80,
    'wind': 30,
    'forest-rain': 20,
    'heavy-rain': 0,
    'stream': 0,
    'thunderstorm': 0
  },
  'summer-storm': {
    'heavy-rain': 70,
    'thunderstorm': 85,
    'wind': 45,
    'forest-rain': 0,
    'stream': 0,
    'fireplace': 0
  },
  'forest-river': {
    'stream': 80,
    'forest-rain': 50,
    'wind': 25,
    'heavy-rain': 0,
    'thunderstorm': 0,
    'fireplace': 0
  },
  'deep-sleep': {
    'forest-rain': 40,
    'wind': 40,
    'stream': 30,
    'heavy-rain': 0,
    'thunderstorm': 0,
    'fireplace': 0
  }
};

// Audio Objects and state
const audioElements = {};
const states = {
  isPlaying: false,
  isMuted: false,
  masterVolume: 80, // percentage 0-100
  channels: {
    'heavy-rain': { active: false, volume: 50 },
    'forest-rain': { active: false, volume: 50 },
    'wind': { active: false, volume: 50 },
    'stream': { active: false, volume: 50 },
    'fireplace': { active: false, volume: 50 },
    'thunderstorm': { active: false, volume: 50 }
  },
  timer: {
    duration: 0, // in seconds
    remaining: 0,
    intervalId: null,
    isFading: false
  }
};

// Active volume transition animation frames
let activeTransitions = {};

// Initialize audio elements
function initAudio() {
  for (const [key, path] of Object.entries(SOUND_FILES)) {
    const audio = new Audio(path);
    audio.loop = true;
    audio.preload = 'auto';
    audioElements[key] = audio;
    updateAudioVolume(key);
  }
}

// Update specific audio element volume based on channel volume, master volume, mute, and fade
function updateAudioVolume(key) {
  const audio = audioElements[key];
  if (!audio) return;
  
  const channel = states.channels[key];
  const fadeFactor = states.timer.isFading ? (states.timer.remaining / 15) : 1;
  const targetVolume = (channel.active && states.isPlaying && !states.isMuted) 
    ? (channel.volume / 100) * (states.masterVolume / 100) * fadeFactor
    : 0;

  audio.volume = targetVolume;
  
  // Handle play/pause based on active/playing
  if (channel.active && states.isPlaying) {
    if (audio.paused) {
      audio.play().catch(e => console.log("Playback prevented or interrupted: ", e));
    }
  } else {
    if (!audio.paused) {
      audio.pause();
    }
  }
}

// Update all audio volumes and playback states
function updateAllAudio() {
  for (const key of Object.keys(SOUND_FILES)) {
    updateAudioVolume(key);
  }
}

// Smoothly transition channel volume
function transitionChannelVolume(key, targetVolume, duration = 800) {
  const channel = states.channels[key];
  const startVolume = channel.volume;
  const startTime = performance.now();
  
  if (activeTransitions[key]) {
    cancelAnimationFrame(activeTransitions[key]);
  }
  
  // If we are fading in from 0, activate immediately so audio plays during fade
  if (targetVolume > 0 && !channel.active) {
    channel.active = true;
    const card = document.querySelector(`.sound-card[data-sound="${key}"]`);
    if (card) {
      card.classList.add('active');
      card.querySelector('.sound-toggle-btn').textContent = 'Выкл';
    }
  }
  
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    const currentVol = Math.round(startVolume + (targetVolume - startVolume) * easedProgress);
    channel.volume = currentVol;
    
    const card = document.querySelector(`.sound-card[data-sound="${key}"]`);
    if (card) {
      card.querySelector('.sound-volume').value = currentVol;
    }
    
    updateAudioVolume(key);
    
    if (progress < 1) {
      activeTransitions[key] = requestAnimationFrame(step);
    } else {
      // Done. If target volume is 0, deactivate the channel
      if (targetVolume === 0) {
        channel.active = false;
        if (card) {
          card.classList.remove('active');
          card.querySelector('.sound-toggle-btn').textContent = 'Вкл';
        }
        updateAudioVolume(key);
      }
      delete activeTransitions[key];
    }
  }
  
  activeTransitions[key] = requestAnimationFrame(step);
}

// Toggle a specific channel (click on card or play button)
function toggleChannel(key) {
  // Cancel any running transition for this channel since user manually interacted
  if (activeTransitions[key]) {
    cancelAnimationFrame(activeTransitions[key]);
    delete activeTransitions[key];
  }

  const channel = states.channels[key];
  channel.active = !channel.active;
  
  const card = document.querySelector(`.sound-card[data-sound="${key}"]`);
  const toggleBtn = card.querySelector('.sound-toggle-btn');
  
  if (channel.active) {
    card.classList.add('active');
    toggleBtn.textContent = 'Выкл';
    
    // If not globally playing, turn on global play
    if (!states.isPlaying) {
      states.isPlaying = true;
      updateMasterPlayBtn();
    }
  } else {
    card.classList.remove('active');
    toggleBtn.textContent = 'Вкл';
  }
  
  // Clear active preset buttons as user has changed states manually
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  
  updateAudioVolume(key);
}

// Update specific channel volume value
function setChannelVolume(key, value) {
  // Cancel any running transition for this channel
  if (activeTransitions[key]) {
    cancelAnimationFrame(activeTransitions[key]);
    delete activeTransitions[key];
  }

  states.channels[key].volume = parseInt(value);
  updateAudioVolume(key);
  
  // If volume is set to >0 and channel wasn't active, activate it
  const channel = states.channels[key];
  const card = document.querySelector(`.sound-card[data-sound="${key}"]`);
  if (channel.volume > 0 && !channel.active) {
    channel.active = true;
    if (card) {
      card.classList.add('active');
      card.querySelector('.sound-toggle-btn').textContent = 'Выкл';
    }
    if (!states.isPlaying) {
      states.isPlaying = true;
      updateMasterPlayBtn();
    }
    updateAudioVolume(key);
  } else if (channel.volume === 0 && channel.active) {
    channel.active = false;
    if (card) {
      card.classList.remove('active');
      card.querySelector('.sound-toggle-btn').textContent = 'Вкл';
    }
    updateAudioVolume(key);
  }
  
  // Clear active preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
}

// Global Play/Pause Toggle
function toggleMasterPlay() {
  states.isPlaying = !states.isPlaying;
  
  // If we clicked play but no channels are active, activate a default one (e.g. forest-rain)
  const anyActive = Object.values(states.channels).some(ch => ch.active);
  if (states.isPlaying && !anyActive) {
    states.channels['forest-rain'].active = true;
    const card = document.querySelector(`.sound-card[data-sound="forest-rain"]`);
    card.classList.add('active');
    card.querySelector('.sound-toggle-btn').textContent = 'Выкл';
  }

  updateMasterPlayBtn();
  updateAllAudio();
}

function updateMasterPlayBtn() {
  const btn = document.getElementById('master-play-btn');
  const playIcon = btn.querySelector('.icon-play');
  const pauseIcon = btn.querySelector('.icon-pause');
  const label = btn.querySelector('span');
  
  if (states.isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    label.textContent = 'Пауза';
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    label.textContent = 'Запустить всё';
  }
}

// Global Mute Toggle
function toggleMasterMute() {
  states.isMuted = !states.isMuted;
  
  const btn = document.getElementById('master-mute-btn');
  const unmutedIcon = btn.querySelector('.icon-unmuted');
  const mutedIcon = btn.querySelector('.icon-muted');
  
  if (states.isMuted) {
    unmutedIcon.classList.add('hidden');
    mutedIcon.classList.remove('hidden');
  } else {
    unmutedIcon.classList.remove('hidden');
    mutedIcon.classList.add('hidden');
  }
  
  updateAllAudio();
}

// Set Master Volume
function setMasterVolume(value) {
  states.masterVolume = parseInt(value);
  document.getElementById('master-volume-value').textContent = `${value}%`;
  updateAllAudio();
}

// Apply a preset
function applyPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) return;
  
  // Update preset buttons active state
  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.getAttribute('data-preset') === presetName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Make sure we are playing
  states.isPlaying = true;
  updateMasterPlayBtn();

  // Transition all channels
  for (const [key, targetVol] of Object.entries(preset)) {
    transitionChannelVolume(key, targetVol, 800);
  }
}

// Reset all channels to defaults (turn off)
function resetAll() {
  states.isPlaying = false;
  states.isMuted = false;
  
  // Stop all transitions
  for (const key of Object.keys(activeTransitions)) {
    cancelAnimationFrame(activeTransitions[key]);
    delete activeTransitions[key];
  }
  
  // Reset all channels
  for (const key of Object.keys(states.channels)) {
    states.channels[key].active = false;
    states.channels[key].volume = 50;
    
    const card = document.querySelector(`.sound-card[data-sound="${key}"]`);
    if (card) {
      card.querySelector('.sound-volume').value = 50;
      card.classList.remove('active');
      card.querySelector('.sound-toggle-btn').textContent = 'Вкл';
    }
  }
  
  // Reset master volume to 80
  states.masterVolume = 80;
  document.getElementById('master-volume').value = 80;
  document.getElementById('master-volume-value').textContent = '80%';
  
  // Reset mute button icon
  const muteBtn = document.getElementById('master-mute-btn');
  muteBtn.querySelector('.icon-unmuted').classList.remove('hidden');
  muteBtn.querySelector('.icon-muted').classList.add('hidden');
  
  // Reset preset active state
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  
  // Reset timer
  stopTimer();
  
  updateAllAudio();
}

// Sleep Timer Functions
function startTimer(minutes) {
  stopTimer();
  if (minutes === 0) return;
  
  states.timer.duration = minutes * 60;
  states.timer.remaining = states.timer.duration;
  states.timer.isFading = false;
  
  updateTimerDisplay();
  
  const timerBtn = document.getElementById('timer-toggle-btn');
  timerBtn.classList.add('active');
  
  states.timer.intervalId = setInterval(() => {
    states.timer.remaining--;
    
    if (states.timer.remaining <= 0) {
      clearInterval(states.timer.intervalId);
      states.timer.intervalId = null;
      pauseAllFromTimer();
    } else {
      // Start fade out in the last 15 seconds
      if (states.timer.remaining <= 15) {
        if (!states.timer.isFading) {
          states.timer.isFading = true;
        }
        updateAllAudio();
      }
      updateTimerDisplay();
    }
  }, 1000);
}

function pauseAllFromTimer() {
  states.isPlaying = false;
  updateMasterPlayBtn();
  updateAllAudio(); // This will pause all audio because states.isPlaying is false
  stopTimer();
}

function stopTimer() {
  if (states.timer.intervalId) {
    clearInterval(states.timer.intervalId);
    states.timer.intervalId = null;
  }
  states.timer.duration = 0;
  states.timer.remaining = 0;
  states.timer.isFading = false;
  
  const timerBtn = document.getElementById('timer-toggle-btn');
  timerBtn.classList.remove('active');
  
  const display = document.getElementById('timer-display');
  display.textContent = 'Выкл';
  
  // Reset all options UI
  document.querySelectorAll('.timer-options button').forEach(btn => {
    if (btn.getAttribute('data-time') === '0') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Restore regular volume settings now that timer is cleared
  updateAllAudio();
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const mins = Math.floor(states.timer.remaining / 60);
  const secs = states.timer.remaining % 60;
  display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Event Listeners
window.addEventListener("DOMContentLoaded", () => {
  initAudio();
  
  // Master Play
  document.getElementById('master-play-btn').addEventListener('click', toggleMasterPlay);
  
  // Master Mute
  document.getElementById('master-mute-btn').addEventListener('click', toggleMasterMute);
  
  // Master Volume
  const masterVolSlider = document.getElementById('master-volume');
  masterVolSlider.addEventListener('input', (e) => setMasterVolume(e.target.value));
  
  // Individual Channel Controls
  document.querySelectorAll('.sound-card').forEach(card => {
    const key = card.getAttribute('data-sound');
    
    // Toggle button
    const toggleBtn = card.querySelector('.sound-toggle-btn');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChannel(key);
    });
    
    // Icon click also toggles
    const iconContainer = card.querySelector('.sound-icon-container');
    iconContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChannel(key);
    });
    
    // Volume slider
    const volumeSlider = card.querySelector('.sound-volume');
    volumeSlider.addEventListener('input', (e) => setChannelVolume(key, e.target.value));
    
    // Prevent slider drag from toggling card
    volumeSlider.addEventListener('click', (e) => e.stopPropagation());
  });
  
  // Presets
  document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preset = e.target.getAttribute('data-preset');
      applyPreset(preset);
    });
  });
  
  // Reset Button
  document.getElementById('reset-btn').addEventListener('click', resetAll);
  
  // Sleep Timer Dropdown
  const timerBtn = document.getElementById('timer-toggle-btn');
  const timerDropdown = document.getElementById('timer-dropdown');
  
  timerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    timerDropdown.classList.toggle('hidden');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!timerDropdown.classList.contains('hidden') && !timerDropdown.contains(e.target) && e.target !== timerBtn) {
      timerDropdown.classList.add('hidden');
    }
  });
  
  // Timer option selection
  document.querySelectorAll('.timer-options button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mins = parseInt(e.target.getAttribute('data-time'));
      
      // Update UI active state in dropdown
      document.querySelectorAll('.timer-options button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      if (mins === 0) {
        stopTimer();
      } else {
        startTimer(mins);
      }
      
      timerDropdown.classList.add('hidden');
    });
  });

  // Query parameter support for screenshots and previews
  const params = new URLSearchParams(window.location.search);
  const presetParam = params.get('preset');
  if (presetParam && PRESETS[presetParam]) {
    const preset = PRESETS[presetParam];
    states.isPlaying = true;
    updateMasterPlayBtn();
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (btn.getAttribute('data-preset') === presetParam) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    for (const [key, targetVol] of Object.entries(preset)) {
      states.channels[key].volume = targetVol;
      states.channels[key].active = targetVol > 0;
      const card = document.querySelector(`.sound-card[data-sound="${key}"]`);
      if (card) {
        const slider = card.querySelector('.sound-volume');
        if (slider) slider.value = targetVol;
        if (targetVol > 0) {
          card.classList.add('active');
          card.querySelector('.sound-toggle-btn').textContent = 'Выкл';
        } else {
          card.classList.remove('active');
          card.querySelector('.sound-toggle-btn').textContent = 'Вкл';
        }
      }
    }
  }
  if (params.get('timer') === 'open') {
    document.getElementById('timer-dropdown')?.classList.remove('hidden');
    const opt = document.querySelector('.timer-options button[data-time="30"]');
    if (opt) {
      document.querySelectorAll('.timer-options button').forEach(b => b.classList.remove('active'));
      opt.classList.add('active');
    }
  }
  if (params.get('timer_active')) {
    startTimer(30);
  }
});

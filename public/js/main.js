// main.js — entry point, bootstraps everything
import { petState } from './modules/petState.js';
import { getRaceData } from './modules/races.js';
import { FeedMinigame } from './modules/feedGame.js';
import { PlayMinigame } from './modules/playGame.js';
import { openShop } from './modules/shop.js';
import { LobbyManager } from './modules/lobby.js';
import { showToast, updateStats, speak, setPetSprite, animatePet, updateRoomItems } from './modules/ui.js';
import { startTutorial } from './modules/tutorial.js';

// ── State ──────────────────────────────────────────────────────────────
let selectedRace = null;
let socket = null;
let lobby = null;
let feedGame = null;
let playGame = null;
let pendingMpScore = null;

// ── Race Select Screen ─────────────────────────────────────────────────
const raceCards = document.querySelectorAll('.race-card');
const playerNameInput = document.getElementById('player-name');
const startBtn = document.getElementById('btn-start-game');

raceCards.forEach(card => {
  card.addEventListener('click', () => {
    raceCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedRace = card.dataset.race;
    checkReady();
  });
});

playerNameInput.addEventListener('input', checkReady);

function checkReady() {
  startBtn.disabled = !(selectedRace && playerNameInput.value.trim().length >= 2);
}

startBtn.addEventListener('click', () => {
  if (!selectedRace) return;
  const name = playerNameInput.value.trim();
  petState.load();
  const existing = petState.get();
  if (existing.race === selectedRace && existing.name === name) {
    bootGame(name, selectedRace);
  } else {
    petState.reset(name, selectedRace);
    bootGame(name, selectedRace);
  }
});

// ── Boot Game ──────────────────────────────────────────────────────────
function bootGame(name, race) {
  const raceData = getRaceData(race);

  document.body.className = raceData.themeClass;
  document.getElementById('hdr-name').textContent = name;
  document.getElementById('hdr-race').textContent = raceData.badge;
  document.getElementById('feed-icon').textContent = raceData.food.emoji;
  setPetSprite(race);

  document.getElementById('screen-race').classList.remove('active');
  document.getElementById('screen-game').classList.add('active');

  socket = io();
  lobby = new LobbyManager(socket, race, name);
  lobby.onGameStart = (gameType) => launchMpMinigame(gameType);
  lobby.onGameResults = () => { pendingMpScore = null; };

  petState.startTick();

  petState.onChange((state, event) => {
    updateStats(state);
    updateRoomItems(state.roomItems);
    if (event === 'levelup') {
      showToast(`🎉 Level up! Now level ${state.level}!`);
      animatePet('happy');
      speak(['Stronger!', 'Growing!', 'Level up!']);
    }
  });

  updateStats(petState.get());
  updateRoomItems(petState.get().roomItems);

  setInterval(() => {
    const s = petState.get();
    const rd = getRaceData(race);
    if (s.hunger < 30) speak(rd.speech.hungry);
    else if (s.happy < 30) speak(rd.speech.happy);
    else if (s.energy < 30) speak(rd.speech.tired);
    else if (Math.random() < 0.3) speak(rd.speech.idle);
  }, 8000);

  document.getElementById('pet-sprite').addEventListener('click', () => {
    const rd = getRaceData(race);
    speak(rd.speech.idle);
    animatePet();
  });

  bindActions(race);

  // ── Start tutorial for new players (slight delay so UI is ready) ──
  setTimeout(() => startTutorial(), 400);
}

// ── Action Bindings ────────────────────────────────────────────────────
function bindActions(race) {
  document.getElementById('btn-feed').onclick = () => openFeedModal(race, false);
  document.getElementById('btn-play').onclick = () => openPlayModal(race, false);
  document.getElementById('btn-shop').onclick = () => openShop(race);

  document.getElementById('btn-sleep').onclick = () => {
    petState.sleep();
    speak(getRaceData(race).speech.tired);
    showToast('💤 Rested! Energy restored.');
    animatePet();
  };

  document.getElementById('btn-open-lobby').onclick = () => lobby.open();
}

// ── Feed Minigame ──────────────────────────────────────────────────────
function openFeedModal(race, isMultiplayer) {
  const modal = document.getElementById('modal-feed');
  const raceData = getRaceData(race);
  document.getElementById('feed-game-title').textContent = `${raceData.food.emoji} Feeding Time!`;
  modal.classList.remove('hidden');

  feedGame?.destroy();
  feedGame = new FeedMinigame('feed-canvas', 'feed-score', 'feed-timer', 'feed-streak', race);

  document.getElementById('feed-start-btn').onclick = () => {
    document.getElementById('feed-start-btn').classList.add('hidden');
    feedGame.start((score) => onMinigameEnd('feed', score, isMultiplayer));
  };

  document.getElementById('feed-close-btn').onclick = () => {
    feedGame?.destroy();
    modal.classList.add('hidden');
  };
}

function openPlayModal(race, isMultiplayer) {
  const modal = document.getElementById('modal-play');
  modal.classList.remove('hidden');

  playGame?.destroy();
  playGame = new PlayMinigame('play-canvas', 'play-score', 'play-timer', 'play-best');

  document.getElementById('play-start-btn').onclick = () => {
    document.getElementById('play-start-btn').classList.add('hidden');
    playGame.start((score) => onMinigameEnd('play', score, isMultiplayer));
  };

  document.getElementById('play-close-btn').onclick = () => {
    playGame?.destroy();
    modal.classList.add('hidden');
  };
}

// ── Minigame Result Handler ────────────────────────────────────────────
function onMinigameEnd(type, score, isMultiplayer) {
  const coins = Math.floor(score * 0.05);
  const xp = Math.floor(score * 0.1);

  if (type === 'feed') {
    petState.feed(Math.min(40, Math.floor(score / 10)));
    document.getElementById('modal-feed').classList.add('hidden');
    document.getElementById('feed-start-btn').classList.remove('hidden');
  } else {
    petState.play(Math.min(40, Math.floor(score / 10)), 8);
    document.getElementById('modal-play').classList.add('hidden');
    document.getElementById('play-start-btn').classList.remove('hidden');
  }

  if (isMultiplayer) {
    lobby.submitScore(score);
    showToast(`Score: ${score}! Waiting for others... ⏳`);
  } else {
    petState.adjust('coins', coins);
    petState.adjust('xp', xp);
    showToast(`🎮 Score: ${score}! +${coins}💰 +${xp}XP`);
    animatePet('happy');
    speak(getRaceData(petState.get().race).speech.happy);
  }
}

// ── Multiplayer Minigame Launch ────────────────────────────────────────
function launchMpMinigame(gameType) {
  const race = petState.get().race;
  showToast('🎮 Multiplayer game starting!', 2000);
  if (gameType === 'feed') {
    openFeedModal(race, true);
  } else {
    openPlayModal(race, true);
  }
}

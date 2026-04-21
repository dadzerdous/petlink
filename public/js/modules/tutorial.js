// tutorial.js — step-by-step onboarding popups, shown once per new player
const TUTORIAL_KEY = 'tamapets_tutorial_done';

// Each step: which element to highlight (CSS selector), where to place the popup, and what to say
const STEPS = [
  {
    title: '👋 Welcome to Tamapets!',
    body: 'You\'ve just adopted a virtual creature. Keep it fed, happy, and rested — or it gets grumpy! Let\'s take a quick tour.',
    target: null, // no highlight, centered intro
    position: 'center',
    emoji: '✨',
  },
  {
    title: '🐾 Your Pet',
    body: 'This is your creature! It bounces around and will speak to you when it needs something. Click it anytime to hear what\'s on its mind.',
    target: '#pet-sprite',
    position: 'bottom',
    emoji: '👆',
  },
  {
    title: '📊 Stats Bar',
    body: 'These three bars show Hunger, Happiness, and Energy. If any bar hits zero your pet gets very unhappy. Keep them topped up!',
    target: '.stats-panel',
    position: 'top',
    emoji: '📉',
  },
  {
    title: '🍖 Feed Button',
    body: 'Tap Feed to launch the feeding minigame. Click the falling food before it hits the ground — combos earn bonus points and more coins!',
    target: '#btn-feed',
    position: 'top',
    emoji: '🎯',
  },
  {
    title: '🎮 Play Button',
    body: 'Tap Play for the Reaction Rush minigame. A glowing target appears — hit it as fast as you can! Faster = more points.',
    target: '#btn-play',
    position: 'top',
    emoji: '⚡',
  },
  {
    title: '🛒 Shop',
    body: 'Spend your coins here! Buy food, items, and room decorations. Each race has its own unique shop with themed items.',
    target: '#btn-shop',
    position: 'top',
    emoji: '💰',
  },
  {
    title: '💤 Sleep',
    body: 'Low on energy? Hit Sleep to restore it. Your pet needs rest just like you do!',
    target: '#btn-sleep',
    position: 'top',
    emoji: '🌙',
  },
  {
    title: '⚔ Multiplayer!',
    body: 'Create a lobby and share the 6-letter code with friends. Everyone plays the same minigame at once — your group\'s average score determines the reward!',
    target: '#btn-open-lobby',
    position: 'bottom',
    emoji: '🏆',
  },
  {
    title: '🎉 You\'re Ready!',
    body: 'That\'s everything! Your pet is waiting. Remember: minigames earn coins, coins buy upgrades, and upgrades keep your pet happy. Good luck!',
    target: null,
    position: 'center',
    emoji: '🚀',
  },
];

let currentStep = 0;
let overlay = null;
let popup = null;
let spotlight = null;
let onDoneCallback = null;

export function startTutorial(onDone) {
  if (localStorage.getItem(TUTORIAL_KEY)) {
    onDone?.();
    return;
  }
  onDoneCallback = onDone;
  currentStep = 0;
  _buildDOM();
  _showStep(0);
}

export function resetTutorial() {
  localStorage.removeItem(TUTORIAL_KEY);
}

function _buildDOM() {
  // Overlay
  overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.innerHTML = `
    <div id="tutorial-spotlight"></div>
    <div id="tutorial-popup">
      <div id="tutorial-emoji"></div>
      <h3 id="tutorial-title"></h3>
      <p id="tutorial-body"></p>
      <div id="tutorial-footer">
        <span id="tutorial-dots"></span>
        <div id="tutorial-btns">
          <button id="tutorial-skip" class="btn-ghost">Skip tour</button>
          <button id="tutorial-next" class="btn-primary">Next →</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  spotlight = document.getElementById('tutorial-spotlight');
  popup = document.getElementById('tutorial-popup');

  document.getElementById('tutorial-next').addEventListener('click', () => {
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      _showStep(currentStep);
    } else {
      _finish();
    }
  });

  document.getElementById('tutorial-skip').addEventListener('click', _finish);
}

function _showStep(index) {
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  // Update text
  document.getElementById('tutorial-emoji').textContent = step.emoji;
  document.getElementById('tutorial-title').textContent = step.title;
  document.getElementById('tutorial-body').textContent = step.body;
  document.getElementById('tutorial-next').textContent = isLast ? '🎉 Let\'s go!' : 'Next →';

  // Dots
  document.getElementById('tutorial-dots').innerHTML = STEPS.map((_, i) =>
    `<span class="t-dot${i === index ? ' active' : ''}"></span>`
  ).join('');

  // Clear old highlight
  document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
  spotlight.style.display = 'none';

  if (step.target) {
    const target = document.querySelector(step.target);
    if (target) {
      target.classList.add('tutorial-highlight');
      _positionPopup(target, step.position);
      _positionSpotlight(target);
    } else {
      _centerPopup();
    }
  } else {
    _centerPopup();
  }

  // Animate in
  popup.classList.remove('tutorial-pop');
  void popup.offsetWidth;
  popup.classList.add('tutorial-pop');
}

function _positionSpotlight(target) {
  const rect = target.getBoundingClientRect();
  const pad = 8;
  spotlight.style.display = 'block';
  spotlight.style.top    = `${rect.top - pad}px`;
  spotlight.style.left   = `${rect.left - pad}px`;
  spotlight.style.width  = `${rect.width + pad * 2}px`;
  spotlight.style.height = `${rect.height + pad * 2}px`;
}

function _positionPopup(target, position) {
  const rect = target.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pw = Math.min(320, vw - 32);

  popup.style.position = 'fixed';
  popup.style.left = '';
  popup.style.right = '';
  popup.style.top = '';
  popup.style.bottom = '';
  popup.style.transform = '';

  // Horizontal center on target, clamped to screen
  let left = rect.left + rect.width / 2 - pw / 2;
  left = Math.max(16, Math.min(left, vw - pw - 16));

  popup.style.width = `${pw}px`;
  popup.style.left = `${left}px`;

  if (position === 'bottom') {
    popup.style.top = `${rect.bottom + 16}px`;
  } else {
    // top — but if too close to top, flip to bottom
    const topPos = rect.top - 16;
    if (topPos < 160) {
      popup.style.top = `${rect.bottom + 16}px`;
    } else {
      popup.style.bottom = `${vh - rect.top + 16}px`;
    }
  }
}

function _centerPopup() {
  popup.style.position = 'fixed';
  popup.style.left = '50%';
  popup.style.top = '50%';
  popup.style.bottom = '';
  popup.style.right = '';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.width = `min(360px, calc(100vw - 32px))`;
}

function _finish() {
  localStorage.setItem(TUTORIAL_KEY, '1');
  document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
  overlay.remove();
  overlay = null;
  onDoneCallback?.();
}

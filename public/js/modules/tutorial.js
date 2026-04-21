// tutorial.js — step-by-step onboarding popups, shown once per new player
const TUTORIAL_KEY = 'tamapets_tutorial_done';

const STEPS = [
  {
    title: '👋 Welcome to Tamapets!',
    body: 'You\'ve just adopted a virtual creature. Keep it fed, happy, and rested — or it gets grumpy! Let\'s take a quick tour.',
    target: null,
    position: 'center',
    emoji: '✨',
  },
  {
    title: '🐾 Your Pet',
    body: 'This is your creature! It bounces around and speaks when it needs something. Click it anytime to hear what\'s on its mind.',
    target: '#pet-sprite',
    position: 'bottom',
    emoji: '👆',
  },
  {
    title: '📊 Stats Bars',
    body: 'These three bars show Hunger, Happiness, and Energy. If any bar hits zero your pet gets very unhappy — keep them topped up!',
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
    body: 'Tap Play for Reaction Rush. A glowing target appears — hit it as fast as you can! Faster = more points.',
    target: '#btn-play',
    position: 'top',
    emoji: '⚡',
  },
  {
    title: '🛒 Shop',
    body: 'Spend your coins here! Each race has its own themed shop with unique items, food, and room decorations.',
    target: '#btn-shop',
    position: 'top',
    emoji: '💰',
  },
  {
    title: '💤 Sleep',
    body: 'Low on energy? Hit Sleep to restore it instantly. Your pet needs rest just like you do!',
    target: '#btn-sleep',
    position: 'top',
    emoji: '🌙',
  },
  {
    title: '⚔ Multiplayer',
    body: 'Create a lobby and share the 6-letter code with friends. Everyone plays the same minigame at once — your group\'s average score determines the reward for all!',
    target: '#btn-open-lobby',
    position: 'bottom',
    emoji: '🏆',
  },
  {
    title: '🎉 You\'re Ready!',
    body: 'That\'s everything! Minigames earn coins, coins buy upgrades, upgrades keep your pet thriving. Good luck!',
    target: null,
    position: 'center',
    emoji: '🚀',
  },
];

let currentStep = 0;
let overlayEl = null;
let popupEl = null;
let spotlightEl = null;
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
  // Remove any stale instance
  document.getElementById('tutorial-overlay')?.remove();
  document.getElementById('tutorial-backdrop')?.remove();

  // Backdrop (separate element so it doesn't interfere with spotlight)
  const backdrop = document.createElement('div');
  backdrop.id = 'tutorial-backdrop';
  document.body.appendChild(backdrop);

  // Main overlay wrapper
  overlayEl = document.createElement('div');
  overlayEl.id = 'tutorial-overlay';
  overlayEl.innerHTML = `
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
  document.body.appendChild(overlayEl);

  spotlightEl = document.getElementById('tutorial-spotlight');
  popupEl     = document.getElementById('tutorial-popup');

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

  document.getElementById('tutorial-emoji').textContent = step.emoji;
  document.getElementById('tutorial-title').textContent = step.title;
  document.getElementById('tutorial-body').textContent  = step.body;
  document.getElementById('tutorial-next').textContent  = isLast ? '🎉 Let\'s go!' : 'Next →';

  // Progress dots
  document.getElementById('tutorial-dots').innerHTML = STEPS.map((_, i) =>
    `<span class="t-dot${i === index ? ' active' : ''}"></span>`
  ).join('');

  // Clear previous highlight
  document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
  spotlightEl.style.display = 'none';

  if (step.target) {
    const target = document.querySelector(step.target);
    if (target) {
      target.classList.add('tutorial-highlight');
      _positionSpotlight(target);
      _positionPopup(target, step.position);
    } else {
      _centerPopup();
    }
  } else {
    _centerPopup();
  }

  // Animate in
  popupEl.classList.remove('tutorial-pop');
  void popupEl.offsetWidth;
  popupEl.classList.add('tutorial-pop');
}

function _positionSpotlight(target) {
  const rect = target.getBoundingClientRect();
  const pad  = 10;
  spotlightEl.style.display = 'block';
  spotlightEl.style.top     = `${rect.top    - pad}px`;
  spotlightEl.style.left    = `${rect.left   - pad}px`;
  spotlightEl.style.width   = `${rect.width  + pad * 2}px`;
  spotlightEl.style.height  = `${rect.height + pad * 2}px`;
}

function _positionPopup(target, position) {
  const rect = target.getBoundingClientRect();
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;
  const pw   = Math.min(320, vw - 32);

  // Reset all positioning
  popupEl.style.cssText = `position:fixed; width:${pw}px;`;

  // Horizontal: center on target, clamped to screen edges
  let left = rect.left + rect.width / 2 - pw / 2;
  left = Math.max(16, Math.min(left, vw - pw - 16));
  popupEl.style.left = `${left}px`;

  if (position === 'bottom') {
    let top = rect.bottom + 16;
    // If it would go off-screen, flip above
    if (top + 200 > vh) top = rect.top - 220;
    popupEl.style.top = `${Math.max(8, top)}px`;
  } else {
    // above target
    let bottom = vh - rect.top + 16;
    if (bottom + 200 > vh) bottom = vh - rect.bottom - 220;
    popupEl.style.bottom = `${Math.max(8, bottom)}px`;
  }
}

function _centerPopup() {
  popupEl.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(360px, calc(100vw - 32px));
  `;
}

function _finish() {
  localStorage.setItem(TUTORIAL_KEY, '1');
  document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
  document.getElementById('tutorial-backdrop')?.remove();
  overlayEl?.remove();
  overlayEl = null;
  onDoneCallback?.();
}

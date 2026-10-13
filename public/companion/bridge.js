import './main.js';

const states = new Set(['idle', 'reading', 'working', 'ready']);
let desiredState = 'idle', desiredPaused = false, appliedState = null, reported = null;
const report = event => {
  if (reported === event) return;
  reported = event;
  window.parent.postMessage({ channel: 'grifon-companion', event }, window.location.origin);
};
function synchronize() {
  const snapshot = window.grifonDebug?.snapshot();
  if (snapshot?.failed) { report('failed'); return; }
  if (!snapshot?.ready) return;
  if (snapshot.pause !== desiredPaused) document.querySelector('#pause').click();
  if (!desiredPaused && appliedState !== desiredState) {
    window.grifonCompanion.setState(desiredState);
    appliedState = desiredState;
  }
  report('ready');
}
window.addEventListener('message', event => {
  if (event.source !== window.parent || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || typeof data !== 'object' || data.channel !== 'grifon-companion') return;
  if (data.command === 'state' && states.has(data.state)) desiredState = data.state;
  else if (data.command === 'pause' && typeof data.paused === 'boolean') desiredPaused = data.paused;
  else if (data.command === 'pointer' && !desiredPaused && Number.isFinite(data.x) && Number.isFinite(data.y)) {
    const stage = document.querySelector('#stage').getBoundingClientRect();
    document.dispatchEvent(new PointerEvent('pointermove', {
      pointerType: 'mouse',
      clientX: stage.left + (Math.max(-1, Math.min(1, data.x)) + 1) * stage.width / 2,
      clientY: stage.top + (1 - Math.max(-1, Math.min(1, data.y))) * stage.height / 2,
    }));
  }
  synchronize();
});
// Report async geometry/texture readiness and later WebGL failures independently of app jobs.
const monitor = window.setInterval(synchronize, 250);
window.addEventListener('pagehide', () => window.clearInterval(monitor), { once: true });
synchronize();

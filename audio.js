const files = { spy: 'spy_music.mp3', celebration: 'celebration_music.mp3', click: 'button_click.wav', key: 'safe_key_click.wav', transition: 'transition_click.wav' };
const levels = { spy: .18, celebration: .30, click: .25, key: .35, transition: .28 };
export class AudioController {
  constructor(storage) {
    this.storage = storage; this.enabled = storage.get('op45:sound') !== 'off';
    this.players = {}; this.active = null; this.unlocked = false; this.effect = null; this.lastClick = 0; this.fades = new Map();
    this.clickContext = null; this.clickGain = null; this.clickBuffer = null; this.clickLoad = null; this.clickSource = null; this.clickUnavailable = false;
    // Capture unlocks/warms audio before the existing button click handlers, without playing anything.
    const prime = e => { if (e.isTrusted && e.target?.closest?.('button')) this.prepareClick(); };
    for (const type of ['pointerdown', 'touchend', 'keydown', 'click']) document.addEventListener(type, prime, {capture:true,passive:true});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Object.values(this.players).forEach(a => a.pause()); this.stopClick(); this.suspendClick(); }
      else if (this.unlocked && this.enabled && this.active) this.start(this.active);
    });
  }
  prepareClick() {
    if (!this.enabled || document.hidden || this.clickUnavailable) return;
    try {
      if (!this.clickContext) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context || !globalThis.fetch) { this.clickUnavailable = true; return; }
        this.clickContext = new Context({latencyHint:'interactive'});
        this.clickGain = this.clickContext.createGain();
        this.clickGain.gain.value = levels.click;
        this.clickGain.connect(this.clickContext.destination);
      }
      const context = this.clickContext;
      this.clickGain.gain.value = levels.click;
      // Call resume inside the trusted gesture, never after fetch/decode promises settle.
      if (context.state !== 'running') context.resume().catch(()=>{});
      if (!this.clickLoad) {
        this.clickLoad = fetch(`assets/audio/${files.click}`, {cache:'force-cache'})
          .then(response => { if (!response.ok) throw new Error('Click unavailable'); return response.arrayBuffer(); })
          .then(bytes => new Promise((resolve,reject) => {
            const result = context.decodeAudioData(bytes,resolve,reject);
            result?.then(resolve,reject);
          }))
          .then(buffer => { this.clickBuffer = buffer; })
          .catch(() => { this.clickUnavailable = true; });
      }
    } catch { this.clickUnavailable = true; }
  }
  stopClick() {
    const source = this.clickSource; this.clickSource = null;
    if (source) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
  }
  suspendClick() {
    if (this.clickContext?.state === 'running') this.clickContext.suspend().catch(()=>{});
  }
  playCachedClick() {
    if (!this.clickBuffer || this.clickContext?.state !== 'running' || this.clickUnavailable) return false;
    let source;
    try {
      source = this.clickContext.createBufferSource();
      source.buffer = this.clickBuffer;
      source.connect(this.clickGain);
      source.onended = () => { source.disconnect(); if (this.clickSource === source) this.clickSource = null; };
      this.clickSource = source;
      source.start(0);
      return true;
    } catch {
      if (this.clickSource === source) this.stopClick();
      else if (source) { try { source.disconnect(); } catch {} }
      return false;
    }
  }
  get(name) {
    if (!this.players[name]) {
      const a = new Audio(`assets/audio/${files[name]}`); a.preload = 'none'; a.loop = ['spy', 'celebration'].includes(name); a.volume = 0;
      a.addEventListener('error', () => console.warn(`Audio unavailable: ${files[name]}`)); this.players[name] = a;
    }
    return this.players[name];
  }
  fade(a, target, ms = 700, pause = false) {
    cancelAnimationFrame(this.fades.get(a)); const from = a.volume; const start = performance.now();
    const tick = now => { const p = Math.min(1, (now-start)/ms); a.volume = from+(target-from)*p;
      if (p < 1) this.fades.set(a, requestAnimationFrame(tick)); else { this.fades.delete(a); if(pause) a.pause(); }
    }; this.fades.set(a, requestAnimationFrame(tick));
  }
  start(name) {
    this.unlocked = true; this.active = name;
    for (const [key,a] of Object.entries(this.players)) if (key !== name && a.loop) this.fade(a,0,650,true);
    if (!this.enabled || document.hidden) return;
    const a = this.get(name); a.play().then(() => this.fade(a, levels[name],900)).catch(() => console.warn('Music playback requires a supported user interaction.'));
  }
  sfx(name='click') {
    if (!this.enabled || document.hidden) return;
    const now = performance.now(); if(now-this.lastClick<100) return; this.lastClick=now;
    // Media APIs can throw synchronously, before play() returns a Promise.
    // A failed optional effect must not abort the caller's keypad/state update.
    try {
      this.stopClick();
      if(this.effect) { this.effect.pause(); this.effect.currentTime=0; }
      if(name==='click' && this.playCachedClick()) return;
      const a=this.get(name); a.volume=levels[name]; a.currentTime=0; this.effect=a; a.play().catch(()=>{});
    } catch {}
  }
  toggle() {
    this.enabled=!this.enabled; this.storage.set('op45:sound', this.enabled?'on':'off');
    if(!this.enabled) { this.stopClick(); if(this.clickGain) this.clickGain.gain.value=0; this.suspendClick(); Object.values(this.players).forEach(a=>{cancelAnimationFrame(this.fades.get(a));a.pause();a.volume=0;}); }
    else { this.prepareClick(); if(this.active) this.start(this.active); }
    return this.enabled;
  }
}

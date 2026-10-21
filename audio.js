const files = { spy: 'spy_music.mp3', celebration: 'celebration_music.mp3', click: 'button_click.wav', key: 'safe_key_click.wav', transition: 'transition_click.wav' };
const levels = { spy: .18, celebration: .30, click: .25, key: .35, transition: .28 };
export class AudioController {
  constructor(storage) {
    this.storage = storage; this.enabled = storage.get('op45:sound') !== 'off';
    this.players = {}; this.active = null; this.unlocked = false; this.effect = null; this.lastClick = 0; this.fades = new Map();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Object.values(this.players).forEach(a => a.pause());
      else if (this.unlocked && this.enabled && this.active) this.start(this.active);
    });
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
    if(this.effect) { this.effect.pause(); this.effect.currentTime=0; }
    const a=this.get(name); a.volume=levels[name]; a.currentTime=0; this.effect=a; a.play().catch(()=>{});
  }
  toggle() {
    this.enabled=!this.enabled; this.storage.set('op45:sound', this.enabled?'on':'off');
    if(!this.enabled) { Object.values(this.players).forEach(a=>{cancelAnimationFrame(this.fades.get(a));a.pause();a.volume=0;}); }
    else if(this.active) this.start(this.active);
    return this.enabled;
  }
}

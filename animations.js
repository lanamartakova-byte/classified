// CSS owns frame rendering. This controller owns scene, visibility and cleanup.
export class SceneAnimations {
  constructor({document=globalThis.document,window=globalThis.window,
    motion=globalThis.matchMedia('(prefers-reduced-motion: reduce)'),
    clock=globalThis.performance,schedule=(fn,delay)=>globalThis.setTimeout(fn,delay),cancel=id=>globalThis.clearTimeout(id)}={}) {
    this.document=document;this.window=window;this.motion=motion;this.clock=clock;
    this.schedule=schedule;this.cancel=cancel;this.box=document.querySelector('#effects');
    this.scene='';this.timer=null;this.remaining=0;this.celebrating=false;
    this.pageHidden=false;this.paused=false;this.reduced=motion.matches;
    this.onVisibility=()=>this.syncVisibility();
    this.onPageHide=()=>{this.pageHidden=true;this.syncVisibility();};
    this.onPageShow=()=>{this.pageHidden=false;this.syncVisibility();};
    this.onMotion=()=>{
      this.reduced=this.motion.matches;this.labelECG();
      if(this.celebrating)this.celebrate();
    };
    document.addEventListener('visibilitychange',this.onVisibility);
    window.addEventListener('pagehide',this.onPageHide);
    window.addEventListener('pageshow',this.onPageShow);
    if(motion.addEventListener)motion.addEventListener('change',this.onMotion);
    else motion.addListener?.(this.onMotion);
    this.syncVisibility();
  }
  setScene(scene) {
    this.stopCelebration();this.scene=scene;this.labelECG();this.syncVisibility();
  }
  labelECG() {
    if(this.scene!=='detector')return;
    const ecg=this.document.querySelector('.ecg');
    ecg?.setAttribute('role','img');
    ecg?.setAttribute('aria-label',this.reduced?'Сигнал детектора. Движение отключено в настройках устройства.':'Движущийся сигнал детектора.');
  }
  syncVisibility() {
    const paused=Boolean(this.document.hidden||this.pageHidden);
    if(paused)this.document.body.classList.add('animations-paused');
    else this.document.body.classList.remove('animations-paused');
    if(paused&&!this.paused&&this.timer!==null){
      this.cancel(this.timer);this.timer=null;
      this.remaining=Math.max(0,this.remaining-(this.clock.now()-this.started));
    }
    this.paused=paused;
    if(!paused&&this.celebrating&&!this.reduced&&this.timer===null)this.armCleanup();
  }
  armCleanup() {
    this.started=this.clock.now();
    this.timer=this.schedule(()=>{this.timer=null;this.stopCelebration();},this.remaining);
  }
  celebrate() {
    this.stopCelebration();
    if(!['invitation','confirmation'].includes(this.scene))return;
    this.celebrating=true;
    if(this.reduced){this.box.classList.add('celebration-still');return;}
    const width=this.window.innerWidth,height=this.window.innerHeight;
    const radius=Math.min(56,width*.10,height*.07);
    // Keep bursts at the outer edges, behind the foreground text and controls.
    const bursts=[[.12,.18,0],[.88,.20,.45],[.12,.82,1.15],[.88,.80,1.75]];
    const fragment=this.document.createDocumentFragment();
    for(const [x,y,delay] of bursts){
      for(let ray=0;ray<12;ray++){
        const angle=ray*Math.PI/6,spark=this.document.createElement('i');
        spark.className='firework-spark';
        spark.style.left=`${x*100}%`;spark.style.top=`${y*100}%`;
        spark.style.setProperty('--dx',`${Math.cos(angle)*radius}px`);
        spark.style.setProperty('--dy',`${Math.sin(angle)*radius}px`);
        spark.style.animationDelay=`${delay}s`;
        spark.style.background=ray%3?'#d4af63':'#f5e5bf';
        fragment.append(spark);
      }
    }
    this.box.append(fragment);
    this.remaining=3200;
    if(!this.paused)this.armCleanup();
  }
  stopCelebration() {
    if(this.timer!==null)this.cancel(this.timer);
    this.timer=null;this.remaining=0;this.celebrating=false;
    this.box.replaceChildren();this.box.classList.remove('celebration-still');
  }
  destroy() {
    this.stopCelebration();
    this.document.removeEventListener('visibilitychange',this.onVisibility);
    this.window.removeEventListener('pagehide',this.onPageHide);
    this.window.removeEventListener('pageshow',this.onPageShow);
    if(this.motion.removeEventListener)this.motion.removeEventListener('change',this.onMotion);
    else this.motion.removeListener?.(this.onMotion);
    this.document.body.classList.remove('animations-paused');
  }
}

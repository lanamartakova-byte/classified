// CSS owns frame rendering. This controller owns scene, visibility and cleanup.
export class SceneAnimations {
  constructor({document=globalThis.document,window=globalThis.window,
    clock=globalThis.performance,schedule=(fn,delay)=>globalThis.setTimeout(fn,delay),cancel=id=>globalThis.clearTimeout(id)}={}) {
    this.document=document;this.window=window;this.clock=clock;
    this.schedule=schedule;this.cancel=cancel;this.box=document.querySelector('#effects');
    this.quizBox=null;this.onComplete=null;this.scene='';this.timer=null;this.remaining=0;this.celebrating=false;this.onComplete=null;
    this.pageHidden=false;this.paused=false;
    this.onVisibility=()=>this.syncVisibility();
    this.onPageHide=()=>{this.pageHidden=true;this.syncVisibility();};
    this.onPageShow=()=>{this.pageHidden=false;this.syncVisibility();};
    document.addEventListener('visibilitychange',this.onVisibility);
    window.addEventListener('pagehide',this.onPageHide);
    window.addEventListener('pageshow',this.onPageShow);
    this.syncVisibility();
  }
  setScene(scene) {
    this.stopCelebration();this.scene=scene;this.quizBox=scene==='detector'?this.document.querySelector('#quiz-effects'):null;this.labelECG();this.syncVisibility();
  }
  labelECG() {
    if(this.scene!=='detector')return;
    const ecg=this.document.querySelector('.ecg');
    ecg?.setAttribute('role','img');
    ecg?.setAttribute('aria-label','Движущийся сигнал детектора.');
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
    if(!paused&&this.celebrating&&this.timer===null)this.armCleanup();
  }
  armCleanup() {
    this.started=this.clock.now();
    this.timer=this.schedule(()=>{this.timer=null;const complete=this.onComplete;this.stopCelebration();complete?.();},this.remaining);
  }
  celebrate() {
    this.stopCelebration();
    if(!['invitation','confirmation'].includes(this.scene))return;
    this.celebrating=true;
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
  celebrateQuiz(onComplete) {
    this.stopCelebration();
    if(this.scene!=='detector'||!this.quizBox)return;
    this.celebrating=true;this.onComplete=onComplete;
    const width=this.quizBox.clientWidth||this.window.innerWidth,height=this.quizBox.clientHeight||this.window.innerHeight;
    const radius=Math.min(44,width*.11,height*.10),fragment=this.document.createDocumentFragment();
    for(const x of [.22,.78])for(let ray=0;ray<12;ray++){
      const spark=this.document.createElement('i'),angle=ray*Math.PI/6;
      spark.className='quiz-spark';spark.style.left=`${x*100}%`;spark.style.top='88%';
      spark.style.setProperty('--dx',`${Math.cos(angle)*radius}px`);spark.style.setProperty('--dy',`${Math.sin(angle)*radius}px`);
      spark.style.animationDelay=x===.22?'0s':'.15s';fragment.append(spark);
    }
    this.quizBox.append(fragment);this.remaining=1800;
    if(!this.paused)this.armCleanup();
  }
  stopCelebration() {
    if(this.timer!==null)this.cancel(this.timer);
    this.timer=null;this.remaining=0;this.celebrating=false;this.onComplete=null;
    this.box.replaceChildren();this.quizBox?.replaceChildren();
  }
  destroy() {
    this.stopCelebration();
    this.document.removeEventListener('visibilitychange',this.onVisibility);
    this.window.removeEventListener('pagehide',this.onPageHide);
    this.window.removeEventListener('pageshow',this.onPageShow);
    this.document.body.classList.remove('animations-paused');
  }
}

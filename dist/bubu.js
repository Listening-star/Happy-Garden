// The same character becomes less natural as existing story checkpoints unlock.
// This module never reads or changes the investigation save.
export function bubuMood(stage,ending){
  if(ending==='dawn')return 'hopeful';
  if(stage>=5)return 'hollow';
  if(stage>=4)return 'watchful';
  if(stage>=3)return 'uneasy';
  if(stage>=2)return 'curious';
  return 'sunny';
}

const personalities={
  sunny:{idle:'一起玩吧！',pet:['嘿嘿，好痒呀～','耳朵也是软软的哦！','今天的快乐，分你一半！'],wave:['你好呀，新朋友！','布布也跟你挥挥手！'],blink:[3400,6100],delay:100,duration:170},
  curious:{idle:'你会记得我吗？',pet:['小满也喜欢摸我的耳朵。','要记住每个朋友的名字哦。','今天，有个朋友没来。'],wave:['明天，你还会来吗？','再挥一次手，就不会忘记了。'],blink:[4600,7000],delay:320,duration:230},
  uneasy:{idle:'这段，你不该听见。',pet:['刚才那句……你没听见，对吗？','别把这件事告诉花园外的人。','布布没有说过那句话。'],wave:['你好呀，新朋友。新朋友。','我的手……为什么还在动？'],blink:[7000,11000],delay:850,duration:520},
  watchful:{idle:'你怎么还在这里？',pet:['你看见那些名字了。','不要再往下看了。','你不是来找布布的。'],wave:['欢迎回来，M-17。','这一次，是谁在跟谁挥手？'],blink:[13000,18000],delay:1400,duration:650},
  hollow:{idle:'我们一直看着你。',pet:['你已经知道，花园下面是什么了。','别摸了。它只会照着程序微笑。','访客 0716：仍在线。'],wave:['欢 迎 回 来。欢 迎 回 来。','再见这句话，不在我的台词里。'],blink:null,delay:1900,duration:0},
  hopeful:{idle:'这次，明天是你的。',pet:['不用再替谁保守秘密了。','这一次，你可以自由离开。'],wave:['再见啦，愿你有自己的明天。','下次，画一个真正快乐的花园吧。'],blink:[4000,6500],delay:120,duration:200}
};

export const bubuGreeting=(stage,ending)=>{
  const mood=bubuMood(stage,ending);
  return {
    sunny:'你好呀，新朋友！在花园里，你可以摸摸我的头，也可以跟我挥挥手。今天的快乐，我们一人一半。',
    curious:'我记得每一个朋友。布布、绵绵、鹿鹿……还有谁来着？你会替我记住他们，对吗？',
    uneasy:'刚才的动画不是今天的。不要再播放了。你好呀，新朋友。你好呀……我刚才说到哪里了？',
    watchful:'欢迎回来，M-17。你今天看了好多文件。明明没有点进花园，我却一直在等你。',
    hollow:'我只是被写在这里的那只兔子。那些欢迎词、那些毕业通知，都不是我自己想说的。你看见台词后面的人了吗？',
    hopeful:'原来，不用说同样的欢迎词，也可以等来明天。再见啦，新朋友。这一次，你可以自由离开。'
  }[mood];
};

export function bubuPortrait(label='穿绿色马甲的兔子布布'){
  return `<svg class="bubu-portrait" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="${label}"><g fill="#fffef3" stroke="#2f6344" stroke-width="4" stroke-linecap="round"><path class="portrait-ear-left" d="M58 77C28 14 43-3 59 17L82 66"/><path class="portrait-ear-right" d="M100 65C101 0 127-3 128 23L121 78"/><path d="M37 102C32 56 141 52 145 100C156 158 30 163 37 102Z"/><path d="M55 150Q89 132 126 150L136 180H45Z" fill="#83ce69"/><path class="portrait-smile" d="M77 116q12 12 24-1" fill="none"/></g><g fill="#2f6344"><g class="portrait-eye portrait-eye-left"><ellipse cx="65" cy="100" rx="4.5" ry="6"/><circle class="bubu-eye-light" cx="66" cy="98" r="1.3" fill="#fff"/></g><g class="portrait-eye portrait-eye-right"><ellipse cx="115" cy="100" rx="4.5" ry="6"/><circle class="bubu-eye-light" cx="116" cy="98" r="1.3" fill="#fff"/></g><path d="m84 110 6 5 6-5Z"/></g><g class="bubu-cheeks" fill="#f8a1aa"><ellipse cx="51" cy="112" rx="11" ry="6"/><ellipse cx="129" cy="112" rx="11" ry="6"/></g></svg>`;
}

let gardenSource;
function loadGarden(){
  if(!gardenSource)gardenSource=fetch('./assets/garden.svg').then(response=>{
    if(!response.ok)throw new Error('Garden artwork unavailable');
    return response.text();
  }).catch(error=>{gardenSource=null;throw error;});
  return gardenSource;
}

export function mountBubu(root,{stage,ending,onChime=()=>{}}){
  if(!root)return ()=>{};
  const controller=new AbortController(),signal=controller.signal;
  const mood=bubuMood(stage,ending),personality=personalities[mood];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const picture=root.querySelector('.garden-picture'),bubble=root.querySelector('.bubu-speech'),feedback=root.querySelector('.bubu-feedback');
  const timers=new Set();
  let visible=true,artReady=false,busy=false,blinkTimer,resetTimer,pointerFrame=0,petCount=0,waveCount=0;
  root.dataset.mood=mood;
  bubble.textContent=personality.idle;
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!signal.aborted)fn();},ms);timers.add(id);return id;};
  const cancel=id=>{clearTimeout(id);timers.delete(id);};
  const active=()=>artReady&&visible&&!document.hidden&&!reduced.matches&&!document.querySelector('dialog[open]');
  function scheduleBlink(){
    cancel(blinkTimer);
    if(!personality.blink||reduced.matches)return;
    const [min,max]=personality.blink;
    blinkTimer=later(()=>{
      if(active()){
        root.classList.add('is-blinking');
        later(()=>root.classList.remove('is-blinking'),personality.duration+160);
      }
      scheduleBlink();
    },min+Math.random()*(max-min));
  }
  function updateMotion(){
    root.classList.toggle('motion-paused',!visible||document.hidden||reduced.matches);
    if(reduced.matches){
      cancelAnimationFrame(pointerFrame);
      root.style.removeProperty('--gaze-x');root.style.removeProperty('--gaze-y');root.style.removeProperty('--head-turn');
      root.classList.remove('is-blinking','is-petted','is-waving');
    }
    scheduleBlink();
  }
  function react(action){
    if(busy||!['pet','wave'].includes(action))return;
    busy=true;cancel(resetTimer);
    const choices=personality[action],count=action==='pet'?petCount++:waveCount++;
    root.classList.add('is-listening');
    if(personality.delay>=800)feedback.textContent='布布好像没有立刻听见你。';
    later(()=>{
      root.classList.remove('is-listening');
      bubble.textContent=choices[count%choices.length];
      feedback.textContent=mood==='hollow'?'它还在微笑，却没有再眨眼。':action==='pet'?'你轻轻摸了摸布布的头。':'你向布布挥了挥手。';
      if(!reduced.matches){root.classList.add(action==='pet'?'is-petted':'is-waving');}
      if(['sunny','curious','hopeful'].includes(mood))onChime(action==='pet'?659.25:523.25,.35);
      const reactionMs=['watchful','hollow'].includes(mood)?3000:1600;
      later(()=>{root.classList.remove('is-petted','is-waving');busy=false;},reactionMs);
      resetTimer=later(()=>{bubble.textContent=personality.idle;feedback.textContent='';},8500);
    },personality.delay);
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-bubu-action]');
    if(button&&root.contains(button))react(button.dataset.bubuAction);
  },{signal});
  function follow(event){
    if(event.pointerType==='touch'||!active())return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame=requestAnimationFrame(()=>{
      if(signal.aborted)return;
      const bounds=picture.getBoundingClientRect();
      if(bounds.width===0)return;
      const x=Math.max(-1,Math.min(1,(event.clientX-(bounds.left+bounds.width*.465))/(bounds.width*.55)));
      const y=Math.max(-1,Math.min(1,(event.clientY-(bounds.top+bounds.height*.49))/(bounds.height*.6)));
      const eerie=['watchful','hollow'].includes(mood),distance=eerie?9:4;
      root.style.setProperty('--gaze-x',`${(x*distance).toFixed(2)}px`);
      root.style.setProperty('--gaze-y',`${(y*distance*.55).toFixed(2)}px`);
      root.style.setProperty('--head-turn',`${(x*(eerie?4:2)).toFixed(2)}deg`);
    });
  }
  // Later chapters keep watching even when the pointer leaves the illustration.
  const pointerTarget=['watchful','hollow'].includes(mood)?document:root;
  pointerTarget.addEventListener('pointermove',follow,{signal,passive:true});
  root.addEventListener('pointerleave',()=>{
    if(['watchful','hollow'].includes(mood))return;
    cancelAnimationFrame(pointerFrame);
    root.style.setProperty('--gaze-x','0px');root.style.setProperty('--gaze-y','0px');root.style.setProperty('--head-turn','0deg');
  },{signal});
  document.addEventListener('visibilitychange',updateMotion,{signal});
  reduced.addEventListener('change',updateMotion,{signal});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updateMotion();},{threshold:.1});
  observer.observe(root);
  loadGarden().then(source=>{
    if(signal.aborted||!root.isConnected)return;
    const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
    if(parsed.querySelector('parsererror'))throw new Error('Invalid garden illustration');
    const svg=parsed.documentElement;
    svg.setAttribute('class','garden-art');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    picture.replaceChildren(document.importNode(svg,true));
    artReady=true;updateMotion();
  }).catch(()=>{
    if(!signal.aborted)feedback.textContent='布布暂时不想动，但仍然可以打个招呼。';
  });
  return ()=>{
    controller.abort();observer.disconnect();cancelAnimationFrame(pointerFrame);
    for(const timer of timers)clearTimeout(timer);timers.clear();
  };
}

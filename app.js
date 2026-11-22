"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- fluid orb (canvas metaballs, gooey) ---------- */
(function orb(){
  const c = document.getElementById("orb"); if(!c) return;
  const ctx = c.getContext("2d");
  let w=0,h=0,t=0, mx=0.5,my=0.5, tx=0.5,ty=0.5, raf;
  const blobs = Array.from({length:7},(_,i)=>({
    a: Math.random()*Math.PI*2, r: .16+Math.random()*.2,
    sp: .18+Math.random()*.3, ox: .3+Math.random()*.4, oy:.3+Math.random()*.4, ph: Math.random()*6.28
  }));
  function size(){
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio||1, 2);
    c.width = rect.width*dpr; c.height = rect.height*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0); w=rect.width; h=rect.height;
  }
  function draw(){
    t += reduce?0:.008;
    ctx.clearRect(0,0,w,h);
    // trail of soft circles; the contrast filter in CSS melts them into a blob
    for(let i=0;i<blobs.length;i++){
      const b=blobs[i];
      const x = w*(b.ox + .22*Math.cos(b.a + t*b.sp*2)*(1-i*.06) + (mx-.5)*.12);
      const y = h*(b.oy + .22*Math.sin(b.a*1.3 + t*b.sp*2.4 + b.ph) + (my-.5)*.12);
      const rad = Math.min(w,h)*b.r*(1+.08*Math.sin(t*2+b.ph));
      const g = ctx.createRadialGradient(x,y,rad*.1,x,y,rad);
      g.addColorStop(0,"rgba(182,243,76,.95)");
      g.addColorStop(.65,"rgba(120,190,60,.55)");
      g.addColorStop(1,"rgba(30,60,20,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,rad,0,6.2832); ctx.fill();
    }
    raf=requestAnimationFrame(draw);
  }
  size(); addEventListener("resize",size);
  addEventListener("pointermove",e=>{
    tx = e.clientX/innerWidth; ty = e.clientY/innerHeight;
  },{passive:true});
  (function lean(){ mx+=(tx-mx)*.04; my+=(ty-my)*.04; requestAnimationFrame(lean); })();
  if(reduce){ draw(); cancelAnimationFrame(raf); } else draw();
})();

/* ---------- gooey nav blob ---------- */
(function gooNav(){
  const wrap=document.getElementById("gooeyLinks"); if(!wrap) return;
  const blob=wrap.querySelector(".goo-blob");
  const links=[...wrap.querySelectorAll(".glink")];
  function move(el){
    blob.style.width=el.offsetWidth+"px";
    blob.style.transform=`translateX(${el.offsetLeft}px)`;
  }
  links.forEach(l=>l.addEventListener("click",()=>{
    links.forEach(x=>x.classList.remove("is-active")); l.classList.add("is-active"); move(l);
  }));
  const io=new IntersectionObserver(es=>{
    es.forEach(en=>{ if(en.isIntersecting){
      const l=links.find(x=>x.getAttribute("href")==="#"+en.target.id);
      if(l){ links.forEach(x=>x.classList.remove("is-active")); l.classList.add("is-active"); move(l); }
    }});
  },{rootMargin:"-40% 0px -55% 0px"});
  ["console","craft","notes"].forEach(id=>{const s=document.getElementById(id); if(s) io.observe(s);});
  const first=wrap.querySelector(".glink.is-active")||links[0];
  requestAnimationFrame(()=>move(first));
  addEventListener("resize",()=>move(wrap.querySelector(".glink.is-active")||links[0]));
})();

/* ---------- odometer ---------- */
(function odo(){
  const els=[...document.querySelectorAll(".odo")];
  els.forEach(el=>{
    const v=+el.dataset.value, pad=+ (el.dataset.pad||String(v).length);
    el.innerHTML=Array.from({length:pad},()=>`<span class="digit"><span class="reel">${Array.from({length:10},(_,d)=>`<span>${d}</span>`).join("")}</span></span>`).join("");
    const reels=[...el.querySelectorAll(".reel")];
    function set(n){
      const s=String(n).padStart(pad,"0");
      reels.forEach((r,i)=>{ r.style.transform=`translateY(-${+s[i]}*1.18em)`; });
    }
    set(0);
    const io=new IntersectionObserver(es=>{ es.forEach(en=>{ if(en.isIntersecting){ io.disconnect();
      setTimeout(()=>set(v), 250);
    }});},{threshold:.4});
    io.observe(el);
  });
})();

/* ---------- console demo ---------- */
(function demo(){
  const thread=document.getElementById("thread"); if(!thread) return;
  const form=document.getElementById("promptForm");
  const input=document.getElementById("promptInput");
  const send=document.getElementById("sendBtn");
  const fill=document.getElementById("depthFill");
  const chip=document.getElementById("statusChip");
  const chipText=document.getElementById("statusText");
  const chips=[...document.querySelectorAll(".chip")];

  const QA=[
    {q:"What can you do?",
     a:"Everything on this page is me: I <strong>stream</strong> answers instead of dumping them, I show my <strong>status</strong> while I work, I cite <strong>sources</strong> as pills above the reply, and I let you set my effort with a <strong>hold</strong>. Outside the demo, that same language runs real assistants.", s:[["0xleetv.studio","type study 03"]]},
    {q:"How was this built?",
     a:"Every line here is <strong>original</strong>. We studied open public component registries (Rare UI among them) for the <em>mechanics</em>: streaming, hold-to-send, gooey nav, the orb. Then we rebuilt each one in the studio's motion, palette and type. Study the idea, ship your own bones.", s:[["rareui.com","studied"],["github/0xleetv","catalog"]]},
    {q:"Why does hold-to-think matter?",
     a:"Because effort should be a <strong>dial</strong>, not a menu. Hold a beat for a quick answer, hold longer for a deep one, and the status line narrates the difference so you always know which one you paid for. One gesture, full control.", s:[["craft notes","below"]]}
  ];
  const STAGES=["reading the brief","scanning context","drafting","polishing"];
  let busy=false, qi=0;

  function el(html){ const t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstChild; }
  function scroll(){ thread.scrollTop=thread.scrollHeight; }

  function addUser(text){ thread.append(el(`<div class="msg msg-user"><div class="bubble"></div></div>`)); thread.lastElementChild.querySelector(".bubble").textContent=text; scroll(); }

  function addSources(pills){
    if(!pills||!pills.length) return null;
    const wrap=el(`<div class="sources">${pills.map(p=>`<span class="source-pill"><b>${p[0]}</b> · ${p[1]}</span>`).join("")}</div>`);
    return wrap;
  }

  function streamAnswer(html){
    const msg=el(`<div class="msg msg-ai"><div class="avatar">e</div><div class="bubble"><span class="body"></span><span class="caret"></span></div></div>`);
    thread.append(msg); scroll();
    const body=msg.querySelector(".body");
    // split into word chunks while keeping tags intact
    const tokens=html.match(/<[^>]+>|[^<\s]+\s*|\s+/g)||[];
    let i=0, acc="";
    (function step(){
      if(reduce){ body.innerHTML=html; msg.querySelector(".caret").remove(); scroll(); return; }
      const batch=tokens.slice(i,i+2).join(""); i+=2;
      acc+=batch; body.innerHTML=acc;
      scroll();
      if(i<tokens.length) setTimeout(step, 34+Math.random()*40);
      else msg.querySelector(".caret").remove();
    })();
  }

  function run(q){
    if(busy) return; busy=true;
    addUser(q); input.value=""; input.style.height="auto";
    chips.forEach(c=>c.disabled=true);
    chip.hidden=false;
    let s=0; chipText.textContent=STAGES[0];
    const tick=setInterval(()=>{ s=(s+1)%STAGES.length; chipText.textContent=STAGES[s]; },900);
    const item=QA[qi]; qi=(qi+1)%QA.length;
    const think = 1400 + Math.random()*1200;
    setTimeout(()=>{
      clearInterval(tick); chip.hidden=true;
      const src=addSources(item.s); if(src) thread.append(src);
      streamAnswer(item.a);
      setTimeout(()=>{ busy=false; chips.forEach(c=>c.disabled=false); }, item.a.length*8+400);
    }, reduce?300:think);
  }

  chips.forEach(c=>c.addEventListener("click",()=>run(c.textContent)));

  form.addEventListener("submit",e=>{ e.preventDefault(); const v=input.value.trim(); if(v) run(v); });
  input.addEventListener("input",()=>{ input.style.height="auto"; input.style.height=Math.min(input.scrollHeight,120)+"px"; });

  /* hold-to-think: press builds depth ring; release submits */
  let hold=null, depth=0;
  function startHold(e){
    if(busy) return;
    if(e.type==="pointerdown" && input.value.trim()==="") return; // hold only when there is something to send
    depth=0; send.setPointerCapture&&e.pointerId!=null&&send.setPointerCapture(e.pointerId);
    hold=setInterval(()=>{
      depth=Math.min(1,depth+.02);
      fill.style.background=`conic-gradient(var(--lime) ${depth*360}deg, transparent ${depth*360}deg)`;
      if(depth>=1){ stopHold(); run(input.value.trim()||QA[qi].q); }
    },30);
  }
  function stopHold(){
    if(hold){ clearInterval(hold); hold=null; }
    fill.style.background=`conic-gradient(var(--lime) 0deg, transparent 0deg)`;
  }
  send.addEventListener("pointerdown",startHold);
  ["pointerup","pointercancel","pointerleave"].forEach(ev=>send.addEventListener(ev,stopHold));
  send.addEventListener("click",e=>{ e.preventDefault(); const v=input.value.trim(); if(v&&!hold) run(v); });

  /* model picker */
  const picker=document.getElementById("modelPicker");
  const cur=document.getElementById("modelCurrent");
  const list=document.getElementById("modelList");
  const name=document.getElementById("modelName");
  const dot=picker.querySelector(".model-dot");
  const tints={"Echo 1":"#b6f34c","Echo Mini":"#7cd4fd","Echo Ultra":"#c9a0ff"};
  cur.addEventListener("click",e=>{ e.stopPropagation(); const open=list.hidden; list.hidden=!open; cur.setAttribute("aria-expanded",String(open)); });
  list.querySelectorAll("li").forEach(li=>li.addEventListener("click",()=>{
    list.querySelectorAll("li").forEach(x=>x.setAttribute("aria-selected","false"));
    li.setAttribute("aria-selected","true");
    name.textContent=li.dataset.model; dot.style.background=tints[li.dataset.model]||"#b6f34c";
    list.hidden=true; cur.setAttribute("aria-expanded","false");
  }));
  document.addEventListener("click",()=>{ list.hidden=true; cur.setAttribute("aria-expanded","false"); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") list.hidden=true; });
})();

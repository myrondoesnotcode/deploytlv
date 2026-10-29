/* Deploy D6: shared behaviour for every page. Needs data.js loaded first. */
(function(){
const D = window.DEPLOY, L = D.links;

/* ---------- built mode: clean URLs ----------
   In the mockup, pages link to each other as partner.html, watch.html?s=waze and
   load media from ../clips/. The build sets window.DEPLOY_BASE (e.g. '/' or
   '/preview/channel/') and every link and media path is rewritten to the
   published layout: /partner/, /stories/waze/, /media/clips/… */
const BASE = window.DEPLOY_BASE || null;
const rw = v => { if (!BASE || typeof v !== 'string') return v;
  return v.replace(/^\.\.\/(clips|thumbs|people)\//, BASE+'media/$1/')
    .replace(/^\.\.\/((?:host|sticker|pop)-[\w-]+\.(?:png|webp|jpg))$/, BASE+'media/$1')
    .replace(/^watch\.html\?s=([\w-]+)$/, BASE+'stories/$1/')
    .replace(/^index\.html(#.*)?$/, (m,h)=>BASE+(h||''))
    .replace(/^(partner|host|kit)\.html(\?[^#]*)?(#.*)?$/, (m,p,q,h)=>BASE+p+'/'+(q||'')+(h||'')); };
window.DeployRewrite = rw;
if (BASE) {
  (function walk(o){ for (const k in o) { if (typeof o[k]==='string') o[k]=rw(o[k]); else if (o[k] && typeof o[k]==='object') walk(o[k]); } })(D);
  const fix = el => { ['href','src','poster','data-src'].forEach(a=>{ if (el.hasAttribute && el.hasAttribute(a)) { const v=el.getAttribute(a), n=rw(v); if (n!==v) el.setAttribute(a,n); } }); };
  const sweep = root => { if (root.nodeType!==1) return; fix(root); root.querySelectorAll('[href],[src],[poster],[data-src]').forEach(fix); };
  new MutationObserver(ms=>ms.forEach(m=>{ if (m.type==='attributes') fix(m.target); else m.addedNodes.forEach(sweep); }))
    .observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['href','src','poster','data-src']});
  document.addEventListener('DOMContentLoaded',()=>sweep(document.body));
}
const HOME = BASE || 'index.html';
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const href = h => L[h] || h;                         // 'whatsapp' → the WhatsApp link
const ext = h => /^https?:/.test(href(h));
const store = { get(k){ try{return localStorage.getItem(k)}catch(e){return null} }, set(k,v){ try{localStorage.setItem(k,v)}catch(e){} } };

/* ---------- dates: computed, never typed ---------- */
const TZ = 'Asia/Jerusalem';
const todayISO = () => new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(new Date());
const dayDiff = iso => Math.round((Date.parse(iso) - Date.parse(todayISO())) / 864e5);
const fmtDay = iso => new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
const fmtDate = iso => new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const rel = iso => { const d = dayDiff(iso); return d===0?'TODAY': d===1?'TOMORROW': null; };
// weekly slots (e.g. Academy 101, every Wednesday) resolve to their next real date
const nextWeekday = wd => { const t=new Date(todayISO()+'T12:00:00'); const d=(wd - t.getDay() + 7) % 7; t.setDate(t.getDate()+d); return t.toISOString().slice(0,10); };
const resolve = x => x.weekly!=null ? Object.assign({}, x, {date: nextWeekday(x.weekly)}) : x;
const upcoming = () => D.guide.map(resolve).filter(g => g.recurring || dayDiff(g.date) >= 0).sort((a,b)=> (a.recurring?1:0)-(b.recurring?1:0) || (a.date||'').localeCompare(b.date||''));
const posted = () => D.stories.filter(s => s.posted);
window.DeployDates = { dayDiff, fmtDay, fmtDate, rel, todayISO, nextWeekday, resolve };


/* ---------- channels: the same numbers on the TV and the remote ---------- */
const CHS = [ {n:1,id:'watch',name:'ON AIR'}, {n:2,id:'stories',name:'STORIES'}, {n:3,id:'longform',name:'LONG'},
              {n:4,id:'onthemic',name:'MIC'}, {n:5,id:'academy',name:'ACADEMY'}, {n:6,id:'partner',name:'PARTNER'} ];

/* ---------- chrome: nav, remote, feed, join dialog, footer ---------- */
function chrome(){
  const here = location.pathname.split('/').pop() || HOME;
  const links = [['Stories',HOME+'#stories'],['Long-form',HOME+'#longform'],["What's on",HOME+'#guide'],['Academy','/academy/'],['Community',HOME+'#community'],['Join the group','/join/'],['Deploy DB','/db/'],['Work with us','partner.html']];
  const nav = $('#nav');
  if (nav) nav.outerHTML = `<nav class="top" aria-label="Main"><div class="wrap">
    <a class="logo" href="${HOME}" aria-label="Deploy TLV, home">DEPLOY <b>TLV</b></a>
    <div class="navlinks">${links.map(([t,h])=>`<a href="${h}"${h===here?' aria-current="page"':''}>${t}</a>`).join('')}</div>
    <div class="nav-end"><span class="livebug"><i></i>LIVE TONIGHT</span><a class="btn o" href="${HOME}#subscribe">Subscribe</a>
      <button class="menubtn" aria-expanded="false" aria-controls="menu">Menu</button></div>
    <div class="menu" id="menu">${links.map(([t,h])=>`<a href="${h}">${t}</a>`).join('')}<a href="host.html">Myron, the host</a><a class="btn o" href="${HOME}#subscribe">Subscribe</a></div>
  </div></nav>`;
  const mb=$('.menubtn'), menu=$('#menu');
  if (mb) { mb.onclick=()=>{ const o=menu.classList.toggle('open'); mb.setAttribute('aria-expanded',o); mb.textContent=o?'Close':'Menu'; };
    $$('a',menu).forEach(a=>a.addEventListener('click',()=>{ menu.classList.remove('open'); mb.setAttribute('aria-expanded',false); mb.textContent='Menu'; })); }
  // the live bug only lights up on the day of a Deploy night
  if (D.guide.some(g => g.date && g.cat==='Deploy night' && dayDiff(g.date)===0)) document.body.classList.add('is-live');

  if (!document.body.dataset.noremote) {
    document.body.classList.add('has-remote');
    document.body.insertAdjacentHTML('afterbegin', `<canvas id="static" width="200" height="120" aria-hidden="true"></canvas><div id="osd" aria-hidden="true"></div>
     <div class="remote" role="navigation" aria-label="Channel remote"><span class="led" id="led"></span>
      ${CHS.map(c=>`<button data-ch="${c.n}" title="Channel ${c.n}: ${c.name.toLowerCase()}" aria-label="Channel ${c.n}: ${c.name.toLowerCase()}">${c.n}<small>${c.name}</small></button>`).join('')}
      <button class="snd" id="snd" aria-label="Sound off. Turn sound on"><i class="ic ic-snd-off" aria-hidden="true"></i></button><span class="brand">DEPLOY</span></div>`);
  }
  document.body.insertAdjacentHTML('beforeend', `<div id="feed" role="dialog" aria-modal="true" aria-label="Stories"><button class="x" aria-label="Close">✕</button><button class="snd2">Tap for sound</button><span class="hint">Swipe or press ↓ for the next one</span><div class="scroller"></div></div>
   <dialog class="clipdlg" id="clipdlg" aria-label="Video"><button class="x" aria-label="Close">✕</button><video controls playsinline></video></dialog>
   <dialog class="dlg" id="joindlg" aria-labelledby="jointitle"><div class="in"><button class="x" aria-label="Close">✕</button>
    <h2 id="jointitle">Join Deploy</h2><p>Get the Deploy Log: one email a week with the next Deploy night, Academy classes, coworking and the newest stories. It also gets you into Deploy DB.</p>
    <form class="fields" data-subscribe novalidate>
      <label class="field">Email<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@company.com"></label>
      <label class="field">First and last name <span class="opt">(optional)</span><input name="name" autocomplete="name" maxlength="120"></label>
      <label class="consent"><input type="checkbox" name="consent"> <span>${esc(D.newsletter.consent)}</span></label>
      <div class="acts"><button class="btn o" type="submit">Join the Deploy Log</button><a class="link" href="${L.whatsapp}">Or apply to the WhatsApp group →</a></div>
      <p class="formnote" role="status"></p>
      <p class="privacy">We'll email you a one-click link to confirm. No password. Unsubscribe from any email.</p>
    </form></div></dialog>`);
  const foot = $('#foot');
  if (foot) foot.outerHTML = `<footer class="ft"><div class="wrap">
    <div class="cols">
      <div class="about"><a class="logo" href="${HOME}">DEPLOY <b>TLV</b></a>The show about the people building tech in Tel Aviv. Founder stories, long-form, the orange mic at events, and the room where it all happens.</div>
      <div><h4>Watch</h4><ul><li><a href="${HOME}#stories">Stories</a></li><li><a href="${HOME}#longform">Long-form</a></li><li><a href="${HOME}#onthemic">On the mic</a></li></ul></div>
      <div><h4>Come along</h4><ul><li><a href="${HOME}#guide">What's on</a></li><li><a href="${HOME}#academy">Academy</a></li><li><a href="${HOME}#community">Community</a></li><li><a href="/db/">Deploy DB</a></li></ul></div>
      <div><h4>Work with us</h4><ul><li><a href="partner.html">Partner with Deploy</a></li><li><a href="kit.html">Media kit</a></li><li><a href="host.html">Book Myron</a></li></ul></div>
      <div><h4>Follow</h4><ul><li><a href="${L.instagram}" target="_blank" rel="noopener">Instagram ↗</a></li><li><a href="${L.youtube}" target="_blank" rel="noopener">YouTube ↗</a></li><li><a href="${L.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a></li><li><a href="${L.whatsapp}">WhatsApp group</a></li></ul></div>
    </div>
  </div>
  <div class="mega" aria-hidden="true">DEPLOY<b>TLV</b></div>
  <div class="wrap">
    <div class="fine"><span>Deploy TLV · made in Tel Aviv</span><span>Hosted by Myron Shneider</span><a href="mailto:${L.email}">${L.email}</a></div>
  </div></footer>`;
}

/* ---------- sound ---------- */
let soundOn = false, actx = null;   // browsers need a tap before sound, so every visit starts muted
function setSound(on){
  soundOn = on;
  $$('#snd').forEach(b=>{ b.innerHTML=on?'<i class="ic ic-snd-on" aria-hidden="true"></i>':'<i class="ic ic-snd-off" aria-hidden="true"></i>'; b.classList.toggle('on',on); b.setAttribute('aria-label', on?'Sound on. Turn sound off':'Sound off. Turn sound on'); });
  $$('.tvsnd').forEach(b=>{ b.innerHTML=on?'<i class="ic ic-snd-on" aria-hidden="true"></i><span class="t">SOUND ON</span>':'<i class="ic ic-snd-off" aria-hidden="true"></i><span class="t">SOUND OFF</span>'; b.setAttribute('aria-label', on?'Sound on':'Sound off'); b.classList.toggle('on',on); });
  $$('#feed .snd2').forEach(b=>{ b.textContent=on?'Sound on':'Tap for sound'; b.classList.toggle('on',on); });
  const led=$('#led'); if(led) led.classList.toggle('on',on);
  const tv=$('#tvvid'); if(tv) tv.muted = !on || tv.dataset.silent==='1';
  $$('#feed video').forEach(v=>v.muted=!on);
  if(!on) $$('.phone video').forEach(v=>{ v.muted=true; const p=v.closest('.phone'); p.classList.remove('loud'); const m=$('.mute',p); if(m) m.innerHTML='<i class="ic ic-snd-off" aria-hidden="true"></i> SOUND'; });
  if(on && !actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
}
function hiss(ms){ if(!soundOn||!actx) return; const n=actx.sampleRate*ms/1000, b=actx.createBuffer(1,n,actx.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*.16; const s=actx.createBufferSource(), g=actx.createGain(); g.gain.value=.5; s.buffer=b; s.connect(g).connect(actx.destination); s.start(); }

/* ---------- static ---------- */
function noise(cv, ms, cb){ if(!cv || RM) return cb&&cb(); const c=cv.getContext('2d'), w=cv.width, h=cv.height, img=c.createImageData(w,h), t0=performance.now(); cv.style.opacity=1;
  (function f(t){ for(let i=0;i<img.data.length;i+=4){ const v=Math.random()*255|0; img.data[i]=img.data[i+1]=img.data[i+2]=v; img.data[i+3]=255; }
    c.putImageData(img,0,0); if(t-t0<ms) requestAnimationFrame(f); else { cv.style.opacity=0; cb&&cb(); } })(t0); }

/* ---------- remote ---------- */
function tune(n){
  const c = CHS.find(x=>x.n===n), el = document.getElementById(c.id);
  if(!el){ location.href = n===6 ? 'partner.html' : HOME+'#'+c.id; return; }
  const osd=$('#osd'); hiss(300); osd.textContent='CH '+n+' · '+c.name; osd.style.opacity=1;
  noise($('#static'), 300);
  setTimeout(()=>window.scrollTo({top: el.getBoundingClientRect().top + scrollY - (el.matches('.hero,.phero')?0:66), behavior:'instant'}), 120);
  clearTimeout(tune.t); tune.t=setTimeout(()=>osd.style.opacity=0, 1400);
  if (window.DeployTV && n<=5) window.DeployTV(n-1);   // the TV follows the remote
}
function wireRemote(){
  $$('.remote [data-ch]').forEach(b=>b.addEventListener('click', ()=>tune(+b.dataset.ch)));
  $$('#snd').forEach(b=>b.onclick=()=>setSound(!soundOn));
  const so=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ const id=e.target.id; const c=CHS.find(x=>x.id===id); $$('.remote button[data-ch]').forEach(b=>b.classList.toggle('on', !!c && +b.dataset.ch===c.n)); } }),{threshold:.35});
  CHS.forEach(c=>{ const el=document.getElementById(c.id); if(el) so.observe(el); });
}

/* ---------- phones ---------- */
function phone(src, poster, opts={}){ src=rw(src); poster=rw(poster);
  const mute = opts.nomute ? '' : '<button class="mute" type="button" aria-label="Sound on for this video"><i class="ic ic-snd-off" aria-hidden="true"></i> SOUND</button>';
  return `<div class="phone"><div class="vid"><video data-src="${src}" poster="${poster}" muted loop playsinline${opts.label?` aria-label="${esc(opts.label)}"`:''}></video>${opts.inner||''}</div><span class="island"></span>${mute}</div>`; }
function wirePhones(root=document){
  const io=new IntersectionObserver(es=>es.forEach(e=>{ const v=e.target; if(e.isIntersecting){ if(!v.src) v.src=v.dataset.src; if(!RM) v.play().catch(()=>{}); } else v.pause(); }),{rootMargin:'150px'});
  $$('.phone video[data-src]', root).forEach(v=>{ if(!v.dataset.wired){ v.dataset.wired=1; io.observe(v); } });
  $$('.phone', root).forEach(p=>{ if(p.dataset.wired) return; p.dataset.wired=1; const v=$('video',p), m=$('.mute',p);
    if(m) m.addEventListener('click',e=>{ e.stopPropagation(); e.preventDefault(); if(!v.src) v.src=v.dataset.src;
      const on = v.muted; $$('.phone video').forEach(o=>{ if(o!==v){ o.muted=true; const op=o.closest('.phone'); op.classList.remove('loud'); const om=$('.mute',op); if(om) om.innerHTML='<i class="ic ic-snd-off" aria-hidden="true"></i> SOUND'; } });
      v.muted=!on; if(on) v.play().catch(()=>{}); p.classList.toggle('loud',on); m.innerHTML = on?'<i class="ic ic-snd-on" aria-hidden="true"></i> ON':'<i class="ic ic-snd-off" aria-hidden="true"></i> SOUND'; });
  });
}

/* ---------- full-screen stories feed (posted stories only) ---------- */
function openFeed(startId){
  const f=$('#feed'), sc=$('.scroller',f);
  sc.innerHTML = posted().map(s=>`<div class="item" data-id="${s.id}"><video src="${rw(`../clips/${s.id}.mp4`)}" poster="${rw(`../clips/${s.id}.jpg`)}" loop playsinline ${soundOn?'':'muted'}></video>
    <div class="meta"><div><span>${esc(s.views)} views</span><strong>${esc(s.name)}</strong><span>${esc(s.headline)}</span></div>
    <div class="acts"><a href="watch.html?s=${s.id}">Read the story →</a><a class="ghost" href="${s.ig}" target="_blank" rel="noopener">Instagram ↗</a></div></div></div>`).join('');
  f.classList.add('open'); document.documentElement.style.overflow='hidden';
  const items=$$('.item',sc), io=new IntersectionObserver(es=>es.forEach(e=>{ const v=$('video',e.target); if(e.isIntersecting){ v.currentTime=0; v.muted=!soundOn; v.play().catch(()=>{}); } else v.pause(); }),{root:sc,threshold:.6});
  items.forEach(i=>io.observe(i)); f._io=io;
  const start=items.find(i=>i.dataset.id===startId); if(start) sc.scrollTop=start.offsetTop;
  f._ret=document.activeElement; setTimeout(()=>$('.x',f).focus(),30);
}
function closeFeed(){ const f=$('#feed'); if(f._ret&&f._ret.focus) f._ret.focus(); f.classList.remove('open'); document.documentElement.style.overflow=''; f._io&&f._io.disconnect(); $('.scroller',f).innerHTML=''; }
function wireFeed(){ const f=$('#feed'); $('.x',f).onclick=closeFeed; $('.snd2',f).onclick=()=>{ setSound(!soundOn); const v=$$('#feed video').find(v=>!v.paused); if(v) v.muted=!soundOn; };
  document.addEventListener('keydown',e=>{ if(!f.classList.contains('open')) return;
    if(e.key==='Escape') closeFeed();
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); const sc=$('.scroller',f); sc.scrollBy({top:(e.key==='ArrowDown'?1:-1)*sc.clientHeight}); }
    if(e.key==='Tab'){ const fs=$$('button,a',f); const i=fs.indexOf(document.activeElement); if(e.shiftKey&&i<=0){ e.preventDefault(); fs[fs.length-1].focus(); } else if(!e.shiftKey&&i===fs.length-1){ e.preventDefault(); fs[0].focus(); } } });
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-feed]'); if(b){ e.preventDefault(); openFeed(b.dataset.feed); } }); }

/* ---------- signups: the Deploy Log (same list, consent and sign-in link as the Deploy DB) ---------- */
const okEmail = s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const NL = D.newsletter;
const LS = { get:k=>{try{return localStorage.getItem(k)}catch(e){return null}}, set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}, del:k=>{try{localStorage.removeItem(k)}catch(e){}} };
let sbClient = null;
function sb(){ if (!sbClient && window.supabase && NL && NL.url) sbClient = window.supabase.createClient(NL.url, NL.anonKey, { auth:{ storage:{getItem:LS.get,setItem:LS.set,removeItem:LS.del}, persistSession:true, detectSessionInUrl:true, flowType:'pkce' } }); return sbClient; }
// the consent travels with the person to their inbox (same key the Deploy DB reads)
const savePending = (email,name) => LS.set('ddb_pending', JSON.stringify({ email:email.toLowerCase(), name:name||'', text:NL.consent, at:Date.now() }));
function takePending(email){ let p=null; try{ p=JSON.parse(LS.get('ddb_pending')||'null'); }catch(e){} if(p && p.email===String(email||'').toLowerCase() && Date.now()-p.at<864e5){ LS.del('ddb_pending'); return p; } return null; }
function toast(msg){ let t=$('#dtoast'); if(!t){ t=document.createElement('div'); t.id='dtoast'; t.setAttribute('role','status'); document.body.appendChild(t); } t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),5200); }
async function finishSignup(){   // back from the email link: record the subscription, push it to Beehiiv
  const c=sb(); if(!c) return;
  const { data } = await c.auth.getSession(); const s=data && data.session; if(!s) return;
  const p=takePending(s.user.email); if(!p) return;
  const r=await c.rpc('subscribe',{ p_name:p.name||'', p_consent:true, p_consent_text:p.text||NL.consent });
  if (r.error) { toast('We couldn’t finish your signup. Try the form again.'); return; }
  try { await c.functions.invoke('beehiiv',{ body:{ action:'subscribe' } }); } catch(e) {}
  toast(`You’re on the ${NL.name}. The next one goes to ${s.user.email}.`);
}
function wireForms(){
  $$('form[data-subscribe]').forEach(form=>form.addEventListener('submit', async e=>{ e.preventDefault();
    const email=($('[type=email]',form).value||'').trim(), name=(($('[name=name]',form)||{}).value||'').trim(), consent=$('[name=consent]',form);
    const note=form.querySelector('.formnote')||form.parentElement.querySelector('.formnote'), btn=$('button[type=submit]',form)||$('button',form), label=btn.textContent;
    if(!okEmail(email)){ note.textContent='Enter a valid email address, like you@company.com.'; $('[type=email]',form).focus(); return; }
    if(consent && !consent.checked){ note.textContent='Tick the box so we can send you the Deploy Log.'; consent.focus(); return; }
    const c=sb(); if(!c){ note.innerHTML=`Signup isn’t available right now. Email <a class="link" href="mailto:${L.email}">${L.email}</a> and we’ll add you.`; return; }
    btn.disabled=true; btn.textContent='Sending…';
    savePending(email,name);
    const r=await c.auth.signInWithOtp({ email, options:{ shouldCreateUser:true, emailRedirectTo: location.origin+location.pathname } });
    btn.disabled=false; btn.textContent=label;
    if(r.error){ const m=(r.error.message||'').toLowerCase(); note.textContent = (r.error.status===429||m.includes('rate')) ? 'Too many emails sent. Wait a minute, then try again.' : `We couldn’t send the link: ${r.error.message}`; return; }
    form.querySelectorAll('input,button').forEach(el=>el.disabled=true);
    note.classList.add('ok'); note.textContent=`Check your inbox: we sent a one-click link to ${email}. Open it on this device to confirm.`; }));
  const dlg=$('#joindlg');
  $('.x',dlg).onclick=()=>dlg.close();
  dlg.addEventListener('click',e=>{ if(e.target===dlg) dlg.close(); });
  document.addEventListener('click',e=>{ if(e.target.closest('[data-join]')){ e.preventDefault(); dlg.showModal(); setTimeout(()=>$('input',dlg).focus(),30); } });
  finishSignup();
  const cd=$('#clipdlg'), cv=$('video',cd);
  const closeClip=()=>{ cv.pause(); cd.close(); };
  $('.x',cd).onclick=closeClip; cd.addEventListener('click',e=>{ if(e.target===cd) closeClip(); }); cd.addEventListener('close',()=>cv.pause());
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-clip]'); if(!b) return; e.preventDefault(); cv.src=b.dataset.clip; cv.poster=b.dataset.poster||''; cv.muted=false; cd.showModal(); cv.play().catch(()=>{}); });
}

/* ---------- doodles ---------- */
/* ---------- channel change between sections: a burst of static on each "up next" band ---------- */
function wireBumpers(){
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) return; const b=e.target; io.unobserve(b);
    b.classList.add('live'); noise($('canvas',b), 520); if(soundOn) hiss(180); }),{threshold:.9});
  $$('.bumper').forEach(b=>io.observe(b));
}
function wireDoodles(){ const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{threshold:.6}); $$('.doodle').forEach(d=>io.observe(d)); }

/* big numbers climb from 0 to their value when they scroll into view: 12K … 950K → 1.0M … 2M */
function wireCounts(){
  const els=$$('.stat .n, .reach .n, #nums .n'); if(!els.length || RM || !window.IntersectionObserver) return;
  const parse=t=>{ const m=String(t).trim().match(/^([\d.,]+)\s*([KkMm]?)(\+?)$/); if(!m) return null;
    return {to:parseFloat(m[1].replace(/,/g,''))*({k:1e3,m:1e6}[m[2].toLowerCase()]||1), plus:m[3]}; };
  const fmt=v=> v>=1e6 ? (v/1e6).toFixed(1)+'M' : v>=1e3 ? Math.floor(v/1e3)+'K' : String(Math.floor(v));
  const run=(el,i)=>{ const fin=el.dataset.final, p=parse(fin); if(!p) return;
    const dur=2000+Math.min(600,Math.log10(p.to+1)*90), t0=performance.now()+i*180;
    el.classList.add('counting'); el.textContent='0';
    const tick=now=>{ const k=Math.max(0,Math.min(1,(now-t0)/dur)), e=1-Math.pow(1-k,3);
      if(k<1){ el.textContent=fmt(p.to*e); requestAnimationFrame(tick); }
      else { el.textContent=fin; el.classList.remove('counting'); el.classList.add('landed'); } };
    requestAnimationFrame(tick); };
  els.forEach(el=>{ el.dataset.final=el.textContent; el.setAttribute('aria-label',el.textContent); el.textContent='0'; });
  const groups=new Map(); els.forEach(el=>{ const g=el.closest('.stats,.reach,#nums')||el; groups.set(g,[...(groups.get(g)||[]),el]); });
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ io.unobserve(e.target); groups.get(e.target).forEach(run); } }),{threshold:.5});
  groups.forEach((_,g)=>io.observe(g));
}

/* ---------- power-on (first visit, home only) ---------- */
function wirePower(){
  const p=$('#power'); if(!p) return;
  if(store.get('deploy-powered')==='1'){ p.remove(); return; }
  const done=(sound)=>{ store.set('deploy-powered','1'); if(sound){ setSound(true); hiss(400); } p.classList.add('off'); setTimeout(()=>p.remove(),RM?0:560); const tv=$('#tvvid'); if(tv&&(!RM||sound)) tv.play().catch(()=>{}); };
  $('.pw',p).onclick=()=>done(true); $('.quiet',p).onclick=()=>done(false);
  setTimeout(()=>$('.pw',p).focus(),50);
  document.addEventListener('keydown',function k(e){ if(e.key==='Escape' && document.body.contains(p)){ done(false); document.removeEventListener('keydown',k); } });
}

/* ---------- shared renderers ---------- */
const R = {
  guide: el => { el.innerHTML = upcoming().map(g=>{
      const r = g.date && rel(g.date);
      const when = g.recurring ? `${esc(g.recurring)}<small>${esc(g.sub)}</small>` : `${fmtDay(g.date)}<small>${esc(g.time)}</small>`;
      const badge = r ? `<span class="badge o">${r}</span>` : (g.badge ? `<span class="badge${/SEATS/.test(g.badge)?' o':''}">${esc(g.badge)}</span>` : '');
      return `<div class="row"><div class="when">${when}</div><span class="chip" style="background:var(--${g.color})">${esc(g.cat)}</span>
        <div class="prog"><h4>${esc(g.title)} ${badge}</h4><p>${esc(g.body)}</p>${g.video?`<button class="rowvid" type="button" data-clip="${rw(g.video)}" data-poster="${rw(g.poster||'')}"><span class="tri" aria-hidden="true"></span> See what it looks like</button>`:''}</div><a class="go${g.hot?' hot':''}" href="${href(g.href)}"${ext(g.href)?' target="_blank" rel="noopener"':''}>${esc(g.cta)} ${ext(g.href)?'↗':'→'}</a></div>`; }).join(''); },
  aired: el => { el.innerHTML = D.aired.map(a=>`<article class="cv" style="background:var(--${a.color})">${a.ig?'<span class="sticker tag">● AIRED</span>':'<span class="sticker tag new">FIRST TIME ONLINE</span>'}
      ${phone(a.clip, a.poster, {label:a.what})}
      <div><h3 class="who">${esc(a.who)}</h3><div class="what">${esc(a.what)}</div><div class="dt">${fmtDate(a.date)}</div>${a.ig?`<a class="lnk" href="${a.ig}" target="_blank" rel="noopener">Watch on Instagram ↗</a>`:'<span class="lnk" style="border:0">Tap SOUND to watch it here</span>'}</div></article>`).join(''); },
  nights: el => { el.innerHTML = [...D.nights].reverse().map(n=>{ const m=n.code.match(/(\d+)$/), num=m?+m[1]:'', st=/STARTUPS/.test(n.code);
      const name = st ? `Deploy for Startups #${num}` : `Deploy #${num}`;
      return `<div class="tk"><span class="no">#${num}</span><div><strong>${esc(name)}</strong><em>${esc(n.title)}</em><span>${fmtDate(n.date)}${n.applied?' · '+n.applied+' applied':''}</span></div></div>`; }).join(''); },
  logos: el => { el.innerHTML = (D.memberLogos||[]).map(l=>l.src?`<img src="${l.src}" alt="${esc(l.alt)}" loading="lazy">`:`<span class="co">${esc(l.name)}</span>`).join(''); },
  builds: el => { const t = D.builds.map(b=>esc(b)).join('<i>✺</i>'); el.innerHTML = `<div><span><b>WHAT THE ROOM IS BUILDING</b>${t}<i>✺</i></span><span><b>WHAT THE ROOM IS BUILDING</b>${t}<i>✺</i></span></div>`; }
};

window.Deploy = { rw, D, $, $$, esc, href, ext, phone, wirePhones, openFeed, setSound, hiss, noise, R, isSound:()=>soundOn, RM, HOME, posted, upcoming };

/* ---------- boot ---------- */
chrome();
document.addEventListener('DOMContentLoaded', ()=>{
  $$('[data-render]').forEach(el=>R[el.dataset.render] && R[el.dataset.render](el));
  if (window.DeployPage) window.DeployPage();
  wireRemote(); wirePhones(); wireFeed(); wireForms(); wireDoodles(); wireCounts(); wirePower(); wireBumpers(); setSound(soundOn);
});
})();

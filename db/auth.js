/* Deploy DB: subscribe-to-access funnel and data loading.
   Access = active Deploy Log subscription (public.subscribers). Needs window.DDB_CONFIG and supabase-js. */
(function(){
  var $=function(id){return document.getElementById(id);};
  var C=window.DDB_CONFIG||{};
  var VIEWS=["vSignin","vLogin","vCheck","vSub","vWait"];
  var timer=null,me=null,session=null,mode="signup";
  var CONSENT=($("consentText")&&$("consentText").textContent.trim())||"Yes, send me the Deploy Log weekly email.";

  function toast(t){var h=$("toastHost");h.textContent="";var d=document.createElement("div");d.className="toast";d.setAttribute("role","status");d.textContent=t;h.appendChild(d);setTimeout(function(){if(d.parentNode)d.remove();},3800);}
  function card(id){VIEWS.forEach(function(v){if($(v))$(v).hidden=v!==id;});}
  function showGate(view){$("gate").hidden=false;$("app").hidden=true;$("acct").hidden=true;$("navSignIn").hidden=false;$("navLogin").hidden=false;card(view||"vSignin");}
  function fail(msg){showGate("vSignin");toast(msg);}
  if(!window.supabase||!C.url||!C.anonKey){fail("Sign-in isn't configured yet. Add the Supabase URL and key to db/config.js.");return;}

  var storage={getItem:function(k){try{return localStorage.getItem(k);}catch(e){return null;}},setItem:function(k,v){try{localStorage.setItem(k,v);}catch(e){}},removeItem:function(k){try{localStorage.removeItem(k);}catch(e){}}};
  var sb=window.supabase.createClient(C.url,C.anonKey,{auth:{storage:storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"implicit"}});
  var here=location.origin+location.pathname;

  /* pending consent survives the trip to the inbox in this browser; on another browser they tick it on the "one step left" card */
  function savePending(email,name){storage.setItem("ddb_pending",JSON.stringify({email:email.toLowerCase(),name:name||"",text:CONSENT,at:Date.now()}));}
  function takePending(email){var p=null;try{p=JSON.parse(storage.getItem("ddb_pending")||"null");}catch(e){}storage.removeItem("ddb_pending");
    if(p&&p.email===String(email||"").toLowerCase()&&Date.now()-p.at<86400000)return p;return null;}

  /* ---------- landing: counts, teasers, subscriber count ---------- */
  sb.rpc("public_stats").then(function(r){
    if(r.error||!r.data)return;var by={},b=0;r.data.forEach(function(x){by[x.type]=x.n;b=x.builders;});
    var box=$("stats");box.textContent="";
    [[by.answer||0,"answers"],[by.resource||0,"tools"],[by.project||0,"projects"],[b||0,"builders"]].forEach(function(x){var d=document.createElement("div");var n=document.createElement("b");n.textContent=x[0];var s=document.createElement("span");s.textContent=x[1];d.appendChild(n);d.appendChild(s);box.appendChild(d);});
  });
  sb.rpc("public_teaser").then(function(r){
    if(r.error||!r.data)return;var M={answer:["tb","ANSWER"],resource:["tb r","TOOL"],win:["tb w","WIN"]};
    r.data.forEach(function(t){var m=M[t.type];if(!m)return;var d=document.createElement("div");d.className="tcard";var bd=document.createElement("span");bd.className=m[0];bd.textContent=m[1];var b=document.createElement("b");b.textContent=t.title;var lk=document.createElement("span");lk.className="lock";lk.textContent="🔒 SUBSCRIBERS";var p=document.createElement("p");p.textContent="Subscribe to read the full entry, the people behind it and the links.";d.appendChild(bd);d.appendChild(b);d.appendChild(lk);d.appendChild(p);$("teaser").appendChild(d);});
  });
  sb.rpc("subscriber_count").then(function(r){if(!r.error&&r.data>=25){$("joinCount").textContent="Join "+Number(r.data).toLocaleString()+" builders who get the Deploy Log.";$("joinCount").hidden=false;}});

  /* ---------- signed in ---------- */
  function initials(n){return n.split(/[\s@.]+/).filter(Boolean).map(function(p){return p[0];}).join("").slice(0,2).toUpperCase();}
  function mapRow(r){return {id:r.id,type:r.type,title:r.title,body:r.body||undefined,answer:r.answer||undefined,who:r.who||[],date:r.date,week:r.week,tags:r.tags||[],link:r.link||undefined,linkLabel:r.link_label||undefined,image:r.image||undefined,imageAlt:r.image_alt||undefined,status:r.status||undefined,time:r.time||undefined};}
  function signImages(rows){
    var withImg=rows.filter(function(r){return r.image&&!/^https:/.test(r.image);});
    if(!withImg.length)return Promise.resolve();
    var paths=withImg.map(function(r){return r.image.replace(/^img\//,"");});
    return sb.storage.from("entry-images").createSignedUrls(paths,3600).then(function(res){
      var map={};(res.data||[]).forEach(function(x){if(x.signedUrl)map[x.path]=x.signedUrl;});
      withImg.forEach(function(r){r.image=map[r.image.replace(/^img\//,"")]||undefined;});
    });
  }
  function bee(action){return sb.functions.invoke("beehiiv",{body:{action:action}}).then(function(r){return r.error?{error:r.error}:(r.data||{});}).catch(function(e){return {error:e};});}
  /* record consent locally, then add them to the Beehiiv list */
  function subscribe(name,text){return sb.rpc("subscribe",{p_name:name||"",p_consent:true,p_consent_text:text||CONSENT}).then(function(r){if(r.error)return r;return bee("subscribe").then(function(b){if(b.error)console.warn("Beehiiv sync will retry on next visit");return r;});});}

  function enter(s){
    session=s;card("vWait");$("waitText").textContent="Opening the Deploy DB…";
    bee("check").then(function(){return sb.rpc("is_member");}).then(function(r){
      if(r.error){fail("We couldn't check your subscription. Try again in a minute.");return;}
      if(r.data)return load(false);
      var p=takePending(s.user.email);
      if(p)return subscribe(p.name,p.text).then(function(x){if(x.error){showSub(s);toast("Subscribing didn't work. Try the button below.");return;}load(true);});
      showSub(s);
    });
  }
  function showSub(s){$("subEmail").textContent=s.user.email;showGate("vSub");}
  function load(isNew){
    /* entries_for_me() redacts hidden names on the server; the page never sees them */
    return Promise.all([sb.rpc("me"),sb.rpc("entries_for_me").limit(3000)]).then(function(res){
      var meR=res[0],entR=res[1];
      if(entR.error){fail("The database didn't load. Reload the page to try again.");return;}
      me=(meR.data&&meR.data[0])||{email:session.user.email};
      var rows=entR.data.map(mapRow);
      return signImages(rows).then(function(){
        window.DDB=rows;
        var nm=me.name||me.email;
        $("chipAva").textContent=initials(nm);$("chipName").textContent=me.name?me.name.split(" ")[0]:"Account";$("menuName").textContent=me.name||"Subscriber";$("menuEmail").textContent=me.email;
        $("menuSince").textContent=me.member_since?"SUBSCRIBER · SINCE "+new Date(me.member_since).toLocaleDateString("en-GB",{month:"short",year:"numeric"}).toUpperCase():"SUBSCRIBER";
        $("privacyState").textContent=me.hidden?"Hidden":"Visible";
        $("gate").hidden=true;$("app").hidden=false;$("acct").hidden=false;$("navSignIn").hidden=true;$("navLogin").hidden=true;
        window.DDB_BOOT&&window.DDB_BOOT();window.scrollTo(0,0);
        toast(isNew?"You're subscribed. Welcome to the Deploy DB.":"Welcome back"+(me.name?", "+me.name.split(" ")[0]:"")+".");
      });
    });
  }

  sb.auth.onAuthStateChange(function(ev,s){
    if(ev==="SIGNED_OUT"){showGate("vSignin");return;}
    if(s&&(ev==="SIGNED_IN"||ev==="INITIAL_SESSION")&&$("app").hidden)enter(s);
  });
  sb.auth.getSession().then(function(r){if(!r.data.session)showGate("vSignin");});
  /* an old or already-used link lands here with #error=…; point them at a fresh email */
  if(/[#&]error=/.test(location.hash)){history.replaceState(null,"",here);setTimeout(function(){toLogin();toast("That sign-in link expired or was already used. Enter your email for a new one.");},0);}

  /* ---------- subscribe form ---------- */
  function valid(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
  /* one email, two ways in: the link, or the 6-digit code typed on whichever device you're on */
  function sendLink(email,btn){
    var label=btn&&btn.textContent;
    if(btn){btn.disabled=true;btn.textContent="SENDING…";}
    return sb.auth.signInWithOtp({email:email,options:{shouldCreateUser:mode==="signup",emailRedirectTo:here}}).then(function(r){
      if(btn){btn.disabled=false;btn.textContent=label;}
      if(r.error){
        var m=(r.error.message||"").toLowerCase();
        if(r.error.status===429||m.indexOf("rate")>-1){toast("Too many emails sent. Wait a minute, then try again.");return;}
        if(mode==="login"&&(m.indexOf("signup")>-1||m.indexOf("not found")>-1||r.error.status===422)){toast("No subscription for that email yet. Get free access below.");toSignup(email);return;}
        toast("We couldn't send the email: "+r.error.message);return;
      }
      $("sentTo").textContent=email;$("code").value="";$("codeErr").hidden=true;card("vCheck");startResend();
    });
  }
  function toLogin(){mode="login";card("vLogin");$("loginEmail").value=$("loginEmail").value||$("email").value.trim();$("loginEmail").focus();}
  function toSignup(email){mode="signup";card("vSignin");if(email)$("email").value=email;$("email").focus();}
  $("toLogin").addEventListener("click",toLogin);
  $("toSignup").addEventListener("click",function(){toSignup();});
  $("loginForm").addEventListener("submit",function(e){e.preventDefault();var v=$("loginEmail").value.trim();
    if(!valid(v)){$("loginErr").hidden=false;$("loginEmail").setAttribute("aria-invalid","true");$("loginEmail").focus();return;}
    $("loginErr").hidden=true;$("loginEmail").removeAttribute("aria-invalid");mode="login";sendLink(v,$("loginBtn"));});
  $("codeForm").addEventListener("submit",function(e){e.preventDefault();
    var t=$("code").value.replace(/\D/g,"");
    if(t.length<6){$("codeErr").hidden=false;$("code").focus();return;}
    $("codeBtn").disabled=true;$("codeBtn").textContent="CHECKING…";
    sb.auth.verifyOtp({email:$("sentTo").textContent,token:t,type:"email"}).then(function(r){
      $("codeBtn").disabled=false;$("codeBtn").textContent="SIGN IN";
      if(r.error){$("codeErr").hidden=false;$("code").focus();return;}
      $("codeErr").hidden=true;/* onAuthStateChange(SIGNED_IN) opens the DB */
    });});
  $("code").addEventListener("input",function(){var v=this.value.replace(/\D/g,"");if(v!==this.value)this.value=v;if(v.length===6&&!$("codeBtn").disabled)$("codeForm").requestSubmit();});
  $("emailForm").addEventListener("submit",function(e){e.preventDefault();var v=$("email").value.trim();var ok=true;
    if(!valid(v)){$("emailErr").hidden=false;$("email").setAttribute("aria-invalid","true");ok=false;}else{$("emailErr").hidden=true;$("email").removeAttribute("aria-invalid");}
    if(!$("consent").checked){$("consentErr").hidden=false;ok=false;}else $("consentErr").hidden=true;
    if(!ok){(valid(v)?$("consent"):$("email")).focus();return;}
    mode="signup";savePending(v,$("name").value.trim());sendLink(v,$("sendLink"));});
  function startResend(){var n=30;clearInterval(timer);$("resend").disabled=true;$("resend").style.opacity=".5";$("resendIn").textContent="in 0:"+n;timer=setInterval(function(){n--;if(n<=0){clearInterval(timer);$("resend").disabled=false;$("resend").style.opacity="1";$("resendIn").textContent="";}else $("resendIn").textContent="in 0:"+String(n).padStart(2,"0");},1000);}
  $("resend").addEventListener("click",function(){sendLink($("sentTo").textContent,null).then(function(){toast("New email sent to "+$("sentTo").textContent+".");});});
  $("diffEmail").addEventListener("click",function(e){e.preventDefault();if(mode==="login")toLogin();else toSignup();});
  $("navSignIn").addEventListener("click",function(){showGate("vSignin");toSignup();});
  $("navLogin").addEventListener("click",function(){showGate("vLogin");toLogin();$("vLogin").scrollIntoView({block:"center"});});

  /* signed in but not subscribed */
  $("subForm").addEventListener("submit",function(e){e.preventDefault();
    if(!$("subConsent").checked){$("subConsentErr").hidden=false;$("subConsent").focus();return;}$("subConsentErr").hidden=true;
    $("subBtn").disabled=true;subscribe($("subName").value.trim(),CONSENT).then(function(r){$("subBtn").disabled=false;if(r.error){toast("That didn't work. Try again.");return;}load(true);});});
  $("subSignOut").addEventListener("click",function(){sb.auth.signOut();});

  /* OAuth (hidden until configured); consent is collected on the "one step left" card */
  function oauth(provider,label){card("vWait");$("waitText").textContent="Taking you to "+label+"…";sb.auth.signInWithOAuth({provider:provider,options:{redirectTo:here}}).then(function(r){if(r.error)fail(label+" sign-in isn't available right now. Use your email instead.");});}
  if(C.google){$("google").hidden=false;$("google").addEventListener("click",function(){oauth("google","Google");});}
  if(C.linkedin){$("linkedin").hidden=false;$("linkedin").addEventListener("click",function(){oauth("linkedin_oidc","LinkedIn");});}
  if(C.google||C.linkedin)$("orEmail").hidden=false;

  /* ---------- account menu ---------- */
  var unsubArmed=false;
  $("chip").addEventListener("click",function(e){e.stopPropagation();var o=$("menu").hidden;$("menu").hidden=!o;$("chip").setAttribute("aria-expanded",String(o));unsubArmed=false;$("unsubLabel").textContent="Unsubscribe";});
  document.addEventListener("click",function(){$("menu").hidden=true;$("chip").setAttribute("aria-expanded","false");});
  $("menu").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var a=b.dataset.act;
    if(a==="unsub"){e.stopPropagation();
      if(!unsubArmed){unsubArmed=true;$("unsubLabel").textContent="Click again: unsubscribe and lose access";return;}
      $("menu").hidden=true;bee("unsubscribe").then(function(b){return b.error?sb.rpc("unsubscribe"):{};}).then(function(r){if(r&&r.error){toast("That didn't go through. Try again.");return;}sb.auth.signOut().then(function(){toast("You're unsubscribed. Your access is closed. Subscribe again anytime.");});});return;}
    $("menu").hidden=true;
    if(a==="signout"){sb.auth.signOut().then(function(){toast("You're signed out.");});}
    else if(a==="profile"&&me&&me.name){window.DDB_PERSON&&window.DDB_PERSON(me.name);}
    else if(a==="profile"){toast("Add your name when you subscribe to get a builder profile.");}
    else if(a==="privacy"&&me&&me.name){var hide=!me.hidden;
      sb.rpc("set_my_visibility",{visible:!hide}).then(function(r){if(r.error){toast("That didn't save. Try again.");return;}
        me.hidden=hide;$("privacyState").textContent=hide?"Hidden":"Visible";
        toast(hide?"Your name is now hidden from other subscribers.":"Your name is visible again.");});}});
})();

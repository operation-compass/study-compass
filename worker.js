export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      const homeUrl = new URL("/home-v2.html", url.origin);
      const response = await env.ASSETS.fetch(new Request(homeUrl.toString(), request));
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    if (request.method === "GET" && url.pathname === "/study.html") {
      const legacyUrl = new URL("/legacy-study.html", url.origin);
      const response = await env.ASSETS.fetch(new Request(legacyUrl.toString(), request));
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      const clean = new Response(response.body, { status: response.status, statusText: response.statusText, headers });

      const mode = url.searchParams.get("mode") || "";
      const subject = url.searchParams.get("subject") || "";
      const safeMode = JSON.stringify(mode);
      const safeSubject = JSON.stringify(subject);

      return new HTMLRewriter()
        .on("html", {
          element(element) {
            element.setAttribute("data-study-v2-worker", "20261011-10");
            element.prepend('<link rel="stylesheet" href="/study-v2.css?v=20261011-13"><meta name="study-v2-worker" content="20261011-10">', { html:true });
            element.append(`
<a id="study-home-fab" href="/" aria-label="Study COMPASSホームへ戻る" style="position:fixed;right:12px;bottom:calc(82px + env(safe-area-inset-bottom));z-index:2147483647;display:flex;align-items:center;gap:6px;padding:10px 13px;border-radius:999px;text-decoration:none;background:linear-gradient(135deg,#1769ff,#31d7ff);color:#00101b;font:800 12px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;border:1px solid rgba(204,219,224,.62);box-shadow:0 0 22px rgba(0,168,255,.38),0 8px 24px rgba(0,0,0,.32)">⌂ ホーム</a>
<script>
(function(){
  const mode = ${safeMode};
  const subject = ${safeSubject};

  function enhance(){
    if(document.body){
      document.body.classList.add("study-v2-runtime");
      const quiz=!!document.querySelector(".quiz");
      const result=!!document.querySelector(".result");
      const selection=!!document.querySelector(".selection");
      document.body.classList.toggle("study-quiz-active",quiz);
      document.body.classList.toggle("study-result-active",result);
      document.body.classList.toggle("study-selection-active",selection);
      document.body.classList.toggle("study-flash-active",!!document.querySelector(".flash-study"));
      document.body.classList.toggle("study-question-only-active",!!document.querySelector(".question-only"));
      const navEl=document.getElementById("nav");
      const navHidden=!!(navEl && navEl.classList.contains("hidden"));
      document.body.classList.toggle("study-nav-hidden",navHidden);
      // Keep one visible Home control: bottom navigation when available,
      // floating return button only while the learning navigation is hidden.
      const homeFab=document.getElementById("study-home-fab");
      if(homeFab){
        homeFab.hidden=!navHidden;
        homeFab.style.display=navHidden?"flex":"none";
      }
    }
    document.documentElement.classList.add("study-v2-runtime-root");
    const navHome=document.querySelector("#nav>div button:first-child");
    if(navHome){
      navHome.setAttribute("onclick","location.href='/'");
      navHome.setAttribute("aria-label","Study COMPASSホームへ戻る");
    }

    document.querySelectorAll("button.text-button").forEach(btn=>{
      const txt=(btn.textContent||"").trim();
      if(txt==="ホームへ戻る"||txt==="← ホームへ戻る"){
        btn.textContent=txt.startsWith("←")?"← 学習トップへ戻る":"学習トップへ戻る";
      }
    });

    document.querySelectorAll(".subject-tile").forEach(el=>{
      const t=(el.textContent||"");
      const icon=el.querySelector(".subject-icon");
      if(!icon) return;
      let code="";
      if(t.includes("国語")) code="JPN";
      else if(t.includes("数学")) code="MAT";
      else if(t.includes("英語")) code="ENG";
      else if(t.includes("理科")) code="SCI";
      else if(t.includes("社会")) code="SOC";
      if(code && icon.textContent!==code) icon.textContent=code;

      const label=el.querySelector("b");
      const meta=el.querySelector("small");
      if(!label||!meta||meta.dataset.v2Split==="1") return;

      const subjectName=(label.textContent||"").trim();
      const subjectMap={
        "国語":["漢字・語句・文法"],
        "数学":["数式・関数・図形"],
        "英語":["英単語・文法"],
        "理科":["生物・化学・物理・地学"],
        "社会":["歴史・地理・公民"]
      };

      if(subjectMap[subjectName]){
        const raw=(meta.textContent||"").trim();
        const m=raw.match(/(\d[\d,]*)\s*問/);
        const count=m?m[1]+"問":"";
        meta.innerHTML='<span class="subject-desc">'+subjectMap[subjectName][0]+'</span>'+(count?'<span class="subject-count">'+count+'</span>':'');
        meta.dataset.v2Split="1";
      }else if(subjectName==="問題だけ10問"||subjectName==="今日の10問"||subjectName==="フラッシュカード20枚"){
        const raw=(meta.textContent||"").trim();
        if(raw.includes("。")){
          const parts=raw.split("。").map(x=>x.trim()).filter(Boolean);
          meta.innerHTML=parts.map(x=>'<span class="subject-desc">'+x+'</span>').join("");
        }else if(raw.includes("・")){
          const parts=raw.split("・").map(x=>x.trim()).filter(Boolean);
          meta.innerHTML=parts.map(x=>'<span class="subject-desc">'+x+'</span>').join("");
        }
        meta.dataset.v2Split="1";
      }
    });
  }

  function scheduleEnhance(){
    requestAnimationFrame(enhance);
  }

  if(typeof window.mount==="function" && !window.mount.__studyV2Wrapped){
    const originalMount=window.mount;
    const wrappedMount=function(html){
      const out=originalMount(html);
      scheduleEnhance();
      return out;
    };
    wrappedMount.__studyV2Wrapped=true;
    window.mount=wrappedMount;
  }
  enhance();

  function clickByLabel(labels){
    const els=Array.from(document.querySelectorAll("button,a,[role=button],[onclick],.subject-tile")).filter(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0;
    });
    for(const label of labels){
      const exact=els.find(el=>(el.textContent||"").trim()===label);
      if(exact){ exact.click(); return true; }
      const partial=els.filter(el=>(el.textContent||"").includes(label)).sort((a,b)=>(a.textContent||"").length-(b.textContent||"").length);
      if(partial[0]){ partial[0].click(); return true; }
    }
    return false;
  }

  function applyRoute(){
    try{
      if(mode==="qa" && typeof window.setStudyMode==="function"){ window.setStudyMode("mcq"); enhance(); return !!document.querySelector(".selection"); }
      if(mode==="flashcards" && typeof window.setStudyMode==="function"){ window.setStudyMode("flashcard"); enhance(); return true; }
      if(mode==="questions" && typeof window.setStudyMode==="function"){ window.setStudyMode("question"); enhance(); return true; }
      if(mode==="history" && typeof window.dashboard==="function"){ window.dashboard(); enhance(); return true; }
    }catch(e){}
    if(subject && clickByLabel([subject])){ enhance(); return true; }
    return !mode && !subject;
  }

  let n=0;
  let routeApplied=false;
  const timer=setInterval(()=>{
    n++;
    scheduleEnhance();
    if(!routeApplied) routeApplied=applyRoute();
    if(routeApplied){ clearInterval(timer); return; }
    if(n>60){
      clearInterval(timer);
      const view=document.getElementById("view");
      if(view && !document.getElementById("study-route-recovery")){
        const notice=document.createElement("div");
        notice.id="study-route-recovery";
        notice.setAttribute("role","status");
        notice.style.cssText="margin:12px;padding:16px;border:1px solid #31d7ff;border-radius:14px;background:#08203a;color:#f4f7fb;font-size:14px;line-height:1.7";
        notice.innerHTML='<b>学習ページの準備に時間がかかっています。</b><div>下のリンクから再読み込みしてください。</div><a href="/study.html?mode=qa" style="color:#72dfff;text-decoration:underline">一問一答を開き直す</a>　<a href="/" style="color:#72dfff;text-decoration:underline">ホームへ戻る</a>';
        view.prepend(notice);
      }
    }
  },200);
})();
</script>`, { html:true });
          }
        })
        .transform(clean);
    }

    return env.ASSETS.fetch(request);
  }
};
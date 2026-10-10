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
            element.setAttribute("data-study-v2-worker", "20261011-4");
            element.prepend('<link rel="stylesheet" href="/study-v2.css?v=20261011-4"><meta name="study-v2-worker" content="20261011-4">', { html:true });
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
    }
    document.documentElement.classList.add("study-v2-runtime-root");
    document.querySelectorAll(".subject-tile").forEach(el=>{
      const t=(el.textContent||"");
      const icon=el.querySelector(".subject-icon");
      if(!icon) return;
      if(t.includes("国語")) icon.textContent="JPN";
      else if(t.includes("数学")) icon.textContent="MAT";
      else if(t.includes("英語")) icon.textContent="ENG";
      else if(t.includes("理科")) icon.textContent="SCI";
      else if(t.includes("社会")) icon.textContent="SOC";
    });
  }

  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{subtree:true,childList:true});
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
      if(mode==="qa" && typeof window.setStudyMode==="function"){ window.setStudyMode("mcq"); enhance(); return true; }
      if(mode==="flashcards" && typeof window.setStudyMode==="function"){ window.setStudyMode("flashcard"); enhance(); return true; }
      if(mode==="questions" && typeof window.setStudyMode==="function"){ window.setStudyMode("question"); enhance(); return true; }
      if(mode==="history" && typeof window.dashboard==="function"){ window.dashboard(); enhance(); return true; }
    }catch(e){}
    if(subject && clickByLabel([subject])){ enhance(); return true; }
    return !mode && !subject;
  }

  let n=0;
  const timer=setInterval(()=>{
    n++;
    enhance();
    if(applyRoute()||n>30) clearInterval(timer);
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
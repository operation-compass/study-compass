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
        .on("body", {
          element(element) {
            element.append(`
<a id="study-home-fab" href="/" aria-label="Study COMPASSホームへ戻る" style="position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147483647;display:flex;align-items:center;gap:6px;padding:11px 14px;border-radius:999px;text-decoration:none;background:linear-gradient(135deg,#1769ff,#31d7ff);color:#00101b;font:800 13px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;border:1px solid rgba(204,219,224,.62);box-shadow:0 0 22px rgba(0,168,255,.38),0 8px 24px rgba(0,0,0,.32)">⌂ ホーム</a>
<script>
(function(){
  const mode = ${safeMode};
  const subject = ${safeSubject};
  const modeLabels = {
    qa: ["一問一答","4択","通常学習"],
    flashcards: ["フラッシュカード"],
    questions: ["問題だけ確認"],
    history: ["学習記録"]
  };
  function visible(el){
    const s=getComputedStyle(el);
    const r=el.getBoundingClientRect();
    return s.display!=="none" && s.visibility!=="hidden" && r.width>0 && r.height>0;
  }
  function candidates(){
    return Array.from(document.querySelectorAll("button,a,[role=button],[onclick],.card,.menu-item,.nav-item,.tab"));
  }
  function clickByLabel(labels){
    const els=candidates().filter(visible);
    let best=null;
    for(const label of labels){
      const exact=els.filter(el=>(el.textContent||"").trim()===label);
      if(exact.length){best=exact[0];break}
      const partial=els.filter(el=>(el.textContent||"").includes(label));
      if(partial.length){partial.sort((a,b)=>(a.textContent||"").length-(b.textContent||"").length);best=partial[0];break}
    }
    if(best){best.click();return true}
    return false;
  }
  function run(){
    if(subject && clickByLabel([subject])) return true;
    if(mode && modeLabels[mode] && clickByLabel(modeLabels[mode])) return true;
    return false;
  }
  let n=0;
  const timer=setInterval(()=>{n++; if(run()||n>24) clearInterval(timer)},250);
})();
</script>`, { html:true });
          }
        })
        .transform(clean);
    }

    return env.ASSETS.fetch(request);
  }
};
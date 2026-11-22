const PUBLIC_HEADER = "question_id,version,subject,grade,unit_major,unit_minor,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation,source_url";
const PUBLIC_URL = "https://docs.google.com/spreadsheets/d/1WFYJ-a5V1GBZzr99yglB4MUaW29z-qBze6cZ5m4cM8g/export?format=csv&gid=343531822";

// Read only the isolated publication tab. Never read MASTER or review sheets.
function parsePublicCsv(csv) {
  const rows = [], row = []; let cell = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') {
      if (cell) throw Error("Invalid CSV quote");
      quoted = true;
    } else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell); if (row.some(x => x !== "")) rows.push(row.slice());
      row.length = 0; cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed CSV quote");
  row.push(cell); if (row.some(x => x !== "")) rows.push(row);
  const header = PUBLIC_HEADER.split(",");
  if (!rows.length || rows[0].length !== header.length || rows[0].some((v,i) => (i === 0 ? v.replace(/^\uFEFF/, "") : v) !== header[i])) throw Error("Unexpected public schema");
  const ids = new Set();
  return rows.slice(1).map(cells => {
    if (cells.length !== header.length) throw Error("Bad public question row");
    const q = Object.fromEntries(header.map((key,i) => [key,cells[i]]));
    if (!q.question_id || ids.has(q.question_id) || !q.question_text || !q.subject || !q.grade || !q.unit_major || !q.unit_minor) throw Error("Bad public question");
    ids.add(q.question_id);
    const options = [q.choice_a,q.choice_b,q.choice_c,q.choice_d];
    const key = q.correct_answer.trim().toUpperCase();
    const at = ["A","B","C","D"].indexOf(key);
    const answer = at >= 0 ? options[at] : q.correct_answer;
    if (options.some(x=>!x || !x.trim()) || new Set(options.map(x=>x.trim())).size !== 4 || options.filter(x=>x.trim()===answer.trim()).length !== 1 || !q.source_url.trim() || !q.explanation.trim() || q.question_type !== "4択") throw Error("Bad public answer or missing audit fields");
    const socialUnit = q.subject === "社会" && q.unit_major === "歴史"
      ? (q.grade === "中1" ? "SC-SOC-G1-ANC" : q.grade === "中2" ? "SC-SOC-G2-MED" : q.grade === "中3" ? "SC-SOC-G3-MOD" : null)
      : null;
    if (q.subject === "社会" && q.unit_major === "歴史" && !socialUnit) throw Error("Unmapped published history grade");
    return { id:q.question_id, subject:q.subject, grade:q.grade,
      unit:q.unit_major === "歴史" ? "歴史・" + (q.grade === "中1" ? "古代" : q.grade === "中2" ? "中世" : "近現代") : q.unit_major,
      unit_id: socialUnit || undefined,
      field_name:q.unit_major, topic_name:q.unit_minor, q:q.question_text,
      answer, options, ex:q.explanation };
  });
}
async function addPublishedQuestions(html, maxQuestions = Infinity) {
  const marker = "const SOCIAL = ", from = html.indexOf(marker);
  if (from < 0) return html;
  const begin = from + marker.length, end = html.indexOf(";", begin);
  if (end < 0) return html;
  const existing = JSON.parse(html.slice(begin,end));
  if (!Array.isArray(existing)) return html;
  const upstream = await fetch(PUBLIC_URL, { signal: AbortSignal.timeout(3500) });
  if (!upstream.ok) return html;
  const csv = await upstream.text();
  if (csv.length > 1024 * 1024) return html;
  const incoming = parsePublicCsv(csv).slice(0, maxQuestions);
  if (!incoming.length) return html;
  const known = new Set(existing.map(x=>x.id));
  if (incoming.some(q=>known.has(q.id))) throw Error("Duplicate question ID");
  return html.slice(0,begin) + JSON.stringify([...existing,...incoming]).replace(/</g, "\\u003c").replace(/>/g, "\\u003e") + html.slice(end);
}


// Approved-only learning interface: no embedded legacy question bank is served publicly.
function approvedOnlyHtml(questions) {
  const json = JSON.stringify(questions).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHIRUNOERA｜一問一答</title><style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;color:#29232a;background:#faf8f4;--wine:#632b40;--ink:#29232a;--muted:#69636a;--line:#e0d6d0;--paper:#fffdfb;--blue:#294454;--accent:#bd9d88}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#faf8f4;color:var(--ink);line-height:1.65}a{color:var(--wine);text-decoration:none}
button{font:inherit;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #b78563;outline-offset:3px}
.site-header{background:#fffdfb;border-bottom:1px solid var(--line)}.header-inner{max-width:960px;margin:auto;padding:13px 20px;display:flex;justify-content:space-between;align-items:center;gap:20px}.brand{font-family:Georgia,"Times New Roman",serif;letter-spacing:.18em;font-size:23px;font-weight:600;color:var(--wine)}.home-link{font-size:13px;white-space:nowrap}
.hero-strip{background:linear-gradient(116deg,#331923,#662b40 62%,#314959);color:#fff6ef;min-height:120px;padding:22px 20px;position:relative;overflow:hidden;text-align:center}.hero-strip:before{content:"";position:absolute;right:-50px;top:-120px;width:350px;height:350px;border:1px solid #d9b9a653;border-radius:50%;box-shadow:0 0 0 38px #d9b9a612,0 0 0 90px #d9b9a60d}.hero-strip small{display:block;font:10px Georgia,serif;letter-spacing:.22em;color:#e9d1c8}.hero-strip h1{position:relative;font:italic 38px/1 Georgia,serif;margin:14px 0 0;letter-spacing:.025em;font-weight:400}
main{max-width:960px;margin:auto;padding:20px 20px 64px}.tag{font-size:11px;color:var(--wine);letter-spacing:.08em}.breadcrumb{color:var(--muted);font-size:13px;margin-bottom:13px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:25px;margin:20px 0;box-shadow:0 8px 30px rgba(58,33,39,.035)}h2{font-size:clamp(21px,3vw,29px);line-height:1.65}h3{margin:12px 0;font-size:18px}.muted{color:var(--muted)}
#selector button{background:#fff;border:1px solid var(--line);color:var(--wine);border-radius:7px;display:inline-block;margin:6px 7px 6px 0;padding:12px 19px;font-weight:600}
#selector button:hover{border-color:var(--wine);background:#fcf3f1}
#quiz{padding:0;overflow:hidden}.quiz-head{background:var(--wine);color:#fff7f3;display:flex;gap:15px;align-items:center;justify-content:space-between;padding:14px 22px}.quiz-head strong{font-size:20px;letter-spacing:.10em}.quiz-head small{font:11px Georgia,serif;letter-spacing:.14em;color:#eecdc6}
.quiz-inner{padding:22px 27px 27px}.quiz-nav{display:flex;justify-content:space-between;align-items:center;gap:14px}.quiz-nav button{font-size:12px;color:var(--wine);background:transparent;border:1px solid var(--line);padding:9px 13px;border-radius:7px}
#progress{font-size:13px;letter-spacing:.04em;text-align:right}.quiz-question-label{font:12px Georgia,serif;letter-spacing:.14em;color:var(--wine);margin-top:23px}
#question{font-weight:650;font-size:clamp(20px,2.8vw,26px);line-height:1.8;border-left:3px solid var(--wine);padding-left:18px;margin:12px 0 25px}
#choices{display:grid;grid-template-columns:1fr 1fr;gap:12px}#choices button{display:flex;align-items:center;gap:12px;text-align:left;background:#fffdfa;color:var(--ink);border:1px solid #cfbeb5;border-radius:8px;min-height:75px;padding:15px 18px;font-size:17px;margin:0;transition:background .15s,border-color .15s}#choices button:hover:not(:disabled){border-color:var(--wine);background:#fcf3f1}
#choices button:disabled{cursor:default;opacity:1}#choices button.ok{border:2px solid #53775d;background:#f0f6ee;color:#203c2b}#choices button.bad{border:2px solid #a95566;background:#fff0f1;color:#7a293b}
#answer{font-size:16px;line-height:1.8;white-space:pre-wrap;margin-top:22px;border:1px solid #d6c0b9;background:#fbf4f0;border-radius:9px;padding:20px}
#answer:empty{display:none}#answer strong{color:var(--wine)}
#next{display:block;width:100%;max-width:360px;margin:25px auto 4px;text-align:center;background:var(--wine);border:0;color:#fff;border-radius:7px;padding:16px 22px;font-weight:700;font-size:17px}
.video-card{margin-top:18px;border:1px solid var(--line);border-radius:9px;padding:19px 23px;background:#fffdfb}.video-card h3{font-size:17px;margin:0 0 5px;color:var(--wine)}.video-card p{font-size:12px;margin:0;color:var(--muted)}.video-placeholder{display:flex;gap:12px;align-items:center;margin-top:12px;border-radius:6px;background:#f1efed;padding:12px;color:#646b75;font-size:13px}.video-placeholder span:first-child{font-size:24px}
footer{padding:22px;text-align:center;color:#81737a;font-size:12px}[hidden]{display:none!important}
@media(max-width:620px){.header-inner{padding:11px 14px}.brand{font-size:18px;letter-spacing:.10em}.hero-strip{min-height:100px;padding:20px 12px}.hero-strip h1{font-size:29px}main{padding:12px 12px 48px}.card{padding:17px;margin:13px 0}.quiz-head{padding:11px 14px}.quiz-head strong{font-size:17px}.quiz-inner{padding:17px 15px 20px}#choices{grid-template-columns:1fr;gap:9px}#choices button{min-height:57px;padding:12px 13px;font-size:16px}#question{font-size:20px;margin-bottom:17px;padding-left:13px}.video-card{padding:16px}}
</style></head><body><header class="site-header"><div class="header-inner"><div class="brand">SHIRUNOERA</div><a href="/" class="home-link">ホームへ戻る ↗</a></div></header><div class="hero-strip"><small>SHIRUNOERA — THE LEARNING EDITION</small><h1>THE ART OF KNOWING.</h1></div>
  <main><div class="tag">監査済み・公開承認済みの問題のみ表示</div>
  <section id="selector" class="card"><h2>教科を選ぶ</h2><div id="subjects"></div><div id="units" hidden><h3 id="unit-title">単元を選ぶ</h3><div id="unit-buttons"></div></div><p id="empty" class="muted" hidden>現在、公開できる問題はありません。監査完了後に追加されます。</p></section>
  <section id="quiz" class="card" hidden><div class="quiz-head"><strong>一問一答</strong><small>QUICK STUDY</small></div><div class="quiz-inner"><div class="quiz-nav"><button id="back" type="button">← 教科・単元を選び直す</button><p id="progress" class="muted"></p></div><div class="quiz-question-label">QUESTION / 問題</div><h2 id="question"></h2><div id="choices"></div><div id="answer" role="status" aria-live="polite"></div><button id="next" hidden>次の問題へ</button></div></section><section id="unit-video" class="video-card" hidden><h3>▣ 単元別 解説動画　<small>EXPLANATION VIDEOS</small></h3><p id="video-unit"></p><div class="video-placeholder"><span>▷</span><span>解説動画は準備中です。公開後にこの単元の動画を表示します。</span></div></section>
  </main><footer>SHIRUNOERA｜公開品質を優先しています</footer>
  <script>const questions=${json};let selected=[],current=0,score=0;
  const el=id=>document.getElementById(id);
  function saveLearningAnswer(q,correct){
    try{
      const key="shirunoera.learning.v1";
      const data=JSON.parse(localStorage.getItem(key)||"{}");
      const answers=data&&data.schema===1&&data.answers&&typeof data.answers==="object"&&!Array.isArray(data.answers)?data.answers:{};
      const old=answers[q.id];
      answers[q.id]={subject:q.subject,major:q.field_name,minor:q.topic_name,correct,attempts:(Number.isSafeInteger(old?.attempts)&&old.attempts>0?old.attempts:0)+1,lastAnswered:new Date().toISOString()};
      localStorage.setItem(key,JSON.stringify({schema:1,answers}));
    }catch(e){/* storage unavailable: keep quiz usable without changing prior records */}
  }
  const subjectOrder=["社会","理科","英語","国語","数学"];
  const groups=[...new Set(questions.map(q=>q.subject))].sort((a,b)=>{const x=subjectOrder.indexOf(a),y=subjectOrder.indexOf(b);return (x<0?99:x)-(y<0?99:y)});
  function clear(node){node.replaceChildren()}
  function makeButton(label,callback){const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=callback;return b}
  function chooseSubject(subject){el("units").hidden=false;el("unit-title").textContent=subject+"｜単元を選ぶ";
    const container=el("unit-buttons");clear(container);
    const subset=questions.filter(q=>q.subject===subject);
    const units=[...new Set(subset.map(q=>q.topic_name||q.unit||"総合"))];
    container.appendChild(makeButton("すべての単元（"+subset.length+"問）",()=>begin(subset)));
    for(const unit of units){const list=subset.filter(q=>(q.topic_name||q.unit||"総合")===unit);container.appendChild(makeButton(unit+"（"+list.length+"問）",()=>begin(list)))}
  }
  function begin(items){selected=items;current=0;score=0;el("selector").hidden=true;el("quiz").hidden=false;show()}
  function show(){const q=selected[current];el("unit-video").hidden=false;el("video-unit").textContent=q.subject+" / "+q.field_name+" / "+q.topic_name;el("progress").textContent=(current+1)+" / "+selected.length+" 問　・　正解 "+score+" 問";el("question").textContent=q.q;
    clear(el("choices"));el("answer").textContent="";el("next").hidden=true;
    q.options.forEach((option,i)=>{const b=makeButton(String.fromCharCode(65+i)+". "+option,()=>{const correct=option===q.answer;if(correct)score++;saveLearningAnswer(q,correct);
      for(const c of el("choices").children){c.disabled=true;if(c.dataset.value===q.answer)c.classList.add("ok")}
      if(!correct)b.classList.add("bad");el("answer").textContent=(correct?"正解！":"不正解")+"　正解："+q.answer+(q.ex?"　"+q.ex:"");
      el("next").hidden=false;el("next").textContent=current===selected.length-1?"選択画面に戻る":"次の問題へ"});
      b.dataset.value=option;el("choices").appendChild(b)})}
  el("next").onclick=()=>{if(current===selected.length-1){el("back").click()}else{current++;show()}};
  el("back").onclick=()=>{el("quiz").hidden=true;el("unit-video").hidden=true;el("selector").hidden=false};
  if(!groups.length){el("empty").hidden=false}
  for(const subject of groups){const count=questions.filter(q=>q.subject===subject).length;el("subjects").appendChild(makeButton(subject+"（"+count+"問）",()=>chooseSubject(subject)))}
  const params=new URLSearchParams(location.search);
  const requested=params.get("subject");
  if(requested&&groups.includes(requested)){
    chooseSubject(requested);
    const major=params.get("major")||"all",minor=params.get("unit")||"all",count=params.get("count")||"10";
    const pool=questions.filter(q=>q.subject===requested&&(major==="all"||q.field_name===major)&&(minor==="all"||q.topic_name===minor));
    const limit=count==="all"?pool.length:Math.min(pool.length,["5","10","20"].includes(count)?Number(count):10);
    if(limit>0)begin(pool.slice(0,limit));
  }
  </script></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Review candidates are private to the release process, never public assets.
    // Block direct access to the old unreviewed embedded question bank.
    if (url.pathname === "/legacy-study.html") return new Response("Not found", {status:404,headers:{"Cache-Control":"no-store"}});
    if (request.method === "GET" && url.pathname === "/study.html") {
      try {
        const upstream=await fetch(PUBLIC_URL,{signal:AbortSignal.timeout(5000)});
        if(!upstream.ok)throw Error("Public data unavailable");
        const csv=await upstream.text();
        if(csv.length>1024*1024)throw Error("Public data too large");
        const approved=parsePublicCsv(csv);
        return new Response(approvedOnlyHtml(approved),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
      } catch (_) {
        return new Response("監査済み教材を読み込めません。公開を一時停止しています。",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
      }
    }
    if (url.pathname === "/data/staging" || url.pathname.startsWith("/data/staging/")) {
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    // Only the separately reviewed WEB QUESTIONS publication sheet is readable here.
    if (request.method === "GET" && url.pathname === "/api/questions.csv") {
      const urlCsv = "https://docs.google.com/spreadsheets/d/1WFYJ-a5V1GBZzr99yglB4MUaW29z-qBze6cZ5m4cM8g/export?format=csv&gid=343531822";
      try {
        const upstream = await fetch(urlCsv, { headers: { Accept: "text/csv" } });
        if (!upstream.ok) throw new Error("csv unavailable");
        const csv = await upstream.text();
        const header = "question_id,version,subject,grade,unit_major,unit_minor,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation,source_url";
        if (csv.replace(/^\uFEFF/, "").split(/\r?\n/)[0] !== header) throw new Error("schema mismatch");
        return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" } });
      } catch (_) {
        return new Response("Question feed unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }

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
      // Extend the existing question bank without altering its UI; on failure retain the legacy questions.
      let html = await response.text();
      // Roll out one verified public question on the ordinary learning route.
      // The opt-in preview can test all published questions before wider rollout.
      try {
        html = await addPublishedQuestions(html);
      } catch (_) { /* preserve the working legacy questions on malformed public data */ }
      // HTML length changes when approved questions are appended; stale asset headers must not be reused.
      headers.delete("Content-Length");
      headers.delete("Content-Encoding");
      headers.delete("ETag");
      const clean = new Response(html, { status: response.status, statusText: response.statusText, headers });

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

  function courseReady(expectedIndex){
    const buttons=Array.from(document.querySelectorAll(".selection .mode-switch button"));
    return buttons.length===3 && !!buttons[expectedIndex]?.classList.contains("active");
  }
  function activateMode(target,index){
    if(typeof window.setStudyMode!=="function")return false;
    if(!courseReady(index))window.setStudyMode(target);
    enhance();
    return courseReady(index);
  }
  function applyRoute(){
    try{
      let ready=false;
      if(mode==="qa")ready=activateMode("mcq",0);
      else if(mode==="flashcards")ready=activateMode("flashcard",2);
      else if(mode==="questions")ready=activateMode("question",1);
      else if(mode==="history" && typeof window.dashboard==="function"){
        if(!document.querySelector("#view .eyebrow") || !document.querySelector("#view .eyebrow")?.textContent?.includes("YOUR LEARNING MAP"))window.dashboard();
        enhance();
        ready=!!document.querySelector("#view .eyebrow")?.textContent?.includes("YOUR LEARNING MAP");
      }else if(subject)ready=clickByLabel([subject]);
      else ready=!mode;
      if(ready && document.body)document.body.setAttribute("data-study-route-ready",mode||"default");
      return ready;
    }catch(e){return false;}
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

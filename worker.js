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
    // Grade ranges are valid in the publication schema. Do not infer a period from a range.
    const history = q.subject === "社会" && q.unit_major === "歴史";
    const rangeGrade = q.grade === "中1〜中3";
    const period = rangeGrade ? (["古代","中世","近現代"].includes(q.unit_minor) ? q.unit_minor : null) : (q.grade === "中1" ? "古代" : q.grade === "中2" ? "中世" : q.grade === "中3" ? "近現代" : null);
    const socialUnit = history ? (period === "古代" ? "SC-SOC-G1-ANC" : period === "中世" ? "SC-SOC-G2-MED" : period === "近現代" ? "SC-SOC-G3-MOD" : null) : null;
    if (history && !socialUnit && !rangeGrade) throw Error("Unmapped published history grade");
    return { id:q.question_id, subject:q.subject, grade:q.grade,
      unit:q.unit_major === "歴史" ? (period ? "歴史・" + period : "歴史") : q.unit_major,
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



// Aggregate only allowlisted categories; no raw URLs, user IDs, IPs, or learning history.
const trafficSources = new Set(["instagram","tiktok","youtube","x","google","bing","yahoo","facebook","threads","chatgpt"]);
function trafficSource(request,url) {
  const ref=request.headers.get("referer")||"";
  let host="";
  try{const parsed=new URL(ref);if(parsed.origin===url.origin)return "internal";host=parsed.hostname.toLowerCase()}catch(_){}
  const source=(url.searchParams.get("utm_source")||"").toLowerCase();
  if(trafficSources.has(source))return source;
  const domains={instagram:["instagram.com"],tiktok:["tiktok.com"],youtube:["youtube.com","youtu.be"],x:["x.com","twitter.com","t.co"],google:["google.com","google.co.jp"],bing:["bing.com"],yahoo:["yahoo.co.jp","yahoo.com"],facebook:["facebook.com","fb.com"],threads:["threads.net","threads.com"],chatgpt:["chatgpt.com","chat.openai.com"]};
  for(const [name,list] of Object.entries(domains))if(list.some(d=>host===d||host.endsWith("."+d)))return name;
  return host?"other":"direct_or_unknown";
}
function recordTraffic(request,env,url,page){
  try{
    if(!env.TRAFFIC_ANALYTICS||request.method!=="GET"||request.headers.get("sec-gpc")==="1"||request.headers.get("dnt")==="1")return;
    if(["smoke","render","analytics_test"].some(k=>url.searchParams.has(k)))return;
    if(/prefetch|prerender/i.test((request.headers.get("purpose")||"")+" "+(request.headers.get("sec-purpose")||"")))return;
    if(/bot|crawler|spider|headless|curl|wget|facebookexternalhit|preview|slurp/i.test(request.headers.get("user-agent")||""))return;
    const mode=request.headers.get("sec-fetch-mode");
    if(mode&&mode!=="navigate")return;
    const dest=request.headers.get("sec-fetch-dest");
    if(dest&&dest!=="document")return;
    const subject=url.searchParams.get("subject")||"";
    const safeSubject=page==="quiz"&&["国語","数学","英語","理科","社会"].includes(subject)?subject:"none";
    const source=trafficSource(request,url);
    env.TRAFFIC_ANALYTICS.writeDataPoint({indexes:[page],blobs:[page,source,safeSubject],doubles:[1]});
  }catch(_){/* analytics must never interrupt learning */}
}

// Display-only snapshot of the 262 already public social questions; no private MASTER data.
// Original field_name/topic_name and question IDs remain unchanged for old links and history.
const SOCIAL_DISPLAY = {
  "SC-SOC-GEO-000015": [
    "世界と日本の姿",
    "地球儀と地図"
  ],
  "SC-SOC-GEO-000016": [
    "世界と日本の姿",
    "日本の位置と領域"
  ],
  "SC-SOC-GEO-000017": [
    "世界と日本の姿",
    "日本の位置と領域"
  ],
  "SC-SOC-GEO-000018": [
    "世界と日本の姿",
    "世界の姿"
  ],
  "SC-SOC-GEO-000019": [
    "世界と日本の姿",
    "地球儀と地図"
  ],
  "SC-SOC-GEO-000020": [
    "世界と日本の姿",
    "日本の位置と領域"
  ],
  "SC-SOC-HIS-000022": [
    "原始・古代",
    "飛鳥時代"
  ],
  "SC-SOC-HIS-000024": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "SC-SOC-HIS-000027": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000029": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000031": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000036": [
    "二つの世界大戦",
    "大正時代"
  ],
  "SC-SOC-GEO-000039": [
    "世界と日本の姿",
    "地球儀と地図"
  ],
  "SC-SOC-GEO-000041": [
    "日本の地域的特色",
    "自然環境"
  ],
  "SC-SOC-GEO-000042": [
    "世界と日本の姿",
    "日本の位置と領域"
  ],
  "SC-SOC-CIV-000045": [
    "民主政治",
    "地方自治"
  ],
  "SC-SOC-CIV-000048": [
    "国際社会",
    "国際連合"
  ],
  "SC-SOC-CIV-000049": [
    "国際社会",
    "国際連合"
  ],
  "SC-SOC-CIV-000050": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "SC-SOC-CIV-000051": [
    "経済と生活",
    "市場経済"
  ],
  "SC-SOC-CIV-000052": [
    "経済と生活",
    "市場経済"
  ],
  "SC-SOC-CIV-000053": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "SC-SOC-CIV-000054": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "SC-SOC-CIV-000055": [
    "国際社会",
    "国際連合"
  ],
  "SC-SOC-CIV-000057": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "SC-SOC-CIV-000059": [
    "国際社会",
    "国際連合"
  ],
  "SC-SOC-CIV-000061": [
    "国際社会",
    "国際社会の仕組み"
  ],
  "SC-SOC-CIV-000062": [
    "経済と生活",
    "市場経済"
  ],
  "SC-SOC-CIV-000063": [
    "経済と生活",
    "市場経済"
  ],
  "SC-SOC-GEO-000065": [
    "世界の気候と生活",
    "世界の気候"
  ],
  "SC-SOC-GEO-000066": [
    "世界の気候と生活",
    "世界の気候"
  ],
  "SC-SOC-HIS-000067": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000068": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000069": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000070": [
    "原始・古代",
    "縄文時代"
  ],
  "SC-SOC-HIS-000071": [
    "原始・古代",
    "縄文時代"
  ],
  "SC-SOC-HIS-000072": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000073": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000074": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000075": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000076": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000077": [
    "原始・古代",
    "飛鳥時代"
  ],
  "SC-SOC-HIS-000078": [
    "原始・古代",
    "飛鳥時代"
  ],
  "SC-SOC-HIS-000080": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-000081": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-000082": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000083": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000084": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000085": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000087": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000088": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000089": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000090": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000091": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000092": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000094": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000095": [
    "中世",
    "戦国時代"
  ],
  "SC-SOC-HIS-000096": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000097": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000098": [
    "中世",
    "戦国時代"
  ],
  "SC-SOC-HIS-000099": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000100": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000101": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000102": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000103": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000104": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000105": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000106": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000107": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000108": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000109": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000110": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000111": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000112": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000113": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000114": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000115": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000116": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000117": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000118": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000119": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000120": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000121": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000122": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000123": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000124": [
    "二つの世界大戦",
    "大正時代"
  ],
  "SC-SOC-HIS-000125": [
    "二つの世界大戦",
    "大正時代"
  ],
  "SC-SOC-HIS-000126": [
    "二つの世界大戦",
    "昭和戦前"
  ],
  "SC-SOC-HIS-000127": [
    "戦後・現代",
    "戦後の日本"
  ],
  "SC-SOC-HIS-000128": [
    "戦後・現代",
    "戦後の日本"
  ],
  "SC-SOC-HIS-000129": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000130": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "SC-SOC-HIS-000131": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "SC-SOC-HIS-000132": [
    "原始・古代",
    "飛鳥時代"
  ],
  "SC-SOC-HIS-000133": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "SC-SOC-HIS-000134": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-000135": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-000136": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000137": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000138": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000139": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000140": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000141": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000142": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000143": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000144": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000145": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000146": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000147": [
    "中世",
    "戦国時代"
  ],
  "SC-SOC-HIS-000148": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000149": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000152": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000153": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000154": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000155": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000156": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000157": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000158": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000159": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000160": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000161": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000162": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000163": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000164": [
    "二つの世界大戦",
    "大正時代"
  ],
  "SC-SOC-HIS-000165": [
    "二つの世界大戦",
    "大正時代"
  ],
  "SC-SOC-HIS-000166": [
    "二つの世界大戦",
    "昭和戦前・戦中"
  ],
  "SC-SOC-HIS-000167": [
    "戦後・現代",
    "戦後の日本"
  ],
  "SC-SOC-HIS-000168": [
    "戦後・現代",
    "高度経済成長"
  ],
  "SC-SOC-HIS-000169": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000170": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000171": [
    "原始・古代",
    "縄文時代"
  ],
  "SC-SOC-HIS-000172": [
    "原始・古代",
    "縄文時代"
  ],
  "SC-SOC-HIS-000173": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000174": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000175": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000176": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000177": [
    "原始・古代",
    "飛鳥時代"
  ],
  "SC-SOC-HIS-000178": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "SC-SOC-HIS-000179": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "SC-SOC-HIS-000180": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000181": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000182": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000183": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000184": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000185": [
    "中世",
    "戦国時代"
  ],
  "SC-SOC-HIS-000186": [
    "中世",
    "戦国時代"
  ],
  "SC-SOC-HIS-000188": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000189": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000190": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000192": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000194": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000196": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000197": [
    "二つの世界大戦",
    "大正時代"
  ],
  "SC-SOC-HIS-000198": [
    "二つの世界大戦",
    "昭和戦前"
  ],
  "SC-SOC-HIS-000199": [
    "二つの世界大戦",
    "昭和戦前"
  ],
  "SC-SOC-HIS-000200": [
    "二つの世界大戦",
    "昭和戦前・戦中"
  ],
  "SC-SOC-HIS-000201": [
    "二つの世界大戦",
    "昭和戦前・戦中"
  ],
  "SC-SOC-HIS-000202": [
    "戦後・現代",
    "戦後の日本"
  ],
  "SC-SOC-HIS-000203": [
    "戦後・現代",
    "高度経済成長"
  ],
  "SC-SOC-GEO-000204": [
    "世界の気候と生活",
    "世界の気候"
  ],
  "SC-SOC-GEO-000205": [
    "世界の気候と生活",
    "世界の気候"
  ],
  "SC-SOC-GEO-000206": [
    "日本の地域的特色",
    "自然環境"
  ],
  "SC-SOC-GEO-000207": [
    "日本の地域的特色",
    "人口・都市"
  ],
  "SC-SOC-GEO-000208": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-CIV-000209": [
    "民主政治",
    "国会"
  ],
  "SC-SOC-CIV-000210": [
    "民主政治",
    "裁判所"
  ],
  "SC-SOC-CIV-000211": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "SC-SOC-CIV-000212": [
    "経済と生活",
    "市場経済"
  ],
  "SC-SOC-CIV-000213": [
    "国際社会",
    "国際連合"
  ],
  "SC-SOC-HIS-000214": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000215": [
    "原始・古代",
    "縄文時代"
  ],
  "SC-SOC-HIS-000216": [
    "中世",
    "戦国時代"
  ],
  "SC-SOC-HIS-000217": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000218": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000220": [
    "原始・古代",
    "縄文時代"
  ],
  "SC-SOC-HIS-000221": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000223": [
    "原始・古代",
    "飛鳥時代"
  ],
  "SC-SOC-HIS-000224": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-000225": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-000226": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000227": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-000228": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-000230": [
    "近世",
    "安土桃山時代"
  ],
  "SC-SOC-HIS-000231": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000232": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000233": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000234": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000235": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000236": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000237": [
    "近代",
    "明治時代"
  ],
  "SC-SOC-HIS-000238": [
    "二つの世界大戦",
    "大正時代"
  ],
  "SC-SOC-HIS-000239": [
    "二つの世界大戦",
    "昭和戦前"
  ],
  "SC-SOC-HIS-000240": [
    "二つの世界大戦",
    "昭和戦前・戦中"
  ],
  "SC-SOC-HIS-000241": [
    "戦後・現代",
    "戦後の日本"
  ],
  "SC-SOC-HIS-000242": [
    "戦後・現代",
    "高度経済成長"
  ],
  "SC-SOC-GEO-000243": [
    "世界の気候と生活",
    "世界の気候"
  ],
  "SC-SOC-GEO-000244": [
    "世界と日本の姿",
    "地理の基礎"
  ],
  "SC-SOC-GEO-000245": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-GEO-000246": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-GEO-000247": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-GEO-000248": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-GEO-000249": [
    "日本の地域的特色",
    "自然環境"
  ],
  "SC-SOC-GEO-000250": [
    "日本の地域的特色",
    "自然環境"
  ],
  "SC-SOC-GEO-000251": [
    "世界の気候と生活",
    "世界の気候"
  ],
  "SC-SOC-GEO-000252": [
    "世界の諸地域",
    "人口と社会"
  ],
  "SC-SOC-CIV-000253": [
    "民主政治",
    "国会"
  ],
  "SC-SOC-CIV-000254": [
    "民主政治",
    "内閣"
  ],
  "SC-SOC-CIV-000255": [
    "民主政治",
    "地方自治"
  ],
  "SC-SOC-CIV-000256": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "SC-SOC-CIV-000257": [
    "経済と生活",
    "金融と経済"
  ],
  "SC-SOC-CIV-000258": [
    "経済と生活",
    "金融と経済"
  ],
  "SC-SOC-CIV-000259": [
    "国際社会",
    "国際連合"
  ],
  "SC-SOC-CIV-000260": [
    "持続可能な社会",
    "地球規模の課題"
  ],
  "SC-SOC-CIV-000261": [
    "経済と生活",
    "社会保障と労働"
  ],
  "SC-SOC-CIV-000262": [
    "民主政治",
    "裁判所"
  ],
  "SC-SOC-HIS-000263": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000264": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-GEO-000266": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-CIV-000267": [
    "経済と生活",
    "社会保障と労働"
  ],
  "SC-SOC-CIV-000268": [
    "民主政治",
    "地方自治"
  ],
  "SC-SOC-HIS-000272": [
    "原始・古代",
    "縄文時代"
  ],
  "SC-SOC-HIS-000274": [
    "原始・古代",
    "原始・古代のまとめ"
  ],
  "SC-SOC-HIS-000275": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000279": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000283": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000284": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000288": [
    "二つの世界大戦",
    "昭和戦前"
  ],
  "SC-SOC-HIS-000289": [
    "二つの世界大戦",
    "昭和戦前・戦中"
  ],
  "SC-SOC-HIS-000290": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000291": [
    "近代",
    "幕末・開国"
  ],
  "SC-SOC-HIS-000292": [
    "戦後・現代",
    "戦後の日本"
  ],
  "SC-SOC-HIS-000293": [
    "戦後・現代",
    "戦後の日本"
  ],
  "SC-SOC-GEO-000294": [
    "日本の地域的特色",
    "人口・都市"
  ],
  "SC-SOC-GEO-000295": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-GEO-000296": [
    "世界の諸地域",
    "世界の産業と貿易"
  ],
  "SC-SOC-GEO-000298": [
    "日本の地域的特色",
    "産業"
  ],
  "SC-SOC-CIV-000299": [
    "民主政治",
    "国会"
  ],
  "SC-SOC-CIV-000300": [
    "民主政治",
    "内閣"
  ],
  "SC-SOC-CIV-000301": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "SC-SOC-CIV-000302": [
    "経済と生活",
    "金融と経済"
  ],
  "SC-SOC-CIV-000303": [
    "経済と生活",
    "金融と経済"
  ],
  "SC-SOC-CIV-000304": [
    "国際社会",
    "国際協力"
  ],
  "SC-SOC-CIV-000305": [
    "国際社会",
    "国際協力"
  ],
  "SC-SOC-CIV-000306": [
    "民主政治",
    "地方自治"
  ],
  "SC-SOC-CIV-000307": [
    "経済と生活",
    "社会保障と労働"
  ],
  "SC-SOC-CIV-000308": [
    "民主政治",
    "裁判所"
  ],
  "SC-SOC-HIS-000309": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000310": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000314": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000315": [
    "原始・古代",
    "古墳時代"
  ],
  "SC-SOC-HIS-000319": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000320": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000321": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-000322": [
    "近世",
    "江戸時代"
  ],
  "SC-SOC-HIS-GAP10-000002": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-GAP10-000003": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "SC-SOC-HIS-GAP10-000006": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-GAP10-000008": [
    "中世",
    "鎌倉時代"
  ],
  "SC-SOC-HIS-GAP10-000010": [
    "中世",
    "室町時代"
  ],
  "SC-SOC-HIS-GAP10-000001": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-GAP10-000004": [
    "原始・古代",
    "奈良時代"
  ],
  "SC-SOC-HIS-GAP10-000005": [
    "原始・古代",
    "平安時代"
  ]
};
const SOCIAL_CHAPTER_ORDER = {"地理":["世界と日本の姿","世界の気候と生活","世界の諸地域","日本の地域的特色","日本の諸地域","地域調査"],"歴史":["原始・古代","中世","近世","近代","二つの世界大戦","戦後・現代"],"公民":["現代社会","日本国憲法と人権","民主政治","経済と生活","国際社会","持続可能な社会"]};
// Only explicitly verified published video URLs may be registered here. None verified yet.
const PUBLISHED_EXPLANATIONS = Object.freeze({});
// Exact explicit units only. Never infer broad periods, regions or concepts from keywords.
// ID-specific reviewed mapping always takes precedence; unknown items remain visible in the review bucket.
const SOCIAL_EXACT_UNIT = Object.freeze({
  "歴史 / 旧石器時代": [
    "原始・古代",
    "旧石器時代"
  ],
  "歴史 / 縄文時代": [
    "原始・古代",
    "縄文時代"
  ],
  "歴史 / 弥生時代": [
    "原始・古代",
    "弥生時代"
  ],
  "歴史 / 古墳時代": [
    "原始・古代",
    "古墳時代"
  ],
  "歴史 / 飛鳥時代": [
    "原始・古代",
    "飛鳥時代"
  ],
  "歴史 / 奈良時代": [
    "原始・古代",
    "奈良時代"
  ],
  "歴史 / 平安時代": [
    "原始・古代",
    "平安時代"
  ],
  "歴史 / 飛鳥〜奈良時代": [
    "原始・古代",
    "飛鳥〜奈良時代"
  ],
  "歴史 / 鎌倉時代": [
    "中世",
    "鎌倉時代"
  ],
  "歴史 / 室町時代": [
    "中世",
    "室町時代"
  ],
  "歴史 / 戦国時代": [
    "中世",
    "戦国時代"
  ],
  "歴史 / 安土桃山時代": [
    "近世",
    "安土桃山時代"
  ],
  "歴史 / 江戸時代": [
    "近世",
    "江戸時代"
  ],
  "歴史 / 幕末・開国": [
    "近代",
    "幕末・開国"
  ],
  "歴史 / 明治時代": [
    "近代",
    "明治時代"
  ],
  "歴史 / 大正時代": [
    "二つの世界大戦",
    "大正時代"
  ],
  "歴史 / 昭和戦前": [
    "二つの世界大戦",
    "昭和戦前"
  ],
  "歴史 / 昭和戦前・戦中": [
    "二つの世界大戦",
    "昭和戦前・戦中"
  ],
  "歴史 / 戦後の日本": [
    "戦後・現代",
    "戦後の日本"
  ],
  "歴史 / 高度経済成長": [
    "戦後・現代",
    "高度経済成長"
  ],
  "地理 / 北海道": [
    "日本の諸地域",
    "北海道"
  ],
  "地理 / 東北地方": [
    "日本の諸地域",
    "東北地方"
  ],
  "地理 / 関東地方": [
    "日本の諸地域",
    "関東地方"
  ],
  "地理 / 中部地方": [
    "日本の諸地域",
    "中部地方"
  ],
  "地理 / 近畿地方": [
    "日本の諸地域",
    "近畿地方"
  ],
  "地理 / 中国地方": [
    "日本の諸地域",
    "中国地方"
  ],
  "地理 / 四国地方": [
    "日本の諸地域",
    "四国地方"
  ],
  "地理 / 九州地方": [
    "日本の諸地域",
    "九州地方"
  ],
  "地理 / 沖縄地方": [
    "日本の諸地域",
    "沖縄地方"
  ],
  "地理 / アジア": [
    "世界の諸地域",
    "アジア"
  ],
  "地理 / ヨーロッパ": [
    "世界の諸地域",
    "ヨーロッパ"
  ],
  "地理 / アフリカ": [
    "世界の諸地域",
    "アフリカ"
  ],
  "地理 / 北アメリカ": [
    "世界の諸地域",
    "北アメリカ"
  ],
  "地理 / 南アメリカ": [
    "世界の諸地域",
    "南アメリカ"
  ],
  "地理 / オセアニア": [
    "世界の諸地域",
    "オセアニア"
  ],
  "公民 / 国会": [
    "民主政治",
    "国会"
  ],
  "公民 / 内閣": [
    "民主政治",
    "内閣"
  ],
  "公民 / 裁判所": [
    "民主政治",
    "裁判所"
  ],
  "公民 / 地方自治": [
    "民主政治",
    "地方自治"
  ],
  "公民 / 基本的人権": [
    "日本国憲法と人権",
    "基本的人権"
  ],
  "公民 / 市場経済": [
    "経済と生活",
    "市場経済"
  ],
  "公民 / 金融と経済": [
    "経済と生活",
    "金融と経済"
  ],
  "公民 / 国際連合": [
    "国際社会",
    "国際連合"
  ]
});
// Reviewed display corrections, limited to already published IDs.
const SOCIAL_DISPLAY_CORRECTIONS = Object.freeze({
  "SC-SOC-ORIGIN51-00009": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-ORIGIN51-00010": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-ORIGIN51-00011": [
    "原始・古代",
    "弥生時代"
  ],
  "SC-SOC-HIS-000325": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000326": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-GEO-000299": [
    "世界と日本の姿",
    "日本の位置と領域"
  ],
  "SHR-HS-HIS-20261126-004": [
    "原始・古代",
    "縄文時代"
  ],
  "SHR-HS-HIS-20261126-001": [
    "原始・古代",
    "旧石器時代"
  ],
  "SHR-HS-HIS-20261126-002": [
    "原始・古代",
    "旧石器時代"
  ],
  "SC-SOC-HIS-000352": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-GAP17-000008": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-GAP17-000009": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-GAP17-000010": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-HIS-GAP17-000012": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-GAP50-000018": [
    "原始・古代",
    "平安時代"
  ],
  "SC-SOC-GAP50-000022": [
    "原始・古代",
    "平安時代"
  ]
});
// Editorial learning priority, not measured past-exam frequency. Individual ratings remain subject to review. Older 3–5 star scale is normalized to 1–3; the reviewed Paleolithic/Jomon three-level scale is retained. No unreviewed ID or private audit data is included.
const PUBLIC_PRIORITY = Object.freeze({
  "SC-SOC-GEO-000015": 2,
  "SC-SOC-GEO-000016": 2,
  "SC-SOC-GEO-000017": 2,
  "SC-SOC-GEO-000018": 2,
  "SC-SOC-GEO-000019": 2,
  "SC-SOC-GEO-000020": 2,
  "SC-SOC-HIS-000022": 1,
  "SC-SOC-HIS-000024": 1,
  "SC-SOC-HIS-000027": 1,
  "SC-SOC-HIS-000029": 1,
  "SC-SOC-HIS-000031": 2,
  "SC-SOC-HIS-000036": 3,
  "SC-SOC-GEO-000039": 2,
  "SC-SOC-GEO-000041": 2,
  "SC-SOC-GEO-000042": 2,
  "SC-SOC-CIV-000045": 2,
  "SC-SOC-CIV-000048": 3,
  "SC-SOC-CIV-000049": 3,
  "SC-SOC-CIV-000050": 3,
  "SC-SOC-CIV-000051": 2,
  "SC-SOC-CIV-000052": 2,
  "SC-SOC-CIV-000053": 3,
  "SC-SOC-CIV-000054": 3,
  "SC-SOC-CIV-000055": 3,
  "SC-SOC-CIV-000057": 3,
  "SC-SOC-CIV-000059": 3,
  "SC-SOC-CIV-000061": 2,
  "SC-SOC-CIV-000062": 3,
  "SC-SOC-CIV-000063": 2,
  "SC-SOC-GEO-000065": 3,
  "SC-SOC-GEO-000066": 2,
  "SC-SOC-HIS-000067": 1,
  "SC-SOC-HIS-000068": 1,
  "SC-SOC-HIS-000069": 3,
  "SC-SOC-HIS-000070": 3,
  "SC-SOC-HIS-000071": 3,
  "SC-SOC-HIS-000072": 1,
  "SC-SOC-HIS-000073": 1,
  "SC-SOC-HIS-000074": 1,
  "SC-SOC-HIS-000075": 1,
  "SC-SOC-HIS-000076": 1,
  "SC-SOC-HIS-000077": 2,
  "SC-SOC-HIS-000078": 1,
  "SC-SOC-HIS-000080": 1,
  "SC-SOC-HIS-000081": 1,
  "SC-SOC-HIS-000082": 1,
  "SC-SOC-HIS-000083": 1,
  "SC-SOC-HIS-000084": 1,
  "SC-SOC-HIS-000085": 1,
  "SC-SOC-HIS-000087": 1,
  "SC-SOC-HIS-000088": 1,
  "SC-SOC-HIS-000089": 1,
  "SC-SOC-HIS-000090": 1,
  "SC-SOC-HIS-000091": 1,
  "SC-SOC-HIS-000092": 1,
  "SC-SOC-HIS-000094": 1,
  "SC-SOC-HIS-000095": 1,
  "SC-SOC-HIS-000096": 1,
  "SC-SOC-HIS-000097": 1,
  "SC-SOC-HIS-000098": 1,
  "SC-SOC-HIS-000099": 1,
  "SC-SOC-HIS-000100": 1,
  "SC-SOC-HIS-000101": 1,
  "SC-SOC-HIS-000102": 2,
  "SC-SOC-HIS-000103": 1,
  "SC-SOC-HIS-000104": 2,
  "SC-SOC-HIS-000105": 2,
  "SC-SOC-HIS-000106": 2,
  "SC-SOC-HIS-000107": 1,
  "SC-SOC-HIS-000108": 1,
  "SC-SOC-HIS-000109": 1,
  "SC-SOC-HIS-000110": 1,
  "SC-SOC-HIS-000111": 1,
  "SC-SOC-HIS-000112": 1,
  "SC-SOC-HIS-000113": 1,
  "SC-SOC-HIS-000114": 2,
  "SC-SOC-HIS-000115": 3,
  "SC-SOC-HIS-000116": 3,
  "SC-SOC-HIS-000117": 2,
  "SC-SOC-HIS-000118": 2,
  "SC-SOC-HIS-000119": 2,
  "SC-SOC-HIS-000120": 2,
  "SC-SOC-HIS-000121": 2,
  "SC-SOC-HIS-000122": 3,
  "SC-SOC-HIS-000123": 3,
  "SC-SOC-HIS-000124": 3,
  "SC-SOC-HIS-000125": 2,
  "SC-SOC-HIS-000126": 2,
  "SC-SOC-HIS-000127": 2,
  "SC-SOC-HIS-000128": 3,
  "SC-SOC-HIS-000129": 1,
  "SC-SOC-HIS-000130": 1,
  "SC-SOC-HIS-000131": 1,
  "SC-SOC-HIS-000132": 1,
  "SC-SOC-HIS-000133": 1,
  "SC-SOC-HIS-000134": 1,
  "SC-SOC-HIS-000135": 1,
  "SC-SOC-HIS-000136": 1,
  "SC-SOC-HIS-000137": 1,
  "SC-SOC-HIS-000138": 1,
  "SC-SOC-HIS-000139": 1,
  "SC-SOC-HIS-000140": 1,
  "SC-SOC-HIS-000141": 1,
  "SC-SOC-HIS-000142": 1,
  "SC-SOC-HIS-000143": 1,
  "SC-SOC-HIS-000144": 1,
  "SC-SOC-HIS-000145": 1,
  "SC-SOC-HIS-000146": 1,
  "SC-SOC-HIS-000147": 1,
  "SC-SOC-HIS-000148": 1,
  "SC-SOC-HIS-000149": 1,
  "SC-SOC-HIS-000152": 1,
  "SC-SOC-HIS-000153": 2,
  "SC-SOC-HIS-000154": 1,
  "SC-SOC-HIS-000155": 1,
  "SC-SOC-HIS-000156": 1,
  "SC-SOC-HIS-000157": 1,
  "SC-SOC-HIS-000158": 1,
  "SC-SOC-HIS-000159": 3,
  "SC-SOC-HIS-000160": 2,
  "SC-SOC-HIS-000161": 2,
  "SC-SOC-HIS-000162": 2,
  "SC-SOC-HIS-000163": 2,
  "SC-SOC-HIS-000164": 2,
  "SC-SOC-HIS-000165": 2,
  "SC-SOC-HIS-000166": 2,
  "SC-SOC-HIS-000167": 2,
  "SC-SOC-HIS-000168": 3,
  "SC-SOC-HIS-000169": 3,
  "SC-SOC-HIS-000170": 3,
  "SC-SOC-HIS-000171": 3,
  "SC-SOC-HIS-000172": 3,
  "SC-SOC-HIS-000173": 1,
  "SC-SOC-HIS-000174": 1,
  "SC-SOC-HIS-000175": 1,
  "SC-SOC-HIS-000176": 1,
  "SC-SOC-HIS-000177": 2,
  "SC-SOC-HIS-000178": 1,
  "SC-SOC-HIS-000179": 1,
  "SC-SOC-HIS-000180": 1,
  "SC-SOC-HIS-000181": 1,
  "SC-SOC-HIS-000182": 1,
  "SC-SOC-HIS-000183": 1,
  "SC-SOC-HIS-000184": 1,
  "SC-SOC-HIS-000185": 1,
  "SC-SOC-HIS-000186": 1,
  "SC-SOC-HIS-000188": 1,
  "SC-SOC-HIS-000189": 1,
  "SC-SOC-HIS-000190": 2,
  "SC-SOC-HIS-000192": 1,
  "SC-SOC-HIS-000194": 2,
  "SC-SOC-HIS-000196": 2,
  "SC-SOC-HIS-000197": 2,
  "SC-SOC-HIS-000198": 3,
  "SC-SOC-HIS-000199": 2,
  "SC-SOC-HIS-000200": 2,
  "SC-SOC-HIS-000201": 3,
  "SC-SOC-HIS-000202": 2,
  "SC-SOC-HIS-000203": 3,
  "SC-SOC-GEO-000204": 3,
  "SC-SOC-GEO-000205": 3,
  "SC-SOC-GEO-000206": 2,
  "SC-SOC-GEO-000207": 3,
  "SC-SOC-GEO-000208": 3,
  "SC-SOC-CIV-000209": 2,
  "SC-SOC-CIV-000210": 2,
  "SC-SOC-CIV-000211": 3,
  "SC-SOC-CIV-000212": 3,
  "SC-SOC-CIV-000213": 3,
  "SC-SOC-HIS-000214": 3,
  "SC-SOC-HIS-000215": 3,
  "SC-SOC-HIS-000216": 1,
  "SC-SOC-HIS-000217": 1,
  "SC-SOC-HIS-000218": 1,
  "SC-SOC-HIS-000220": 3,
  "SC-SOC-HIS-000221": 1,
  "SC-SOC-HIS-000223": 1,
  "SC-SOC-HIS-000224": 1,
  "SC-SOC-HIS-000225": 1,
  "SC-SOC-HIS-000226": 1,
  "SC-SOC-HIS-000227": 1,
  "SC-SOC-HIS-000228": 1,
  "SC-SOC-HIS-000230": 1,
  "SC-SOC-HIS-000231": 2,
  "SC-SOC-HIS-000232": 1,
  "SC-SOC-HIS-000233": 1,
  "SC-SOC-HIS-000234": 1,
  "SC-SOC-HIS-000235": 2,
  "SC-SOC-HIS-000236": 2,
  "SC-SOC-HIS-000237": 3,
  "SC-SOC-HIS-000238": 3,
  "SC-SOC-HIS-000239": 2,
  "SC-SOC-HIS-000240": 2,
  "SC-SOC-HIS-000241": 2,
  "SC-SOC-HIS-000242": 3,
  "SC-SOC-GEO-000243": 3,
  "SC-SOC-GEO-000244": 3,
  "SC-SOC-GEO-000245": 3,
  "SC-SOC-GEO-000246": 3,
  "SC-SOC-GEO-000247": 3,
  "SC-SOC-GEO-000248": 3,
  "SC-SOC-GEO-000249": 2,
  "SC-SOC-GEO-000250": 2,
  "SC-SOC-GEO-000251": 2,
  "SC-SOC-GEO-000252": 3,
  "SC-SOC-CIV-000253": 3,
  "SC-SOC-CIV-000254": 3,
  "SC-SOC-CIV-000255": 3,
  "SC-SOC-CIV-000256": 3,
  "SC-SOC-CIV-000257": 2,
  "SC-SOC-CIV-000258": 3,
  "SC-SOC-CIV-000259": 3,
  "SC-SOC-CIV-000260": 2,
  "SC-SOC-CIV-000261": 3,
  "SC-SOC-CIV-000262": 3,
  "SC-SOC-HIS-000263": 1,
  "SC-SOC-HIS-000264": 1,
  "SC-SOC-GEO-000266": 3,
  "SC-SOC-CIV-000267": 3,
  "SC-SOC-CIV-000268": 2,
  "SC-SOC-HIS-000272": 3,
  "SC-SOC-HIS-000274": 1,
  "SC-SOC-HIS-000275": 1,
  "SC-SOC-HIS-000279": 1,
  "SC-SOC-HIS-000283": 1,
  "SC-SOC-HIS-000284": 1,
  "SC-SOC-HIS-000288": 2,
  "SC-SOC-HIS-000289": 3,
  "SC-SOC-HIS-000290": 3,
  "SC-SOC-HIS-000291": 2,
  "SC-SOC-HIS-000292": 2,
  "SC-SOC-HIS-000293": 3,
  "SC-SOC-GEO-000294": 2,
  "SC-SOC-GEO-000295": 3,
  "SC-SOC-GEO-000296": 2,
  "SC-SOC-GEO-000298": 3,
  "SC-SOC-CIV-000299": 2,
  "SC-SOC-CIV-000300": 3,
  "SC-SOC-CIV-000301": 3,
  "SC-SOC-CIV-000302": 2,
  "SC-SOC-CIV-000303": 2,
  "SC-SOC-CIV-000304": 2,
  "SC-SOC-CIV-000305": 2,
  "SC-SOC-CIV-000306": 2,
  "SC-SOC-CIV-000307": 2,
  "SC-SOC-CIV-000308": 3,
  "SC-SOC-HIS-000309": 3,
  "SC-SOC-HIS-000310": 3,
  "SC-SOC-HIS-000314": 1,
  "SC-SOC-HIS-000315": 1,
  "SC-SOC-HIS-000319": 1,
  "SC-SOC-HIS-000320": 2,
  "SC-SOC-HIS-000321": 1,
  "SC-SOC-HIS-000322": 2,
  "SC-SOC-HIS-000325": 3,
  "SC-SOC-HIS-000326": 3,
  "SC-SOC-GEO-000299": 2,
  "SC-SOC-HIS-GAP10-000001": 1,
  "SC-SOC-HIS-GAP10-000002": 1,
  "SC-SOC-HIS-GAP10-000003": 1,
  "SC-SOC-HIS-GAP10-000004": 1,
  "SC-SOC-HIS-GAP10-000005": 1,
  "SC-SOC-HIS-GAP10-000006": 1,
  "SC-SOC-HIS-GAP10-000008": 1,
  "SC-SOC-HIS-GAP10-000010": 1,
  "SC-SOC-OLDSTONE52-00001": 2,
  "SC-SOC-OLDSTONE52-00002": 2,
  "SC-SOC-OLDSTONE52-00004": 2,
  "SC-SOC-OLDSTONE52-00005": 2,
  "SC-SOC-OLDSTONE52-00006": 2,
  "SC-SOC-OLDSTONE52-00007": 2,
  "SC-SOC-OLDSTONE52-00008": 2,
  "SC-SOC-OLDSTONE53-00001": 2,
  "SC-SOC-OLDSTONE53-00002": 2,
  "SC-SOC-OLDSTONE53-00003": 2,
  "SC-SOC-OLDSTONE53-00005": 2,
  "SC-SOC-OLDSTONE53-00006": 2,
  "SC-SOC-OLDSTONE53-00009": 2,
  "SC-SOC-JOMON54-00001": 2,
  "SC-SOC-JOMON54-00003": 2,
  "SC-SOC-JOMON54-00004": 2,
  "SC-SOC-JOMON54-00005": 2,
  "SC-SOC-JOMON54-00006": 2,
  "SC-SOC-JOMON54-00007": 2,
  "SC-SOC-JOMON54-00008": 2,
  "SC-SOC-JOMON54-00009": 2,
  "SC-SOC-JOMON54-00010": 2,
  "SC-SOC-JOMON54-00011": 2,
  "SHR-HS-HIS-20261126-004": 3,
  "SHR-HS-HIS-20261126-001": 3,
  "SHR-HS-HIS-20261126-PAL-002": 1,
  "SHR-HS-HIS-20261126-PAL-003": 1,
  "SHR-HS-HIS-20261126-PAL-004": 1,
  "SHR-HS-HIS-20261126-PAL-005": 1,
  "SHR-HS-HIS-20261126-003": 3,
  "SHR-HS-HIS-20261126-PAL-006": 1,
  "SHR-HS-HIS-20261126-PAL-007": 1,
  "SHR-HS-HIS-20261126-PAL-001": 1,
  "SHR-HS-HIS-20261126-002": 2
});
const ADDED_PUBLIC_PRIORITY = Object.freeze({"SC-SOC-HIS-000327":3,"SC-SOC-GAP50-000003":2,"SC-SOC-ORIGIN51-00008":3,"SHR-HS-HIS-20261127-JOM-001":2,"SHR-HS-HIS-20261127-JOM-002":1,"SHR-HS-HIS-20261127-JOM-003":1,"SHR-HS-HIS-20261127-JOM-004":2,"SC-SOC-HIS-GAP-STD-000003":3,"SC-SOC-GAP50-000002":3,"SC-SOC-ORIGIN51-00007":3,"SHR-HS-HIS-20261128-JOM-001":3,"SHR-HS-HIS-20261128-JOM-002":3,"SC-SOC-ORIGIN51-00009":3,"SC-SOC-ORIGIN51-00010":3,"SC-SOC-ORIGIN51-00011":3,"SC-SOC-YAYOI55-00001":2,"SC-SOC-YAYOI55-00004":2,"SC-SOC-YAYOI55-00005":2,"SC-SOC-YAYOI-DRAFT-20261011-004":3,"SC-SOC-YAYOI-DRAFT-20261011-011":3,"SC-SOC-YAYOI-DRAFT-20261011-013":3,"SC-SOC-YAYOI-BASE-20261011-002":3,"SC-SOC-YAYOI-BASE-20261011-003":3,"SC-SOC-YAYOI-BASE-20261011-007":2,"SC-SOC-YAYOI-DRAFT-20261011-001":3,"SC-SOC-YAYOI-DRAFT-20261011-022":3,"SC-SOC-YAYOI-DRAFT-20261011-025":2,"SC-SOC-YAYOI-DRAFT-20261011-026":2,"SC-SOC-YAYOI-BASE-20261011-001":3,"SC-SOC-YAYOI-BASE-20261011-006":2,"SC-SOC-YAYOI-DRAFT-20261011-017":1,"SC-SOC-YAYOI-DRAFT-20261011-018":2,"SC-SOC-YAYOI-DRAFT-20261011-012":3,"SC-SOC-YAYOI-APP-20261011-007":1,"SC-SOC-YAYOI-DRAFT-20261011-014":2,"SC-SOC-KOFUN-DRAFT-20261011-013":3,"SC-SOC-KOFUN-DRAFT-20261011-015":2,"SC-SOC-KOFUN-DRAFT-20261011-017":2,"SC-SOC-KOFUN-DRAFT-20261011-005":2,"SC-SOC-KOFUN-DRAFT-20261011-009":2,"SC-SOC-HIS-000339":3,"SC-SOC-HIS-000346":3,"SC-SOC-HIS-000347":3,"SC-SOC-HIS-000350":2,"SC-SOC-HIS-000352":3,"SC-SOC-HIS-LEVEL-000014":3,"SC-SOC-HIS-LEVEL-000015":3,"SC-SOC-HIS-LEVEL-000026":3,"SC-SOC-HIS-GAP-STD-000005":3,"SC-SOC-HIS-GAP17-000005":3,"SC-SOC-HIS-GAP17-000007":3,"SC-SOC-HIS-GAP17-000008":3,"SC-SOC-HIS-GAP17-000009":3,"SC-SOC-HIS-GAP17-000010":2,"SC-SOC-HIS-GAP17-000012":2,"SC-SOC-GAP50-000011":2,"SC-SOC-GAP50-000012":3,"SC-SOC-GAP50-000013":3,"SC-SOC-GAP50-000018":2,"SC-SOC-GAP50-000021":3,"SC-SOC-GAP50-000022":3,"SC-SOC-ORIGIN51-00014":3,"SC-SOC-ORIGIN51-00015":3,"SC-SOC-ORIGIN51-00016":2,"SC-SOC-ORIGIN51-00017":2,"SC-SOC-HIS-WEB26-000001":3,"SC-SOC-HIS-WEB26-000002":2,"SC-SOC-HIS-WEB26-000003":2,"SC-SOC-HIS-WEB26-000004":3,"SC-SOC-HIS-WEB26-000006":3,"SC-SOC-KOFUN-DRAFT-20261011-014":3,"SC-SOC-KOFUN-DRAFT-20261011-016":2,"SC-SOC-KOFUN-DRAFT-20261011-003":2,"SC-SOC-KOFUN-DRAFT-20261011-006":2,"SC-SOC-KOFUN-DRAFT-20261011-007":2,"SHR-HS-HIS-20261128-KOF-001":3,"SHR-HS-HIS-20261128-KOF-002":2,"SHR-HS-HIS-20261128-KOF-003":2,"SHR-HS-HIS-20261128-KOF-004":1,"SHR-HS-HIS-20261128-KOF-005":3,"SHR-HS-HIS-20261128-KOF-006":2,"SC-CAND-20261017-001":3,"SC-CAND-20261017-003":3,"SC-CAND-20261017-006":3,"SC-CAND-20261017-007":3,"SC-CAND-20261017-002":2,"SHR-HS-HIS-20261128-ASK-001":3,"SHR-HS-HIS-20261128-ASK-002":3,"SHR-HS-HIS-20261128-ASK-003":3,"SC-CAND-20261017-013":2,"SHR-HS-HIS-20261128-ASK-004":3,"SHR-HS-HIS-20261128-ASK-005":3,"SHR-HS-HIS-20261128-ASK-006":3,"SHR-HS-HIS-20261128-ASK-007":3,"SHR-HS-HIS-20261128-ASK-008":2,"SHR-HS-HIS-20261128-ASK-009":3,"SHR-HS-HIS-20261128-ASK-010":3,"SHR-HS-HIS-20261128-ASK-011":2,"SHR-HS-HIS-20261128-ASK-012":2,"SHR-HS-HIS-20261128-ASK-013":2,"SHR-HS-HIS-20261128-ASK-014":1,"SHR-HS-HIS-20261128-ASK-015":2,"SC-CAND-20261017-009":3,"SC-CAND-20261017-010":2,"SC-CAND-20261017-011":2,"SC-CAND-20261017-014":3,"SC-CAND-20261017-019":3,"SC-CAND-20261017-021":2,"SC-CAND-20261017-018":3,"SC-CAND-20261017-020":2,"SHR-HS-HIS-20261128-NAR-001":3,"SHR-HS-HIS-20261128-NAR-002":3,"SHR-HS-HIS-20261128-NAR-003":3,"SC-CAND-20261017-005":2,"SHR-HS-HIS-20261128-NAR-004":3,"SHR-HS-HIS-20261128-NAR-005":2,"SHR-HS-HIS-20261128-NAR-006":3,"SHR-HS-HIS-20261128-NAR-007":2,"SHR-HS-HIS-20261128-NAR-008":2,"SHR-HS-HIS-20261128-ASKNAR-001":2,"SHR-HS-HIS-20261128-ASKNAR-002":2,"SHR-HS-HIS-20261128-ASKNAR-003":3,"SHR-HS-HIS-20261128-ASKNAR-004":3,"SHR-HS-HIS-20261128-ASKNAR-005":2,"SHR-HS-HIS-20261128-ASKNAR-006":2,"SHR-HS-HIS-20261128-ASKNAR-007":1,"SHR-HS-HIS-20261128-ASKNAR-008":2,"SHR-HS-HIS-20261128-ASKNAR-009":2,"SHR-HS-HIS-20261128-ASKNAR-010":2,"SHR-HS-HIS-20261128-ASKNAR-011":2,"SHR-HS-HIS-20261128-ASKNAR-012":1,"SHR-HS-HIS-20261128-ASKNAR-013":1,"SHR-HS-HIS-20261128-ASKNAR-014":2,"SHR-HS-HIS-20261128-ASKNAR-015":2,"SHR-HS-HIS-20261128-ASKNAR-016":2,"SHR-HS-HIS-20261128-HEI-001":3,"SHR-HS-HIS-20261128-HEI-002":3,"SHR-HS-HIS-20261128-HEI-003":3,"SHR-HS-HIS-20261128-HEI-004":3,"SHR-HS-HIS-20261128-HEI-005":3,"SHR-HS-HIS-20261128-HEI-006":3,"SHR-HS-HIS-20261128-HEI-007":3,"SHR-HS-HIS-20261128-HEI-008":2,"SHR-HS-HIS-20261128-HEI-009":3,"SHR-HS-HIS-20261128-HEI-010":2,"SHR-HS-HIS-20261128-HEI-011":3,"SHR-HS-HIS-20261128-HEI-012":3});
const ANSWER_IMAGE_ID = "SC-SOC-OLDSTONE53-00005";
const ANSWER_IMAGE_PATH = "/media/learning/ice-age-sea-level.svg";
const ICE_AGE_DIAGRAM = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 460\" role=\"img\" aria-labelledby=\"title desc\">\n<title id=\"title\">氷期の海面低下と陸地の広がり</title><desc id=\"desc\">同じ地形を上下に比較。海面が低下すると浅い海底の一部が陸地として現れる。実際の地図や縮尺を表すものではない。</desc>\n<rect width=\"640\" height=\"460\" fill=\"#fffaf0\" rx=\"14\"/><g font-family=\"sans-serif\" fill=\"#302b29\">\n<text x=\"320\" y=\"30\" text-anchor=\"middle\" font-size=\"22\" font-weight=\"bold\">海面が下がると？</text>\n<text x=\"24\" y=\"64\" font-size=\"18\" font-weight=\"bold\">海面が高いとき</text>\n<rect x=\"24\" y=\"78\" width=\"592\" height=\"140\" rx=\"6\" fill=\"#e9f0f5\"/>\n<path d=\"M24 218V108H120L190 126 280 164 340 190 420 212 616 218Z\" fill=\"#b79665\"/>\n<path d=\"M190 126H616V218L420 212 340 190 280 164Z\" fill=\"#61a5c8\"/>\n<path d=\"M24 108H120L190 126 280 164 340 190 420 212 616 218\" stroke=\"#765735\" stroke-width=\"3\" fill=\"none\"/>\n<path d=\"M190 126H616\" stroke=\"#226c9b\" stroke-width=\"3\"/>\n<text x=\"75\" y=\"99\" font-size=\"17\" text-anchor=\"middle\">陸地</text><text x=\"501\" y=\"155\" font-size=\"17\" text-anchor=\"middle\">海</text>\n<text x=\"24\" y=\"258\" font-size=\"18\" font-weight=\"bold\">氷期：海面が低いとき</text>\n<rect x=\"24\" y=\"272\" width=\"592\" height=\"140\" rx=\"6\" fill=\"#e9f0f5\"/>\n<path d=\"M24 412V302H120L190 320 280 358 340 384 420 406 616 412Z\" fill=\"#b79665\"/>\n<path d=\"M340 384H616V412L420 406Z\" fill=\"#61a5c8\"/>\n<path d=\"M190 320L280 358 340 384V412H190Z\" fill=\"#e5bd64\"/>\n<path d=\"M24 302H120L190 320 280 358 340 384 420 406 616 412\" stroke=\"#765735\" stroke-width=\"3\" fill=\"none\"/>\n<path d=\"M190 320H616\" stroke=\"#527b98\" stroke-width=\"2\" stroke-dasharray=\"6 5\"/><path d=\"M340 384H616\" stroke=\"#226c9b\" stroke-width=\"3\"/>\n<path d=\"M470 327V376M461 367L470 376 479 367\" stroke=\"#226c9b\" stroke-width=\"3\" fill=\"none\"/>\n<text x=\"485\" y=\"350\" font-size=\"16\">海面低下</text><text x=\"245\" y=\"397\" font-size=\"16\" text-anchor=\"middle\">新たな陸地</text>\n<text x=\"320\" y=\"444\" text-anchor=\"middle\" font-size=\"15\" fill=\"#5b5350\">模式図（実際の地形・縮尺とは異なります）</text></g></svg>";
const CHIPPED_STONE_IMAGE_PATH = "/media/learning/chipped-stone-tool.svg";
const CHIPPED_STONE_DIAGRAM = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 460\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">打製石器の模式図</title><desc id=\"desc\">石を打ち欠いて形を整えた石器の一例。実物の写真ではない。</desc><rect width=\"640\" height=\"460\" fill=\"#fffdf9\"/><g stroke=\"#51483d\" stroke-width=\"2.5\" stroke-linejoin=\"round\"><path d=\"M322 40 L287 78 254 129 225 193 209 258 228 326 265 382 318 411 369 384 405 328 428 265 411 201 380 138 349 81 Z\" fill=\"#80776b\"/><path d=\"M322 40 287 78 254 129 279 153 321 127 349 81Z\" fill=\"#b6aa98\"/><path d=\"M322 40 349 81 380 138 355 169 321 127Z\" fill=\"#918575\"/><path d=\"M254 129 225 193 209 258 258 248 279 153Z\" fill=\"#9e9383\"/><path d=\"M279 153 321 127 355 169 332 225 258 248Z\" fill=\"#c3b7a5\"/><path d=\"M355 169 380 138 411 201 428 265 384 251 332 225Z\" fill=\"#6c665d\"/><path d=\"M209 258 228 326 265 382 286 326 258 248Z\" fill=\"#776d60\"/><path d=\"M258 248 332 225 384 251 349 312 286 326Z\" fill=\"#a79b88\"/><path d=\"M384 251 428 265 405 328 369 384 349 312Z\" fill=\"#948776\"/><path d=\"M286 326 349 312 369 384 318 411 265 382Z\" fill=\"#b0a38f\"/></g><g fill=\"none\" stroke=\"#e0d6c5\" stroke-width=\"2\" opacity=\".65\"><path d=\"M287 85Q302 98 307 120M239 193Q255 200 266 222M295 164Q304 179 315 188M363 185Q380 203 389 224M286 267Q308 274 329 291M239 287Q251 310 266 322M365 331Q378 345 379 360M291 353Q307 369 318 386\"/></g><g font-family=\"sans-serif\" fill=\"#403b35\"><text x=\"320\" y=\"440\" font-size=\"16\" text-anchor=\"middle\">打製石器の一例（模式図・実物写真ではありません）</text></g></svg>";
function answerImage(q){if(q.id==="SC-SOC-HIS-000170")return {answer_image_url:"/assets/learning/chipped-stone-tool.webp",answer_image_alt:"石を打ち欠いて形を整えた打製石器の一例。AI生成の参考イメージで、実物写真ではありません。",answer_image_caption:"SHIRUNOERA 作成・AI生成参考イメージ（実物写真ではありません）",answer_image_width:800,answer_image_height:600};return q.id===ANSWER_IMAGE_ID?{answer_image_url:ANSWER_IMAGE_PATH,answer_image_alt:"同じ地形で海面が低下すると浅い海底の一部が陸地になる模式図"}:{};}
function questionPriority(q){return Object.hasOwn(ADDED_PUBLIC_PRIORITY,q.id)?ADDED_PUBLIC_PRIORITY[q.id]:Object.hasOwn(PUBLIC_PRIORITY,q.id)?PUBLIC_PRIORITY[q.id]:null;}
function socialDisplay(q){
  if(q.subject!=="社会")return {};
  const key=q.field_name+" / "+q.topic_name;
  const item=Object.hasOwn(SOCIAL_DISPLAY_CORRECTIONS,q.id)?SOCIAL_DISPLAY_CORRECTIONS[q.id]:(Object.hasOwn(SOCIAL_DISPLAY,q.id)?SOCIAL_DISPLAY[q.id]:(Object.hasOwn(SOCIAL_EXACT_UNIT,key)?SOCIAL_EXACT_UNIT[key]:null));
  return {display_chapter:item?.[0]||"その他（分類確認中）",display_section:item?.[1]||""};
}
function publishedExplanation(q){
  if(q.subject!=="社会"||!Object.hasOwn(PUBLISHED_EXPLANATIONS,q.id))return {};
  try{const u=new URL(PUBLISHED_EXPLANATIONS[q.id]);if(u.protocol==="https:"&&["www.youtube.com","youtube.com","youtu.be"].includes(u.hostname))return {video_url:u.href}}catch(_){}
  return {};
}
// Approved-only learning interface: no embedded legacy question bank is served publicly.
function approvedOnlyHtml(questions) {
  const json = JSON.stringify(questions.map(q=>({...q,...socialDisplay(q),...publishedExplanation(q),...answerImage(q),priority:questionPriority(q)}))).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHIRUNOERA｜一問一答</title><meta name="robots" content="noindex,follow"><style>
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
.results-card{border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:28px;margin:20px 0;text-align:center}
.results-card h2{font-size:27px;margin:5px 0}.results-eyebrow{font:12px Georgia,serif;color:var(--wine);letter-spacing:.15em}.result-score{font:italic 48px Georgia,serif;color:var(--wine);margin:18px 0 8px}.results-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:24px}
.results-actions button,.results-actions a{min-height:45px;border-radius:7px;padding:11px 17px;font-size:15px;font-weight:700;text-decoration:none;background:#fff;border:1px solid var(--wine);color:var(--wine)}.results-actions .primary{background:var(--wine);color:#fff}
.results-card .summary-note{color:var(--muted);font-size:13px}
.video-card{margin-top:18px;border:1px solid var(--line);border-radius:9px;padding:19px 23px;background:#fffdfb}.video-card h3{font-size:17px;margin:0 0 5px;color:var(--wine)}.video-card p{font-size:12px;margin:0;color:var(--muted)}.video-placeholder{display:flex;gap:12px;align-items:center;margin-top:12px;border-radius:6px;background:#f1efed;padding:12px;color:#646b75;font-size:13px}.video-placeholder span:first-child{font-size:24px}
footer{padding:22px;text-align:center;color:#81737a;font-size:12px}[hidden]{display:none!important}
@media(max-width:620px){.header-inner{padding:11px 14px}.brand{font-size:18px;letter-spacing:.10em}.hero-strip{min-height:100px;padding:20px 12px}.hero-strip h1{font-size:29px}main{padding:12px 12px 48px}.card{padding:17px;margin:13px 0}.quiz-head{padding:11px 14px}.quiz-head strong{font-size:17px}.quiz-inner{padding:17px 15px 20px}#choices{grid-template-columns:1fr;gap:9px}#choices button{min-height:57px;padding:12px 13px;font-size:16px}#question{font-size:20px;margin-bottom:17px;padding-left:13px}.video-card{padding:16px}}

/* Editorial quiz palette — keep questions and answer feedback legible. */
:root{--wine:#622b45;--ink:#352b2f;--muted:#66525a;--line:#cfb9ae;--paper:#fbf3e8;--accent:#b59162;--serif:"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP",Georgia,serif}
body{background:radial-gradient(ellipse at 94% 6%,#dce5d6 0,transparent 35%),linear-gradient(125deg,#ead3d4,#f2e5d5 50%,#e3d4c3)}
.site-header{background:linear-gradient(105deg,#e3bcc6,#edd3ca 52%,#e9d4b4);border-top:4px solid var(--wine);border-bottom-color:var(--line)}
.header-inner{min-height:64px}.brand{color:#472335;font-weight:500}.home-link{color:#622b45;font-weight:600}
.hero-strip{background:linear-gradient(120deg,#e9cbd0,#eddcbf 75%,#d9e2d2);color:#472335;min-height:0;padding:23px 20px 25px;border-bottom:1px solid var(--line)}
.hero-strip::before{display:none}.hero-strip small{color:#66525a}.hero-strip h1{font:600 clamp(24px,3.5vw,35px)/1.4 var(--serif);letter-spacing:.06em;margin:5px 0 0}
.tag{font-size:11px;color:#66525a}
.card,.results-card,.video-card{background:linear-gradient(145deg,#fbf3e8,#f2e4d5);border-color:var(--line);border-radius:4px;box-shadow:0 7px 24px #68423313}
#selector h2,.results-card h2{font-family:var(--serif);color:#472335}
#selector button{background:linear-gradient(145deg,#f9ebdd,#e9d4da);border-color:#c6aea8;border-radius:4px;color:var(--wine);min-height:46px}
#selector button:hover{background:#e8cbd4}#selector button[aria-pressed="true"]{background:var(--wine);color:#fff}#selector button:disabled{opacity:.5;cursor:default}.social-range{margin-top:12px}.social-range label{display:flex;align-items:center;gap:10px;padding:11px 8px;border-bottom:1px solid var(--line);cursor:pointer}.social-range input{width:19px;height:19px;accent-color:var(--wine)}.social-chapter details{margin:0 0 12px 26px}.social-chapter summary{cursor:pointer;padding:9px 0;color:var(--wine)}.social-chapter details label{font-size:14px;font-weight:normal}
.quiz-head{background:linear-gradient(105deg,#622b45,#88465f);color:#fff6eb}.quiz-head small{color:#f4e2d4}
.quiz-nav button{border-color:#c6aea8;background:#f8e9de;color:var(--wine);min-height:44px}
#progress{color:var(--muted);font-variant-numeric:tabular-nums}
.quiz-question-label{font:600 12px/1.5 system-ui,sans-serif;letter-spacing:.08em}
#question{border-left-color:#a77a88;color:var(--ink);overflow-wrap:anywhere}
#choices button{background:#fff7ed;border-color:#c6aea8;border-radius:5px;color:var(--ink);overflow-wrap:anywhere}
#choices button:hover:not(:disabled){background:#f3e0e3;border-color:var(--wine)}
#choices button.ok{background:#e1eddf;border-color:#52775f;color:#203c2b}
#choices button.bad{background:#f6dce1;border-color:#a95566;color:#7a293b}
#answer{background:linear-gradient(145deg,#f4e4dc,#f6ead9);border-color:#c6aea8;border-radius:5px;overflow-wrap:anywhere}
#next,.results-actions .primary{background:linear-gradient(110deg,#622b45,#88465f);color:#fff6eb;border-radius:4px}
.results-actions button{background:#faebdf;border-color:var(--wine);border-radius:4px}
.result-score{font:500 clamp(36px,5vw,48px)/1.25 Georgia,serif;color:var(--wine);font-variant-numeric:tabular-nums}
.results-eyebrow{font:600 12px/1.5 system-ui,sans-serif}
.video-card h3{color:var(--wine)}.video-placeholder{background:#e3e6d9;color:#42584b}
footer{color:#573849}
@media(max-width:620px){.header-inner{min-height:55px;gap:10px}.home-link{font-size:12px}.hero-strip{padding:13px 12px 15px}.hero-strip h1{font-size:23px}.hero-strip small{font-size:10px}.quiz-nav{align-items:flex-start;gap:8px}.quiz-nav button{font-size:11px;padding:8px 9px}.quiz-inner{padding:15px 14px 20px}#question{font-size:20px}#choices button{min-height:57px}#progress{font-size:12px}}
@media(prefers-reduced-motion:reduce){#choices button{transition:none}}
.answer-figure{margin:14px 0 0}.answer-figure img{display:block;width:100%;max-width:640px;height:auto;margin:auto;border:1px solid var(--line);border-radius:6px}.answer-figure figcaption{font-size:12px;margin-top:5px;color:var(--wine)}#question-priority{display:inline-block;margin-left:6px;color:var(--wine);font-size:12px;letter-spacing:0}.priority-label{font-weight:650}#skip-question{display:block;width:100%;min-height:44px;margin:12px 0 0;padding:9px 12px;color:var(--wine);background:#fffdf9;border:1px solid #806973;border-radius:5px;font-size:14px}#skip-question[hidden],#review-skipped[hidden]{display:none}.question-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:18px}.question-tools .quiz-question-label{margin-top:0}#mark-question{min-height:44px;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:#fff8ed;color:var(--wine);font-size:13px}#mark-question[aria-pressed=true]{background:#ecd4dc;border-color:var(--wine);font-weight:700}#mark-status{font-size:12px;color:var(--wine);margin:0}#mode-empty{border:1px solid var(--line);padding:12px;border-radius:6px}

/* Reading and answer controls remain legible in every state. */
body{--muted:#52434c;--ink:#30232b;--wine:#622b45;color-scheme:light}
#quiz,.results-card,.video-card,#selector{background:#fffdf9}
#question{color:#30232b;border-left-color:#622b45}
#choices button{background:#fffdf9;color:#30232b;border-color:#806973}
#choices button:hover:not(:disabled){background:#f4e7ec;border-color:#622b45}
#choices button.ok{background:#e2f0e5;color:#173e27;border-color:#356344}
#choices button.bad{background:#f9e4e8;color:#78233b;border-color:#96374e}
#mark-question,.quiz-nav button,#selector button{background:#fffdf9;color:#4b2639;border-color:#806973}
#mark-question[aria-pressed=true]{background:#622b45;color:#fff;border-color:#622b45}
#mark-question:disabled{background:#eee8e4;color:#61545a;opacity:1}
#answer{background:#f8eee6;color:#30232b;border-color:#806973}
#next,.results-actions .primary,.quiz-head{background:#622b45;color:#fff}
.quiz-head small{color:#fff}
button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #164b70;outline-offset:2px}
</style></head><body><header class="site-header"><div class="header-inner"><div class="brand">SHIRUNOERA</div><a href="/high-school" class="home-link">高校受験へ戻る ↗</a></div></header><div class="hero-strip"><small>高校受験</small><h1>一問一答で、知識を確かに。</h1></div>
  <main><div class="tag">監査済み・公開承認済みの問題のみ表示</div>
  <section id="selector" class="card"><h2>教科を選ぶ</h2><p id="mode-empty" class="muted" role="status" hidden></p><div id="subjects"></div><div id="units" hidden><h3 id="unit-title">単元を選ぶ</h3><div id="unit-buttons"></div></div><p id="empty" class="muted" hidden>現在、公開できる問題はありません。監査完了後に追加されます。</p></section>
  <section id="quiz" class="card" hidden><div class="quiz-head"><strong>一問一答</strong><small>学習モード</small></div><div class="quiz-inner"><div class="quiz-nav"><button id="back" type="button">← 教科・単元を選び直す</button><p id="progress" class="muted"></p></div><div class="question-tools"><div class="quiz-question-label">問題 <span id="question-priority" class="priority-label"></span></div><button id="mark-question" type="button" aria-pressed="false">☆ チェック</button></div><p id="mark-status" role="status"></p><h2 id="question"></h2><div id="choices"></div><button id="skip-question" type="button">わからない・スキップ</button><div id="answer" role="status" aria-live="polite"></div><button id="next" hidden>次の問題へ</button></div></section><section id="results" class="results-card" hidden aria-live="polite"><div class="results-eyebrow">学習の振り返り</div><h2>今回の学習結果</h2><div id="result-score" class="result-score"></div><p id="result-detail"></p><p id="result-mistakes" class="summary-note"></p><div class="results-actions"><button type="button" id="review-wrong">間違えた問題を復習</button><button type="button" id="review-skipped" hidden>飛ばした問題を復習</button><button type="button" id="retry-all">同じ問題をもう一度</button><a class="primary" href="/high-school">学習記録へ戻る ↗</a></div></section><section id="unit-video" class="video-card" hidden><h3>単元別 解説動画</h3><p id="video-unit"></p><a id="video-link" rel="noopener noreferrer" target="_blank">解説動画を見る ↗</a></section>
  </main><footer>© SHIRUNOERA</footer>
  <script>const questions=${json};const socialOrder=${JSON.stringify(SOCIAL_CHAPTER_ORDER)};let selected=[],current=0,score=0,sessionAnswers=[],sessionBase=[],sessionSkipped=[];
  const el=id=>document.getElementById(id);

function readModeData(key,field){
  try{const raw=localStorage.getItem(key);if(raw===null)return Object.create(null);
    const data=JSON.parse(raw);return data?.schema===1&&data[field]&&typeof data[field]==="object"&&!Array.isArray(data[field])?data[field]:null;
  }catch(e){return null}
}
function modeData(mode){
  if(mode==="marked")return readModeData("shirunoera.bookmarks.v1","items");
  if(mode==="wrong"||mode==="unseen")return readModeData("shirunoera.learning.v1","answers");
  return Object.create(null)
}
function modeMatch(q,mode,data){
  if(mode==="normal")return true;
  if(data===null)return false;
  const past=Object.hasOwn(data,q.id)?data[q.id]:null;
  if(mode==="wrong")return past?.correct===false;
  if(mode==="unseen")return typeof past?.correct!=="boolean";
  if(mode==="marked")return past===true;
  return false
}

  function renderBookmark(q){
    const btn=el("mark-question"),items=modeData("marked");
    const marked=items!==null&&Object.hasOwn(items,q.id)&&items[q.id]===true;
    btn.disabled=items===null;btn.setAttribute("aria-pressed",String(marked));
    btn.textContent=marked?"✓ チェック済み":"☆ チェック";
    btn.title=items===null?"この端末のチェック記録を読み取れません":"復習したい問題を保存・解除";
  }
  el("mark-question").onclick=()=>{
    const q=selected[current],items=modeData("marked");if(!q||items===null)return;
    const next=Object.assign(Object.create(null),items);
    if(next[q.id]===true)delete next[q.id];else next[q.id]=true;
    try{localStorage.setItem("shirunoera.bookmarks.v1",JSON.stringify({schema:1,items:next}));renderBookmark(q);el("mark-status").textContent=""}
    catch(e){el("mark-status").textContent="チェックを保存できませんでした。"}
  };
  function saveLearningAnswer(q,correct){
    try{
      const key="shirunoera.learning.v1";
      const raw=localStorage.getItem(key);
      const data=raw===null?{schema:1,answers:{}}:JSON.parse(raw);
      // If storage belongs to an unfamiliar schema, do not overwrite it.
      if(!data||data.schema!==1||!data.answers||typeof data.answers!=="object"||Array.isArray(data.answers))return;
      const answers=data.answers;
      const old=answers[q.id];
      const now=new Date().toISOString();
      const previousAttempts=Number.isSafeInteger(old?.attempts)&&old.attempts>0?old.attempts:0;
      // Historical rows lack the original result. Never guess their first attempt.
      const firstCorrect=typeof old?.firstCorrect==="boolean"?old.firstCorrect:(old?null:correct);
      const firstAnswered=typeof old?.firstAnswered==="string"?old.firstAnswered:(old?null:now);
      answers[q.id]={subject:q.subject,major:q.field_name,minor:q.topic_name,correct,
        attempts:previousAttempts+1,firstCorrect,firstAnswered,lastAnswered:now};
      localStorage.setItem(key,JSON.stringify(data));
    }catch(e){/* storage unavailable: keep quiz usable without changing prior records */}
  }
  const subjectOrder=["社会","理科","英語","国語","数学"];
  const groups=[...new Set(questions.map(q=>q.subject))].sort((a,b)=>{const x=subjectOrder.indexOf(a),y=subjectOrder.indexOf(b);return (x<0?99:x)-(y<0?99:y)});
  function clear(node){node.replaceChildren()}
  function makeButton(label,callback){const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=callback;return b}
  function chooseSubject(subject){el("units").hidden=false;el("unit-title").textContent=subject+"｜単元を選ぶ";
    const container=el("unit-buttons");clear(container);
    const subset=questions.filter(q=>q.subject===subject);
    if(subject==="社会"){
      const fields=["地理","歴史","公民"].filter(f=>subset.some(q=>q.field_name===f));
      container.appendChild(makeButton("社会すべて（"+subset.length+"問）",()=>begin(subset)));
      for(const field of fields){const pool=subset.filter(q=>q.field_name===field);container.appendChild(makeButton(field+"（"+pool.length+"問）",()=>chooseSocialField(field,pool)))}
      return;
    }
    const units=[...new Set(subset.map(q=>q.topic_name||q.unit||"総合"))];
    container.appendChild(makeButton("すべての単元（"+subset.length+"問）",()=>begin(subset)));
    for(const unit of units){const list=subset.filter(q=>(q.topic_name||q.unit||"総合")===unit);container.appendChild(makeButton(unit+"（"+list.length+"問）",()=>begin(list)))}
  }

// BEGIN SOCIAL SECTION MODEL
function socialSectionKey(q){return JSON.stringify([q.display_chapter||"その他（分類確認中）",q.display_section||"分類確認中"])}
function socialRangeMatch(q,sections,chapters,legacyMinor){
  if(sections.length)return sections.includes(socialSectionKey(q));
  if(chapters.length)return chapters.includes("all")||chapters.includes(q.display_chapter||"その他（分類確認中）");
  return legacyMinor==="all"||(q.topic_name||q.minor)===legacyMinor;
}
function sectionGroups(pool,order){
  const map=new Map();
  for(const q of pool){const [chapter,section]=JSON.parse(socialSectionKey(q));if(!map.has(chapter))map.set(chapter,new Map());const m=map.get(chapter);m.set(section,(m.get(section)||0)+1)}
  const rank=(a,list)=>list.includes(a)?list.indexOf(a):999;
  const secOrder=["旧石器時代","縄文時代","弥生時代","古墳時代","飛鳥時代","飛鳥〜奈良時代","奈良時代","平安時代","原始・古代のまとめ","鎌倉時代","室町時代","戦国時代","安土桃山時代","江戸時代","幕末・開国","明治時代","大正時代","昭和戦前","昭和戦前・戦中","戦後の日本","高度経済成長","分類確認中"];
  return [...map].sort((a,b)=>rank(a[0],order)-rank(b[0],order)||a[0].localeCompare(b[0],"ja")).map(([chapter,m])=>[chapter,[...m].sort((a,b)=>rank(a[0],secOrder)-rank(b[0],secOrder)||a[0].localeCompare(b[0],"ja"))]);
}
// END SOCIAL SECTION MODEL
function renderSocialRange(container,pool,order,onChange,initial=true){
  const groups=sectionGroups(pool,order),leaves=[],parents=[];
  const btn=(text,fn)=>{const b=document.createElement("button");b.type="button";b.textContent=text;b.onclick=fn;return b};
  const label=(text,input)=>{const l=document.createElement("label");l.append(input,document.createTextNode(text));return l};
  const refresh=()=>{for(const [parent,children] of parents){const n=children.filter(x=>x.checked).length;parent.checked=n===children.length;parent.indeterminate=n>0&&n<children.length}onChange()};
  const setAll=value=>{for(const x of leaves)x.checked=value;refresh()};
  container.append(btn("すべて選択",()=>setAll(true)),btn("選択を解除",()=>setAll(false)));
  for(const [chapter,sections] of groups){
    const block=document.createElement("div");block.className="social-chapter";
    const parent=document.createElement("input");parent.type="checkbox";
    block.append(label(chapter+"（"+sections.reduce((n,x)=>n+x[1],0)+"問）",parent));
    const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent="小単元を選ぶ";details.append(summary);const children=[];
    for(const [section,count] of sections){const c=document.createElement("input");c.type="checkbox";c.value=JSON.stringify([chapter,section]);c.className="social-section-choice";c.checked=initial;c.onchange=refresh;children.push(c);leaves.push(c);details.append(label(section+"（"+count+"問）",c))}
    parents.push([parent,children]);parent.onchange=()=>{children.forEach(c=>c.checked=parent.checked);refresh()};block.append(details);container.append(block);
  }
  refresh();
}
  function chooseSocialField(field,pool){
    const container=el("unit-buttons");clear(container);el("unit-title").textContent="社会 / "+field+"｜単元・テスト範囲を選ぶ";
    container.appendChild(makeButton("← 分野を選び直す",()=>chooseSubject("社会")));
    const range=document.createElement("div");range.className="social-range";
    const status=document.createElement("p");status.setAttribute("aria-live","polite");
    const selectedSections=()=>[...range.querySelectorAll(".social-section-choice:checked")].map(c=>c.value);
    const selectedPool=()=>{const keys=new Set(selectedSections());return pool.filter(q=>keys.has(socialSectionKey(q)))};
    const start=makeButton("選択した範囲で開始",()=>begin(selectedPool()));
    const refresh=()=>{const n=selectedPool().length;status.textContent="選択中："+n+"問";start.disabled=!n};
    container.append(range,status,start);renderSocialRange(range,pool,socialOrder[field]||[],refresh,false);
  }
  function begin(items){if(!items.length)return;selected=items.slice().sort((a,b)=>(b.priority||0)-(a.priority||0));sessionBase=selected.slice();sessionAnswers=[];sessionSkipped=[];current=0;score=0;el("results").hidden=true;el("selector").hidden=true;el("quiz").hidden=false;show()}
  function showResults(){el("quiz").hidden=true;el("unit-video").hidden=true;el("results").hidden=false;const total=sessionAnswers.length;const wrong=sessionAnswers.filter(x=>!x.correct);const skipped=sessionSkipped.length;const pct=total?Math.round(score/total*100):null;el("result-score").textContent=total?score+" / "+total+"問":"未回答";el("result-detail").textContent="正答率 "+(pct===null?"—":pct+"%")+"　・　間違い "+wrong.length+"問　・　スキップ "+skipped+"問";el("result-mistakes").textContent=skipped?"飛ばした問題は未回答のままです。復習できます。":wrong.length?"間違えた問題から復習できます。":"全問正解！次は別の単元にも挑戦しましょう。";el("review-wrong").hidden=wrong.length===0;el("review-skipped").hidden=skipped===0;window.scrollTo(0,0)}
  el("review-wrong").onclick=()=>{const wrongIds=new Set(sessionAnswers.filter(x=>!x.correct).map(x=>x.id));begin(selected.filter(q=>wrongIds.has(q.id)))};
  el("review-skipped").onclick=()=>{const ids=new Set(sessionSkipped);begin(selected.filter(q=>ids.has(q.id)))};
  el("retry-all").onclick=()=>begin(sessionBase);
  function show(){const q=selected[current];renderBookmark(q);el("mark-status").textContent="";el("unit-video").hidden=!q.video_url;el("video-unit").textContent=q.subject+" / "+q.field_name+" / "+(q.display_section||q.topic_name);if(q.video_url)el("video-link").href=q.video_url;else el("video-link").removeAttribute("href");el("progress").textContent=(current+1)+" / "+selected.length+" 問　・　正解 "+score+" 問";el("question").textContent=q.q;el("question-priority").textContent=q.priority?"重要度 "+"★".repeat(q.priority):"重要度 未評価";
    clear(el("choices"));el("answer").textContent="";el("next").hidden=true;el("skip-question").hidden=false;
    q.options.forEach((option,i)=>{const b=makeButton(String.fromCharCode(65+i)+". "+option,()=>{const correct=option===q.answer;if(correct)score++;sessionAnswers.push({id:q.id,correct});saveLearningAnswer(q,correct);el("skip-question").hidden=true;
      for(const c of el("choices").children){c.disabled=true;if(c.dataset.value===q.answer)c.classList.add("ok")}
      if(!correct)b.classList.add("bad");renderAnswer(q,correct?"✓ 正解":"✕ 不正解");
      el("next").hidden=false;el("next").textContent=current===selected.length-1?"結果を見る":"次の問題へ"});
      b.dataset.value=option;el("choices").appendChild(b)})}
  function advance(){if(current===selected.length-1){showResults()}else{current++;show()}}
  function renderAnswer(q,label){const panel=el("answer");panel.replaceChildren();const headline=document.createElement("strong");headline.textContent=label+"　正解："+q.answer;panel.append(headline);if(q.ex){const detail=document.createElement("div");detail.textContent=q.ex;detail.style.marginTop="10px";panel.append(detail)}if(q.answer_image_url){const fig=document.createElement("figure");fig.className="answer-figure";const image=document.createElement("img");image.src=q.answer_image_url;image.alt=q.answer_image_alt;image.width=q.answer_image_width||640;image.height=q.answer_image_height||460;const caption=document.createElement("figcaption");caption.textContent=q.answer_image_caption||"SHIRUNOERA 作成・解説用模式図";image.addEventListener("error",()=>fig.remove(),{once:true});fig.append(image,caption);panel.append(fig)}}
  el("skip-question").onclick=()=>{if(el("quiz").hidden||el("skip-question").hidden)return;const q=selected[current];if(!q)return;sessionSkipped.push(q.id);el("skip-question").hidden=true;for(const c of el("choices").children){c.disabled=true;if(c.dataset.value===q.answer)c.classList.add("ok")}renderAnswer(q,"未回答・スキップ");el("next").hidden=false;el("next").textContent=current===selected.length-1?"結果を見る":"次の問題へ"};
  el("next").onclick=advance;
  el("back").onclick=()=>{if(params.get("from")==="configure"&&groups.includes(requested)){location.assign("/high-school?"+new URLSearchParams({subject:requested}));return}el("quiz").hidden=true;el("unit-video").hidden=true;el("results").hidden=true;el("selector").hidden=false};
  if(!groups.length){el("empty").hidden=false}
  for(const subject of groups){const count=questions.filter(q=>q.subject===subject).length;el("subjects").appendChild(makeButton(subject+"（"+count+"問）",()=>chooseSubject(subject)))}
  // Mix new questions with recent mistakes; avoid always serving the first ten rows.
  function selectQuizQuestions(pool,limit){
    let history={};
    try{
      const raw=localStorage.getItem("shirunoera.learning.v1");
      const state=raw?JSON.parse(raw):null;
      if(state?.schema===1&&state.answers&&typeof state.answers==="object"&&!Array.isArray(state.answers))history=state.answers;
    }catch(e){/* quizzes remain usable without browser storage */}
    const incorrect=[],unseen=[],previouslyCorrect=[];
    for(const q of pool){
      const past=history[q.id];
      if(past&&past.correct===false)incorrect.push(q);
      else if(past&&past.correct===true)previouslyCorrect.push(q);
      else unseen.push(q);
    }
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a};
    const rank=q=>Number.isInteger(q.priority)?q.priority:0;
    for(const group of [incorrect,unseen,previouslyCorrect])shuffle(group).sort((a,b)=>rank(a)-rank(b));
    const chosen=[];
    // One earlier mistake for roughly every two unattempted items.
    while(chosen.length<limit&&(incorrect.length||unseen.length)){
      const preferred=chosen.length%3===0?incorrect:unseen;
      const alternative=preferred===incorrect?unseen:incorrect;
      chosen.push((preferred.length?preferred:alternative).pop());
    }
    while(chosen.length<limit&&previouslyCorrect.length)chosen.push(previouslyCorrect.pop());
    return shuffle(chosen).sort((a,b)=>rank(b)-rank(a));
  }

  // Explicit range filters are additive, and never fall back to all on malformed input.
  function selectedRangeMatch(q,ranges){
    const path=q.subject==="社会"?[q.field_name,q.display_chapter||"その他（分類確認中）",q.display_section||"分類確認中"]:[q.field_name,q.topic_name];
    return ranges.some(prefix=>Array.isArray(prefix)&&prefix.length>0&&prefix.length<=path.length&&prefix.every((v,i)=>typeof v==="string"&&v===path[i]));
  }
  const params=new URLSearchParams(location.search);
  const requested=params.get("subject");
  if(requested&&groups.includes(requested)){
    chooseSubject(requested);
    const major=params.get("major")||"all",minor=params.get("unit")||"all",count=params.get("count")||"10";
    const chapters=params.getAll("chapter"),sections=params.getAll("section");
    const ranges=params.getAll("range").map(value=>{try{return JSON.parse(value)}catch(e){return null}});
    const mode=params.get("mode")||"normal",data=modeData(mode);
    const pool=questions.filter(q=>modeMatch(q,mode,data)&&q.subject===requested&&(params.has("range")?selectedRangeMatch(q,ranges):((major==="all"||q.field_name===major)&&(requested==="社会"?socialRangeMatch(q,sections,chapters,minor):(minor==="all"||q.topic_name===minor)))));
    const limit=count==="all"?pool.length:Math.min(pool.length,["5","10","20"].includes(count)?Number(count):10);
    if(limit>0)begin(count==="all"?pool:selectQuizQuestions(pool,limit));
    else if(params.has("mode")||params.has("range")){el("units").hidden=true;el("subjects").hidden=true;const msg=el("mode-empty");msg.hidden=false;msg.textContent="条件に合う問題がありません。";const a=document.createElement("a");a.href="/high-school?"+new URLSearchParams({subject:requested});a.textContent=" 出題条件を選び直す";msg.append(a)}
  }
  </script></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if(request.method==="GET"&&url.pathname===ANSWER_IMAGE_PATH)return new Response(ICE_AGE_DIAGRAM,{headers:{"Content-Type":"image/svg+xml; charset=utf-8","X-Content-Type-Options":"nosniff","Cache-Control":"public, max-age=86400","Content-Security-Policy":"default-src 'none'; style-src 'none'; sandbox"}});
    if(request.method==="GET"&&url.pathname===CHIPPED_STONE_IMAGE_PATH)return new Response(CHIPPED_STONE_DIAGRAM,{headers:{"Content-Type":"image/svg+xml; charset=utf-8","X-Content-Type-Options":"nosniff","Cache-Control":"public, max-age=86400","Content-Security-Policy":"default-src 'none'; style-src 'none'; sandbox"}});

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
        recordTraffic(request,env,url,"quiz");
        return new Response(approvedOnlyHtml(approved),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
      } catch (_) {
        return new Response("監査済み教材を読み込めません。公開を一時停止しています。",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
      }
    }
    if (url.pathname === "/data/staging" || url.pathname.startsWith("/data/staging/")) {
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    // Public catalog for live subject/unit counts and exact learning-coverage denominators.
    // Use the same strict parser as the approved-only quiz. Do not expose private sheets.
    if (request.method === "GET" && ["/api/question-catalog.json","/api/question-catalog.csv"].includes(url.pathname)) {
      const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
      try {
        const upstream=await fetch(PUBLIC_URL,{signal:AbortSignal.timeout(5000)});
        if(!upstream.ok)throw Error("Public data unavailable");
        const csv=await upstream.text();
        if(csv.length>1024*1024)throw Error("Public data too large");
        const approved=parsePublicCsv(csv);
        if(url.pathname==="/api/question-catalog.csv"){
          const columns=["id","subject","major","minor","display_chapter","display_section","priority"];
          const escapeCsv=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
          const lines=approved.map(q=>{const d=socialDisplay(q);return [q.id,q.subject,q.field_name,q.topic_name,d.display_chapter,d.display_section,questionPriority(q)].map(escapeCsv).join(",")});
          return new Response(columns.join(",")+"\n"+lines.join("\n")+"\n",{headers:{...headers,"Content-Type":"text/csv; charset=utf-8"}});
        }
        const display=url.searchParams.get("display")==="1";
        const questions=approved.map(q=>({id:q.id,subject:q.subject,major:q.field_name,minor:q.topic_name,...(display?socialDisplay(q):{})}));
        return new Response(JSON.stringify({schema:1,questions}),{headers});
      } catch (_) {
        return new Response(JSON.stringify({error:"Published catalog unavailable"}),{status:503,headers});
      }
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

    if (request.method === "GET" && ["/", "/index.html", "/high-school", "/high-school/"].includes(url.pathname)) {
      const homeUrl = new URL(url.pathname.startsWith("/high-school") ? "/home-v2.html" : "/portal.html", url.origin);
      const response = await env.ASSETS.fetch(new Request(homeUrl.toString(), request));
      if(response.ok)recordTraffic(request,env,url,url.pathname.startsWith("/high-school")?"high_school":"portal");
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

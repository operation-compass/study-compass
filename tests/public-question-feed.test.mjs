'use strict';
// Run: node --test tests/public-question-feed.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const src = await fs.readFile(new URL('../worker.js', import.meta.url),'utf8');
const {default:worker} = await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const HEADER = 'question_id,version,subject,grade,unit_major,unit_minor,question_type,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation,source_url';
const priorFetch = globalThis.fetch;
let lastUpstreamUrl = '';
const env = {ASSETS:{fetch:()=>new Response('asset')}};
async function probe(upstream, path='/api/questions.csv') {
  globalThis.fetch=async (url)=>{ lastUpstreamUrl=String(url);return upstream; };
  try {return await worker.fetch(new Request('https://study.example'+path),env);}
  finally {globalThis.fetch=priorFetch;}
}
test('header-only approved public sheet returns no questions',async()=>{
  const res=await probe(new Response(HEADER+'\n',{status:200,headers:{'Content-Type':'text/csv'}}));
  assert.equal(res.status,200);assert.equal(await res.text(),HEADER+'\n');
  assert.equal(new URL(lastUpstreamUrl).searchParams.get('gid'),'343531822');
  assert.equal(new URL(lastUpstreamUrl).searchParams.get('format'),'csv');
  assert.match(lastUpstreamUrl,/1WFYJ-a5V1GBZzr99yglB4MUaW29z-qBze6cZ5m4cM8g/);
  assert.equal(res.headers.get('cache-control'),'no-store');
});
test('invalid public schema fails closed',async()=>{
  const res=await probe(new Response('private_audit,question\n',{status:200}));
  assert.equal(res.status,503);
});
test('Google export unavailable fails closed',async()=>{
  const res=await probe(new Response('No access',{status:403}));
  assert.equal(res.status,503);
});
test('staging path remains inaccessible',async()=>{
  const res=await probe(new Response(HEADER),'/data/staging/example');
  assert.equal(res.status,404);
});

test('approved public question row is returned unchanged',async()=>{
  const row=['SC-TEST-001','1','社会','中3','歴史','江戸','4択','江戸幕府を開いた人物は？','徳川家康','豊臣秀吉','織田信長','源頼朝','A','1603年。','https://example.org'].join(',');
  const csv=HEADER+'\n'+row+'\n';
  const res=await probe(new Response(csv,{status:200}));
  assert.equal(res.status,200);
  assert.equal(await res.text(),csv);
});


test('approved public CSV merges into legacy question schema without changing existing questions',async()=>{
  const source=src+'\nexport { parsePublicCsv, addPublishedQuestions };';
  const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const original='<!doctype html><script>const SOCIAL = '+JSON.stringify([{id:'old-1',subject:'社会',grade:'中3',unit:'歴史',field_name:'歴史',topic_name:'江戸',q:'旧問',answer:'旧答',options:['旧答','B','C','D'],ex:'説明'}])+';</script>';
  const row=['new-1','1','社会','中3','歴史','江戸','4択','新問','正解','誤答1','誤答2','誤答3','A','新解説','https://example.org'].join(',');
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(HEADER+'\n'+row+'\n',{status:200});
  try{
    const changed=await api.addPublishedQuestions(original);
    const match=changed.match(/const SOCIAL = (\[[^;]+\]);/);
    assert.ok(match);
    const combined=JSON.parse(match[1]);
    assert.equal(combined.length,2);
    assert.equal(combined[0].id,'old-1');
    assert.equal(combined[1].q,'新問');
    assert.equal(combined[1].answer,'正解');
    assert.deepEqual(combined[1].options,['正解','誤答1','誤答2','誤答3']);
    assert.equal(combined[1].ex,'新解説');
  }finally{globalThis.fetch=oldFetch;}
});
test('header-only public sheet keeps existing study page byte-for-byte',async()=>{
  const source=src+'\nexport { addPublishedQuestions };';
  const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const original='<script>const SOCIAL = [{"id":"old"}];</script>';
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(HEADER+'\n',{status:200});
  try{assert.equal(await api.addPublishedQuestions(original),original);}finally{globalThis.fetch=oldFetch;}
});

test('question text cannot break out of embedded HTML script',async()=>{
  const source=src+'\nexport { addPublishedQuestions };';
  const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const original='<script>const SOCIAL = [];</script>';
  const payload='</script><script>alert(1)</script>';
  const fields=['escape-test','1','社会','中1','歴史','近世','4択',payload,'a','b','c','d','A','説明','https://example.org'];
  const escapeCsv=v=>'"'+String(v).replaceAll('"','""')+'"';
  const csv=HEADER+'\n'+fields.map(escapeCsv).join(',')+'\n';
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(csv,{status:200});
  try{
    const out=await api.addPublishedQuestions(original);
    assert.equal(out.includes(payload),false,'Unsafe closing script tag leaked into HTML');
    assert.equal(out.includes('\\u003c/script\\u003e'),true);
  }finally{globalThis.fetch=oldFetch;}
});

test('real legacy Study HTML retains all existing questions when public CSV adds one',async()=>{
  const html=await fs.readFile(new URL('../legacy-study.html',import.meta.url),'utf8');
  const marker='const SOCIAL = ',start=html.indexOf(marker);
  assert.ok(start>=0,'existing question bank must exist');
  const offset=start+marker.length;
  const stop=html.indexOf(';',offset);
  const before=JSON.parse(html.slice(offset,stop));
  assert.ok(before.length>100,'unexpected loss of legacy bank');
  const source=src+'\nexport { addPublishedQuestions };';
  const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const row=['SC-INTEGRATION-NEW-00001','1','社会','中1','歴史','古代','4択','新規テスト問題','正答','誤答1','誤答2','誤答3','A','説明','https://example.org'].join(',');
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(HEADER+'\n'+row+'\n',{status:200});
  try {
    const changed=await api.addPublishedQuestions(html);
    const from=changed.indexOf(marker)+marker.length,end=changed.indexOf(';',from);
    const after=JSON.parse(changed.slice(from,end));
    assert.equal(after.length,before.length+1);
    assert.deepEqual(after.slice(0,before.length),before);
    assert.equal(after.at(-1).answer,'正答');
    assert.equal(after.at(-1).options.length,4);
    assert.equal(changed.slice(0,html.indexOf(marker)),html.slice(0,html.indexOf(marker)));
  } finally {globalThis.fetch=oldFetch;}
});

test('approved-only quiz includes subject deep-link and separate persistent history',async()=>{
  const row=['SC-SUBJECT-001','1','社会','中3','歴史','江戸','4択','江戸幕府を開いた人物は？','徳川家康','豊臣秀吉','織田信長','源頼朝','A','1603年。','https://example.org'].join(',');
  const res=await probe(new Response(HEADER+'\n'+row+'\n',{status:200}),'/study.html?subject=社会');
  assert.equal(res.status,200);
  const html=await res.text();
  assert.match(html,/new URLSearchParams\(location.search\).get\("subject"\)/);
  assert.match(html,/groups.includes\(requestedSubject\)\)chooseSubject\(requestedSubject\)/);
  assert.match(html,/studyCompassApprovedQuizV1/);
  assert.match(html,/recordAnswer\(q,correct\)/);
  assert.ok(html.includes('SC-SUBJECT-001'));
  assert.ok(!html.includes('studyCompassWrittenBetaV1'));
});
test('home displays quiz stats independently of the original beta totals',async()=>{
  const html=await fs.readFile(new URL('../home-v2.html',import.meta.url),'utf8');
  for(const id of ['quizDistinct','quizAttempts','quizAccuracy'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(html.includes('studyCompassApprovedQuizV1'));
  assert.ok(html.includes('(w+g)+" / 64"'));
  assert.ok(html.includes('studyCompassWrittenBetaV1'));
  assert.ok(html.includes('studyCompassGeneratedBetaV1'));
});

test('approved-only learning page fetches the current public CSV on each request',async()=>{
  const makeRow=(id,prompt)=>[id,'1','社会','中3','歴史','江戸','4択',prompt,'正答','誤答1','誤答2','誤答3','A','解説','https://example.org'].join(',');
  const first=await probe(new Response(HEADER+'\n'+makeRow('SC-UPDATE-001','公開済み問題')+'\n',{status:200}),'/study.html?subject=社会');
  assert.equal(first.status,200);
  const firstHtml=await first.text();
  assert.ok(firstHtml.includes('SC-UPDATE-001'));
  assert.ok(!firstHtml.includes('SC-UPDATE-002'));
  const second=await probe(new Response(HEADER+'\n'+makeRow('SC-UPDATE-001','公開済み問題')+'\n'+makeRow('SC-UPDATE-002','追加された新しい問題')+'\n',{status:200}),'/study.html?subject=社会');
  assert.equal(second.status,200);
  const secondHtml=await second.text();
  assert.ok(secondHtml.includes('SC-UPDATE-001'));
  assert.ok(secondHtml.includes('SC-UPDATE-002'));
  assert.equal(second.headers.get('cache-control'),'no-store');
});

test('quiz interaction persists correct and incorrect attempts without double counting clicks',async()=>{
  const row=['SC-BEHAVIOR-001','1','社会','中3','歴史','江戸','4択','江戸幕府を開いたのは？','徳川家康','豊臣秀吉','織田信長','源頼朝','A','解説','https://example.org'].join(',');
  const response=await probe(new Response(HEADER+'\n'+row+'\n',{status:200}),'/study.html?subject=社会');
  assert.equal(response.status,200);
  const html=await response.text();
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script,'quiz script exists');
  const store=new Map();
  const localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  const makeEl=()=>({children:[],hidden:false,dataset:{},classList:{add(){}},replaceChildren(){this.children=[]},appendChild(child){this.children.push(child);return child},click(){if(!this.disabled)this.onclick?.()},setAttribute(){},textContent:''});
  const run=()=>{
    const nodes=new Map();
    const get=id=>{if(!nodes.has(id))nodes.set(id,makeEl());return nodes.get(id)};
    const document={getElementById:get,createElement:()=>makeEl()};
    vm.runInNewContext(script,{document,location:{search:'?subject=社会'},URLSearchParams,localStorage,Date,Set});
    return get;
  };
  let get=run();
  assert.equal(get('unit-title').textContent,'社会｜単元を選ぶ');
  get('unit-buttons').children[0].click();
  assert.equal(get('choices').children.length,4);
  get('choices').children[1].click();
  get('choices').children[1].click();
  const saved1=JSON.parse(store.get('studyCompassApprovedQuizV1'));
  assert.equal(saved1.answers.length,1,'repeated click after disabling must not create extra attempts');
  assert.equal(saved1.answers[0].correct,false);
  assert.equal(saved1.answers[0].question_id,'SC-BEHAVIOR-001');
  get=run();
  get('unit-buttons').children[0].click();
  get('choices').children[0].click();
  const saved2=JSON.parse(store.get('studyCompassApprovedQuizV1'));
  assert.equal(saved2.answers.length,2);
  assert.equal(saved2.answers[1].correct,true);
  assert.equal(new Set(saved2.answers.map(a=>a.question_id)).size,1);
});

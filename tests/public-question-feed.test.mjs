'use strict';
// Run: node --test tests/public-question-feed.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

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


test('public catalog contains only approved question IDs and classification fields',async()=>{
  const row=['catalog-1','1','社会','中1','歴史','古代','4択','問題','正解','誤答1','誤答2','誤答3','A','解説','https://example.org'].join(',');
  const res=await probe(new Response(HEADER+'\n'+row+'\n'),'/api/question-catalog.json');
  assert.equal(res.status,200);
  assert.equal(res.headers.get('cache-control'),'no-store');
  assert.deepEqual(await res.json(),{schema:1,questions:[{id:'catalog-1',subject:'社会',major:'歴史',minor:'古代'}]});
  assert.equal(new URL(lastUpstreamUrl).searchParams.get('gid'),'343531822');
});
test('empty approved catalog is a valid empty result',async()=>{
  const res=await probe(new Response(HEADER+'\n'),'/api/question-catalog.json');
  assert.equal(res.status,200);
  assert.deepEqual(await res.json(),{schema:1,questions:[]});
});
test('catalog fails closed on invalid questions, duplicate IDs and unavailable data',async()=>{
  const row=['dup','1','社会','中1','歴史','古代','4択','問題','正解','誤答1','誤答2','誤答3','A','解説','https://example.org'].join(',');
  for(const upstream of [new Response('private,question\n'),new Response(HEADER+'\n'+row+'\n'+row+'\n'),new Response(HEADER+'\n'+row.replace(',A,',',Z,')+'\n'),new Response('unavailable',{status:403})]){
    const res=await probe(upstream,'/api/question-catalog.json');
    assert.equal(res.status,503);
    assert.deepEqual(await res.json(),{error:'Published catalog unavailable'});
  }
});

test('display classification is separate from raw classification and preserves known public IDs',async()=>{
  const api=await import('data:text/javascript;base64,'+Buffer.from(src+'\nexport { socialDisplay, publishedExplanation, approvedOnlyHtml, parsePublicCsv };').toString('base64'));
  const row=['SC-SOC-HIS-GAP10-000001','1','社会','中1','歴史','律令・税制','4択','問題','正解','誤答1','誤答2','誤答3','A','解説','https://example.org'].join(',');
  const q=api.parsePublicCsv(HEADER+'\n'+row+'\n')[0];
  assert.equal(q.topic_name,'律令・税制');
  assert.equal(q.answer,'正解');
  assert.deepEqual(api.socialDisplay(q),{display_chapter:'原始・古代',display_section:'奈良時代'});
  assert.deepEqual(api.publishedExplanation(q),{});
  assert.deepEqual(api.socialDisplay({id:'unknown',subject:'社会'}),{display_chapter:'その他（分類確認中）',display_section:''});
  assert.deepEqual(api.socialDisplay({id:'unknown',subject:'国語'}),{});
  const html=api.approvedOnlyHtml([q]);
  assert(!html.includes('解説動画は準備中'));
  assert(html.includes('el("unit-video").hidden=!q.video_url'));
  assert(html.includes('params.getAll("chapter")'));
  const vm=await import('node:vm');
  for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
});

test('opt-in catalog adds display chapter without changing original API',async()=>{
  const row=['SC-SOC-HIS-GAP10-000001','1','社会','中1','歴史','律令・税制','4択','問題','正解','誤答1','誤答2','誤答3','A','解説','https://example.org'].join(',');
  const csv=HEADER+'\n'+row+'\n';
  const basic=await probe(new Response(csv),'/api/question-catalog.json');
  const expanded=await probe(new Response(csv),'/api/question-catalog.json?display=1');
  assert.deepEqual((await basic.json()).questions,[{id:'SC-SOC-HIS-GAP10-000001',subject:'社会',major:'歴史',minor:'律令・税制'}]);
  assert.deepEqual((await expanded.json()).questions,[{id:'SC-SOC-HIS-GAP10-000001',subject:'社会',major:'歴史',minor:'律令・税制',display_chapter:'原始・古代',display_section:'奈良時代'}]);
});

test('quiz section filtering matches home selection while retaining legacy links',async()=>{
 const vm=await import('node:vm');
 const model=src.split('// BEGIN SOCIAL SECTION MODEL')[1].split('// END SOCIAL SECTION MODEL')[0];
 const c=vm.createContext({});
 vm.runInContext(model,c);
 c.pool=[{display_chapter:'原始・古代',display_section:'縄文時代',topic_name:'古代'},{display_chapter:'原始・古代',display_section:'弥生時代',topic_name:'古代'},{display_chapter:'中世',display_section:'鎌倉時代',topic_name:'中世'}];
 assert.equal(vm.runInContext('pool.filter(q=>socialRangeMatch(q,[socialSectionKey(pool[0]),socialSectionKey(pool[2])],[],"all")).length',c),2);
 assert.equal(vm.runInContext('pool.filter(q=>socialRangeMatch(q,[],["原始・古代"],"all")).length',c),2);
 assert.equal(vm.runInContext('pool.filter(q=>socialRangeMatch(q,[],[],"古代")).length',c),2);
 assert.equal(vm.runInContext('pool.filter(q=>socialRangeMatch(q,["invalid"],["all"],"all")).length',c),0);
});

test('new social IDs with explicit unit labels are classified without touching approved question content',async()=>{
 const api=await import('data:text/javascript;base64,'+Buffer.from(src+'\nexport { socialDisplay, parsePublicCsv };').toString('base64'));
 const q=(field_name,topic_name,id='new-social')=>({subject:'社会',id,field_name,topic_name});
 assert.deepEqual(api.socialDisplay(q('歴史','縄文時代')),{display_chapter:'原始・古代',display_section:'縄文時代'});
 assert.deepEqual(api.socialDisplay(q('歴史','江戸時代')),{display_chapter:'近世',display_section:'江戸時代'});
 assert.deepEqual(api.socialDisplay(q('地理','九州地方')),{display_chapter:'日本の諸地域',display_section:'九州地方'});
 assert.deepEqual(api.socialDisplay(q('公民','国会')),{display_chapter:'民主政治',display_section:'国会'});
 for(const [f,m] of [['歴史','古代'],['歴史','近現代'],['歴史','縄文・弥生'],['地理','世界'],['公民','政治'],['日本史探究','江戸時代'],['地理','縄文時代']])assert.deepEqual(api.socialDisplay(q(f,m)),{display_chapter:'その他（分類確認中）',display_section:''});
 assert.deepEqual(api.socialDisplay(q('歴史','江戸時代','SC-SOC-HIS-GAP10-000001')),{display_chapter:'原始・古代',display_section:'奈良時代'});
 assert.deepEqual(api.socialDisplay({...q('歴史','縄文時代'),subject:'国語'}),{});
});

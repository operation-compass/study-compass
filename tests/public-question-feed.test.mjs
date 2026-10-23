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
  const row=['new-1','1','社会','中3','歴史','江戸','mcq','新問','正解','誤答1','誤答2','誤答3','A','新解説','https://example.org'].join(',');
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
  const fields=['escape-test','1','社会','中1','歴史','近世','mcq',payload,'a','b','c','d','A','説明','https://example.org'];
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

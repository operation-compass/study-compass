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

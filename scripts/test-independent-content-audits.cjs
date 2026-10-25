'use strict';
const assert=require('node:assert/strict');
const {run,validate,hash,callOpenAI}=require('./run-independent-content-audits.cjs');
function fixture(){const text='調は、布・絹・糸・鉄・塩・海産物などのほか地方の各種の産物を納めるものです。'.repeat(4),url='https://www.town.onga.lg.jp/site/choshi/26900.html';const existing=[{id:'existing-1',q:'別の学習事項を問う問題',answer:'別の答え'}];return {schema_version:1,source_spreadsheet_id:'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88',export_source:'authenticated-drive-export',exported_at:new Date().toISOString(),production_commit:'a'.repeat(40),existing_questions:existing,existing_questions_sha256:hash(existing),sources:[{url,text,sha256:hash(text),retrieved_at:new Date().toISOString()}],items:[{id:'fixture-not-for-publication',version:'test',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'律令・税制',question_type:'4択',question_text:'布などの地方の産物を納める税は？',choice_a:'調',choice_b:'租',choice_c:'庸',choice_d:'雑徭',correct_answer:'調',explanation:'調は地方の産物を納める税です。',source_url:url}]};}
let serial=0;
function response(body,decision={result:'PASS',risk:'LOW',findings:[],citations:[{url:fixture().sources[0].url,quote:'調は、布・絹・糸・鉄・塩・海産物など'}]}){return {id:'resp_test_'+(++serial),model:body.model,status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(decision)}]}]};}
(async()=>{
 const requests=[];const input=fixture();const out=await run(input,{model:'test-model',transport:async b=>{requests.push(b);return response(b);}});
 assert.equal(requests.length,2);assert.notEqual(requests[0].instructions,requests[1].instructions);assert(requests.every(x=>x.store===false&&!x.previous_response_id&&!x.conversation));assert(out.records[0].content_reviews_complete);assert.equal(out.records[0].final_decision,'HOLD');assert.equal(out.release_ready,false);assert.equal(out.production_updated,false);assert.equal(out.records[0].technical,'PENDING');
 assert(!JSON.stringify(requests[1]).includes(out.records[0].reviews[0].response_id),'No reviewer leakage');
 let x=fixture();x.sources[0].text+='modified';assert.throws(()=>validate(x),/digest/);
 x=fixture();x.existing_questions.push({id:'injected'});assert.throws(()=>validate(x),/digest/);
 x=fixture();x.exported_at='2000-01-01T00:00:00Z';assert.throws(()=>validate(x),/snapshot/);
 x=fixture();x.sources[0].url='https://127.0.0.1/private';assert.throws(()=>validate(x),/source URL/);
 const errors=await run(fixture(),{model:'test-model',transport:async()=>{throw Error('secret-must-not-leak');}});assert(!JSON.stringify(errors).includes('secret-must-not-leak'));assert(!errors.records[0].content_reviews_complete);
 const fabricated=await run(fixture(),{model:'test-model',transport:async b=>response(b,{result:'PASS',risk:'LOW',findings:[],citations:[{url:fixture().sources[0].url,quote:'this quote does not exist'}]})});assert(!fabricated.records[0].content_reviews_complete);
 const same=await run(fixture(),{model:'test-model',transport:async b=>({...response(b),id:'resp_reused'})});assert(!same.records[0].content_reviews_complete);
 const failed=await run(fixture(),{model:'test-model',transport:async b=>response(b,{result:'FAIL',risk:'HIGH',findings:['Ambiguous answer'],citations:[]})});assert(!failed.records[0].content_reviews_complete);
 const incomplete=await run(fixture(),{model:'test-model',transport:async b=>({...response(b),status:'incomplete'})});assert(!incomplete.records[0].content_reviews_complete);
 await assert.rejects(()=>callOpenAI({},{}),/not configured/);
 let endpoint;await callOpenAI({store:false},{apiKey:'test-only',fetchImpl:async(u,o)=>{endpoint=u;assert.equal(JSON.parse(o.body).store,false);return {ok:true,json:async()=>({})};}});assert.equal(endpoint,'https://api.openai.com/v1/responses');
 console.log('PASS: independent stateless reviews; missing API key; changed source/bank; stale snapshot; invalid host; API failure; invented citation; reused response; refusal/incomplete decisions; content PASS never becomes READY');
})().catch(e=>{console.error(e);process.exitCode=1;});


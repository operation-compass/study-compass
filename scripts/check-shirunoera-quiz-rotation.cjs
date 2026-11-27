'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const worker=fs.readFileSync('worker.js','utf8');
const start=worker.indexOf('  function selectQuizQuestions(');
const end=worker.indexOf('  const params=',start);
assert(start>=0&&end>start,'quiz selection function must be present');
const picker=worker.slice(start,end);
function run(pool,limit,stored){
  const store=stored===undefined?null:stored;
  const context={pool,limit,localStorage:{getItem:()=>store}};
  return vm.runInNewContext(picker+';selectQuizQuestions(pool,limit)',context,{timeout:1000});
}
const pool=Array.from({length:30},(_,i)=>({id:'Q'+(i+1)}));
function saved(entries){return JSON.stringify({schema:1,answers:Object.fromEntries(entries.map(([id,correct])=>[id,{correct}]))})}
const first=run(pool,10,null);
assert.equal(first.length,10);assert.equal(new Set(first.map(q=>q.id)).size,10);
const mastered=saved(pool.slice(0,10).map(q=>[q.id,true]));
for(let i=0;i<8;i++){
  const result=run(pool,10,mastered);
  assert.equal(result.length,10);
  assert(result.every(q=>Number(q.id.slice(1))>10),'new questions should outrank previously mastered first ten');
}
const mixed=saved([...pool.slice(0,3).map(q=>[q.id,false]),...pool.slice(3,13).map(q=>[q.id,true])]);
const selected=run(pool,10,mixed);
assert.equal(selected.length,10);
assert(selected.some(q=>['Q1','Q2','Q3'].includes(q.id)),'earlier mistakes should receive review slots');
assert(selected.some(q=>Number(q.id.slice(1))>13),'unseen questions must not be starved');
assert.equal(new Set(selected.map(q=>q.id)).size,10);
assert.equal(run(pool,100,mixed).length,30);
assert.equal(run(pool,10,'not json').length,10);
assert.equal(run(pool,10,'{"schema":999,"answers":{}}').length,10);
assert(worker.includes('count==="all"?pool:selectQuizQuestions(pool,limit)'), 'full-range session must remain complete');
assert(worker.includes('approvedOnlyHtml(approved)'), 'approved-only source must be preserved');
assert(worker.includes('saveLearningAnswer(q,correct)'), 'learning-history saving must remain present');
console.log('PASS SHIRUNOERA unseen/missed question rotation, approved-only contract and fallback');

const rated=[{id:'low',priority:1},{id:'unknown',priority:null},{id:'high',priority:3},{id:'mid',priority:2}];
assert.equal(run(rated,1,null)[0].id,'high');
assert.equal(Array.from(run(rated,4,null),q=>q.id).join(','),'high,mid,low,unknown');

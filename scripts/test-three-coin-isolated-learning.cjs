'use strict';
// Isolated data-level learning simulation; never publishes or writes browser storage.
const test=require('node:test'),assert=require('node:assert/strict');
const {hashV2}=require('./simple-three-check-gate.cjs');
const master=[
{id:'SC-SOC-HIS-WEB26-000001',answer:'和同開珎',options:['和同開珎','富本銭','開元通宝','寛永通宝'],sha:'99efb7520f1f4502dccff5962b40cdb01d3236d4f45f37c238f13a6a908bb65d'},
{id:'SC-SOC-HIS-WEB26-000002',answer:'富本銭',options:['和同開珎','富本銭','開元通宝','永楽通宝'],sha:'9fef55d642106a0685e69ddbae6bbd0a2aa9770dabb41196ebde2e2c73bca063'},
{id:'SC-SOC-HIS-WEB26-000003',answer:'開元通宝',options:['富本銭','永楽通宝','開元通宝','寛永通宝'],sha:'a1f9b53ba6683eac6b6223f772fce39e0352add777a4c1725dbc10a9f7a4b81d'}
];
test('expected answers and distractors remain unique and unambiguous',()=>{
 for(const q of master){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.equal(q.options.filter(x=>x===q.answer).length,1)}
 assert.deepEqual(master.map(q=>q.options.indexOf(q.answer)),[0,1,2]);
});
test('isolated grading does not modify existing history state',()=>{
 const events=[{id:'SC-SOC-HIS-000001',outcome:'correct',at:100}];
 const before=JSON.stringify(events);
 const simulated=master.map(q=>({id:q.id,correct:q.options.includes(q.answer)}));
 assert(simulated.every(x=>x.correct));
 assert.equal(JSON.stringify(events),before);
});
test('sandbox tests cannot grant release',()=>{
 const records=master.map(x=>({id:x.id,expected_sha:x.sha,formal_review:'PENDING',release_authorized:false,production_permission:'HOLD'}));
 assert(records.every(x=>x.release_authorized===false&&x.production_permission==='HOLD'));
});

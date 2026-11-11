'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validate,validateForDeployment}=require('./check-publish-delta-approval.cjs');
const {hashV2}=require('./simple-three-check-gate.cjs');
// Pinned snapshot read from live Drive MASTER on 2026-10-23, not live Drive API in CI.
const questions=[
{id:'SC-SOC-HIS-WEB26-000001',version:'v0.1',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'奈良・文化',question_type:'4択',question_text:'708年に発行され、律令国家が普及を進めた日本の銅銭は？',choice_a:'和同開珎',choice_b:'富本銭',choice_c:'開元通宝',choice_d:'寛永通宝',correct_answer:'和同開珎',explanation:'和同開珎は708年発行。富本銭はそれ以前に作られた貨幣であり、和同開珎を日本最初の貨幣と断定するのは不適切。'},
{id:'SC-SOC-HIS-WEB26-000002',version:'v0.1',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'奈良・文化',question_type:'4択',question_text:'飛鳥池遺跡で作られ、和同開珎より古い7世紀後半の貨幣は？',choice_a:'和同開珎',choice_b:'富本銭',choice_c:'開元通宝',choice_d:'永楽通宝',correct_answer:'富本銭',explanation:'富本銭は飛鳥池遺跡で製造され、和同開珎より古い7世紀後半の鋳造貨幣。'},
{id:'SC-SOC-HIS-WEB26-000003',version:'v0.1',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'奈良・文化',question_type:'4択',question_text:'708年の和同開珎がモデルにした唐の貨幣は？',choice_a:'富本銭',choice_b:'永楽通宝',choice_c:'開元通宝',choice_d:'寛永通宝',correct_answer:'開元通宝',explanation:'日本銀行貨幣博物館によれば、和同開珎は唐の開元通宝をモデルとして発行された。'}
];
const pinned=['99efb7520f1f4502dccff5962b40cdb01d3236d4f45f37c238f13a6a908bb65d','9fef55d642106a0685e69ddbae6bbd0a2aa9770dabb41196ebde2e2c73bca063','a1f9b53ba6683eac6b6223f772fce39e0352add777a4c1725dbc10a9f7a4b81d'];
const candidates=questions.map((q,i)=>({...q,sha256:hashV2(q)}));
test('pinned actual MASTER question contents match v2 SHA and deny all without approval',()=>{
 candidates.forEach((q,i)=>assert.equal(q.sha256,pinned[i]));
 const r=validate(candidates,[],{});
 assert.equal(r.can_deploy,false);
 assert.equal(r.blocked.length,3);
 for(const b of r.blocked){
  assert.equal(b.type,'NEW');
  assert(b.reasons.includes('MASTER_NOT_PUBLIC'));
  assert(b.reasons.includes('INDIVIDUAL_APPROVAL_MISSING'));
  assert(b.reasons.includes('INDEPENDENT_AUDIT_MISSING'));
 }
 const deployment=validateForDeployment(candidates,[],{});
 assert.equal(deployment.can_deploy,false);
 assert(deployment.blocked.some(b=>b.reasons.includes('TRUSTED_BASELINE_ATTESTATION_NOT_IMPLEMENTED')));
});

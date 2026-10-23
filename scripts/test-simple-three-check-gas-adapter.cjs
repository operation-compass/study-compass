'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildShadowReport}=require('./simple-three-check-gas-adapter.cjs');
const old={candidate:{items:[{id:'A'}]},audit:{records:[]}};
test('legacy GAS bundle cannot be silently promoted',()=>assert.throws(()=>buildShadowReport(old,['A'],[],[]),/No simplified-review records/));
test('missing authenticated bundle is rejected',()=>assert.throws(()=>buildShadowReport({candidate:{items:[]} },[],[],[]),/Existing GAS candidate\/audit bundle/));
test('untrusted missing external approval registry is rejected',()=>assert.throws(()=>buildShadowReport({...old,simple_checks:{records:[]}},['A'],[],null),/Independent canonical inventory/));
test('new records missing actual evidence remain HOLD',()=>{
 const r=buildShadowReport({...old,simple_checks:{records:[]}},['A'],[],[]);
 assert.deepEqual(r.eligible,[]);assert.deepEqual(r.held,['A']);assert.equal(r.production_updated,false);assert.equal(r.legacy_release_unchanged,true);
});

test('separate shadow-only GAS bundle can be assessed without legacy READY audits',()=>{
 const x={mode:'shadow_only',production_updated:false,canonical_master_ids:['A'],candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 const r=buildShadowReport(x,['A'],[],[]);
 assert.deepEqual(r.eligible,[]);assert.deepEqual(r.held,['A']);
 assert.equal(r.source,'canonical_GAS_shadow_preview');
 assert.equal(r.production_updated,false);
});
test('shadow-only GAS bundle rejects embedded legacy release audits',()=>{
 const x={mode:'shadow_only',production_updated:false,...old,simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A'],[],[]),/must not carry legacy/);
});
test('shadow-only flag must explicitly say no production update',()=>{
 const x={mode:'shadow_only',production_updated:true,candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A'],[],[]),/Existing GAS candidate\/audit bundle/);
});

test('shadow inventory missing a canonical MASTER ID fails closed',()=>{
 const x={mode:'shadow_only',production_updated:false,canonical_master_ids:['A'],candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A','B'],[],[]),/inventory differs/);
});
test('shadow inventory with duplicate MASTER IDs fails closed',()=>{
 const x={mode:'shadow_only',production_updated:false,canonical_master_ids:['A','A'],candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A'],[],[]),/unique canonical MASTER/);
});

test('shadow report cannot authorize release without independently authenticated approval provenance',()=>{
 const x={mode:'shadow_only',production_updated:false,canonical_master_ids:['A'],candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 const r=buildShadowReport(x,['A'],[],[]);
 assert.equal(r.release_authorized,false);
 assert.deepEqual(r.eligible,[]);
 assert.equal(r.authorization_blocker,'TRUSTED_APPROVAL_PROVENANCE_NOT_CONNECTED');
});

test('all superficially passing shadow checks remain HOLD, including nested candidate status',()=>{
 const {hashV2}=require('./simple-three-check-gate.cjs');
 const {sha256}=require('./simple-three-check-evidence.cjs');
 const q={id:'SC-TEST-001',subject:'社会',grade:'中2',unit_major:'歴史',
  unit_minor:'室町',question_type:'4択',question_text:'テスト問題',
  choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',
  correct_answer:'A',explanation:'テスト説明',version:'v1'};
 const hash=hashV2(q);
 const evidence={id:q.id,version:q.version,question_sha256:hash,risk:'LOW',
  publication_approved:true,approval_reference:'synthetic-approval'};
 const files=[];
 for(const role of ['accuracy','quality']){
  const reviewer=role+'-synthetic-reviewer',path='docs/audits/'+role+'-synthetic.md';
  const body=q.id+' '+hash+' '+reviewer;
  files.push({path,text:body});
  evidence[role]={reviewer,result:'PASS',checked_at:'2026-10-19',
   question_sha256:hash,evidence_file:path,evidence_sha256:sha256(body)};
 }
 evidence.accuracy.sources=['https://example.org/synthetic-reference'];
 Object.assign(evidence.quality,{duplicate_reviewed:true,existing_web_reviewed:true,
  curriculum_reviewed:true});
 const bundle={mode:'shadow_only',production_updated:false,
  canonical_master_ids:[q.id],candidate:{items:[q]},simple_checks:{records:[evidence]}};
 const approvals=[['synthetic-approval',{id:q.id,version:q.version,question_sha256:hash}]];
 const report=buildShadowReport(bundle,[q.id],files,approvals);
 assert.deepEqual(report.unverified_candidates,[q.id]);
 assert.deepEqual(report.eligible,[]);
 assert.deepEqual(report.held,[q.id]);
 assert.equal(report.release_authorized,false);
 assert.equal(report.candidates[0].preliminary_eligible,true);
 assert.equal(report.candidates[0].eligible,false);
 assert.equal(report.candidates[0].status,'HOLD');
 assert(report.candidates[0].errors.includes('approval_provenance_unverified'));
 // A forged or stale approval must not even count as preliminary success.
 const stale=buildShadowReport(bundle,[q.id],files,
  [['synthetic-approval',{id:q.id,version:q.version,question_sha256:'0'.repeat(64)}]]);
 assert.deepEqual(stale.unverified_candidates,[]);
 assert.deepEqual(stale.held,[q.id]);
 assert.equal(stale.candidates[0].eligible,false);
});

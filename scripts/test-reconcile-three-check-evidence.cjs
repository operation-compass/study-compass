'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reconcile,sha256}=require('./reconcile-three-check-evidence.cjs');
const {hashV2}=require('./simple-three-check-gate.cjs');
const q={id:'TEST-01',version:'v0.1',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'古代',question_type:'4択',question_text:'何？',choice_a:'甲',choice_b:'乙',choice_c:'丙',choice_d:'丁',correct_answer:'甲',explanation:'説明'};
test('missing evidence stays HOLD',()=>{const x=reconcile(q);assert.equal(x.production_permission,'HOLD');assert.equal(x.pending.length,3);assert.equal(x.resolved.length,0)});
test('verified artifact integrity does not grant factual PASS or release',()=>{const digest=hashV2(q),body='TEST-01 '+digest+' reviewer notes',file='docs/audits/test-01.md';const x=reconcile(q,{accuracy:{id:q.id,version:q.version,question_sha256:digest,status:'PASS',evidence_file:file,evidence_sha256:sha256(body)}},new Map([[file,body]]));assert(x.resolved.includes('ACCURACY_ARTIFACT_INTEGRITY'));assert(x.pending.includes('ACCURACY_VERIFIED_AUTHORITY_AND_SUBSTANCE'));assert.equal(x.release_authorized,false);assert.equal(x.formal_review,'PENDING')});
test('tampered artifact and mismatched SHA cannot be resolved',()=>{const digest=hashV2(q),file='docs/audits/test-01.md';const x=reconcile(q,{accuracy:{id:q.id,version:q.version,question_sha256:digest,status:'PASS',evidence_file:file,evidence_sha256:sha256('original')}},new Map([[file,'tampered']]));assert(!x.resolved.length);assert(x.pending.includes('ACCURACY_ARTIFACT_MISSING_OR_CHANGED'))});

test('wrong question, stale version and wrong question hash never resolve',()=>{
 const digest=hashV2(q),file='docs/audits/test-01.md',body=q.id+' '+digest;
 for(const override of [{id:'OTHER'},{version:'v0.2'},{question_sha256:'b'.repeat(64)}]){
  const record={id:q.id,version:q.version,question_sha256:digest,status:'PASS',evidence_file:file,evidence_sha256:sha256(body),...override};
  const x=reconcile(q,{accuracy:record},new Map([[file,body]]));
  assert(!x.resolved.length);
  assert(x.pending.includes('ACCURACY_IDENTITY_MISMATCH'));
  assert.equal(x.production_permission,'HOLD');
 }
});
test('all three role documents cannot be reused even with apparently valid hashes',()=>{
 const digest=hashV2(q),file='docs/audits/shared.md',body=q.id+' '+digest;
 const make=()=>({id:q.id,version:q.version,question_sha256:digest,status:'PASS',evidence_file:file,evidence_sha256:sha256(body)});
 for(const pair of [['accuracy','quality'],['accuracy','technical'],['quality','technical']]){
  const x=reconcile(q,{[pair[0]]:make(),[pair[1]]:make()},new Map([[file,body]]));
  assert(x.errors.includes('REUSED_REVIEW_ARTIFACT'),pair.join('/'));
  assert.equal(x.release_authorized,false);
 }
});
test('artifact with correct bytes but no bound ID/hash is rejected',()=>{
 const digest=hashV2(q),file='docs/audits/evidence.md',body='unbound notes';
 const x=reconcile(q,{technical:{id:q.id,version:q.version,question_sha256:digest,status:'PASS',evidence_file:file,evidence_sha256:sha256(body)}},new Map([[file,body]]));
 assert(x.pending.includes('TECHNICAL_ARTIFACT_IDENTITY_MISMATCH'));
 assert.equal(x.release_authorized,false);
});

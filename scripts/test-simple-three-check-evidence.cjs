'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {hashV2}=require('./simple-three-check-gate.cjs');
const {verifyThreeCheckArtifacts,sha256}=require('./simple-three-check-evidence.cjs');
function sample(){
 const q={id:'TEST-1',subject:'社会',grade:'中2',unit_major:'歴史',unit_minor:'室町',question_type:'4択',question_text:'問題？',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'説明',version:'v1'};
 const hash=hashV2(q),artifacts=new Map();
 const e={id:q.id,version:q.version,question_sha256:hash,risk:'LOW',publication_approved:true,approval_reference:'approved/1'};
 for(const role of ['accuracy','quality']){
  const reviewer=role+'-reviewer',file='docs/audits/'+role+'.md',body=q.id+' '+hash+' '+reviewer;
  artifacts.set(file,body);
  e[role]={reviewer,result:'PASS',checked_at:'2026-10-19',question_sha256:hash,evidence_file:file,evidence_sha256:sha256(body)};
 }
 e.accuracy.sources=['https://example.org/reference'];
 Object.assign(e.quality,{duplicate_reviewed:true,existing_web_reviewed:true,curriculum_reviewed:true});
 return {q,e,artifacts,ids:[q.id],approvals:new Set(['approved/1'])};
}
const verify=s=>verifyThreeCheckArtifacts(s.q,s.e,s.ids,s.artifacts,s.approvals);
test('real artifact hashes and trusted registry are required',()=>{assert.equal(verify(sample()).eligible,true);});
test('candidate-declared approval without external registry fails',()=>{const s=sample();s.approvals=new Set();assert.equal(verify(s).eligible,false);});
test('modified artifact fails',()=>{const s=sample();s.artifacts.set('docs/audits/accuracy.md','rewritten');assert.equal(verify(s).eligible,false);});
test('missing artifact fails',()=>{const s=sample();s.artifacts.delete('docs/audits/quality.md');assert.equal(verify(s).eligible,false);});
test('wrong reviewer in artifact fails',()=>{const s=sample(),f='docs/audits/quality.md';const content=s.artifacts.get(f).replace('quality-reviewer','someone-else');s.artifacts.set(f,content);s.e.quality.evidence_sha256=sha256(content);assert.equal(verify(s).eligible,false);});
test('path traversal fails',()=>{const s=sample();s.e.accuracy.evidence_file='docs/audits/../accuracy.md';assert.equal(verify(s).eligible,false);});
test('SHA changed with no re-review fails',()=>{const s=sample();s.q.question_text='別の問題';assert.equal(verify(s).eligible,false);});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {hashV2}=require('./simple-three-check-gate.cjs');
const {sha256}=require('./simple-three-check-evidence.cjs');
const {previewSimpleThreeChecks}=require('./verify-auto-publication.cjs');
function fixture(){
 const q={id:'SC-TEST-001',subject:'社会',grade:'中2',unit_major:'歴史',unit_minor:'室町',question_type:'4択',question_text:'問題',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'説明',version:'v1'};
 const hash=hashV2(q),e={id:q.id,version:q.version,question_sha256:hash,risk:'LOW',publication_approved:true,approval_reference:'approval-1'};
 const index=[];
 for(const role of ['accuracy','quality']){
  const reviewer=role+'-reviewer',path='docs/audits/'+role+'.md',text=q.id+' '+hash+' '+reviewer;
  index.push({path,text,sha:sha256(text)});
  e[role]={result:'PASS',reviewer,checked_at:'2026-10-19',question_sha256:hash,evidence_file:path,evidence_sha256:sha256(text)};
 }
 e.accuracy.sources=['https://example.org/source'];
 Object.assign(e.quality,{duplicate_reviewed:true,existing_web_reviewed:true,curriculum_reviewed:true});
 return {bundle:{candidate:{items:[q]},simple_checks:{records:[e]}},index,approval:new Map([['approval-1',{id:q.id,version:q.version,question_sha256:hash}]])};
}
test('valid shadow evaluation never grants actual release',()=>{
 const f=fixture(),r=previewSimpleThreeChecks(f.bundle,f.index,f.approval,['SC-TEST-001']);
 assert.deepEqual(r.eligible,['SC-TEST-001']);assert.equal(r.production_updated,false);assert.equal(r.mode,'shadow_only');
});
test('untrusted approval is held in shadow evaluation',()=>{
 const f=fixture(),r=previewSimpleThreeChecks(f.bundle,f.index,new Map(),['SC-TEST-001']);
 assert.deepEqual(r.eligible,[]);assert.deepEqual(r.held,['SC-TEST-001']);
});
test('missing verified audit evidence is held',()=>{
 const f=fixture();f.index=[];const r=previewSimpleThreeChecks(f.bundle,f.index,f.approval,['SC-TEST-001']);
 assert.deepEqual(r.held,['SC-TEST-001']);
});
test('duplicate candidate IDs fail closed',()=>{
 const f=fixture();f.bundle.candidate.items.push({...f.bundle.candidate.items[0]});
 assert.throws(()=>previewSimpleThreeChecks(f.bundle,f.index,f.approval,['SC-TEST-001']),/Duplicate/);
});
test('missing complete master inventory fails closed',()=>{const f=fixture();assert.throws(()=>previewSimpleThreeChecks(f.bundle,f.index,f.approval),/MASTER ID inventory/);});
test('candidate omitted from full master inventory remains HOLD',()=>{const f=fixture();const r=previewSimpleThreeChecks(f.bundle,f.index,f.approval,['SC-OTHER-001']);assert.deepEqual(r.eligible,[]);});
test('duplicate IDs in canonical MASTER fail closed',()=>{const f=fixture();assert.throws(()=>previewSimpleThreeChecks(f.bundle,f.index,f.approval,['SC-TEST-001','SC-TEST-001']),/Duplicate MASTER/);});

test('duplicate evidence paths fail closed rather than last-writer wins',()=>{
 const f=fixture();
 f.index.push({...f.index[0],text:'forged evidence'});
 assert.throws(()=>previewSimpleThreeChecks(f.bundle,f.index,f.approval,['SC-TEST-001']),/Duplicate evidence path/);
});

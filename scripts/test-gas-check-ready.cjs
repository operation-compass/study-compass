#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync('integrations/apps-script/StudyCompassSync.gs','utf8');
const cols=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
function question(id,status){return {question_id:id,status,subject:'社会',question_type:'4択',question_text:'710年に遷都した都は？',choice_a:'平城京',choice_b:'平安京',choice_c:'藤原京',choice_d:'長岡京',correct_answer:'平城京',explanation:'710年に遷都',version:'1',publish_flag:status==='PUBLIC'};}
const q1=question('CHECK_READY','CHECK'),q2=question('CHECK_HOLD','CHECK'),q3=question('PUBLIC_EXISTING','PUBLIC'),q4=question('CHECK_WRONG_SHA','CHECK');
const sha=q=>crypto.createHash('sha256').update(JSON.stringify(cols.map(k=>String((k==='id'?q.question_id:q[k])??'')))).digest('hex');
function audit(q,ready){return {question_id:q.question_id,question_version:'1',content_sha256:ready?sha(q):'wrong',audit_1_accuracy:'PASS',audit_1_checked_at:'2026-10-16',audit_1_evidence_url:'https://example.org/source',audit_2_quality:'PASS',audit_2_checked_at:'2026-10-16',audit_3_technical:'PASS',audit_3_checked_at:'2026-10-16',risk_class:'LOW',exception_reason:'',final_decision:ready?'READY':'HOLD',last_reviewed_at:'2026-10-16'};}
function sheet(rows){const headers=Object.keys(rows[0]);return {getDataRange(){return {getValues(){return [headers,...rows.map(x=>headers.map(k=>x[k]))]}}}}}
const sheets={'問題MASTER':sheet([q1,q2,q3,q4]),'Web自動公開｜3段階監査ログ':sheet([audit(q1,true),audit(q2,false),{...audit(q4,true),content_sha256:'wrong'}])};
const context={SpreadsheetApp:{openById:()=>({getSheetByName:name=>sheets[name]})},Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()].map(x=>x>127?x-256:x)},Logger:{log:()=>{}}};
vm.createContext(context);vm.runInContext(source,context,{filename:'StudyCompassSync.gs'});
const found=context.studyCollect_(),ids=Array.from(found.items,x=>x.id).sort();
assert.deepEqual(ids,['CHECK_READY','PUBLIC_EXISTING']);
assert.equal(found.scanned,4);
assert.equal(found.items.find(x=>x.id==='CHECK_READY').version,'1');
console.log('GAS CHECK status requires 3PASS, LOW, matching SHA; HOLD and invalid SHA excluded; PUBLIC retained.');

const recent=new Date().toISOString(),old=new Date(Date.now()-13*3600000).toISOString();
const snapshot=t=>({candidate:{items:[{id:'A'}]},audit:{records:[]},approval:{mode:'ai_three_stage',source_spreadsheet_id:'S',exported_at:t}});
assert.equal(context.studySameSnapshot_(snapshot(recent),snapshot(recent)),true);
assert.equal(context.studySameSnapshot_(snapshot(old),snapshot(recent)),false,'12h refresh mandatory');
assert.equal(context.studySameSnapshot_(snapshot('not-a-date'),snapshot(recent)),false);
console.log('GAS snapshot freshness and Base64 normalization guards verified.');

// V2 covers learning metadata; v1 remains backward compatible.
const v2q={id:'V2',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'古代',question_type:'4択',question_text:'Question',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'Explain'};
const hashV1=context.studySha_(v2q,'v1'),hashV2=context.studySha_(v2q,'v2');
assert.notEqual(hashV1,hashV2);
assert.equal(context.studySha_(v2q),hashV1);
assert.notEqual(context.studySha_({...v2q,grade:'中2'},'v2'),hashV2);
assert.notEqual(context.studySha_({...v2q,unit_minor:'中世'},'v2'),hashV2);
assert.throws(()=>context.studySha_(v2q,'v3'),/Unsupported SHA version/);
console.log('GAS v2 SHA covers grade and units; v1 historical hashes preserved.');

const preview=context.studyAuditMigrationPreview();
assert.equal(preview.mode,'read_only');
assert.equal(preview.has_hash_version_column,false);
assert.equal(preview.v1,3);
assert.equal(preview.v2,0);
assert.equal(preview.ready_v1,2);
assert.equal(preview.production_updated,false);
console.log('Read-only migration preflight does not require a new sheet column or rewrite existing audit.');

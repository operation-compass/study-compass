'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.STUDY={spreadsheetId:'test-sheet',source:'問題MASTER'};
global.STUDY_FIELDS_V2=['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
global.studySha_=()=> 'a'.repeat(64);
let rows=[],checks=[];
global.SpreadsheetApp={openById:id=>{assert.equal(id,'test-sheet');return {getSheetByName:name=>({name})}}};
global.studyRows_=()=>rows;
global.scReadSimpleChecks_=()=>({records:checks});
global.Logger={log:()=>{}};
const {studySimpleThreeMigrationPreview}=require('../gas/sc-simple-three-migration-preview.gs');
test('new check candidates counted even when legacy selector would exclude them',()=>{
 rows=[{question_id:'SC-001',status:'CHECK',publish_flag:false,version:'v1'}];
 checks=[{id:'SC-001',version:'v1',question_sha256:'a'.repeat(64),accuracy:{result:'PASS'},quality:{result:'PASS'}}];
 const r=studySimpleThreeMigrationPreview();
 assert.equal(r.matched_records,1);
 assert.equal(r.pass_claims_unverified,1);
 assert.equal(r.eligible_for_publication,0);
 assert.equal(r.production_updated,false);
});
test('unknown question IDs reported and not released',()=>{
 rows=[{question_id:'SC-001'}];checks=[{id:'UNKNOWN',question_sha256:'b'.repeat(64)}];
 const r=studySimpleThreeMigrationPreview();
 assert.deepEqual(r.missing_master_ids,['UNKNOWN']);
 assert.equal(r.eligible_for_publication,0);
});
test('duplicate master is rejected',()=>{
 rows=[{question_id:'SC-001'},{question_id:'SC-001'}];checks=[];
 assert.throws(()=>studySimpleThreeMigrationPreview(),/Duplicate MASTER/);
});
test('invalid content hash reported',()=>{
 rows=[{question_id:'SC-001'}];checks=[{id:'SC-001',question_sha256:'not-a-hash'}];
 assert.deepEqual(studySimpleThreeMigrationPreview().invalid_hashes,['SC-001']);
});

test('tampered review SHA is compared to actual MASTER not just 64 hex digits',()=>{
 rows=[{question_id:'SC-001',status:'CHECK',publish_flag:false,version:'v1'}];
 checks=[{id:'SC-001',version:'v1',question_sha256:'b'.repeat(64)}];
 assert.deepEqual(studySimpleThreeMigrationPreview().mismatched_master_hashes,['SC-001']);
});
test('stale question version is reported even when content SHA agrees',()=>{
 rows=[{question_id:'SC-001',status:'CHECK',publish_flag:false,version:'v2'}];
 checks=[{id:'SC-001',version:'v1',question_sha256:'a'.repeat(64)}];
 assert.deepEqual(studySimpleThreeMigrationPreview().mismatched_master_hashes,['SC-001']);
});
test('public or withdrawn MASTER row cannot be previewed as current candidate',()=>{
 rows=[{question_id:'SC-001',status:'PUBLIC',publish_flag:true,version:'v1'}];
 checks=[{id:'SC-001',version:'v1',question_sha256:'a'.repeat(64)}];
 assert.deepEqual(studySimpleThreeMigrationPreview().blocked_master_status,['SC-001']);
 assert.equal(studySimpleThreeMigrationPreview().eligible_for_publication,0);
});

test('blank publication flag is flagged in preview',()=>{
 rows=[{question_id:'SC-001',status:'CHECK',publish_flag:'',version:'v1'}];
 checks=[{id:'SC-001',version:'v1',question_sha256:'a'.repeat(64)}];
 assert.deepEqual(studySimpleThreeMigrationPreview().blocked_master_status,['SC-001']);
});

test('empty new-review sheet remains read-only and publishes nothing',()=>{
 rows=[{question_id:'SC-001',status:'CHECK',publish_flag:false,version:'v1'}];checks=[];
 const before=JSON.stringify(rows);
 const result=studySimpleThreeMigrationPreview();
 assert.equal(result.review_records,0);
 assert.equal(result.eligible_for_publication,0);
 assert.equal(result.production_updated,false);
 assert.equal(JSON.stringify(rows),before);
});

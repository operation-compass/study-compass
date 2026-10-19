'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.STUDY={spreadsheetId:'test-sheet',source:'問題MASTER'};
let rows=[],checks=[];
global.SpreadsheetApp={openById:id=>{assert.equal(id,'test-sheet');return {getSheetByName:name=>({name})}}};
global.studyRows_=()=>rows;
global.scReadSimpleChecks_=()=>({records:checks});
global.Logger={log:()=>{}};
const {studySimpleThreeMigrationPreview}=require('../gas/sc-simple-three-migration-preview.gs');
test('new check candidates counted even when legacy selector would exclude them',()=>{
 rows=[{question_id:'SC-001',status:'CHECK',publish_flag:false}];
 checks=[{id:'SC-001',question_sha256:'a'.repeat(64),accuracy:{result:'PASS'},quality:{result:'PASS'}}];
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

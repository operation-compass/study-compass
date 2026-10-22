'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('gas/sc-auto-three-check-exception-preview.gs','utf8');
test('classifies exceptions without upgrading approval',()=>{
 const ctx={Logger:{log(){}},studyPreviewThreeCoinsExceptionsReadOnly(){return {results:[{id:'SC-SOC-HIS-WEB26-000001',version:'v0.1',sha256_v2:'a'.repeat(64),exceptions:['SOURCE_CONTENT_NOT_AUTOMATICALLY_VERIFIED','CURRICULUM_REVIEW_NOT_VERIFIED','TECHNICAL_PREFLIGHT_FAILED','TRUSTED_RELEASE_AUTHORIZATION_MISSING']}]}}};
 vm.runInNewContext(src,ctx);
 const result=JSON.parse(JSON.stringify(ctx.studyClassifyThreeCoinsExceptionsReadOnly()));
 assert.equal(result.production_permission,'HOLD');
 assert.equal(result.release_authorized,false);
 assert.deepEqual(result.results[0].machine_checkable,['TECHNICAL_PREFLIGHT_FAILED']);
 assert.deepEqual(result.results[0].evidence_or_independent_review_required,['SOURCE_CONTENT_NOT_AUTOMATICALLY_VERIFIED','CURRICULUM_REVIEW_NOT_VERIFIED','TRUSTED_RELEASE_AUTHORIZATION_MISSING']);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.STUDY={spreadsheetId:'canonical-test'};
let snapshot;
global.scBuildSimpleShadowCandidates_=()=>snapshot;
const {scPreviewNewReviewStagingBundle_}=require('../gas/sc-preview-new-review-bundle.gs');
const base=()=>({mode:'shadow_only',production_updated:false,candidate:{items:[{id:'SC-1'}]},simple_checks:{records:[{id:'SC-1',accuracy:{result:'PENDING'}}]},canonical_master_ids:['SC-1','SC-2'],held:[]});
test('shadow bundle cannot manufacture legacy review PASS or publication approval',()=>{
 snapshot=base();const b=scPreviewNewReviewStagingBundle_();
 assert.deepEqual(b.audit.records,[]);
 assert.equal(b.approval.publication_approved,false);
 assert.equal(b.approval.mode,'shadow_only');
 assert.equal(b.production_updated,false);
 assert.deepEqual(b.simple_checks.records,snapshot.simple_checks.records);
});
test('reject missing canonical ID inventory',()=>{
 snapshot=base();delete snapshot.canonical_master_ids;
 assert.throws(()=>scPreviewNewReviewStagingBundle_(),/Invalid shadow/);
});
test('reject candidates not in MASTER',()=>{
 snapshot=base();snapshot.candidate.items=[{id:'NOT-IN-MASTER'}];
 assert.throws(()=>scPreviewNewReviewStagingBundle_(),/not in canonical MASTER/);
});
test('reject fake production mode',()=>{
 snapshot=base();snapshot.mode='production';
 assert.throws(()=>scPreviewNewReviewStagingBundle_(),/Invalid shadow/);
});
test('duplicate canonical ID fails closed',()=>{
 snapshot=base();snapshot.canonical_master_ids.push('SC-1');
 assert.throws(()=>scPreviewNewReviewStagingBundle_(),/duplicate canonical/);
});

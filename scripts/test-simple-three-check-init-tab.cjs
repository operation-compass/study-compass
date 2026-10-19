'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.STUDY={spreadsheetId:'canonical-id'};
let tab=null,insertions=0,lockReleases=0;
const headers=['question_id','question_version','content_sha256','simple_check_record_json'];
function fakeTab(values){
 return {getRange:()=>({getValues:()=>[values],setValues:next=>{values=next[0]},setFontWeight:()=>{}}),setFrozenRows:()=>{}};
}
global.SpreadsheetApp={openById:id=>{
 assert.equal(id,'canonical-id');return {
  getSheetByName:name=>{assert.equal(name,'Web自動公開｜新3チェック記録');return tab;},
  insertSheet:name=>{insertions++;tab=fakeTab([]);return tab;}
 };
}};
global.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{lockReleases++}})};
const {scInitializeSimpleReviewTab_}=require('../gas/sc-initialize-simple-review-tab.gs');
test('first initialization creates only empty review headers, no records',()=>{
 tab=null;insertions=0;
 const r=scInitializeSimpleReviewTab_();
 assert.equal(r.created,true);assert.equal(r.review_records_added,0);
 assert.equal(r.production_updated,false);assert.equal(insertions,1);
 assert.deepEqual(tab.getRange().getValues()[0],headers);
});
test('second initialization is a no-op, preserves existing records',()=>{
 const r=scInitializeSimpleReviewTab_();
 assert.equal(r.created,false);assert.equal(insertions,1);
});
test('incompatible existing tab is never overwritten',()=>{
 tab=fakeTab(['bad','columns','already','present']);
 assert.throws(()=>scInitializeSimpleReviewTab_(),/incompatible headers/);
 assert.equal(insertions,1);
});

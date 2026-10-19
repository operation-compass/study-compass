'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
global.STUDY={spreadsheetId:'test',source:'問題MASTER'};
const q={question_id:'SC-1',subject:'社会',grade:'中2',unit_major:'歴史',unit_minor:'室町',question_type:'4択',question_text:'問い',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'解説',version:'v1',status:'CHECK',publish_flag:false};
const fields=['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
function hash(row){const vals=fields.map(k=>String((k==='id'?row.question_id:row[k])??''));return crypto.createHash('sha256').update(JSON.stringify(vals)).digest('hex');}
let rows=[],records=[];
let reviewTabExists=true;
global.SpreadsheetApp={openById:()=>({getSheetByName:name=>name==='Web自動公開｜新3チェック記録'&&!reviewTabExists?null:{}})};
global.studyRows_=()=>rows;global.scReadSimpleChecks_=()=>({records});
global.studyValidV2Metadata_=q=>/^中[123]$/.test(q.grade)&&!!q.unit_major&&!!q.unit_minor;
global.studySha_=q=>crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');
const {scBuildSimpleShadowCandidates_}=require('../gas/sc-simple-shadow-candidates.gs');
test('CHECK with publish_flag false is read into shadow only with SHA match',()=>{
 rows=[q];records=[{id:'SC-1',version:'v1',question_sha256:hash(q)}];
 const r=scBuildSimpleShadowCandidates_();assert.equal(r.candidate.items.length,1);
 assert.equal(r.production_updated,false);assert.equal(r.mode,'shadow_only');
 assert.deepEqual(r.canonical_master_ids,['SC-1']);
});
test('mismatched sha stays held',()=>{
 rows=[q];records=[{id:'SC-1',version:'v1',question_sha256:'0'.repeat(64)}];
 const r=scBuildSimpleShadowCandidates_();assert.equal(r.candidate.items.length,0);
 assert.equal(r.held[0].reason,'SHA_OR_METADATA_MISMATCH');
});
test('unknown review ID stays held',()=>{
 rows=[q];records=[{id:'unknown',version:'v1'}];
 assert.equal(scBuildSimpleShadowCandidates_().held[0].reason,'MASTER_ID_NOT_FOUND');
});
test('duplicate master ID rejects staging',()=>{
 rows=[q,{...q}];records=[];assert.throws(()=>scBuildSimpleShadowCandidates_(),/Duplicate MASTER/);
});
test('no actual new review records gives no candidates',()=>{
 rows=[q];records=[];assert.equal(scBuildSimpleShadowCandidates_().candidate.items.length,0);
});

test('PUBLISHED or PUBLIC MASTER record cannot become shadow candidate',()=>{
 rows=[{...q,status:'PUBLIC',publish_flag:true}];records=[{id:'SC-1',version:'v1',question_sha256:hash(q)}];
 const result=scBuildSimpleShadowCandidates_();
 assert.deepEqual(result.candidate.items,[]);
 assert.equal(result.held[0].reason,'MASTER_NOT_CHECK_UNPUBLISHED');
});
test('retired MASTER question cannot be resurrected by an old review',()=>{
 rows=[{...q,status:'ARCHIVED',publish_flag:false}];records=[{id:'SC-1',version:'v1',question_sha256:hash(q)}];
 assert.equal(scBuildSimpleShadowCandidates_().candidate.items.length,0);
});
test('CHECK with publish_flag true is held even if SHA matches',()=>{
 rows=[{...q,status:'CHECK',publish_flag:true}];records=[{id:'SC-1',version:'v1',question_sha256:hash(q)}];
 assert.equal(scBuildSimpleShadowCandidates_().held[0].reason,'MASTER_NOT_CHECK_UNPUBLISHED');
});

test('missing real new-review tab fails explicitly, not silently as empty approval',()=>{
 reviewTabExists=false;
 try{assert.throws(()=>scBuildSimpleShadowCandidates_(),/NEW_THREE_CHECK_REVIEW_TAB_MISSING/);}
 finally{reviewTabExists=true;}
});

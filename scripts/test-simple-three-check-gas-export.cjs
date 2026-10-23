'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scReadSimpleChecks_}=require('../gas/sc-simple-check-export.gs');
const headers=['question_id','question_version','content_sha256','simple_check_record_json'];
const sha='a'.repeat(64);
const record={id:'SC-001',version:'v2',question_sha256:sha,accuracy:{result:'PENDING'}};
function sheet(rows){return {getSheetByName:name=>name==='Web自動公開｜新3チェック記録'&&rows?{getDataRange:()=>({getValues:()=>rows})}:null};}
test('missing review tab returns zero without auto PASS',()=>assert.deepEqual(scReadSimpleChecks_(sheet(null)),{records:[]}));
test('empty review tab returns zero',()=>assert.deepEqual(scReadSimpleChecks_(sheet([headers])),{records:[]}));
test('record exported without changing PENDING',()=>{const x=scReadSimpleChecks_(sheet([headers,['SC-001','v2',sha,JSON.stringify(record)]]));assert.deepEqual(x.records,[record]);});
test('wrong SHA rejected',()=>assert.throws(()=>scReadSimpleChecks_(sheet([headers,['SC-001','v2','b'.repeat(64),JSON.stringify(record)]])),/mismatch/));
test('duplicate review IDs rejected',()=>assert.throws(()=>scReadSimpleChecks_(sheet([headers,['SC-001','v2',sha,JSON.stringify(record)],['SC-001','v2',sha,JSON.stringify(record)]])),/Duplicate/));
test('bad JSON rejected',()=>assert.throws(()=>scReadSimpleChecks_(sheet([headers,['SC-001','v2',sha,'{invalid']])),/Invalid/));
test('missing required header rejected',()=>assert.throws(()=>scReadSimpleChecks_(sheet([headers.slice(0,3),['SC-001','v2',sha]])),/Missing/));

test('headerless existing review tab is invalid rather than empty approval',()=>assert.throws(()=>scReadSimpleChecks_(sheet([])),/no header/));
test('blank review ID with populated cells is not silently discarded',()=>assert.throws(()=>scReadSimpleChecks_(sheet([headers,['','v2',sha,JSON.stringify(record)]])),/missing question_id/));
test('fully blank unused review row is ignored',()=>assert.deepEqual(scReadSimpleChecks_(sheet([headers,['','','','']])),{records:[]}));

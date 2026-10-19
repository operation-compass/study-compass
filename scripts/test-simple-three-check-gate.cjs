'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {preflightQuestion,hashV2} = require('./simple-three-check-gate.cjs');
function fixture() {
 const q={id:'SC-TEST-001',subject:'社会',grade:'中2',unit_major:'歴史',unit_minor:'室町時代',question_type:'4択',question_text:'自治的な村を何というか。',choice_a:'惣村',choice_b:'城下町',choice_c:'門前町',choice_d:'条里制',correct_answer:'惣村',explanation:'寄合による自治を行いました。',version:'test-v1'};
 const sha=hashV2(q),today='2026-10-19';
 const e={id:q.id,version:q.version,question_sha256:sha,accuracy:{result:'PASS',reviewer:'content-review',checked_at:today,question_sha256:sha,sources:['https://www.rekihaku.ac.jp/']},quality:{result:'PASS',reviewer:'quality-review',checked_at:today,question_sha256:sha,duplicate_reviewed:true,existing_web_reviewed:true,curriculum_reviewed:true},risk:'LOW',publication_approved:true};
 return {q,e};
}
test('valid candidate passes preflight but is not READY',()=>{const {q,e}=fixture();const r=preflightQuestion(q,e,[q.id]);assert.equal(r.eligible,true);assert.equal(r.status,'PRECHECK_PASS');});
test('missing approval blocks',()=>{const {q,e}=fixture();e.publication_approved=false;assert.equal(preflightQuestion(q,e).eligible,false);});
test('wrong hash blocks',()=>{const {q,e}=fixture();q.question_text+='変更';assert.equal(preflightQuestion(q,e).eligible,false);});
test('unverified duplication blocks',()=>{const {q,e}=fixture();e.quality.existing_web_reviewed=false;assert.equal(preflightQuestion(q,e).eligible,false);});
test('ambiguous grades block',()=>{const {q,e}=fixture();q.grade='中1〜中3';assert.equal(preflightQuestion(q,e).eligible,false);});
test('duplicate choices block',()=>{const {q,e}=fixture();q.choice_b=q.choice_a;assert.equal(preflightQuestion(q,e).eligible,false);});
test('two equal master IDs block',()=>{const {q,e}=fixture();assert.equal(preflightQuestion(q,e,[q.id,q.id]).eligible,false);});
test('missing evidence blocks',()=>{const {q}=fixture();assert.equal(preflightQuestion(q,null).eligible,false);});

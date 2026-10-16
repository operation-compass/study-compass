'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{selectReady}=require('./select-ready-candidates.cjs');
const b=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/staging/drive-sync-bundle.json'),'utf8'));
const actual=selectReady(b);
assert.equal(actual.total,5);assert.deepEqual(actual.ready,[]);assert.equal(actual.held.length,5);
const clone=JSON.parse(JSON.stringify(b));
clone.audit.records[0].final_decision='READY'; // HOLD must still be enforced by risk, exception, evidence time
assert.deepEqual(selectReady(clone).ready,actual.ready);
assert.throws(()=>selectReady({...b,audit:{records:[...b.audit.records,b.audit.records[0]]}}),/Duplicate/);
const corrupt=JSON.parse(JSON.stringify(b));
corrupt.audit.records[1].accuracy_checked_at='not-a-date';
assert.deepEqual(selectReady(corrupt).ready,[],'Malformed audit dates cannot release');
const corrupt2=JSON.parse(JSON.stringify(b));
corrupt2.audit.records[1].technical_checked_at='2026-99-99';
assert.deepEqual(selectReady(corrupt2).ready,[],'Impossible audit dates cannot release');
const future=JSON.parse(JSON.stringify(b));
future.audit.records[1].checked_at='2099-01-01';
assert.deepEqual(selectReady(future).ready,[],'Future-dated audit cannot release');
console.log('Historical staged records lacking independent attestations: 0 release-eligible, 5 HOLD; no deployment.');

const unknownVersion=JSON.parse(JSON.stringify(b));
unknownVersion.audit.records[1].hash_version='v3';
assert.deepEqual(selectReady(unknownVersion).ready,[],'Unknown hash versions cannot fall back to v1');
const missingV2Metadata=JSON.parse(JSON.stringify(b));
missingV2Metadata.audit.records[1].hash_version='v2';
missingV2Metadata.candidate.items[1].unit_minor='';
assert.deepEqual(selectReady(missingV2Metadata).ready,[],'Incomplete v2 unit metadata blocks release');

const signedShape=JSON.parse(JSON.stringify(b));
const q=signedShape.candidate.items.find(x=>x.id==='SC-SOC-HIS-000002');
const r=signedShape.audit.records.find(x=>x.id===q.id);
r.independent_reviews=['accuracy','quality','technical'].map((role,i)=>({
 role,result:'PASS',reviewer_id:'fixture-analyst-'+i,evidence_sha256:'0123456789abcdef'.repeat(4),
 question_sha256:r.sha256,checked_at:'2026-10-16'
}));
assert.deepEqual(selectReady(signedShape).ready,[q.id],'Complete synthetic role-separated review structure may pass');
const duplicateReviewer=JSON.parse(JSON.stringify(signedShape));
duplicateReviewer.audit.records[1].independent_reviews[1].reviewer_id='reviewer-0';
assert.deepEqual(selectReady(duplicateReviewer).ready,[],'Repeated reviewer identity must block');
const alteredReview=JSON.parse(JSON.stringify(signedShape));
alteredReview.audit.records[1].independent_reviews[2].question_sha256='0'.repeat(64);
assert.deepEqual(selectReady(alteredReview).ready,[],'Review must bind to question hash');
const missingReview=JSON.parse(JSON.stringify(signedShape));
missingReview.audit.records[1].independent_reviews.pop();
assert.deepEqual(selectReady(missingReview).ready,[],'Missing independent stage must block');
console.log('Synthetic review-shape gate: duplicate identities, missing stage, tampered content binding all blocked.');

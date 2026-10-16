'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{selectReady}=require('./select-ready-candidates.cjs');
const b=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/staging/drive-sync-bundle.json'),'utf8'));
const actual=selectReady(b);
assert.equal(actual.total,5);assert.deepEqual(actual.ready,['SC-SOC-HIS-000002']);assert.equal(actual.held.length,4);
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
console.log('Real staged candidate selection: 1 READY, 4 HOLD; invalid dates blocked; no deployment.');

const unknownVersion=JSON.parse(JSON.stringify(b));
unknownVersion.audit.records[1].hash_version='v3';
assert.deepEqual(selectReady(unknownVersion).ready,[],'Unknown hash versions cannot fall back to v1');
const missingV2Metadata=JSON.parse(JSON.stringify(b));
missingV2Metadata.audit.records[1].hash_version='v2';
missingV2Metadata.candidate.items[1].unit_minor='';
assert.deepEqual(selectReady(missingV2Metadata).ready,[],'Incomplete v2 unit metadata blocks release');

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{selectReady}=require('./select-ready-candidates.cjs');
const b=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/staging/drive-sync-bundle.json'),'utf8'));
const actual=selectReady(b);
assert.equal(actual.total,5);assert.equal(actual.ready.length,0);assert.equal(actual.held.length,5);
const clone=JSON.parse(JSON.stringify(b));
clone.audit.records[0].final_decision='READY'; // HOLD must still be enforced by risk, exception, evidence time
assert.equal(selectReady(clone).ready.length,0);
assert.throws(()=>selectReady({...b,audit:{records:[...b.audit.records,b.audit.records[0]]}}),/Duplicate/);
console.log('Real staged candidate selection: 0 READY, 5 HOLD; no deployment.');

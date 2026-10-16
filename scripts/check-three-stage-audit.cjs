#!/usr/bin/env node
'use strict';
// Read-only three-stage audit checker. Never authorizes deployment or approvals.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {selectReady}=require('./select-ready-candidates.cjs');
try {
 const bundle=JSON.parse(fs.readFileSync(process.argv[2]||'', 'utf8'));
 const audit=process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : bundle.audit;
 assert(Array.isArray(bundle.candidate?.items) && bundle.candidate.items.length>0,'Nonempty candidate items required');
 assert(Array.isArray(audit?.records),'Audit records missing');
 // The reporting checker and release selector must use the same v1/v2 and evidence rules.
 const selected=selectReady({...bundle,audit});
 const ready=selected.ready.length,held=selected.held.length;
 console.log(JSON.stringify({reviewed:bundle.candidate.items.length,ready,held,production_updated:false}));
 // Evidence-only selector; deployments remain disabled by separate release workflow.
 if(held)process.exitCode=2;
}catch(e){console.error('Three-stage audit BLOCK:',e.message);process.exitCode=1}

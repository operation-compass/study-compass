'use strict';
// Read-only diagnostics for real staging; NO ready conversion, no deploy.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {selectReady}=require('./select-ready-candidates.cjs');
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
function diagnose(bundle){
 if(!bundle||!Array.isArray(bundle.candidate?.items)||!Array.isArray(bundle.audit?.records))
  throw Error('Invalid authenticated staging bundle');
 const old=selectReady(bundle);
 const checks=bundle.simple_checks?.records;
 let blocker;
 if(!Array.isArray(checks))blocker='NEW_REVIEW_RECORDS_MISSING';
 else if(checks.length===0)blocker='NEW_REVIEW_RECORDS_EMPTY';
 else blocker='NEW_REVIEW_PROVENANCE_UNVERIFIED';
 return {mode:'diagnostic_only',production_updated:false,release_authorized:false,
   source_digest:digest(JSON.stringify(bundle)),
   candidate_ids:bundle.candidate.items.map(x=>x.id),
   legacy_ready_count:old.ready.length,
   legacy_ready_is_production_permission:false,
   legacy_held_count:old.held.length,
   simple_check_records:Array.isArray(checks)?checks.length:0,
   new_gate_blocker:blocker,new_gate_releasable:0};
}
if(require.main===module){
 try{
  const source=process.argv[2];if(!source)throw Error('Usage: node diagnose-live-staging.cjs path');
  const result=diagnose(JSON.parse(fs.readFileSync(source,'utf8')));
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.stack||e.message);process.exitCode=1;}
}
module.exports={diagnose};

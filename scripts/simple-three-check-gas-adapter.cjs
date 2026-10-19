'use strict';
// Read-only adapter between existing GAS candidate bundle and new shadow audit.
// No implicit PASS, READY, or publication permission.
const {previewSimpleThreeChecks}=require('./verify-auto-publication.cjs');
function buildShadowReport(gasBundle, inventory, evidenceFiles, approvals) {
 if(!gasBundle||!Array.isArray(gasBundle.candidate?.items))
  throw Error('Authenticated GAS candidate items are required');
 const shadow=gasBundle.mode==='shadow_only'&&gasBundle.production_updated===false;
 if(!shadow&&!Array.isArray(gasBundle.audit?.records))
  throw Error('Existing GAS candidate/audit bundle is required');
 if(shadow&&gasBundle.audit!==undefined)
  throw Error('Shadow-only bundle must not carry legacy release audits');
 if(!Array.isArray(inventory)||!Array.isArray(evidenceFiles)||!Array.isArray(approvals))
  throw Error('Independent canonical inventory, evidence files and trusted approval registry required');
 if(shadow){
  const exported=gasBundle.canonical_master_ids;
  if(!Array.isArray(exported)||!exported.length||new Set(exported).size!==exported.length)
   throw Error('Shadow bundle requires full unique canonical MASTER inventory');
  if(exported.length!==inventory.length || !exported.every(id=>inventory.includes(id)))
   throw Error('Shadow MASTER inventory differs from independently supplied inventory');
 }
 const simpleChecks=gasBundle.simple_checks;
 if(!Array.isArray(simpleChecks?.records))throw Error('No simplified-review records; legacy 3-audit PASS cannot be transformed');
 const result=previewSimpleThreeChecks({candidate:gasBundle.candidate,simple_checks:simpleChecks},evidenceFiles,new Map(approvals),inventory);
 return {...result,source:shadow?'canonical_GAS_shadow_preview':'authenticated_GAS_bundle',legacy_release_unchanged:true};
}
module.exports={buildShadowReport};

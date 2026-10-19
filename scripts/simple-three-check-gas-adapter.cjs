'use strict';
// Read-only adapter between existing GAS candidate bundle and new shadow audit.
// No implicit PASS, READY, or publication permission.
const {previewSimpleThreeChecks}=require('./verify-auto-publication.cjs');
function buildShadowReport(gasBundle, inventory, evidenceFiles, approvals) {
 if(!gasBundle||!Array.isArray(gasBundle.candidate?.items)||!Array.isArray(gasBundle.audit?.records))
  throw Error('Existing GAS candidate/audit bundle is required');
 if(!Array.isArray(inventory)||!Array.isArray(evidenceFiles)||!Array.isArray(approvals))
  throw Error('Independent canonical inventory, evidence files and trusted approval registry required');
 const simpleChecks=gasBundle.simple_checks;
 if(!Array.isArray(simpleChecks?.records))throw Error('No simplified-review records; legacy 3-audit PASS cannot be transformed');
 const result=previewSimpleThreeChecks({candidate:gasBundle.candidate,simple_checks:simpleChecks},evidenceFiles,new Map(approvals),inventory);
 return {...result,source:'authenticated_GAS_bundle',legacy_release_unchanged:true};
}
module.exports={buildShadowReport};

'use strict';
// Pure fail-closed delta preflight. The caller must supply an authenticated
// baseline and current independently verified release evidence. Never deploys.
const assert=require('node:assert/strict');
const HEX=/^[a-f0-9]{64}$/i;
function validate(items,baseline,evidence){
 assert(Array.isArray(items)&&Array.isArray(baseline),'Candidate and baseline arrays required');
 const byId=new Map(),old=new Map();
 for(const b of baseline){if(!b?.id||!HEX.test(b.sha256)||old.has(b.id))throw Error('INVALID_BASELINE');old.set(b.id,b);}
 const seen=new Set(),blocked=[],unchanged=[];
 for(const q of items){
  if(!q?.id||!HEX.test(q.sha256)||seen.has(q.id))throw Error('INVALID_CANDIDATE');
  seen.add(q.id);
  const original=old.get(q.id);
  if(original?.sha256===q.sha256){unchanged.push(q.id);continue;}
  const e=evidence?.[q.id];
  const reasons=[];
  if(!e||e.id!==q.id||e.version!==q.version||e.sha256!==q.sha256)reasons.push('EVIDENCE_ID_VERSION_SHA_MISMATCH');
  if(!e||e.master_status!=='PUBLIC'||e.publish_flag!==true)reasons.push('MASTER_NOT_PUBLIC');
  if(!e||e.audit_roles?.length!==3||!['accuracy','quality','technical'].every(role=>e.audit_roles.some(x=>x.role===role&&x.status==='PASS'&&x.id===q.id&&x.version===q.version&&x.sha256===q.sha256&&x.verified===true)))reasons.push('INDEPENDENT_AUDIT_MISSING');
  if(!e||e.approval?.status!=='APPROVED'||e.approval?.id!==q.id||e.approval?.version!==q.version||e.approval?.sha256!==q.sha256||!e.approval?.by||!e.approval?.at)reasons.push('INDIVIDUAL_APPROVAL_MISSING');
  if(!e||e.release?.permission!=='ALLOW'||e.release?.id!==q.id||e.release?.version!==q.version||e.release?.sha256!==q.sha256||!e.release?.by||!e.release?.at)reasons.push('RELEASE_AUTHORIZATION_MISSING');
  if(e?.explicit_hold===true||e?.legacy_hold===true)reasons.push('EXPLICIT_HOLD');
  if(!e?.verified_live_master_snapshot)reasons.push('LIVE_MASTER_EVIDENCE_MISSING');
  if(reasons.length)blocked.push({id:q.id,type:original?'MODIFIED':'NEW',reasons});
 }
 for(const b of baseline)if(!seen.has(b.id))blocked.push({id:b.id,type:'REMOVED',reasons:['BASELINE_REMOVAL_REQUIRES_REVIEW']});
 return {mode:'read_only_delta_gate',baseline_count:baseline.length,current_count:items.length,unchanged_count:unchanged.length,blocked,can_deploy:blocked.length===0,production_updated:false};
}
module.exports={validate};

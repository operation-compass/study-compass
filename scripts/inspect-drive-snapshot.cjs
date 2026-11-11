'use strict';
// Validates structural integrity of externally supplied Drive snapshot.
// Claims about source are NOT proof of provenance. No release authorization.
const {hashV2}=require('./simple-three-check-gate.cjs');
const HEX=/^[a-f0-9]{64}$/;
function inspect(snapshot,now=new Date()){
 const errors=[];
 if(!snapshot||!Array.isArray(snapshot.questions)||!Array.isArray(snapshot.reviews)||!Array.isArray(snapshot.approvals))
   return {valid:false,errors:['SNAPSHOT_INCOMPLETE'],can_deploy:false};
 // A fresh timestamp or self-declared source cannot authenticate the producer.
 // All validity results describe structure only; never an authorized release.
 const t=Date.parse(snapshot.fetched_at||'');
 if(!Number.isFinite(t)||t>now.getTime()+60000||now.getTime()-t>900000)errors.push('SNAPSHOT_STALE');
 const ids=new Set();
 for(const q of snapshot.questions){
  if(!q?.id||!q.version||ids.has(q.id)){errors.push('DUPLICATE_OR_INVALID_ID');continue;}
  ids.add(q.id);
  if(!HEX.test(String(q.sha256||''))||hashV2(q)!==q.sha256)errors.push('CONTENT_HASH_MISMATCH:'+q.id);
 }
 for(const key of ['reviews','approvals']){
  const seen=new Set();
  for(const r of snapshot[key]){
   if(!r?.id||seen.has(r.id)){errors.push('DUPLICATE_'+key.toUpperCase());continue;}
   seen.add(r.id);
  }
 }
 return {valid:errors.length===0,errors,question_count:ids.size,can_deploy:false,
   provenance:'NOT_AUTHENTICATED',production_updated:false};
}
module.exports={inspect};

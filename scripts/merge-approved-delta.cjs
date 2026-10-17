#!/usr/bin/env node
'use strict';
// Pure fail-closed incremental merge. Not connected to production deployment.
const assert=require('node:assert/strict');
function mergeExisting(existing,incoming,allowedIds){
 assert(Array.isArray(existing)&&Array.isArray(incoming),'Expected arrays');
 const allowed=new Set(allowedIds);
 const out=existing.map(x=>({...x})),index=new Map();
 out.forEach((q,i)=>{assert(q.id&&!index.has(q.id),'Duplicate/blank existing ID');index.set(q.id,i)});
 const seen=new Set();
 for(const q of incoming){
  assert(q.id&&!seen.has(q.id),'Duplicate/blank incoming ID');seen.add(q.id);
  assert(allowed.has(q.id),'Unapproved candidate blocked: '+q.id);
  if(index.has(q.id))out[index.get(q.id)]={...q};
  else {index.set(q.id,out.length);out.push({...q});}
 }
 assert(out.length>=existing.length,'Existing questions must not be deleted');
 return out;
}
module.exports={mergeExisting};

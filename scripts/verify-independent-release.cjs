'use strict';
const {allowed}=require('./check-approval-contract.cjs');
const crypto=require('node:crypto');
function validate(snapshot,permission,ids,sourceSha,mainSha,provenance,trustedPublicKey){
 if(!provenance||!provenance.signature||typeof trustedPublicKey!=='string'||!trustedPublicKey.includes('BEGIN PUBLIC KEY'))return false;
 // Never trust a public key supplied by the staging bundle: the caller must pin it.
 const signed=JSON.stringify({snapshot,permission,ids,sourceSha,mainSha});
 try{if(!crypto.verify(null,Buffer.from(signed),trustedPublicKey,Buffer.from(provenance.signature,'base64')))return false;}catch{return false;}
 if(!snapshot||!permission||!Array.isArray(ids)||!ids.length)return false;
 if(snapshot.source_sha!==sourceSha||snapshot.main_sha!==mainSha)return false;
 if(snapshot.verified_source!=='authenticated_google_sheets_readonly')return false;
 for(const key of ['rows','approvals','audits'])if(!Array.isArray(snapshot[key]))return false;
 if(!Array.isArray(permission.permissions))return false;
 if(new Set(ids).size!==ids.length)return false;
 for(const id of ids){
  const find=(records)=>records.filter(x=>x.question_id===id);
  const row=find(snapshot.rows),approval=find(snapshot.approvals),audit=find(snapshot.audits),release=find(permission.permissions);
  if([row,approval,audit,release].some(a=>a.length!==1))return false;
  if(!allowed(row[0],approval[0],audit[0],release[0]))return false;
 }
 return true;
}
module.exports={validate};

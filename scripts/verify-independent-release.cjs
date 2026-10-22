'use strict';
const {allowed}=require('./check-approval-contract.cjs');
function validate(snapshot,permission,ids,sourceSha,mainSha,provenance){
 if(!provenance||provenance.authenticated_by!=='trusted_drive_exporter'||provenance.source_sha!==sourceSha||provenance.main_sha!==mainSha||provenance.verified!==true)return false;
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

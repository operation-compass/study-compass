'use strict';
// Read-only evidence reconciler. Evidence must be supplied by trusted callers;
// this function never authenticates a reviewer or grants release permission.
const crypto=require('node:crypto');
const {hashV2}=require('./simple-three-check-gate.cjs');
const sha256=text=>crypto.createHash('sha256').update(text,'utf8').digest('hex');
const safeFile=s=>typeof s==='string'&&/^docs\/audits\/[a-zA-Z0-9_./-]+\.md$/.test(s)&&!s.split('/').includes('..')&&!s.includes('//');
const roles=['accuracy','quality','technical'];
function reconcile(question,items={},evidenceFiles=new Map()){
  const errors=[],resolved=[],pending=[];
  if(!question||typeof question!=='object')throw Error('Question required');
  const id=String(question.id||''),version=String(question.version||''),digest=hashV2(question);
  const records=items&&typeof items==='object'?items:{};
  for(const role of roles){
    const record=records[role];
    if(!record){pending.push(role.toUpperCase()+'_EVIDENCE_MISSING');continue;}
    if(record.id!==id||record.version!==version||record.question_sha256!==digest){
      pending.push(role.toUpperCase()+'_IDENTITY_MISMATCH');continue;
    }
    if(record.status!=='PASS'||typeof record.evidence_file!=='string'||!safeFile(record.evidence_file)||
      !/^[a-f0-9]{64}$/.test(String(record.evidence_sha256||''))){
      pending.push(role.toUpperCase()+'_EVIDENCE_INVALID');continue;
    }
    const bytes=evidenceFiles.get(record.evidence_file);
    if(typeof bytes!=='string'||sha256(bytes)!==record.evidence_sha256){
      pending.push(role.toUpperCase()+'_ARTIFACT_MISSING_OR_CHANGED');continue;
    }
    if(!bytes.includes(id)||!bytes.includes(digest)){
      pending.push(role.toUpperCase()+'_ARTIFACT_IDENTITY_MISMATCH');continue;
    }
    // Artifact correspondence is not proof that claims were independently checked.
    resolved.push(role.toUpperCase()+'_ARTIFACT_INTEGRITY');
    pending.push(role.toUpperCase()+'_VERIFIED_AUTHORITY_AND_SUBSTANCE');
  }
  if(records.accuracy?.evidence_file&&records.quality?.evidence_file&&
    records.accuracy.evidence_file===records.quality.evidence_file)
    errors.push('REUSED_REVIEW_ARTIFACT');
  return {id,version,sha256_v2:digest,resolved,pending,errors,
    formal_review:'PENDING',release_authorized:false,production_permission:'HOLD',
    production_updated:false};
}
module.exports={reconcile,sha256};

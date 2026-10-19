'use strict';
// Experimental evidence verifier; never grants READY or deploys.
const crypto=require('node:crypto');
const {preflightQuestion}=require('./simple-three-check-gate.cjs');
const sha256=s=>crypto.createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const safePath=p=>typeof p==='string'&&/^docs\/audits\/[a-zA-Z0-9_./-]+\.md$/.test(p)&&!p.split('/').includes('..')&&!p.includes('//');
/**
 * The approval registry must be supplied by a trusted caller independently
 * of the candidate's evidence. A claim in candidate JSON is not authorization.
 * Artifacts must be raw repository files, not self-declared digest strings.
 */
function verifyThreeCheckArtifacts(question,evidence,masterIds,artifacts,approvedReferences){
 const errors=[];
 const preflight=preflightQuestion(question,evidence,masterIds);
 errors.push(...preflight.errors);
 const authorization=approvedReferences instanceof Map?approvedReferences.get(evidence?.approval_reference):undefined;
 if(!authorization || authorization.id!==question?.id ||
     authorization.version!==question?.version ||
     authorization.question_sha256!==preflight.question_sha256)
   errors.push('untrusted_or_unbound_approval');
 const a=evidence?.accuracy,b=evidence?.quality;
 if(a?.reviewer && b?.reviewer && a.reviewer.trim()===b.reviewer.trim())errors.push('same_reviewer_for_two_checks');
 if(a?.evidence_file && a.evidence_file===b?.evidence_file)errors.push('shared_evidence_file');
 if(a?.evidence_sha256 && a.evidence_sha256===b?.evidence_sha256)errors.push('shared_evidence_digest');
 for(const role of ['accuracy','quality']){
  const check=evidence?.[role];
  const file=check?.evidence_file;
  if(!safePath(file)||typeof check?.evidence_sha256!=='string'||!(/^[a-f0-9]{64}$/.test(check.evidence_sha256))){
   errors.push(role+'_invalid_artifact_metadata');continue;
  }
  const actual=artifacts instanceof Map?artifacts.get(file):undefined;
  if(typeof actual!=='string'||sha256(actual)!==check.evidence_sha256){
   errors.push(role+'_artifact_hash_mismatch');continue;
  }
  if(!actual.includes(question.id)||!actual.includes(preflight.question_sha256)||!actual.includes(check.reviewer)){
   errors.push(role+'_artifact_identity_mismatch');
  }
 }
 return {eligible:errors.length===0,status:errors.length===0?'EVIDENCE_VERIFIED':'HOLD',errors,question_sha256:preflight.question_sha256};
}
module.exports={verifyThreeCheckArtifacts,sha256};

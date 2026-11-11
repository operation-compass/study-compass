'use strict';
// Adopted operating policy: automated three-stage checks with exception review.
// This classifier never grants publication permission or converts HOLD to READY.
const crypto=require('node:crypto');
const fields=['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const norm=x=>String(x??'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const sha=q=>crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');
function inspect(q,context={}){
  const failures=[],exceptions=[];
  if(!q||typeof q!=='object')return {technical:'FAIL',accuracy:'NEEDS_REVIEW',quality:'NEEDS_REVIEW',exceptions:['INVALID_RECORD'],production_permission:'HOLD',release_authorized:false};
  for(const k of fields)if(!String(q[k]??'').trim())failures.push('MISSING_'+k.toUpperCase());
  if(!/^中[123]$/.test(q.grade||''))failures.push('GRADE_INVALID');
  if(q.question_type!=='4択')failures.push('TYPE_INVALID');
  const choices=['choice_a','choice_b','choice_c','choice_d'].map(k=>norm(q[k]));
  if(choices.some(x=>!x)||new Set(choices).size!==4)failures.push('CHOICE_INVALID');
  if(choices.filter(x=>x===norm(q.correct_answer)).length!==1)failures.push('ANSWER_INVALID');
  if(!String(q.version??'').trim())failures.push('VERSION_MISSING');
  if(context.master_status!=='CHECK'||context.publish_flag!==false)exceptions.push('MASTER_RELEASE_STATE_NOT_PENDING');
  if(context.original_hold===true||context.legacy_hold===true)exceptions.push('EXPLICIT_HOLD');
  if(context.question_id_count!==1)exceptions.push('MASTER_ID_NOT_UNIQUE');
  if(!/^https:\/\//.test(String(context.source_url||'')))exceptions.push('SOURCE_UNVERIFIED');
  if(context.source_verified!==true)exceptions.push('FACTS_NOT_VERIFIED');
  if(context.semantic_duplicate_checked!==true||context.existing_web_checked!==true)exceptions.push('DUPLICATION_UNVERIFIED');
  if(context.curriculum_checked!==true)exceptions.push('CURRICULUM_UNVERIFIED');
  if(context.mobile_display_verified!==true||context.grading_verified!==true||context.history_preservation_verified!==true)exceptions.push('TECHNICAL_RUNTIME_UNVERIFIED');
  return {id:q.id,version:q.version,sha256_v2:sha(q),technical:failures.length?'FAIL':'PRECHECK_PASS',accuracy:context.source_verified===true?'PRECHECK_PASS':'NEEDS_REVIEW',quality:context.semantic_duplicate_checked===true&&context.existing_web_checked===true&&context.curriculum_checked===true?'PRECHECK_PASS':'NEEDS_REVIEW',failures,exceptions,exception_review_required:!!(failures.length||exceptions.length),formal_review:'PENDING',production_permission:'HOLD',release_authorized:false};
}
module.exports={inspect};

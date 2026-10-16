'use strict';
// Converts only reviewed question fields, preserving existing website metadata.
// Never call this function without a trusted audit-ready id set.
const assert=require('node:assert/strict');
function applyToWeb(existing, candidates, readyIds){
 assert(Array.isArray(existing)&&Array.isArray(candidates)&&Array.isArray(readyIds),'Invalid collections');
 assert.equal(new Set(readyIds).size,readyIds.length,'Duplicate READY ID');
 assert(readyIds.length<=5,'Release batch exceeds five-question limit');
 const ready=new Set(readyIds),incoming=new Map(),seen=new Set();
 for(const q of candidates){assert(q.id&&!incoming.has(q.id),'Duplicate candidate ID');incoming.set(q.id,q);}
 const result=existing.map(q=>{
  assert(q.id&&!seen.has(q.id),'Duplicate existing ID');seen.add(q.id);
  if(!ready.has(q.id))return {...q};
  const c=incoming.get(q.id);assert(c,'Missing ready candidate');
  assert(c.subject===q.subject,'Subject mismatch');
  assert(c.question_type==='4択','Only four-choice questions supported');
  const options=[c.choice_a,c.choice_b,c.choice_c,c.choice_d].map(v=>String(v||'').trim());
  assert(options.every(Boolean)&&new Set(options).size===4,'Invalid options');
  assert(options.includes(c.correct_answer),'Answer not in choices');
  assert(c.question_text&&c.explanation,'Missing question or explanation');
  return {...q,q:c.question_text,answer:c.correct_answer,options,ex:c.explanation};
 });
 for(const id of ready){
  if(seen.has(id))continue;
  const c=incoming.get(id);assert(c,'Missing ready candidate');
  assert(c.subject==='社会' && c.question_type==='4択','New question subject or type not yet supported');
  assert(typeof c.grade==='string' && /^中[123]$/.test(c.grade),'New question grade required');
  assert(typeof c.unit_major==='string' && c.unit_major.trim() && typeof c.unit_minor==='string' && c.unit_minor.trim(),'New question unit metadata required');
  const options=[c.choice_a,c.choice_b,c.choice_c,c.choice_d].map(v=>String(v||'').trim());
  assert(options.every(Boolean)&&new Set(options).size===4&&options.includes(c.correct_answer),'Invalid new question choices');
  assert(c.question_text&&c.explanation,'Incomplete new question');
  result.push({id,subject:c.subject,grade:c.grade,unit:c.unit_major+'・'+c.unit_minor,field_name:c.unit_major,topic_name:c.unit_minor,q:c.question_text,answer:c.correct_answer,options,ex:c.explanation});
 }

 return result;
}
module.exports={applyToWeb};

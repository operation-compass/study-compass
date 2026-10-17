#!/usr/bin/env node
'use strict';
// Staging-only strict READY selector. Does not write anything or deploy.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const v2Fields=['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const digest=(q,keys)=>crypto.createHash('sha256').update(JSON.stringify(keys.map(k=>String(q[k]??'')))).digest('hex');
function selectReady(bundle){
 assert(Array.isArray(bundle.candidate?.items)&&Array.isArray(bundle.audit?.records),'Missing candidate or audit sections');
 const unique=(rows,name)=>{const m=new Map();for(const x of rows){assert(x.id&&!m.has(x.id),'Duplicate '+name+' ID');m.set(x.id,x)}return m};
 const audits=unique(bundle.audit.records,'audit');
 const candidates=unique(bundle.candidate.items,'candidate');
 const ready=[],held=[];
 const now=Date.now(),maxFuture=60*1000;
 for(const q of candidates.values()){
  const h=digest(q,fields),h2=digest(q,v2Fields);
  const r=audits.get(q.id);
  const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=now+maxFuture;
  const hashVersion=r?.hash_version||'v1';
  const validHashVersion=hashVersion==='v1'||hashVersion==='v2';
  const version2=hashVersion==='v2';
  const validMetadata=!version2||(typeof q.grade==='string'&&/^中[123]$/.test(q.grade)&&typeof q.unit_major==='string'&&q.unit_major.trim()&&typeof q.unit_minor==='string'&&q.unit_minor.trim());
  // Legacy v1 attestations can update existing items only; new items need v2 with unit metadata.
  // Independent review evidence is NOT proven by three PASS strings or an HTTPS citation.
  // Only attestations with three distinct review identities, evidence digests and review
  // timestamps may enter the release queue. Historical rows remain safely HOLD.
  const reviews=Array.isArray(r?.independent_reviews)?r.independent_reviews:[];
  const roles=['accuracy','quality','technical'];
  const validReviews=reviews.length===3&&roles.every(role=>reviews.filter(v=>v?.role===role&&v.result==='PASS'&&typeof v.reviewer_id==='string'&&v.reviewer_id.trim()&&typeof v.evidence_sha256==='string'&&/^[a-f0-9]{64}$/.test(v.evidence_sha256)&&validDate(v.checked_at)&&v.question_sha256===(version2?h2:h)).length===1)&&new Set(reviews.map(v=>v.reviewer_id)).size===3&&reviews.every(v=>!/^synthetic-|^reviewer-\d+$/.test(v.reviewer_id)&&!/^([a-f0-9])\1{63}$/.test(v.evidence_sha256));
  const verified=!!r&&validReviews&&validHashVersion&&validMetadata&&r.version===q.version&&r.sha256===(version2?h2:h)&&r.accuracy==='PASS'&&r.quality==='PASS'&&r.technical==='PASS'&&r.final_decision==='READY'&&r.risk==='LOW'&&!r.exception_reason&&validDate(r.checked_at)&&validDate(r.accuracy_checked_at)&&validDate(r.quality_checked_at)&&validDate(r.technical_checked_at)&&typeof r.evidence_url==='string'&&/^https:\/\//.test(r.evidence_url);
  (verified?ready:held).push(q.id);
 }
 return {ready,held,total:candidates.size,hashVersionById:Object.fromEntries(ready.map(id=>[id,audits.get(id).hash_version==='v2'?'v2':'v1']))};
}
if(require.main===module){try{const r=selectReady(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));console.log(JSON.stringify({ready:r.ready.length,held:r.held.length,total:r.total,production_updated:false}));}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={selectReady,digest,v2Fields};


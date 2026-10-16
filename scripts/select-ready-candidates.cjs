#!/usr/bin/env node
'use strict';
// Staging-only strict READY selector. Does not write anything or deploy.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
function selectReady(bundle){
 assert(Array.isArray(bundle.candidate?.items)&&Array.isArray(bundle.audit?.records),'Missing candidate or audit sections');
 const unique=(rows,name)=>{const m=new Map();for(const x of rows){assert(x.id&&!m.has(x.id),'Duplicate '+name+' ID');m.set(x.id,x)}return m};
 const audits=unique(bundle.audit.records,'audit');
 const candidates=unique(bundle.candidate.items,'candidate');
 const ready=[],held=[];
 const now=Date.now(),maxFuture=60*1000;
 for(const q of candidates.values()){
  const h=crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');
  const r=audits.get(q.id);
  const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=now+maxFuture;
  const verified=!!r&&r.version===q.version&&r.sha256===h&&r.accuracy==='PASS'&&r.quality==='PASS'&&r.technical==='PASS'&&r.final_decision==='READY'&&r.risk==='LOW'&&!r.exception_reason&&validDate(r.checked_at)&&validDate(r.accuracy_checked_at)&&validDate(r.quality_checked_at)&&validDate(r.technical_checked_at)&&typeof r.evidence_url==='string'&&/^https:\/\//.test(r.evidence_url);
  (verified?ready:held).push(q.id);
 }
 return {ready,held,total:candidates.size};
}
if(require.main===module){try{const r=selectReady(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));console.log(JSON.stringify({ready:r.ready.length,held:r.held.length,total:r.total,production_updated:false}));}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={selectReady};

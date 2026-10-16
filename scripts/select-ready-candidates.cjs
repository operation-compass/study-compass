#!/usr/bin/env node
'use strict';
// Staging-only strict READY selector. Does not write anything or deploy.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
function selectReady(bundle){
 assert(Array.isArray(bundle.candidate?.items)&&Array.isArray(bundle.approval?.approvals)&&Array.isArray(bundle.audit?.records),'Missing bundle sections');
 const unique=(rows,name)=>{const m=new Map();for(const x of rows){assert(x.id&&!m.has(x.id),'Duplicate '+name+' ID');m.set(x.id,x)}return m};
 const approvals=unique(bundle.approval.approvals,'approval'),audits=unique(bundle.audit.records,'audit');
 const candidates=unique(bundle.candidate.items,'candidate');
 const ready=[],held=[];
 for(const q of candidates.values()){
  const h=crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');
  const a=approvals.get(q.id),r=audits.get(q.id);
  const approved=!!a&&a.status==='PUBLIC'&&a.publish_flag===true&&typeof a.reviewed_by==='string'&&a.reviewed_by.trim()&&a.reviewed_by.trim()!=='AI'&&a.approved_at&&a.version===q.version&&a.sha256===h;
  const verified=!!r&&r.version===q.version&&r.sha256===h&&r.accuracy==='PASS'&&r.quality==='PASS'&&r.technical==='PASS'&&r.final_decision==='READY'&&r.risk==='LOW'&&!r.exception_reason&&r.checked_at&&r.accuracy_checked_at&&r.quality_checked_at&&r.technical_checked_at&&typeof r.evidence_url==='string'&&/^https:\/\//.test(r.evidence_url);
  (approved&&verified?ready:held).push(q.id);
 }
 return {ready,held,total:candidates.size};
}
if(require.main===module){try{const r=selectReady(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));console.log(JSON.stringify({ready:r.ready.length,held:r.held.length,total:r.total,production_updated:false}));}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={selectReady};

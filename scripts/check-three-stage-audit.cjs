#!/usr/bin/env node
'use strict';
// Read-only three-stage audit checker. Never authorizes deployment or approvals.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
try {
 const bundle=JSON.parse(fs.readFileSync(process.argv[2]||'', 'utf8'));
 const audit=process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : bundle.audit;
 assert(Array.isArray(bundle.candidate?.items),'Candidate items missing');
 assert(Array.isArray(audit?.records),'Audit records missing');
 const checks=new Map(),fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
 for(const a of audit.records) {
  assert(a.id && !checks.has(a.id),'Duplicate or blank audit ID');
  checks.set(a.id,a);
 }
 let ready=0,held=0;
 for(const q of bundle.candidate.items) {
  const a=checks.get(q.id);
  const digest=crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');
  const pass=!!a && a.version===q.version && a.sha256===digest &&
   a.accuracy==='PASS' && a.quality==='PASS' && a.technical==='PASS' &&
   a.final_decision==='READY' && a.checked_at && a.accuracy_checked_at && a.quality_checked_at && a.technical_checked_at &&
   typeof a.evidence_url==='string' && /^https:\/\//.test(a.evidence_url) &&
   a.risk==='LOW' && !a.exception_reason;
  if(pass) ready++;else held++;
 }
 console.log(JSON.stringify({reviewed:bundle.candidate.items.length,ready,held,production_updated:false}));
 // The gate is observe-only until independent three-stage evidence is trustworthy.
 if(held)process.exitCode=2;
}catch(e){console.error('Three-stage audit BLOCK:',e.message);process.exitCode=1}

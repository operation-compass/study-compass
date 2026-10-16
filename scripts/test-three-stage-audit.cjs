#!/usr/bin/env node
'use strict';
// Synthetic regression tests only; does not grant publication permission.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'study-audit-gate-'));
const fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const q={id:'TEST-001',subject:'社会',question_type:'4択',question_text:'検証用問題',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'検証用解説',version:'v1'};
const sha=crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');
const a={id:q.id,version:q.version,sha256:sha,accuracy:'PASS',quality:'PASS',technical:'PASS',accuracy_checked_at:'2026-10-16',quality_checked_at:'2026-10-16',technical_checked_at:'2026-10-16',checked_at:'2026-10-16',evidence_url:'https://example.org/evidence',risk:'LOW',final_decision:'READY',exception_reason:''};
function run(candidate,audits,override={}) {
 const filename=path.join(dir,'bundle.json');
 fs.writeFileSync(filename,JSON.stringify({candidate:{items:[candidate]},audit:{records:audits},approval:{approvals:override.approvals??[{id:q.id,status:'PUBLIC',publish_flag:true,reviewed_by:'Human reviewer',approved_at:'2026-10-16',version:q.version,sha256:sha}]}}));
 return cp.spawnSync(process.execPath,[path.join(__dirname,'check-three-stage-audit.cjs'),filename],{encoding:'utf8'});
}
try{
 assert.equal(run(q,[a]).status,0,'Complete synthetic evidence should pass read-only gate');
 assert.equal(run(q,[]).status,2,'Missing audit must HOLD');
 assert.equal(run(q,[{...a,risk:'UNASSESSED'}]).status,2,'Unassessed risk must HOLD');
 assert.equal(run(q,[{...a,final_decision:'HOLD'}]).status,2,'HOLD decision must stay HOLD');
 assert.equal(run(q,[{...a,exception_reason:'Pending human check'}]).status,2,'Open exception must HOLD');
 assert.equal(run({...q,explanation:'Changed'},[a]).status,2,'Edited content must invalidate hash');
 assert.equal(run(q,[{...a,technical_checked_at:''}]).status,2,'Incomplete technical evidence must HOLD');
 assert.equal(run(q,[a,a]).status,1,'Duplicate audit records must fail closed');
 assert.equal(run(q,[a],{approvals:[]}).status,0,'All three audit PASS may proceed without human approval');
 assert.equal(run(q,[a],{approvals:[{id:q.id,status:'PUBLIC',publish_flag:true,reviewed_by:'AI',approved_at:'2026-10-16',version:q.version,sha256:sha}]}).status,0,'Human approval metadata must not control audit gate');
 console.log('Three-stage audit gate regression tests passed (no deploy).');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

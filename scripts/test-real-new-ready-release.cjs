'use strict';
// Synthetic new-question release against real HTML, without commit or deploy.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {prepare}=require('./prepare-ready-release.cjs');
const root=path.join(__dirname,'..');
const fields=['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const q={id:'SYN-SOC-HIS-ADDITION-TEST-20261016',subject:'社会',grade:'中1',unit_major:'歴史',unit_minor:'古代',question_type:'4択',question_text:'710年に遷都した都はどこか。',choice_a:'平城京',choice_b:'平安京',choice_c:'藤原京',choice_d:'長岡京',correct_answer:'平城京',explanation:'710年に平城京へ遷都した。',version:'test-1'};
const sha=crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');
const audit={id:q.id,version:q.version,hash_version:'v2',sha256:sha,accuracy:'PASS',quality:'PASS',technical:'PASS',accuracy_checked_at:'2026-10-16',quality_checked_at:'2026-10-16',technical_checked_at:'2026-10-16',checked_at:'2026-10-16',evidence_url:'https://example.org/test-only',risk:'LOW',exception_reason:'',final_decision:'READY'};
audit.independent_reviews=['accuracy','quality','technical'].map((role,i)=>({role,result:'PASS',reviewer_id:'synthetic-reviewer-'+i,evidence_sha256:'a'.repeat(64),question_sha256:sha,checked_at:'2026-10-16'}));
const bundle={schema_version:1,candidate:{items:[q]},audit:{records:[audit]},approval:{mode:'ai_three_stage',export_source:'authenticated-drive-export',source_spreadsheet_id:'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88',exported_at:new Date().toISOString()}};
function social(html){const a='const SOCIAL = ',start=html.indexOf(a)+a.length;assert(start>=a.length);return JSON.parse(html.slice(start,html.indexOf(';',start)));}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'study-new-ready-'));
try {
 const report=prepare(bundle,tmp);
 assert.equal(report.no_change,false);
 assert.equal(report.ready.length,1);
 for(const filename of ['index.html','legacy-study.html']){
  const before=social(fs.readFileSync(path.join(root,filename),'utf8'));
  const after=social(fs.readFileSync(path.join(tmp,filename),'utf8'));
  assert.equal(after.length,before.length+1);
  assert.deepEqual(after.slice(0,before.length),before,'Existing questions changed');
  assert.equal(after.at(-1).id,q.id);
  assert.equal(after.at(-1).answer,'平城京');
 }
 const v1={...bundle,audit:{records:[{...audit,hash_version:'v1'}]}};
 assert.throws(()=>prepare(v1,tmp),/No READY records|SHA v2/);
 const changedUnit={...bundle,candidate:{items:[{...q,unit_minor:'近世'}]}};
 assert.throws(()=>prepare(changedUnit,tmp),/No READY records/,'Changed unit invalidates v2 SHA');
 const held={...bundle,audit:{records:[{...audit,final_decision:'HOLD'}]}};
 assert.throws(()=>prepare(held,tmp),/No READY records/);
 const tampered={...bundle,candidate:{items:[{...q,correct_answer:'平安京'}]}};
 assert.throws(()=>prepare(tampered,tmp),/No READY records/);
 console.log('PASS: synthetic READY appended to both real HTML snapshots; existing questions immutable; HOLD and SHA tampering blocked. No deploy.');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}

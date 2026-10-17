'use strict';
// End-to-end synthetic integration: independent gate must succeed before Web adapter runs.
// No real approved question is released by this test.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const source={id:'SYN-001',subject:'社会',question_type:'4択',question_text:'更新後の問題',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'更新後の解説',version:'v1'};
const hash=crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(source[k]??'')))).digest('hex');
const approval={id:source.id,status:'PUBLIC',publish_flag:true,reviewed_by:'Human reviewer',approved_at:'2026-10-16',version:'v1',sha256:hash};
const audit={id:source.id,version:'v1',sha256:hash,accuracy:'PASS',quality:'PASS',technical:'PASS',accuracy_checked_at:'2026-10-16',quality_checked_at:'2026-10-16',technical_checked_at:'2026-10-16',checked_at:'2026-10-16',evidence_url:'https://example.org/evidence',risk:'LOW',final_decision:'READY',exception_reason:''};
audit.independent_reviews=['accuracy','quality','technical'].map((role,i)=>({role,result:'PASS',reviewer_id:'fixture-analyst-'+i,evidence_sha256:'0123456789abcdef'.repeat(4),question_sha256:hash,checked_at:'2026-10-16'}));
const existing=[{id:'SYN-001',subject:'社会',unit:'歴史・古代',grade:'中1',q:'変更前',answer:'B',options:['A','B','C','D'],ex:'変更前の解説'},{id:'KEEP-002',subject:'数学',q:'残す問題'}];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'study-integration-'));
function verify(a,approvals=[approval]) {
 const file=path.join(dir,'bundle.json');fs.writeFileSync(file,JSON.stringify({candidate:{items:[source]},approval:{approvals},audit:{records:[a]}}));
 const res=cp.spawnSync(process.execPath,[path.join(__dirname,'check-three-stage-audit.cjs'),file],{encoding:'utf8'});
 assert([0,2].includes(res.status),'Malformed gate outcome: '+res.stderr);
 const eligible=res.status===0?[source.id]:[];
 return applyToWeb(existing,[source],eligible);
}
try{
 const ok=verify(audit);
 assert.equal(ok[0].q,'更新後の問題');
 assert.equal(ok[0].grade,'中1');assert.equal(ok[0].unit,'歴史・古代');
 assert.deepEqual(ok[1],existing[1]);assert.equal(ok.length,existing.length);
 assert.deepEqual(verify({...audit,independent_reviews:[]}),existing,'Missing independent review evidence must preserve Web');
 for(const changed of [{...audit,final_decision:'HOLD'},{...audit,risk:'UNASSESSED'},{...audit,sha256:'tampered'},{...audit,exception_reason:'Open issue'}])assert.deepEqual(verify(changed),existing,'Failed audit must preserve every existing question');
 assert.equal(verify(audit,[])[0].q,'更新後の問題','Three-stage PASS does not require human approval');
 console.log('Synthetic gate-to-Web end-to-end integration passed (never deploys).');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

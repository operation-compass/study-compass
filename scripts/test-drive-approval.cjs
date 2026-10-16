#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'study-approval-'));
const q={id:'TEST-001',subject:'社会',question_type:'4択',question_text:'テスト問題',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'テスト用解説',version:'v1'};
const keys=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const hash=crypto.createHash('sha256').update(JSON.stringify(keys.map(k=>String(q[k]??'')))).digest('hex');
const entry={id:q.id,status:'PUBLIC',publish_flag:true,reviewed_by:'Sample human reviewer',approved_at:'2026-10-16',version:'v1',sha256:hash};
const manifest={source_spreadsheet_id:'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88',exported_at:new Date().toISOString(),export_source:'authenticated-drive-export',approvals:[entry]};
const candidate={items:[q]};
function run(c,a,expected){fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(c));fs.writeFileSync(path.join(dir,'approval.json'),JSON.stringify(a));const p=cp.spawnSync(process.execPath,[path.join(__dirname,'check-drive-approval.cjs'),path.join(dir,'candidate.json'),path.join(dir,'approval.json')],{encoding:'utf8'});assert.equal(p.status,expected, p.stdout+p.stderr);}
try{
run(candidate,manifest,0);
run(candidate,{...manifest,approvals:[{...entry,status:'CHECK'}]},1);
run(candidate,{...manifest,approvals:[{...entry,publish_flag:false}]},1);
run(candidate,{...manifest,approvals:[{...entry,sha256:'incorrect'}]},1);
run({items:[q,q]},manifest,1);
run({items:[]},manifest,1);
run(candidate,{...manifest,exported_at:'2020-01-01T00:00:00Z'},1);
run(candidate,{...manifest,source_spreadsheet_id:'untrusted'},1);
run(candidate,{...manifest,approvals:[{...entry,version:'v2'}]},1);
const withheld={...q,id:'SC-SOC-HIS-GAP17-000004'};
const withheldHash=crypto.createHash('sha256').update(JSON.stringify(keys.map(k=>String(withheld[k]??'')))).digest('hex');
run({items:[withheld]},{...manifest,approvals:[{...entry,id:withheld.id,sha256:withheldHash}]},1);
console.log('Approval gate: 10 positive/negative scenarios passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

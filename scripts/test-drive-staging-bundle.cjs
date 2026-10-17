#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const q={id:'STAGING-TEST-001',subject:'社会',question_type:'4択',question_text:'テスト',choice_a:'A',choice_b:'B',choice_c:'C',choice_d:'D',correct_answer:'A',explanation:'説明',version:'v1'};
const keys=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const sha=crypto.createHash('sha256').update(JSON.stringify(keys.map(k=>String(q[k]??'')))).digest('hex');
const approval={id:q.id,status:'PUBLIC',publish_flag:true,reviewed_by:'Reviewer',approved_at:'2026-10-16',version:'v1',sha256:sha};
const bundle={schema_version:1,candidate:{items:[q]},approval:{source_spreadsheet_id:'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88',export_source:'authenticated-drive-export',exported_at:new Date().toISOString(),approvals:[approval]}};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'study-bundle-'));
function verify(data,expect){const p=path.join(dir,'bundle.json');fs.writeFileSync(p,JSON.stringify(data));const r=cp.spawnSync(process.execPath,[path.join(__dirname,'check-drive-staging-bundle.cjs'),p],{encoding:'utf8'});assert.equal(r.status,expect,r.stdout+r.stderr);}
try{
 verify(bundle,0);
 verify({...bundle,schema_version:999},1);
 verify({...bundle,candidate:{items:[]}},1);
 verify({...bundle,approval:{...bundle.approval,approvals:[{...approval,sha256:'changed'}]}},1);
 verify({...bundle,approval:{...bundle.approval,approvals:[{...approval,status:'CHECK'}]}},1);
 console.log('Staging bundle regression: 5 scenarios passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

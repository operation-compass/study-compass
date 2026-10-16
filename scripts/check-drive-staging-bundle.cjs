#!/usr/bin/env node
'use strict';
// Staging-only structural verification; not proof of Google provenance.
// Usage: node scripts/check-drive-staging-bundle.cjs <bundle.json>
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
try {
 const input=process.argv[2];assert(input,'Bundle path required');
 const bundle=JSON.parse(fs.readFileSync(input,'utf8'));
 assert.equal(bundle.schema_version,1,'Unexpected bundle schema version');
 assert(Array.isArray(bundle.candidate?.items),'Missing candidate data');
 assert(Array.isArray(bundle.approval?.approvals),'Missing approvals');
 // No approved records is a valid no-op in GAS, but no empty bundle may be released.
 assert(bundle.candidate.items.length>0,'Empty bundle must never replace production content');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'study-staging-'));
 try{
  const candidate=path.join(dir,'candidate.json'),approvals=path.join(dir,'approvals.json');
  fs.writeFileSync(candidate,JSON.stringify(bundle.candidate));
  fs.writeFileSync(approvals,JSON.stringify(bundle.approval));
  const result=cp.spawnSync(process.execPath,[path.join(__dirname,'check-drive-approval.cjs'),candidate,approvals],{encoding:'utf8'});
  if(result.status!==0)throw Error('Approval gate rejected bundle: '+(result.stderr||result.stdout).trim());
  console.log('Staging bundle verified; no release performed.');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}catch(e){console.error('Staging bundle BLOCK:',e.message);process.exitCode=1;}

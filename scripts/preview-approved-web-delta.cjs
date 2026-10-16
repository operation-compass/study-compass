#!/usr/bin/env node
'use strict';
// Read-only preview of vetted changes. Does not create files or publish.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {selectReady}=require('./select-ready-candidates.cjs');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const root=path.join(__dirname,'..'),bundle=JSON.parse(fs.readFileSync(path.join(root,'data/staging/drive-sync-bundle.json'),'utf8'));
const selected=selectReady(bundle);
function extract(html){
 const anchor='const SOCIAL = ',at=html.indexOf(anchor);
 assert(at>=0,'SOCIAL array missing');
 const from=at+anchor.length,to=html.indexOf(';',from);
 assert(to>from,'SOCIAL array terminator missing');
 return JSON.parse(html.slice(from,to));
}
const reports=[];
for(const filename of ['index.html','legacy-study.html']){
 const before=extract(fs.readFileSync(path.join(root,filename),'utf8'));
 const after=applyToWeb(before,bundle.candidate.items,selected.ready);
 assert(after.length>=before.length,'Existing questions deleted');
 assert(after.length-before.length<=5,'More than five new questions in one batch');
 const changes=[];
 for(let i=0;i<before.length;i++){
  const a=before[i],b=after[i];
  if(JSON.stringify(a)===JSON.stringify(b))continue;
  assert(selected.ready.includes(a.id),'Non-READY record changed');
  changes.push({id:a.id,changed_fields:Object.keys(b).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]))});
 }
 for(const q of after.slice(before.length)){
  assert(selected.ready.includes(q.id),'Non-READY addition blocked');
  assert(!before.some(x=>x.id===q.id),'Duplicate new question');
  changes.push({id:q.id,changed_fields:['NEW_QUESTION']});
 }
 assert(changes.length<=5,'More than five changed questions in one batch');
 reports.push({file:filename,existing:before.length,after:after.length,changed:changes.length,changes});
}
console.log(JSON.stringify({ready:selected.ready.length,hold:selected.held.length,production_updated:false,files:reports},null,2));

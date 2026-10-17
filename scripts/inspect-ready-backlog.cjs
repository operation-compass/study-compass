#!/usr/bin/env node
'use strict';
// Read-only publication backlog: compare actual READY content with both production snapshots.
// This does not authorize a release or mutate any input.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {selectReady}=require('./select-ready-candidates.cjs');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const root=path.join(__dirname,'..');
const bundle=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,'data/staging/drive-sync-bundle.json'),'utf8'));
const selected=selectReady(bundle);
function existing(file){
 const html=fs.readFileSync(path.join(root,file),'utf8'),mark='const SOCIAL = ',start=html.indexOf(mark);
 assert(start>=0,'Missing SOCIAL: '+file);
 const end=html.indexOf(';',start+mark.length);
 assert(end>start,'Missing terminator: '+file);
 return JSON.parse(html.slice(start+mark.length,end));
}
const left=existing('index.html'),right=existing('legacy-study.html');
assert.deepEqual(left.map(q=>q.id),right.map(q=>q.id),'Production mirrors differ: refuse to infer publication');
function canonical(q){return [q.q,q.answer,JSON.stringify(q.options),q.ex].map(x=>String(x??''));}
const delta=[];
for(const id of selected.ready){
 const candidate=bundle.candidate.items.find(q=>q.id===id);
 assert(candidate,'Missing READY candidate');
 const i=left.findIndex(q=>q.id===id);
 if(i===-1){delta.push({id,action:'new',note:'Requires v2 hash and independent audit'});continue;}
 const converted=applyToWeb([left[i]],[candidate],[id])[0];
 if(JSON.stringify(canonical(left[i]))!==JSON.stringify(canonical(converted)))delta.push({id,action:'update'});
}
const report={production_updated:false,mode:'read_only',staged:bundle.candidate.items.length,ready:selected.ready.length,held:selected.held.length,unpublished_delta:delta.length,delta,blocked_unstaged_backlog:'Not measurable from the five-item staging bundle'};
console.log(JSON.stringify(report,null,2));
module.exports={existing};

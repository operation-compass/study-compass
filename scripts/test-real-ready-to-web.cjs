'use strict';
// Read-only composition on real HTML fixtures. No deploy or output file.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {selectReady}=require('./select-ready-candidates.cjs');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const root=path.join(__dirname,'..');
const bundle=JSON.parse(fs.readFileSync(path.join(root,'data/staging/drive-sync-bundle.json'),'utf8'));
const selection=selectReady(bundle);
function social(html){
 const anchor='const SOCIAL = ',at=html.indexOf(anchor);
 assert(at>=0,'Missing SOCIAL array');
 const start=at+anchor.length,end=html.indexOf(';',start);
 assert(end>start,'Missing SOCIAL terminator');
 return JSON.parse(html.slice(start,end));
}
for(const file of ['index.html','legacy-study.html']){
 const before=social(fs.readFileSync(path.join(root,file),'utf8'));
 const after=applyToWeb(before,bundle.candidate.items,selection.ready);
 assert.equal(after.length,before.length,'Unexpected deletion or addition');
 const ready=new Set(selection.ready);
 for(let i=0;i<before.length;i++)if(!ready.has(before[i].id))assert.deepEqual(after[i],before[i],'Unapproved or HOLD question changed');
 console.log(file+': total='+before.length+', ready='+selection.ready.length+', held='+selection.held.length+', no deploy');
}

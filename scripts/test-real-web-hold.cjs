'use strict';
// Real repository fixture; no writes. Assert HOLD produces a byte-for-byte equivalent question array.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {applyToWeb}=require('./adapt-drive-to-web.cjs');
const bundle=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/staging/drive-sync-bundle.json'),'utf8'));
const ids=bundle.candidate.items.map(x=>x.id);
assert.deepEqual(bundle.audit?.records?.map(x=>x.id)||[],[],'Fixture must remain HOLD for all five');
function extract(html){
 const anchor='const SOCIAL = ';
 const start=html.indexOf(anchor);assert(start>=0,'SOCIAL array missing');
 const from=start+anchor.length;
 const end=html.indexOf(';',from);assert(end>from,'SOCIAL terminator missing');
 return JSON.parse(html.slice(from,end));
}
for(const file of ['index.html','legacy-study.html']){
 const data=extract(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
 const byId=new Map(data.map(x=>[x.id,x]));
 for(const id of ids)assert(byId.has(id),'Staged id missing from real website '+id);
 const output=applyToWeb(data,bundle.candidate.items,[]);
 assert.deepEqual(output,data,'HOLD must not change any web question');
 assert.equal(output.length,data.length,'Existing questions must remain');
 console.log(file+': '+data.length+' social questions unchanged while 5 HOLD');
}
console.log('Real website HOLD preservation verified; production untouched.');

'use strict';
// Offline-only HTML transform. Never writes deployed assets or touches localStorage.
const assert=require('node:assert/strict');
const old="question_version:'v0.3-CHECK'";
const anchor='function record(outcome,event_type=';
function patch(html){
 assert.equal(typeof html,'string');
 const start=html.indexOf(anchor);
 assert(start>=0,'Response recorder not found');
 const end=html.indexOf('\nfunction ',start+1);
 assert(end>start,'Response recorder boundary missing');
 const segment=html.slice(start,end);
 assert.equal(segment.split(old).length-1,1,'Expected one version expression in response recorder');
 assert(html.includes("const KEY='studyCompassAlphaV3'"),'Unexpected history storage key');
 return html.slice(0,start)+segment.replace(old,"question_version:q.version||'v0.3-CHECK'")+html.slice(end);
}
module.exports={patch};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 const source=process.argv[2],target=process.argv[3];
 assert(source&&target&&path.resolve(source)!==path.resolve(target),'Usage: node patch-history-version-offline.cjs <source-html> <separate-output-html>');
 const input=fs.readFileSync(source,'utf8');
 fs.writeFileSync(target,patch(input),'utf8');
 console.log('Wrote isolated patched copy to '+target);
}

'use strict';
// Offline-only HTML transform. Never writes deployed assets or touches localStorage.
const assert=require('node:assert/strict');
const old="question_version:'v0.3-CHECK'";
function patch(html){
 assert.equal(typeof html,'string');
 const n=html.split(old).length-1;
 assert.equal(n,1,'Expected exactly one known legacy version expression');
 assert(html.includes("const KEY='studyCompassAlphaV3'"),'Unexpected history storage key');
 return html.replace(old,"question_version:q.version||'v0.3-CHECK'");
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

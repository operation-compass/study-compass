'use strict';
// Strict offline-only patch of all three real event recorders. No deployed writes.
const assert=require('node:assert/strict');
const old="question_version:'v0.3-CHECK'";
const replacement="question_version:q.version||'v0.3-CHECK'";
function patch(html){
 assert.equal(typeof html,'string');
 assert(html.includes("const KEY='studyCompassAlphaV3'"),'Unexpected history storage key');
 const recorders=[
  {start:'function recordFlash(',suffix:':flash-v03'},
  {start:'function recordQuestionOnly(',suffix:':question-v03'},
  {start:'function record(outcome,event_type=',suffix:':mcq-v03'}
 ];
 // Some recorders have different names. Resolve by distinctive event variant,
 // require one matching function and one old version marker in each.
 const lines=html.split('\n');
 const targets=[];
 for(const r of recorders){
  const matches=lines.map((line,i)=>({line,i})).filter(x=>x.line.startsWith('function ')&&x.line.includes(r.suffix));
  assert.equal(matches.length,1,'Missing or ambiguous recorder '+r.suffix);
  assert.equal(matches[0].line.split(old).length-1,1,'Unexpected version marker for '+r.suffix);
  targets.push(matches[0].i);
 }
 assert.equal(new Set(targets).size,3,'Recorder targets overlap');
 assert.equal(html.split(old).length-1,3,'Unexpected total version markers');
 for(const i of targets)lines[i]=lines[i].replace(old,replacement);
 return lines.join('\n');
}
module.exports={patch};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 const source=process.argv[2],target=process.argv[3];
 assert(source&&target&&path.resolve(source)!==path.resolve(target),'Usage: node patch-history-version-offline.cjs <source-html> <separate-output-html>');
 fs.writeFileSync(target,patch(fs.readFileSync(source,'utf8')),'utf8');
 console.log('Wrote isolated patched copy to '+target);
}

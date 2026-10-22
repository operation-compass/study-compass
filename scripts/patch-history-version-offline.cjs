'use strict';
// Strict offline-only patch of all three real event recorders. No deployed writes.
const assert=require('node:assert/strict');
const old="question_version:'v0.3-CHECK'";
const replacement="question_version:q.version||'v0.3-CHECK'";
function patch(html){
 assert.equal(typeof html,'string');
 assert(html.includes("const KEY='studyCompassAlphaV3'"),'Unexpected history storage key');
 const recorders=[
  {start:'function rateFlash(',suffix:':flash-v03'},
  {start:'function pushQuestionOnlyEvent(',suffix:':question-v03'},
  {start:'function record(outcome,event_type=',suffix:':mcq-v03'}
 ];
 const segments=[];
 for(const r of recorders){
  const start=html.indexOf(r.start);
  assert(start>=0,'Missing recorder '+r.start);
  const end=html.indexOf('\nfunction ',start+1);
  assert(end>start,'Recorder boundary missing '+r.start);
  const segment=html.slice(start,end);
  assert(segment.includes(r.suffix),'Recorder identity mismatch '+r.suffix);
  assert.equal(segment.split(old).length-1,1,'Unexpected version marker '+r.suffix);
  segments.push({start,end,segment});
 }
 assert.equal(html.split(old).length-1,3,'Unexpected total version markers');
 assert(segments[0].end<=segments[1].start&&segments[1].end<=segments[2].start,'Recorder order changed');
 let output=html;
 for(const r of segments.reverse())output=output.slice(0,r.start)+r.segment.replace(old,replacement)+output.slice(r.end);
 return output;

}
module.exports={patch};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');
 const source=process.argv[2],target=process.argv[3];
 assert(source&&target&&path.resolve(source)!==path.resolve(target),'Usage: node patch-history-version-offline.cjs <source-html> <separate-output-html>');
 fs.writeFileSync(target,patch(fs.readFileSync(source,'utf8')),'utf8');
 console.log('Wrote isolated patched copy to '+target);
}

#!/usr/bin/env node
// Read-only static QA on the study HTML. Does not deploy or change data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path=process.argv[2]||'legacy-study.html';
const html=fs.readFileSync(path,'utf8');
assert.ok(html.length>800000,'HTML unexpectedly short; stop');
const start=html.indexOf('const SCIENCE = [');
assert.ok(start>=0,'missing science dataset');
const from=html.indexOf('[',start),to=html.indexOf('];',from);
const science=JSON.parse(html.slice(from,to+1));
const expected=new Map([
 ['SC-SCI-EXAM-000002',['電圧1V','電流0.2A','電圧と電流']],
 ['SC-SCI-EXAM2-000002',['銅4.0g','5.0g','銅6.0g']]
]);
for(const [id,terms] of expected){
 const hits=science.filter(x=>x.id===id);
 assert.equal(hits.length,1,id+' must exist exactly once');
 const q=hits[0];
 assert.ok(terms.every(x=>q.q.includes(x)),id+' missing self-contained context');
 assert.ok(!q.q.includes('前問'),id+' still depends on previous question');
 assert.equal(q.options.length,4,id+' options');
 assert.equal(new Set(q.options).size,4,id+' unique options');
 assert.ok(q.options.includes(q.answer),id+' answer must be present');
 assert.ok(q.ex,id+' missing explanation');
}
assert.ok(html.includes('function questionMaterial(q)'),'material render must remain present');
assert.ok(html.includes("const KEY='studyCompassAlphaV3'"),'history storage key changed');
assert.ok(html.includes('function shuffle(a)'),'randomizer missing');
assert.ok(html.includes('function start(isReview=false,specific=null,testChapter=null)'),'start/review missing');
assert.ok(html.includes("mode==='question'") || html.includes("mode==='questionOnly'") || html.includes("mode==='question-only'") || html.includes("mode==='only'"),'inspect question-only mode selector: expected marker missing');
console.log('PASS: self-contained science questions and key learning-path invariants');

const fs = require('node:fs');
const assert = require('node:assert/strict');
const home = fs.readFileSync('home-v2.html', 'utf8');
const worker = fs.readFileSync('worker.js', 'utf8');
const beta = fs.readFileSync('beta-storage.js', 'utf8');
const policy = fs.readFileSync('study-compass-free-policy.md', 'utf8');
assert(home.includes('まずは一問一答から始める'), 'primary learning entry missing');
for(const route of ['./study.html?mode=qa','./study.html?mode=flashcards','./study.html?mode=questions','./study.html?mode=history']){
  assert(home.includes(route), 'missing learning route '+route);
}
assert(home.includes('id="storageStatus"'), 'missing storage status');
assert(home.includes('s.checked!==undefined'), 'legacy written progress compatibility missing');
for(const key of ['studyCompassWrittenBetaV1','studyCompassGeneratedBetaV1']){
  assert(home.includes(key), 'missing beta progress key '+key);
}
assert(beta.includes('if (blocked) return false'), 'corrupt storage overwrite protection missing');
assert(worker.includes('"/home-v2.html"'), 'homepage worker mapping missing');
assert(policy.includes('**Webは完全無料**'), 'free web policy missing');
assert(!/href=["'][^"']*(?:\/pricing|\/checkout|\/subscribe)/i.test(home), 'payment entry detected');
console.log('PASS free learning home routes, progress compatibility and storage protection');

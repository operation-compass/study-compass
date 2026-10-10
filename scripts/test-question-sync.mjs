import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'compass-sync-test-'));
const base = {question_id:'Q001',status:'CHECK',publish_flag:'FALSE',question_type:'4択',question_text:'正しい答えは？',choice_a:'あ',choice_b:'い',choice_c:'う',choice_d:'え',correct_answer:'い',explanation:'解説'};
const add = {...base,question_id:'Q002',question_text:'次の問題は？'};
const cases = [
  ['safe append', [base,add], true],
  ['duplicate id', [base,{...add,question_id:'Q001'}], false],
  ['removed existing id', [add], false],
  ['changed existing text', [{...base,question_text:'無断変更'},add], false],
  ['changed existing answer', [{...base,correct_answer:'う'},add], false],
  ['changed existing publish flag', [{...base,publish_flag:'TRUE'},add], false],
  ['new published question', [base,{...add,publish_flag:'TRUE'}], false],
  ['new without CHECK', [base,{...add,status:'APPROVED'}], false],
  ['missing answer choice', [base,{...add,correct_answer:'お'}], false],
  ['missing explanation', [base,{...add,explanation:''}], false],
  ['duplicate choices', [base,{...add,choice_b:'あ'}], false]
];
try {
  const b = path.join(root,'baseline.json'), c=path.join(root,'candidate.json');
  fs.writeFileSync(b,JSON.stringify([base]));
  for (const [name,candidate,expected] of cases) {
    fs.writeFileSync(c,JSON.stringify(candidate));
    const run = spawnSync(process.execPath,['scripts/check-question-sync.mjs',b,c],{encoding:'utf8'});
    assert.equal(run.status===0,expected,name+' '+run.stdout+' '+run.stderr);
    console.log('PASS',name);
  }
  console.log('PASS',cases.length,'tests');
} finally { fs.rmSync(root,{recursive:true,force:true}); }

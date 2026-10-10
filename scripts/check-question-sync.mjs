#!/usr/bin/env node
// Study COMPASS safety gate: inspect a staged JSON export before any manual sync.
// Usage: node scripts/check-question-sync.mjs baseline.json candidate.json
// Input: JSON array of records using Google Sheets column names, OR {"questions":[...]}
// Never writes to Drive or GitHub. No network calls.
import fs from 'node:fs';
import process from 'node:process';

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  console.error('Usage: node scripts/check-question-sync.mjs baseline.json candidate.json');
  process.exit(2);
}
const load = path => {
  const obj = JSON.parse(fs.readFileSync(path, 'utf8'));
  const records = Array.isArray(obj) ? obj : obj.questions;
  if (!Array.isArray(records)) throw new Error(path + ': expected an array or {questions: array}');
  return records;
};
const previous = load(baselinePath);
const next = load(candidatePath);
const errors = [], warnings = [];
const norm = value => String(value ?? '').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const idOf = q => String(q.question_id ?? '').trim();
const textOf = q => String(q.question_text ?? '');
const truthy = v => v === true || String(v).trim().toUpperCase() === 'TRUE';
const map = new Map(), texts = new Map();
for (const [i, q] of next.entries()) {
  const id = idOf(q);
  if (!id) { errors.push('missing question_id at item '+(i+1)); continue; }
  if (map.has(id)) errors.push('duplicate ID: '+id);
  map.set(id,q);
  const t = norm(textOf(q));
  if (!t) errors.push('empty question_text: '+id);
  if (texts.has(t)) warnings.push('same text: '+id+' and '+texts.get(t));
  else texts.set(t,id);
  if (truthy(q.publish_flag) && String(q.status).toUpperCase() !== 'APPROVED') {
    errors.push('publish without APPROVED review status: '+id);
  }
  if (String(q.question_type) === '4択') {
    const options = ['choice_a','choice_b','choice_c','choice_d'].map(k=>String(q[k]??'').trim());
    if (options.some(x=>!x) || new Set(options).size!==4) errors.push('invalid 4 choices: '+id);
    if (!options.includes(String(q.correct_answer??'').trim())) errors.push('answer missing from options: '+id);
    if (!String(q.explanation??'').trim()) errors.push('missing explanation: '+id);
  }
}
const previousIds = new Set();
for (const q of previous) {
  const id = idOf(q);
  if (previousIds.has(id)) errors.push('baseline duplicate ID: '+id);
  previousIds.add(id);
  if (!map.has(id)) { errors.push('existing ID removed: '+id); continue; }
  const after = map.get(id);
  if (textOf(q) !== textOf(after)) errors.push('existing question text changed: '+id);
  if (String(q.correct_answer??'') !== String(after.correct_answer??'')) errors.push('existing answer changed: '+id);
  if (String(q.publish_flag??'').toUpperCase() !== String(after.publish_flag??'').toUpperCase())
    errors.push('existing publish flag changed; separate review required: '+id);
}
const added = [...map.keys()].filter(id=>!previousIds.has(id));
for (const id of added) {
  const q = map.get(id);
  if (truthy(q.publish_flag) || String(q.status).toUpperCase() !== 'CHECK')
    errors.push('new item must be CHECK + unpublished: '+id);
}
console.log(JSON.stringify({baseline:previous.length,candidate:next.length,added:added.length,errors,warnings},null,2));
process.exit(errors.length?1:0);

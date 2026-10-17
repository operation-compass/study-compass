#!/usr/bin/env node
'use strict';
// Fail-closed release gate. This does NOT grant editorial approval.
// Usage: node scripts/check-drive-approval.cjs <candidate.json> <approvals.json>
// Neither input is published by this script.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
function load(path) { assert(path, 'Missing input path'); return JSON.parse(fs.readFileSync(path, 'utf8')); }
function hash(q) {
  const fields = ['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
  return crypto.createHash('sha256').update(JSON.stringify(fields.map(k => String(q[k] ?? '')))).digest('hex');
}
try {
  const candidate=load(process.argv[2]), approval=load(process.argv[3]);
  assert(Array.isArray(candidate.items), 'candidate.items must be an array');
  assert(Array.isArray(approval.approvals), 'approvals.approvals must be an array');
  assert.equal(approval.source_spreadsheet_id, process.env.STUDY_COMPASS_SOURCE_SHEET_ID || '1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88', 'Unexpected Drive source');
  assert(typeof approval.exported_at === 'string' && !Number.isNaN(Date.parse(approval.exported_at)), 'Missing valid export time');
  assert(Date.now()-Date.parse(approval.exported_at) < 3*60*60*1000 && Date.parse(approval.exported_at)<=Date.now()+60000, 'Approval snapshot expired or future-dated');
  assert(approval.export_source === 'authenticated-drive-export', 'Untrusted export source');
  const allow = new Map();
  for (const a of approval.approvals) {
    assert(typeof a.id === 'string' && a.id, 'Blank approval id');
    assert(!allow.has(a.id), 'Duplicate approval id: '+a.id);
    allow.set(a.id,a);
  }
  const withheld = new Set(load('data/release/withheld-ids.json').ids);
  const seen = new Set();
  for (const q of candidate.items) {
    assert(typeof q.id === 'string' && q.id, 'Blank question id');
    assert(!seen.has(q.id), 'Duplicate candidate id: '+q.id); seen.add(q.id);
    assert(!withheld.has(q.id), 'Known withheld question cannot be released: '+q.id);
    const a=allow.get(q.id);
    assert(a, 'Missing Drive approval: '+q.id);
    assert(a.status === 'PUBLIC' && (a.publish_flag === true || a.publish_flag === 'TRUE'), 'Not public-approved: '+q.id);
    assert(typeof a.reviewed_by === 'string' && a.reviewed_by.trim() && a.reviewed_by !== 'AI', 'Missing human reviewer: '+q.id);
    assert(typeof a.approved_at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(a.approved_at), 'Missing approval date: '+q.id);
    assert(a.sha256 === hash(q), 'Approval content hash mismatch: '+q.id);
    assert(typeof a.version === 'string' && a.version.trim(), 'Missing approved version: '+q.id);
    assert(a.version === q.version, 'Approved version mismatch: '+q.id);
    assert(typeof q.question_text === 'string' && q.question_text.trim(), 'Blank question: '+q.id);
    assert(typeof q.correct_answer === 'string' && q.correct_answer.trim(), 'Blank answer: '+q.id);
    assert(typeof q.explanation === 'string' && q.explanation.trim(), 'Blank explanation: '+q.id);
    if(q.question_type === '4択') {
      const choices=['choice_a','choice_b','choice_c','choice_d'].map(k=>q[k]);
      assert(choices.every(s=>typeof s==='string'&&s.trim()) && new Set(choices).size===4, 'Invalid choices: '+q.id);
      assert(choices.filter(s=>s===q.correct_answer).length===1,'Correct choice not unique: '+q.id);
    }
  }
  assert(candidate.items.length > 0, 'Empty release candidate: refusing production wipe');
  console.log('Drive approval gate PASS: '+candidate.items.length+' approved items.');
} catch(e) {
  console.error('Drive approval gate BLOCK:',e.message);
  process.exitCode=1;
}

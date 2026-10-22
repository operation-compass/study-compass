'use strict';
const assert = require('node:assert/strict');
function allowed(row, approval, audit, release) {
  if (!row || !approval || !audit || !release) return false;
  // Authorization to deploy is separate from review approval and must be explicit.
  if (release.question_id !== row.question_id || release.production_permission !== 'ALLOW') return false;
  if (!release.authorized_by || !release.authorized_at) return false;
  if (release.version !== row.version || release.content_sha256 !== row.content_sha256) return false;
  if (/(本番反映は行わない|公開禁止|HOLD|do not publish)/i.test(approval.approval_note || '')) return false;
  const complete = v => typeof v === 'string' && v.trim().length > 0;
  if (!complete(row.question_id) || row.status !== 'PUBLIC' || String(row.publish_flag).toUpperCase() !== 'TRUE') return false;
  if (approval.question_id !== row.question_id || approval.approval_status !== 'APPROVED') return false;
  if (!complete(approval.approved_by) || !complete(approval.approved_at)) return false;
  if (!complete(row.version) || !complete(approval.approved_version) || row.version !== approval.approved_version) return false;
  if (!/^[a-f0-9]{64}$/i.test(row.content_sha256 || '') || row.content_sha256 !== approval.approved_sha256) return false;
  if (audit.question_id !== row.question_id || audit.question_version !== row.version || audit.content_sha256 !== row.content_sha256) return false;
  return ['audit_1_accuracy','audit_2_quality','audit_3_technical'].every(k => audit[k] === 'PASS');
}
module.exports = {allowed};
if (require.main === module) {
  const hash = 'a'.repeat(64);
  const row = {question_id:'TEST-001',status:'PUBLIC',publish_flag:'TRUE',version:'v1',content_sha256:hash};
  const approval = {question_id:'TEST-001',approval_status:'APPROVED',approved_by:'reviewer',approved_at:'2026-10-22',approved_version:'v1',approved_sha256:hash};
  const audit = {question_id:'TEST-001',question_version:'v1',content_sha256:hash,audit_1_accuracy:'PASS',audit_2_quality:'PASS',audit_3_technical:'PASS'};
  const release = {question_id:'TEST-001',production_permission:'ALLOW',authorized_by:'human',authorized_at:'2026-10-22',version:'v1',content_sha256:hash};
  assert(allowed(row,approval,audit,release));
  assert.equal(allowed(row,approval,audit),false,'missing explicit production permission must deny');
  assert.equal(allowed(row,{...approval,approval_note:'本番反映は行わない'},audit,release),false);
  for (const change of [
    [row,'status','CHECK'],[row,'publish_flag','FALSE'],[row,'version','v2'],[row,'content_sha256','b'.repeat(64)],
    [approval,'approval_status','HOLD'],[approval,'approved_by',''],[approval,'approved_at',''],[approval,'approved_sha256','b'.repeat(64)],
    [audit,'audit_1_accuracy','PENDING'],[audit,'audit_2_quality','PENDING'],[audit,'audit_3_technical','PENDING']
  ]) {
    const [target,key,value]=change;
    const mutated={...target,[key]:value};
    assert.equal(allowed(target===row?mutated:row,target===approval?mutated:approval,target===audit?mutated:audit,release),false,key);
  }
  for (const [key,value] of [['production_permission','HOLD'],['authorized_by',''],['content_sha256','b'.repeat(64)]]) assert.equal(allowed(row,approval,audit,{...release,[key]:value}),false,key);
  assert.equal(allowed(row,null,audit,release),false);
  console.log('PASS approval gate: synthetic approved row accepted; unapproved, mismatch and missing proofs rejected');
}

'use strict';
/**
 * Study COMPASS: simplified three-check candidate preflight (experimental).
 *
 * Check 1: sourced content review recorded by ChatGPT/operator.
 * Check 2: educational/duplication review recorded by ChatGPT/operator.
 * Check 3: deterministic validation here; the downstream GitHub CI/deploy
 * checks must still pass separately.
 *
 * This module DOES NOT grant legacy READY, modify Sheets or publish anything.
 */
const crypto = require('node:crypto');
const V2_FIELDS = ['id','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
const hashV2 = q => crypto.createHash('sha256').update(JSON.stringify(V2_FIELDS.map(k => String(q[k] ?? '')))).digest('hex');
const nonblank = s => typeof s === 'string' && s.trim().length > 0;
const validDate = s => nonblank(s) && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s) && Number.isFinite(Date.parse(s)) && Date.parse(s) <= Date.now() + 60000;
const canonical = s => String(s ?? '').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
function preflightQuestion(q, evidence, knownIds = []) {
  const errors = [];
  if (!q || typeof q !== 'object' || Array.isArray(q) || !evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return {eligible:false, errors:['missing_question_or_evidence']};
  for (const f of V2_FIELDS) if (!nonblank(q[f])) errors.push('missing_' + f);
  if (!/^中[123]$/.test(q.grade ?? '')) errors.push('invalid_grade');
  if (q.question_type !== '4択') errors.push('invalid_question_type');
  const choices = ['choice_a','choice_b','choice_c','choice_d'].map(k => q[k]);
  if (new Set(choices.map(canonical)).size !== 4) errors.push('duplicate_choices');
  if (choices.filter(x => canonical(x) === canonical(q.correct_answer)).length !== 1) errors.push('invalid_correct_answer');
  if (!nonblank(q.version)) errors.push('missing_version');
  if (!Array.isArray(knownIds) || knownIds.filter(id => id === q.id).length !== 1) errors.push('missing_or_duplicate_master_id');
  const sha = hashV2(q);
  if (evidence.id !== q.id || evidence.version !== q.version || evidence.question_sha256 !== sha) errors.push('evidence_identity_mismatch');
  for (const name of ['accuracy','quality']) {
    const c = evidence[name];
    if (!c || c.result !== 'PASS' || !validDate(c.checked_at) || !nonblank(c.reviewer) || c.question_sha256 !== sha) errors.push('invalid_' + name + '_check');
  }
  if (!Array.isArray(evidence.accuracy?.sources) || !evidence.accuracy.sources.some(u => typeof u === 'string' && /^https:\/\/[a-z0-9.-]+\//i.test(u))) errors.push('missing_source_url');
  if (!evidence.quality || evidence.quality.duplicate_reviewed !== true || evidence.quality.existing_web_reviewed !== true || evidence.quality.curriculum_reviewed !== true) errors.push('incomplete_quality_review');
  if (evidence.risk !== 'LOW' || evidence.exception_reason) errors.push('risk_or_exception');
  if (evidence.publication_approved !== true || !nonblank(evidence.approval_reference)) errors.push('missing_publication_approval');
  return {eligible:errors.length===0, errors, question_sha256:sha, status:errors.length===0?'PRECHECK_PASS':'HOLD'};
}
module.exports = {preflightQuestion,hashV2,V2_FIELDS};

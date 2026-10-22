'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assess}=require('./evaluate-release-exceptions.cjs');
const sha='a'.repeat(64),id='SC-SOC-HIS-WEB26-000001',version='v0.1';
const record={id,version,sha256:sha,master_status:'CHECK',publish_flag:false};
const ref=()=>({id,version,sha256:sha});
function proof(){return {source:{...ref(),verified:true},duplicate:{...ref(),live_parity:true,semantic_checked:true},curriculum:{...ref(),checked:true},runtime:{...ref(),mobile_ui:true,grading:true,history_preserved:true},exception_reviews:['accuracy','quality','technical'].map(role=>({...ref(),role,decision:'PASS',evidence_verified:true}))}}
test('missing proof remains HOLD',()=>{const r=assess(record);assert.equal(r.review_ready,false);assert.equal(r.release_authorized,false);assert(r.blockers.length>=5)});
test('all evidence can only make eligible for distinct approval, never authorize release',()=>{const r=assess(record,proof());assert.equal(r.review_ready,true);assert.equal(r.formal_release_approval,'NOT_EVALUATED');assert.equal(r.release_authorized,false);assert.equal(r.production_permission,'HOLD')});
test('explicit HOLD remains blocked even if proof is green',()=>{for(const flag of ['original_hold','legacy_hold','user_release_ban']){const r=assess({...record,[flag]:true},proof());assert.equal(r.review_ready,false);assert(r.blockers.includes('EXPLICIT_HOLD_REQUIRES_SEPARATE_CLEARANCE'))}});
test('stale or wrong-ID evidence rejected',()=>{const p=proof();p.runtime.version='v0.2';assert(assess(record,p).blockers.includes('BROWSER_RUNTIME_EVIDENCE_INCOMPLETE'));p.runtime.version=version;p.source.sha256='b'.repeat(64);assert(assess(record,p).blockers.includes('SOURCE_EVIDENCE_UNVERIFIED'))});
test('legacy READY state cannot bypass the new exception review',()=>{const r=assess({...record,master_status:'READY',publish_flag:true},proof());assert.equal(r.review_ready,false);assert.equal(r.release_authorized,false)});

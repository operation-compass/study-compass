'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validate,validateForDeployment}=require('./check-publish-delta-approval.cjs');
const h='a'.repeat(64),h2='b'.repeat(64);
const baseline=[{id:'LIVE-001',version:'v1',sha256:h}];
const existing={id:'LIVE-001',version:'v1',sha256:h};
const extra={id:'NEW-001',version:'v0.1',sha256:h2};
test('unchanged deployed bank is unaffected by missing candidate approvals',()=>{const r=validate([existing],baseline,{});assert.equal(r.can_deploy,true);assert.equal(r.unchanged_count,1);assert.equal(r.production_updated,false)});
test('new unapproved and modified candidates are blocked',()=>{for(const q of [extra,{...existing,sha256:h2}]){const r=validate(q.id===existing.id?[q]:[existing,q],baseline,{});assert.equal(r.can_deploy,false);assert(r.blocked.some(b=>b.id===q.id))}});
test('missing baseline entry blocks removal',()=>{const r=validate([],baseline,{});assert.equal(r.can_deploy,false);assert.equal(r.blocked[0].type,'REMOVED')});
test('explicit HOLD overrides apparently complete metadata',()=>{
 const e={id:extra.id,version:extra.version,sha256:extra.sha256,master_status:'PUBLIC',publish_flag:true,
  audit_roles:['accuracy','quality','technical'].map(role=>({role,status:'PASS',id:extra.id,version:extra.version,sha256:extra.sha256,verified:true})),
  approval:{status:'APPROVED',id:extra.id,version:extra.version,sha256:extra.sha256,by:'human',at:'2026-10-23'},
  release:{permission:'ALLOW',id:extra.id,version:extra.version,sha256:extra.sha256,by:'human',at:'2026-10-23'},
  verified_live_master_snapshot:true,explicit_hold:true};
 const r=validate([existing,extra],baseline,{[extra.id]:e});
 assert.equal(r.can_deploy,false);assert(r.blocked[0].reasons.includes('EXPLICIT_HOLD'));
});
test('invalid or duplicated identity rejects',()=>{assert.throws(()=>validate([existing,existing],baseline,{}),/INVALID_CANDIDATE/);assert.throws(()=>validate([existing],[existing,existing],{}),/INVALID_BASELINE/)});

test('unchanged content but changed version requires new approval',()=>{const q={...existing,version:'v2'};const r=validate([q],baseline,{});assert.equal(r.can_deploy,false);assert.equal(r.blocked[0].type,'MODIFIED')});
test('deployment rejects unverified baseline provenance even with unchanged content',()=>{const r=validateForDeployment([existing],baseline,{});assert.equal(r.can_deploy,false);assert(r.blocked.some(x=>x.reasons.includes('BASELINE_PROVENANCE_UNVERIFIED')))});
test('deployment rejects false or throwing provenance verifier',()=>{for(const check of [()=>false,()=>{throw Error('no trust')}]){const r=validateForDeployment([existing],baseline,{},check);assert.equal(r.can_deploy,false)}});

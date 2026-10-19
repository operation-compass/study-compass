'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildShadowReport}=require('./simple-three-check-gas-adapter.cjs');
const old={candidate:{items:[{id:'A'}]},audit:{records:[]}};
test('legacy GAS bundle cannot be silently promoted',()=>assert.throws(()=>buildShadowReport(old,['A'],[],[]),/No simplified-review records/));
test('missing authenticated bundle is rejected',()=>assert.throws(()=>buildShadowReport({candidate:{items:[]} },[],[],[]),/Existing GAS candidate\/audit bundle/));
test('untrusted missing external approval registry is rejected',()=>assert.throws(()=>buildShadowReport({...old,simple_checks:{records:[]}},['A'],[],null),/Independent canonical inventory/));
test('new records missing actual evidence remain HOLD',()=>{
 const r=buildShadowReport({...old,simple_checks:{records:[]}},['A'],[],[]);
 assert.deepEqual(r.eligible,[]);assert.deepEqual(r.held,['A']);assert.equal(r.production_updated,false);assert.equal(r.legacy_release_unchanged,true);
});

test('separate shadow-only GAS bundle can be assessed without legacy READY audits',()=>{
 const x={mode:'shadow_only',production_updated:false,canonical_master_ids:['A'],candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 const r=buildShadowReport(x,['A'],[],[]);
 assert.deepEqual(r.eligible,[]);assert.deepEqual(r.held,['A']);
 assert.equal(r.source,'canonical_GAS_shadow_preview');
 assert.equal(r.production_updated,false);
});
test('shadow-only GAS bundle rejects embedded legacy release audits',()=>{
 const x={mode:'shadow_only',production_updated:false,...old,simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A'],[],[]),/must not carry legacy/);
});
test('shadow-only flag must explicitly say no production update',()=>{
 const x={mode:'shadow_only',production_updated:true,candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A'],[],[]),/Existing GAS candidate\/audit bundle/);
});

test('shadow inventory missing a canonical MASTER ID fails closed',()=>{
 const x={mode:'shadow_only',production_updated:false,canonical_master_ids:['A'],candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A','B'],[],[]),/inventory differs/);
});
test('shadow inventory with duplicate MASTER IDs fails closed',()=>{
 const x={mode:'shadow_only',production_updated:false,canonical_master_ids:['A','A'],candidate:{items:[{id:'A'}]},simple_checks:{records:[]}};
 assert.throws(()=>buildShadowReport(x,['A'],[],[]),/unique canonical MASTER/);
});

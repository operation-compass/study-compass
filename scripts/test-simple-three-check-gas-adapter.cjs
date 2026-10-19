'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildShadowReport}=require('./simple-three-check-gas-adapter.cjs');
const old={candidate:{items:[{id:'A'}]},audit:{records:[]}};
test('legacy GAS bundle cannot be silently promoted',()=>assert.throws(()=>buildShadowReport(old,['A'],[],[]),/No simplified-review records/));
test('missing authenticated bundle is rejected',()=>assert.throws(()=>buildShadowReport({candidate:{items:[]} },[],[],[]),/GAS candidate\/audit bundle/));
test('untrusted missing external approval registry is rejected',()=>assert.throws(()=>buildShadowReport({...old,simple_checks:{records:[]}},['A'],[],null),/Independent canonical inventory/));
test('new records missing actual evidence remain HOLD',()=>{
 const r=buildShadowReport({...old,simple_checks:{records:[]}},['A'],[],[]);
 assert.deepEqual(r.eligible,[]);assert.deepEqual(r.held,['A']);assert.equal(r.production_updated,false);assert.equal(r.legacy_release_unchanged,true);
});

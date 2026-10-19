'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scReadSimpleChecks_}=require('../gas/sc-simple-check-export.gs');
global.scReadSimpleChecks_=scReadSimpleChecks_;
const {scAttachSimpleChecksToStaging_}=require('../gas/sc-attach-simple-checks.gs');
const legacy=()=>({candidate:{items:[{id:'SC-1'}]},audit:{records:[]},sync:{authenticated:true}});
const spreadsheet={getSheetByName:()=>null};
test('preserves authenticated GAS bundle and adds empty review collection',()=>{
 const source=legacy(),r=scAttachSimpleChecksToStaging_(source,spreadsheet);
 assert.deepEqual(r.simple_checks,{records:[]});
 assert.strictEqual(r.audit,source.audit);
 assert.strictEqual(r.sync,source.sync);
 assert.equal(Object.hasOwn(source,'simple_checks'),false);
});
test('rejects overwrite of existing reviews',()=>{
 const x=legacy();x.simple_checks={records:[]};
 assert.throws(()=>scAttachSimpleChecksToStaging_(x,spreadsheet),/overwrite/);
});
test('rejects invalid legacy staging',()=>assert.throws(()=>scAttachSimpleChecksToStaging_({},spreadsheet),/invalid legacy/));
test('rejects duplicate candidate IDs',()=>{
 const x=legacy();x.candidate.items.push({id:'SC-1'});
 assert.throws(()=>scAttachSimpleChecksToStaging_(x,spreadsheet),/duplicate candidate/);
});
test('requires canonical spreadsheet handle',()=>assert.throws(()=>scAttachSimpleChecksToStaging_(legacy(),null),/spreadsheet/));

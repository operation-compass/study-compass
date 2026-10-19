'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scReadSimpleChecks_}=require('../gas/sc-simple-check-export.gs');
global.scReadSimpleChecks_=scReadSimpleChecks_;
const {scAttachSimpleChecksToStaging_,scSameSnapshotWithSimpleChecks_}=require('../gas/sc-attach-simple-checks.gs');
global.studySameSnapshot_=(old,next)=>JSON.stringify(old.candidate)===JSON.stringify(next.candidate)&&JSON.stringify(old.audit)===JSON.stringify(next.audit);
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

test('review-only change forces new staging snapshot',()=>{
 const old={...legacy(),simple_checks:{records:[{id:'SC-1',result:'PENDING'}]}};
 const next={...legacy(),simple_checks:{records:[{id:'SC-1',result:'PASS'}]}};
 assert.equal(scSameSnapshotWithSimpleChecks_(old,next),false);
});
test('identical extended snapshots can be skipped',()=>{
 const old={...legacy(),simple_checks:{records:[]}};
 const next={...legacy(),simple_checks:{records:[]}};
 assert.equal(scSameSnapshotWithSimpleChecks_(old,next),true);
});
test('old-format snapshot must be staged once',()=>{
 const old=legacy(),next={...legacy(),simple_checks:{records:[]}};
 assert.equal(scSameSnapshotWithSimpleChecks_(old,next),false);
});
test('missing new snapshot cannot be treated as unchanged',()=>{
 assert.equal(scSameSnapshotWithSimpleChecks_({...legacy(),simple_checks:{records:[]}},legacy()),false);
});

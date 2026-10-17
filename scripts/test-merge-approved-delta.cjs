#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),{mergeExisting}=require('./merge-approved-delta.cjs');
const existing=[{id:'old-1',question:'Preserve'},{id:'old-2',question:'Original'}];
let out=mergeExisting(existing,[{id:'new-3',question:'Add'}],['new-3']);
assert.equal(out.length,3);
assert.equal(out[0].question,'Preserve');
out=mergeExisting(existing,[{id:'old-2',question:'Updated'}],['old-2']);
assert.equal(out.length,2);
assert.equal(out[0].question,'Preserve');
assert.equal(out[1].question,'Updated');
assert.throws(()=>mergeExisting(existing,[{id:'new-3'}],[]),/Unapproved/);
assert.throws(()=>mergeExisting(existing,[{id:'new-3'},{id:'new-3'}],['new-3']),/Duplicate/);
assert.deepEqual(mergeExisting(existing,[],[]),existing);
assert.equal(existing[1].question,'Original');
console.log('Safe delta merge tests passed (synthetic only; no deploy).');

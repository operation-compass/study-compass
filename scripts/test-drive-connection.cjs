'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const env={...process.env};delete env.STUDY_COMPASS_GOOGLE_SERVICE_ACCOUNT_JSON;
const out=cp.spawnSync(process.execPath,[path.join(__dirname,'check-drive-connection.cjs')],{env,encoding:'utf8'});
assert.equal(out.status,1,'Missing credential must never be treated as success');
assert.match(out.stderr,/Missing service-account secret/);
console.log('Drive connection probe correctly rejects missing credential.');

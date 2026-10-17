#!/usr/bin/env node
'use strict';
// Non-production contract tests. No Drive credentials, no network calls.
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const p=cp.spawnSync(process.execPath,[path.join(__dirname,'export-drive-approved.cjs')],{encoding:'utf8',env:{...process.env,STUDY_COMPASS_GOOGLE_SERVICE_ACCOUNT_JSON:''}});
assert.equal(p.status,1,'Export must fail without Google credentials');
assert.match(p.stderr,/Missing service-account secret/);
console.log('Drive exporter: missing-credential fail-closed test passed');

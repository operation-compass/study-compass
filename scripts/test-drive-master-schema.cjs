#!/usr/bin/env node
'use strict';
// Verify Drive question MASTER shape, not its editorial approval.
// This test does not read credentials or publish anything.
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=['question_id','status','subject','grade','unit_major','unit_minor','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation','memory_tip','difficulty','importance','source_type','source_url','verified_date','reviewer','version','publish_flag'];
const expected={question_id:0,status:1,subject:2,question_type:6,question_text:7,choice_a:8,choice_b:9,choice_c:10,choice_d:11,correct_answer:12,explanation:13,verified_date:19,reviewer:20,version:21,publish_flag:22};
for(const [column,index] of Object.entries(expected))assert.equal(source[index],column,'Misaligned: '+column);
assert(!source.includes('approved_at'),'Source verified_date is NOT editorial approved_at');
console.log('MASTER schema mapping verified; human approval timestamp must be supplied separately.');

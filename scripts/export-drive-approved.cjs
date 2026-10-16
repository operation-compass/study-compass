#!/usr/bin/env node
'use strict';
// Read-only, authenticated Google Sheets export. Does not approve or deploy anything.
// Secrets: STUDY_COMPASS_GOOGLE_SERVICE_ACCOUNT_JSON (GitHub secret, not checked in).
const fs=require('node:fs'),crypto=require('node:crypto');
const SHEET='1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88';
const RANGE="'問題MASTER'!A1:AP6000";
function b64(v){return Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url');}
async function token(){
  const raw=process.env.STUDY_COMPASS_GOOGLE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw Error('Missing service-account secret; no export performed');
  const sa=JSON.parse(raw);
  if(!sa.client_email||!sa.private_key||!sa.token_uri)throw Error('Invalid service account secret');
  if(sa.token_uri!=='https://oauth2.googleapis.com/token')throw Error('Unexpected OAuth token URL');
  const now=Math.floor(Date.now()/1000);
  const header=b64({alg:'RS256',typ:'JWT'});
  const claims=b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:sa.token_uri,iat:now,exp:now+1800});
  const input=header+'.'+claims;
  const signature=crypto.sign('RSA-SHA256',Buffer.from(input),sa.private_key).toString('base64url');
  const response=await fetch(sa.token_uri,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:input+'.'+signature})});
  if(!response.ok)throw Error('Google authentication failed HTTP '+response.status);
  const json=await response.json();if(!json.access_token)throw Error('Missing access token');return json.access_token;
}
const fields=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
function fingerprint(q){return crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>String(q[k]??'')))).digest('hex');}
async function main(){
  const access=await token();
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+SHEET+'/values/'+encodeURIComponent(RANGE)+'?valueRenderOption=UNFORMATTED_VALUE';
  const response=await fetch(url,{headers:{Authorization:'Bearer '+access}});
  if(!response.ok)throw Error('Drive read failed HTTP '+response.status);
  const body=await response.json(),rows=body.values||[];
  const header=rows.shift();if(!header)throw Error('Empty Drive sheet');
  const indexes=Object.fromEntries(header.map((h,i)=>[String(h),i]));
  for(const key of ['question_id','status','publish_flag','reviewer','verified_date','version','question_text','correct_answer','explanation'])if(indexes[key]===undefined)throw Error('Missing column '+key);
  const approved=[],seen=new Set(),errors=[];
  for(let i=0;i<rows.length;i++){
    const row=rows[i],get=key=>row[indexes[key]]??'';
    const id=String(get('question_id'));if(!id)continue;
    if(seen.has(id)){errors.push('Duplicate ID row '+(i+2)+': '+id);continue;}seen.add(id);
    const published=get('publish_flag')===true||String(get('publish_flag')).toUpperCase()==='TRUE';
    if(String(get('status'))!=='PUBLIC'||!published)continue;
    const reviewer=String(get('reviewer')).trim(),verified=String(get('verified_date')).trim();
    if(!reviewer||reviewer==='AI'||!verified||!get('version')){errors.push('Missing human-review metadata: '+id);continue;}
    const q={id,subject:String(get('subject')),question_type:String(get('question_type')),question_text:String(get('question_text')),choice_a:String(get('choice_a')),choice_b:String(get('choice_b')),choice_c:String(get('choice_c')),choice_d:String(get('choice_d')),correct_answer:String(get('correct_answer')),explanation:String(get('explanation')),version:String(get('version'))};
    approved.push({q,a:{id,status:'PUBLIC',publish_flag:true,reviewed_by:reviewer,approved_at:verified,version:q.version,sha256:fingerprint(q)}});
  }
  if(errors.length)throw Error('Drive data integrity problems: '+errors.slice(0,12).join('; '));
  if(!approved.length){console.log('0 approved questions; no export and no production changes');return;}
  // Never silently overwrite existing production data. Files remain local runner artifacts.
  const output=process.env.STUDY_COMPASS_EXPORT_DIR;
  if(!output)throw Error('Set STUDY_COMPASS_EXPORT_DIR to an isolated staging directory');
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(output+'/candidate.json',JSON.stringify({items:approved.map(x=>x.q)},null,2));
  fs.writeFileSync(output+'/approval-manifest.json',JSON.stringify({source_spreadsheet_id:SHEET,export_source:'authenticated-drive-export',exported_at:new Date().toISOString(),approvals:approved.map(x=>x.a)},null,2));
  console.log('Staged '+approved.length+' approved candidates; NOT deployed');
}
main().catch(e=>{console.error('Drive export BLOCK:',e.message);process.exitCode=1;});

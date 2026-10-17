#!/usr/bin/env node
'use strict';
// Manual, read-only connector diagnostic. No question data is printed or exported.
const crypto=require('node:crypto');
const id='1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88';
function b64(x){return Buffer.from(JSON.stringify(x)).toString('base64url')}
async function main(){
 const raw=process.env.STUDY_COMPASS_GOOGLE_SERVICE_ACCOUNT_JSON;
 if(!raw){console.log('SKIP: no service-account secret');return}
 const sa=JSON.parse(raw);
 if(!sa.client_email||!sa.private_key||sa.token_uri!=='https://oauth2.googleapis.com/token')throw Error('Invalid service account configuration');
 const now=Math.floor(Date.now()/1000),base=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:sa.token_uri,iat:now,exp:now+1200});
 const sig=crypto.sign('RSA-SHA256',Buffer.from(base),sa.private_key).toString('base64url');
 const resp=await fetch(sa.token_uri,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:base+'.'+sig})});
 if(!resp.ok)throw Error('Google OAuth authentication error: HTTP '+resp.status);
 const access=(await resp.json()).access_token;if(!access)throw Error('No OAuth token');
 const target='https://sheets.googleapis.com/v4/spreadsheets/'+id+'/values/'+encodeURIComponent("'問題MASTER'!A1:W2");
 const response=await fetch(target,{headers:{authorization:'Bearer '+access}});
 if(!response.ok)throw Error('Drive Sheet is not shared with the service account or API denied: HTTP '+response.status);
 const rows=(await response.json()).values||[];
 const headers=rows[0]||[];
 for(const col of ['question_id','status','reviewer','version','publish_flag'])if(!headers.includes(col))throw Error('Missing source column: '+col);
 console.log('PASS: Google Sheets read-only access, correct master ID, required headers. No questions printed or modified.');
}
main().catch(e=>{console.error('BLOCK:',e.message);process.exitCode=1});

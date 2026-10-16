/**
 * Study COMPASS: read-only master → GitHub staging (never production).
 * Paste into a script bound to the Study COMPASS MASTER spreadsheet.
 * Script properties: STUDY_GITHUB_TOKEN (fine-grained token restricted to this repo).
 * Execute studyPreview() before studyStageApproved(). No trigger until explicitly enabled.
 * Required permissions: Spreadsheet read, external HTTPS request.
 */
const STUDY = Object.freeze({
  spreadsheetId:'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88',
  repo:'operation-compass/study-compass',
  branch:'feature/drive-approval-gate-20261016',
  source:'問題MASTER',
  ledger:'Web公開承認台帳｜人手最終承認'
});
const STUDY_FIELDS=['id','subject','question_type','question_text','choice_a','choice_b','choice_c','choice_d','correct_answer','explanation'];
function studyRows_(sheet) {
  if(!sheet)throw Error('Missing required sheet');
  const values=sheet.getDataRange().getValues(), headers=values.shift().map(String);
  return values.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]])));
}
function studySha_(q) {
  const payload=JSON.stringify(STUDY_FIELDS.map(k=>String(q[k]===undefined||q[k]===null?'':q[k])));
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,payload,Utilities.Charset.UTF_8)
    .map(x=>('0'+(x<0?x+256:x).toString(16)).slice(-2)).join('');
}
function studyCollect_() {
  const book=SpreadsheetApp.openById(STUDY.spreadsheetId);
  const rows=studyRows_(book.getSheetByName(STUDY.source));
  const approvals=studyRows_(book.getSheetByName(STUDY.ledger));
  const decisions=new Map();
  for(const a of approvals) {
    const id=String(a.question_id||'').trim();
    if(!id || id.startsWith('【運用ルール】'))continue;
    if(decisions.has(id))throw Error('Duplicate ledger id: '+id);
    decisions.set(id,a);
  }
  const seen=new Set(), items=[], manifest=[];
  for(const row of rows) {
    const id=String(row.question_id||'').trim();
    if(!id)continue;
    if(seen.has(id))throw Error('Duplicate MASTER ID: '+id);
    seen.add(id);
    const enabled=row.publish_flag===true||String(row.publish_flag).toUpperCase()==='TRUE';
    if(String(row.status).trim()!=='PUBLIC'||!enabled)continue;
    const a=decisions.get(id);
    if(!a||String(a.approval_status).trim()!=='APPROVED')continue;
    const q={id,subject:String(row.subject||''),question_type:String(row.question_type||''),
      question_text:String(row.question_text||''),choice_a:String(row.choice_a||''),
      choice_b:String(row.choice_b||''),choice_c:String(row.choice_c||''),
      choice_d:String(row.choice_d||''),correct_answer:String(row.correct_answer||''),
      explanation:String(row.explanation||''),version:String(row.version||'')};
    const sha=studySha_(q), reviewer=String(a.approved_by||'').trim(),
      date=a.approved_at instanceof Date?Utilities.formatDate(a.approved_at,'Asia/Tokyo',"yyyy-MM-dd'T'HH:mm:ssXXX"):String(a.approved_at||'').trim();
    if(!reviewer||reviewer==='AI'||!/^\d{4}-\d\d-\d\d/.test(date)||
      !q.version||String(a.approved_version)!==q.version||String(a.approved_sha256)!==sha)
      throw Error('Approval content mismatch or missing human approval: '+id);
    if(!q.question_text||!q.correct_answer||!q.explanation)throw Error('Incomplete content: '+id);
    items.push(q);
    manifest.push({id,status:'PUBLIC',publish_flag:true,reviewed_by:reviewer,approved_at:date,version:q.version,sha256:sha});
  }
  return {items,manifest,scanned:seen.size};
}
function studyPreview() {
  const c=studyCollect_();
  const summary={scanned:c.scanned,approved:c.items.length,mode:'preview_only',production_updated:false};
  Logger.log(JSON.stringify(summary));return summary;
}
function studyPutGitHub_(file,data,token) {
  const url='https://api.github.com/repos/'+STUDY.repo+'/contents/'+file;
  const opts={headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},muteHttpExceptions:true};
  const existing=UrlFetchApp.fetch(url+'?ref='+encodeURIComponent(STUDY.branch),opts);
  if(existing.getResponseCode()!==200 && existing.getResponseCode()!==404)throw Error('GitHub lookup error: '+existing.getResponseCode());
  const sha=existing.getResponseCode()===200?JSON.parse(existing.getContentText()).sha:undefined;
  const content=Utilities.base64Encode(Utilities.newBlob(JSON.stringify(data,null,2),'application/json').getBytes());
  const body={message:'Stage audited Drive snapshot (NOT production)',content,branch:STUDY.branch};
  if(sha)body.sha=sha;
  const result=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',payload:JSON.stringify(body),headers:opts.headers,muteHttpExceptions:true});
  if(result.getResponseCode()!==200&&result.getResponseCode()!==201)throw Error('GitHub stage error HTTP '+result.getResponseCode());
}
function studyStageApproved() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Another Study COMPASS stage process is running');
  try {
    const c=studyCollect_();
    if(!c.items.length){Logger.log('0 approvals; staging unchanged');return {staged:0,skipped:true};}
    const token=PropertiesService.getScriptProperties().getProperty('STUDY_GITHUB_TOKEN');
    if(!token)throw Error('Missing STUDY_GITHUB_TOKEN script property');
    // Atomic staging artifact: candidate and approval snapshot cannot diverge between commits.
    studyPutGitHub_('data/staging/drive-sync-bundle.json',{
      schema_version:1,
      candidate:{items:c.items},
      approval:{
        source_spreadsheet_id:STUDY.spreadsheetId,export_source:'authenticated-drive-export',
        exported_at:new Date().toISOString(),approvals:c.manifest
      }
    },token);
    Logger.log('Staged '+c.items.length+' approved items; production unchanged');
    return {staged:c.items.length,production_updated:false};
  } finally {lock.releaseLock();}
}

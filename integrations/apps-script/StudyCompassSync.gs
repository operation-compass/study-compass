/**
 * Study COMPASS: read-only master → GitHub staging (never production).
 * Paste into a script bound to the Study COMPASS MASTER spreadsheet.
 * Script properties: STUDY_GITHUB_TOKEN (fine-grained token restricted to this repo).
 * Execute studyPreview() before studyStageApproved(). No trigger until explicitly enabled.
 * AI three-stage verification replaces the per-question human approval requirement.
 * Required permissions: Spreadsheet read, external HTTPS request.
 */
const STUDY = Object.freeze({
  spreadsheetId:'1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88',
  repo:'operation-compass/study-compass',
  branch:'feature/drive-approval-gate-20261016',
  source:'問題MASTER',
  audit:'Web自動公開｜3段階監査ログ'
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
  const audit=studyAuditRecords_(book,[] ,true);
  const auditMap=new Map(audit.records.map(a=>[a.id,a]));
  const seen=new Set(), items=[];
  for(const row of rows) {
    const id=String(row.question_id||'').trim();
    if(!id)continue;
    if(seen.has(id))throw Error('Duplicate MASTER ID: '+id);
    seen.add(id);
    const enabled=row.publish_flag===true||String(row.publish_flag).toUpperCase()==='TRUE';
    const status=String(row.status||'').trim();
    const reviewed=auditMap.get(id);
    const legacyPublic=status==='PUBLIC'&&enabled;
    const auditedCheck=status==='CHECK'&&reviewed&&reviewed.final_decision==='READY';
    if(!legacyPublic&&!auditedCheck)continue;
    const q={id,subject:String(row.subject||''),grade:String(row.grade||''),unit_major:String(row.unit_major||''),unit_minor:String(row.unit_minor||''),question_type:String(row.question_type||''),
      question_text:String(row.question_text||''),choice_a:String(row.choice_a||''),
      choice_b:String(row.choice_b||''),choice_c:String(row.choice_c||''),
      choice_d:String(row.choice_d||''),correct_answer:String(row.correct_answer||''),
      explanation:String(row.explanation||''),version:String(row.version||'') || (auditedCheck?reviewed.version:'')};
    if(auditedCheck){
      const sha=studySha_(q);
      const pass=reviewed.version===q.version&&reviewed.sha256===sha&&
        reviewed.accuracy==='PASS'&&reviewed.quality==='PASS'&&reviewed.technical==='PASS'&&
        reviewed.risk==='LOW'&&!reviewed.exception_reason&&reviewed.checked_at&&
        reviewed.accuracy_checked_at&&reviewed.quality_checked_at&&reviewed.technical_checked_at&&
        String(reviewed.evidence_url||'').startsWith('https://');
      if(!pass)continue;
    }
    if(!q.question_text||!q.correct_answer||!q.explanation)throw Error('Incomplete content: '+id);
    items.push(q);
  }
  return {items,scanned:seen.size};
}

// Read three-stage audit rows without altering the Drive source. Missing evidence stays HOLD.
function studyAuditRecords_(book,approvedItems,includeAll) {
  const sheet=book.getSheetByName(STUDY.audit);
  if(!sheet)throw Error('Missing three-stage audit sheet');
  const allowed=new Set(approvedItems.map(q=>q.id));
  const records=[], seen=new Set();
  for(const row of studyRows_(sheet)) {
    const id=String(row.question_id||'').trim();
    if(!id||(!includeAll&&!allowed.has(id)))continue;
    if(seen.has(id))throw Error('Duplicate audit ID: '+id);
    seen.add(id);
    const date=v=>v instanceof Date?Utilities.formatDate(v,'Asia/Tokyo',"yyyy-MM-dd'T'HH:mm:ssXXX"):String(v||'').trim();
    records.push({
      id,version:String(row.question_version||'').trim(),
      sha256:String(row.content_sha256||'').trim(),
      accuracy:String(row.audit_1_accuracy||'').trim(),
      accuracy_checked_at:date(row.audit_1_checked_at),
      evidence_url:String(row.audit_1_evidence_url||'').trim(),
      quality:String(row.audit_2_quality||'').trim(),
      quality_checked_at:date(row.audit_2_checked_at),
      technical:String(row.audit_3_technical||'').trim(),
      technical_checked_at:date(row.audit_3_checked_at),
      risk:String(row.risk_class||'').trim(),
      exception_reason:String(row.exception_reason||'').trim(),
      final_decision:String(row.final_decision||'').trim(),
      checked_at:date(row.last_reviewed_at)
    });
  }
  return {records};
}

function studyPreview() {
  const c=studyCollect_();
  const summary={scanned:c.scanned,candidates:c.items.length,mode:'preview_only',production_updated:false};
  Logger.log(JSON.stringify(summary));return summary;
}
function studySameSnapshot_(left,right) {
  if(!left||!right)return false;
  // Refresh unchanged evidence at least every 12h; release snapshots expire after 24h.
  const last=Date.parse(left.approval&&left.approval.exported_at);
  if(!Number.isFinite(last)||Date.now()-last>=12*60*60*1000||last>Date.now()+60000)return false;
  // Skip only when the last export is still fresh and question/audit contents match.
  return JSON.stringify(left.candidate)===JSON.stringify(right.candidate)&&
    JSON.stringify(left.audit)===JSON.stringify(right.audit)&&
    left.approval&&right.approval&&
    left.approval.mode===right.approval.mode&&
    left.approval.source_spreadsheet_id===right.approval.source_spreadsheet_id;
}
function studyPutGitHub_(file,data,token) {
  const url='https://api.github.com/repos/'+STUDY.repo+'/contents/'+file;
  const opts={headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},muteHttpExceptions:true};
  const existing=UrlFetchApp.fetch(url+'?ref='+encodeURIComponent(STUDY.branch),opts);
  if(existing.getResponseCode()!==200 && existing.getResponseCode()!==404)throw Error('GitHub lookup error: '+existing.getResponseCode());
  const current=existing.getResponseCode()===200?JSON.parse(existing.getContentText()):null;
  const sha=current?current.sha:undefined;
  if(current){
    try{
      const old=JSON.parse(Utilities.newBlob(Utilities.base64Decode(current.content.replace(/\s/g,''))).getDataAsString());
      if(studySameSnapshot_(old,data))return {unchanged:true};
    }catch(e){throw Error('Cannot verify previous staging snapshot: '+e.message);}
  }
  const content=Utilities.base64Encode(Utilities.newBlob(JSON.stringify(data,null,2),'application/json').getBytes());
  const body={message:'Stage audited Drive snapshot (NOT production)',content,branch:STUDY.branch};
  if(sha)body.sha=sha;
  const result=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',payload:JSON.stringify(body),headers:opts.headers,muteHttpExceptions:true});
  if(result.getResponseCode()!==200&&result.getResponseCode()!==201)throw Error('GitHub stage error HTTP '+result.getResponseCode());
  return {unchanged:false};
}
function studyStageApproved() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Another Study COMPASS stage process is running');
  try {
    const c=studyCollect_();
    if(!c.items.length){Logger.log('0 candidates; staging unchanged');return {staged:0,skipped:true};}
    const audit=studyAuditRecords_(SpreadsheetApp.openById(STUDY.spreadsheetId),c.items);
    const token=PropertiesService.getScriptProperties().getProperty('STUDY_GITHUB_TOKEN');
    if(!token)throw Error('Missing STUDY_GITHUB_TOKEN script property');
    // Atomic staging artifact: candidate and approval snapshot cannot diverge between commits.
    const put=studyPutGitHub_('data/staging/drive-sync-bundle.json',{
      schema_version:1,
      candidate:{items:c.items},
      audit,
      approval:{
        mode:'ai_three_stage',source_spreadsheet_id:STUDY.spreadsheetId,
        export_source:'authenticated-drive-export',exported_at:new Date().toISOString()
      }
    },token);
    if(put.unchanged){Logger.log('No content changes; GitHub staging commit skipped');return {staged:0,unchanged:true,production_updated:false};}
    Logger.log('Staged '+c.items.length+' candidate items; '+audit.records.length+' audit records; production unchanged');
    return {staged:c.items.length,unchanged:false,production_updated:false};
  } finally {lock.releaseLock();}
}

/* Read-only automated technical preflight; no READY or publication approval. */
function studyMasterPreflightPreview(questionIds) {
  if(!Array.isArray(questionIds) || questionIds.length<1 || questionIds.length>10) throw Error('Specify 1-10 explicit question IDs');
  var wanted={};
  questionIds.forEach(function(id){ if(typeof id!=='string'||!id||wanted[id])throw Error('Invalid or duplicate requested ID');wanted[id]=true; });
  var sheet=SpreadsheetApp.openById(STUDY.spreadsheetId);
  var rows=studyRows_(sheet.getSheetByName(STUDY.source));
  var results=[],found={};
  rows.forEach(function(row){
    var id=String(row.question_id||'').trim();
    if(!wanted[id])return;
    if(found[id])throw Error('Duplicate question ID in MASTER: '+id);
    found[id]=true;
    var options=['choice_a','choice_b','choice_c','choice_d'].map(function(k){return String(row[k]||'').trim();});
    var normalized=options.map(function(s){return s.normalize('NFKC').replace(/\s+/g,'').toLowerCase();});
    var correct=String(row.correct_answer||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
    var problems=[];
    if(new Set(normalized).size!==4||normalized.some(function(s){return !s;}))problems.push('DUPLICATE_OR_BLANK_CHOICES');
    if(normalized.filter(function(s){return s===correct;}).length!==1)problems.push('INVALID_ANSWER');
    if(!row.question_text||!row.explanation)problems.push('MISSING_TEXT');
    if(!/^https:\/\//.test(String(row.source_url||'')))problems.push('MISSING_SOURCE_URL');
    if(!row.version)problems.push('MISSING_VERSION');
    if(String(row.status)!=='CHECK'||![false,'FALSE','false',0].includes(row.publish_flag))problems.push('NOT_PENDING_UNPUBLISHED');
    var q={id:id};
    STUDY_FIELDS_V2.forEach(function(k){if(k!=='id')q[k]=String(row[k]==null?'':row[k]);});
    results.push({id:id,version:String(row.version||''),sha256_v2:studySha_(q,'v2'),answer_position:normalized.indexOf(correct)+1,technical_errors:problems,automatic_preflight_ok:problems.length===0,formal_review:'PENDING',production_permission:'HOLD'});
  });
  questionIds.forEach(function(id){if(!found[id])results.push({id:id,technical_errors:['MASTER_ID_NOT_FOUND'],automatic_preflight_ok:false,formal_review:'PENDING',production_permission:'HOLD'});});
  return {mode:'read_only_preflight',production_updated:false,published:0,results:results};
}
if(typeof module!=='undefined')module.exports={studyMasterPreflightPreview};

/* Manual entrypoint: select this function in Apps Script editor; no arguments needed. */
function studyPreviewThreeCoinsReadOnly() {
  var ids=['SC-SOC-HIS-WEB26-000001','SC-SOC-HIS-WEB26-000002','SC-SOC-HIS-WEB26-000003'];
  var result=studyMasterPreflightPreview(ids);
  Logger.log(JSON.stringify(result));
  return result;
}


/* Integrated, read-only current-MASTER drift preview; no new GAS file required. */
function studyPreviewThreeCoinsLiveDriftReadOnly() {
  var sheet=SpreadsheetApp.openById('1Mmerqyc6z1gNR7Ju8NRPswKfau01vYMTJfTMGZxPZ88').getSheetByName('問題MASTER');
  if(!sheet)throw Error('MASTER_SHEET_MISSING');
  var expected=[
    ['SC-SOC-HIS-WEB26-000001','社会','中1','歴史','奈良・文化','4択','708年に発行され、律令国家が普及を進めた日本の銅銭は？','和同開珎','富本銭','開元通宝','寛永通宝','和同開珎','和同開珎は708年発行。富本銭はそれ以前に作られた貨幣であり、和同開珎を日本最初の貨幣と断定するのは不適切。','v0.1'],
    ['SC-SOC-HIS-WEB26-000002','社会','中1','歴史','奈良・文化','4択','飛鳥池遺跡で作られ、和同開珎より古い7世紀後半の貨幣は？','和同開珎','富本銭','開元通宝','永楽通宝','富本銭','富本銭は飛鳥池遺跡で製造され、和同開珎より古い7世紀後半の鋳造貨幣。','v0.1'],
    ['SC-SOC-HIS-WEB26-000003','社会','中1','歴史','奈良・文化','4択','708年の和同開珎がモデルにした唐の貨幣は？','富本銭','永楽通宝','開元通宝','寛永通宝','開元通宝','日本銀行貨幣博物館によれば、和同開珎は唐の開元通宝をモデルとして発行された。','v0.1']
  ];
  // Inspect actual MASTER by stable ID, not presumed row numbers.
  var last=sheet.getLastRow();
  if(last<2)throw Error('MASTER_EMPTY');
  var header=sheet.getRange(1,1,1,23).getDisplayValues()[0];
  var required={0:'question_id',1:'status',2:'subject',3:'grade',4:'unit_major',5:'unit_minor',6:'question_type',7:'question_text',8:'choice_a',9:'choice_b',10:'choice_c',11:'choice_d',12:'correct_answer',13:'explanation',21:'version',22:'publish_flag'};
  Object.keys(required).forEach(function(k){if(header[Number(k)]!==required[k])throw Error('MASTER_SCHEMA_CHANGED_COLUMN_'+(Number(k)+1));});
  var rows=sheet.getRange(2,1,last-1,23).getDisplayValues();
  var relevant={}, counts={};
  expected.forEach(function(e){counts[e[0]]=0;});
  rows.forEach(function(r){
    if(Object.prototype.hasOwnProperty.call(counts,r[0])){
      counts[r[0]]++;
      relevant[r[0]]=r;
    }
  });
  var fields=[0,2,3,4,5,6,7,8,9,10,11,12,13,21];
  var diffs=[];
  expected.forEach(function(e){
    if(counts[e[0]]!==1){diffs.push({id:e[0],issue:'ID_COUNT',count:counts[e[0]]});return;}
    var r=relevant[e[0]];
    fields.forEach(function(column,i){if(String(r[column])!==String(e[i]))diffs.push({id:e[0],issue:'MASTER_FIELD_CHANGED',column:column+1});});
    if(r[1]!=='CHECK')diffs.push({id:e[0],issue:'MASTER_NOT_CHECK'});
    if(String(r[22]).toUpperCase()!=='FALSE')diffs.push({id:e[0],issue:'MASTER_PUBLISH_FLAG_NOT_FALSE'});
  });
  var result={
    mode:'read_only_live_master_drift',checked_at:new Date().toISOString(),
    snapshot_date:'2026-10-23',found:expected.map(function(e){return {id:e[0],count:counts[e[0]]};}),
    unchanged:diffs.length===0,blockers:diffs,production_updated:false,
    release_authorized:false,production_permission:'HOLD'
  };
  Logger.log(JSON.stringify(result));
  return result;
}

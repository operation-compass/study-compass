/**
 * Study COMPASS: live, read-only MASTER drift gate.
 * Run manually in the existing Apps Script project. No Drive writes, triggers,
 * staging, READY conversion, GitHub updates, or Cloudflare publishing.
 * Snapshot pinned from manually verified MASTER A5210:W5212 on 2026-10-23.
 * It is a DRIFT test, not an authenticated independent audit or release permit.
 */
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

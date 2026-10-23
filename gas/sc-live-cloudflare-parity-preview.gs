/* Study COMPASS read-only live parity diagnostic. Never stages or publishes.
 * Requires existing STUDY, studyProductionRevision_, studyProductionSocial_.
 * Calls only GET endpoints. Don't install triggers for this function.
 */
function studyPreviewCloudflareParityReadOnly() {
  var token=PropertiesService.getScriptProperties().getProperty('STUDY_GITHUB_TOKEN');
  if(!token)throw Error('Missing STUDY_GITHUB_TOKEN');
  var revision=studyProductionRevision_(token);
  // GitHub has two mirrored HTML files, but Cloudflare Worker routes /index.html to home-v2.html.
  var paths=['index.html','legacy-study.html'];
  var expected=paths.map(function(path){return studyProductionSocial_(path,token,revision);});
  if(expected[0].size!==expected[1].size)throw Error('GitHub production mirrors count mismatch');
  expected[0].forEach(function(q,id){
    if(!expected[1].has(id)||JSON.stringify(q)!==JSON.stringify(expected[1].get(id)))
      throw Error('GitHub production mirrors disagree: '+id);
  });
  function live(path){
    var url='https://study-compass.occompass-info.workers.dev/'+path+(path.indexOf('?')>=0?'&':'?')+'parity='+encodeURIComponent(revision);
    var response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:true});
    if(response.getResponseCode()!==200)throw Error('Cloudflare '+path+' HTTP '+response.getResponseCode());
    var html=response.getContentText(),marker='const SOCIAL = ';
    var begin=html.indexOf(marker);
    if(begin<0)throw Error('Cloudflare '+path+' has no SOCIAL array');
    var start=begin+marker.length,end=html.indexOf(';',start);
    if(end<=start)throw Error('Cloudflare '+path+' SOCIAL terminator missing');
    var list=JSON.parse(html.slice(start,end)),result=new Map();
    if(!Array.isArray(list))throw Error('Cloudflare '+path+' SOCIAL not array');
    list.forEach(function(q){
      if(!q.id||result.has(q.id))throw Error('Duplicate live ID: '+String(q.id));
      result.set(q.id,q);
    });
    return result;
  }
  // Compare the *learning routes*, not /index.html: the Worker serves the homepage there.
  // /legacy-study.html is the raw learning asset; /study.html adds runtime enhancements.
  var livePaths=['legacy-study.html','study.html?mode=qa'];
  var actual=livePaths.map(live);
  if(actual[0].size!==actual[1].size)throw Error('Cloudflare mirrors count mismatch');
  actual[0].forEach(function(q,id){
    if(!actual[1].has(id)||JSON.stringify(q)!==JSON.stringify(actual[1].get(id)))
      throw Error('Cloudflare mirrors disagree: '+id);
  });
  var diffs=[];
  paths.forEach(function(path,i){
    if(actual[i].size!==expected[i].size)diffs.push(path+':COUNT');
    expected[i].forEach(function(q,id){
      if(!actual[i].has(id)||JSON.stringify(q)!==JSON.stringify(actual[i].get(id)))
        diffs.push(path+':'+id);
    });
    actual[i].forEach(function(q,id){if(!expected[i].has(id))diffs.push(path+':UNEXPECTED:'+id);});
  });
  var targets=['SC-SOC-HIS-WEB26-000001','SC-SOC-HIS-WEB26-000002','SC-SOC-HIS-WEB26-000003'];
  var out={mode:'read_only_cloudflare_parity',github_main_revision:revision,
    github_count:expected[0].size,live_count:actual[0].size,
    live_routes:livePaths,parity:diffs.length===0,difference_count:diffs.length,
    difference_sample:diffs.slice(0,10),
    target_ids_present:targets.filter(function(id){return actual[0].has(id);}),
    production_updated:false,release_authorized:false};
  Logger.log(JSON.stringify(out));return out;
}
if(typeof module!=='undefined')module.exports={studyPreviewCloudflareParityReadOnly};

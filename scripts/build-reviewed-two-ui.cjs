'use strict';
// Isolated browser-test entry points. Never alters repository/production HTML.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),out=path.join(root,'outputs/reviewed-two-preview');
const ids=['SC-SOC-HIS-GAP10-000001','SC-SOC-HIS-GAP10-000005'];
const harness=`\n// REVIEW HARNESS ONLY: drive the unchanged app start/render functions.
const reviewParams=new URLSearchParams(location.search);
const reviewId=reviewParams.get('audit_id'),reviewMode=reviewParams.get('audit_mode');
if(${JSON.stringify(ids)}.includes(reviewId)&&['mcq','question','flashcard'].includes(reviewMode)){
 subject='社会';mode=reviewMode;studyFilter={kind:'all',value:''};start(false,[reviewId]);
 document.title='審査専用・未公開 | '+document.title;
}
`;
for(const file of ['index.html','legacy-study.html']){
 const html=fs.readFileSync(path.join(out,file),'utf8');
 assert.equal(html.split('</script>').length,2,'Expected one app script');
 fs.writeFileSync(path.join(out,'qa-'+file),html.replace('</script>',harness+'</script>'));
}
console.log('Browser test entry points created; source HTML and release authorization unchanged.');

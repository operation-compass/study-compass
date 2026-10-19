/* Study COMPASS - Apps Script read-only extension for staged review export.
 * NOT deployed. Requires installation into existing authenticated GAS project
 * and explicit invocation from its existing staging routine. No new triggers.
 * Does not grant READY or create any review PASS.
 */
function scReadSimpleChecks_(spreadsheet) {
  const tab = spreadsheet.getSheetByName('Web自動公開｜新3チェック記録');
  if (!tab) return {records: []}; // migration hasn't been enabled
  const rows = tab.getDataRange().getValues();
  if (rows.length < 2) return {records: []};
  const header = rows[0].map(String);
  const required = ['question_id','question_version','content_sha256','simple_check_record_json'];
  required.forEach(function(name) {
    if (header.indexOf(name) < 0) throw Error('Missing review export column: '+name);
  });
  const ids = {};
  const records = [];
  rows.slice(1).forEach(function(row, offset) {
    const id = String(row[header.indexOf('question_id')] || '').trim();
    if (!id) return;
    if (ids[id]) throw Error('Duplicate simple-check ID: '+id);
    ids[id] = true;
    const raw = row[header.indexOf('simple_check_record_json')];
    if (typeof raw !== 'string' || !raw.trim()) throw Error('Missing review JSON at row '+(offset+2));
    let record;
    try { record = JSON.parse(raw); }
    catch(e) { throw Error('Invalid review JSON at row '+(offset+2)); }
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('Review must be an object');
    const version = String(row[header.indexOf('question_version')] || '');
    const sha = String(row[header.indexOf('content_sha256')] || '');
    if (record.id !== id || record.version !== version ||
        record.question_sha256 !== sha || !/^[a-f0-9]{64}$/.test(sha))
      throw Error('Review identity mismatch at row '+(offset+2));
    // Records may be PENDING/FAIL: do not manufacture PASS or approval.
    records.push(record);
  });
  return {records: records};
}
if (typeof module !== 'undefined') module.exports = {scReadSimpleChecks_};

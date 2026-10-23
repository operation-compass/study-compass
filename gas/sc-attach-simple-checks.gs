/* Optional GAS staging hook for Study COMPASS.
 * Install in the existing GAS project with sc-simple-check-export.gs.
 * Call AFTER existing signed/canonical bundle creation, BEFORE its existing
 * staging upload. No new triggers, permissions, or changes to old audit rows.
 * This is a read-only extension; it cannot create review records.
 */
function scAttachSimpleChecksToStaging_(existingBundle, spreadsheet) {
  if (!existingBundle || !existingBundle.candidate ||
      !Array.isArray(existingBundle.candidate.items) ||
      !existingBundle.audit || !Array.isArray(existingBundle.audit.records)) {
    throw Error('Refuse to extend invalid legacy authenticated staging bundle');
  }
  if (Object.prototype.hasOwnProperty.call(existingBundle,'simple_checks')) {
    throw Error('Refuse to overwrite existing simple_checks data');
  }
  if (!spreadsheet || typeof spreadsheet.getSheetByName !== 'function') {
    throw Error('Canonical spreadsheet handle required');
  }
  var checks = scReadSimpleChecks_(spreadsheet);
  var masterIds = {};
  existingBundle.candidate.items.forEach(function(q) {
    if (!q || !q.id || masterIds[q.id]) throw Error('Invalid/duplicate candidate ID');
    masterIds[q.id] = true;
  });
  // Preserve unrelated bundle fields. An absent review tab exports [] only.
  var extended = {};
  Object.keys(existingBundle).forEach(function(key) {
    extended[key] = existingBundle[key];
  });
  extended.simple_checks = checks;
  return extended;
}
/* Prevent the original studySameSnapshot_() from suppressing updates
 * made exclusively to new review records. An old snapshot without the new
 * field must be uploaded once even if candidate and audit are unchanged.
 * The original 12-hour freshness and approval/source checks still apply.
 */
function scSameSnapshotWithSimpleChecks_(previous, next) {
  if (typeof studySameSnapshot_ !== 'function') {
    throw Error('Existing studySameSnapshot_ is required');
  }
  if (!studySameSnapshot_(previous, next)) return false;
  if (!previous || !next ||
      !previous.simple_checks || !next.simple_checks ||
      !Array.isArray(previous.simple_checks.records) ||
      !Array.isArray(next.simple_checks.records)) return false;
  return JSON.stringify(previous.simple_checks) === JSON.stringify(next.simple_checks);
}
if (typeof module !== 'undefined') module.exports = {
  scAttachSimpleChecksToStaging_, scSameSnapshotWithSimpleChecks_
};

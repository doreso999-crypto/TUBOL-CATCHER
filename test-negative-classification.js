/* Regression tests for Negative-tab account classification.
 * Run: node test-negative-classification.js
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');

function section(start, end) {
    const a = script.indexOf(start);
    const b = script.indexOf(end, a);
    assert(a >= 0 && b > a, 'Missing source section: ' + start);
    return script.slice(a, b);
}
const bureauConfig = section('    const CRC_BUREAUS = [', '    function getBureauPriorityOrder');
const agencies = section('    const COLLECTION_AGENCIES = [', '    // ========================================\n    // CSS STYLES');
const agencyLogic = section('    function isKnownCollectionAgency(name) {', '    // ========================================\n    // NAME NORMALIZATION');
const normalizer = section('    function normalizeAccountName(name) {', '    function namesMatch(a, b) {');
const classifier = section('    function readCrcCellValue(cell) {', '    function getCollectionVerificationWarning');
const api = new Function(bureauConfig + agencies + normalizer + agencyLogic + classifier +
    '\nreturn { classifyNegativeAccountType };')();

function classify(creditor, fields, bureaus = ['experian']) {
    return api.classifyNegativeAccountType(creditor, fields, bureaus);
}
const openCollectionLabels = {
    EX: {
        'Account Rating': 'COLLECTION',
        'Account Status': 'OPEN',
        'Payment Status': 'COLLECTION',
        'Account Type': 'REVOLVING'
    }
};
assert.equal(classify('CAPITAL ONE', openCollectionLabels), 'OPEN LP',
    'An OPEN account must not become CHARGE OFF from generic COLLECTION labels');
assert.equal(classify('CAPITAL ONE', {
    EX: { ...openCollectionLabels.EX, 'Creditor Remarks': 'ACCOUNT CLOSED, CHARGED OFF ACCOUNT' }
}), 'CHARGE OFF', 'Explicit charge-off wording must still take precedence');
assert.equal(classify('Original Bank', {
    EX: { 'Account Type': 'Collection Account', 'Account Status': 'CLOSED' }
}), 'CHARGE OFF', 'Generic collection evidence on a closed non-agency account retains legacy behavior');
assert.equal(classify('MIDLAND CREDIT', {
    EX: { 'Account Status': 'OPEN', 'Payment Status': 'CURRENT' }
}), 'COLLECTION', 'Known collection agencies remain COLLECTION');
assert.equal(classify('Original Bank', {
    EX: { 'Account Status': 'CLOSED' }
}), 'CLOSED LP', 'Closed without collection evidence remains CLOSED LP');
assert.equal(classify('Original Bank', {
    EX: { 'Account Type': 'Collection Account' }
}), 'CHARGE OFF', 'Collection evidence without a reported status remains a charge-off fallback');
assert.equal(classify('Original Bank', {
    EX: { 'Account Status': 'OPEN' },
    EQU: { 'Account Type': 'Collection', 'Account Status': 'CLOSED' }
}, ['experian']), 'OPEN LP', 'Evidence from a non-negative bureau must not override the negative bureau');
assert.equal(classify('Original Bank', {
    EX: { 'Account Status': 'OPEN', 'Payment Status': 'COLLECTION' },
    TU: { 'Account Status': 'CLOSED' }
}, ['experian', 'transunion']), 'OPEN LP (EX) / CLOSED LP (TU)',
    'Conflicting bureau statuses must remain separately visible');
console.log('PASS: OPEN-vs-COLLECTION priority, explicit charge-off, closed fallback, agency, and bureau-isolation cases');

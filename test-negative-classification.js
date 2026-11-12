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
assert.equal(classify('CAPITAL ONE', openCollectionLabels), 'CHARGE OFF',
    'An OPEN account with generic COLLECTION wording from a non-agency creditor is CHARGE OFF');
assert.equal(classify('CAPITAL ONE', {
    EX: { ...openCollectionLabels.EX, 'Creditor Remarks': 'ACCOUNT CLOSED, CHARGED OFF ACCOUNT' }
}), 'CHARGE OFF', 'Explicit charge-off wording must still take precedence');
assert.equal(classify('Original Bank', {
    EX: { 'Account Type': 'Collection Account', 'Account Status': 'CLOSED', 'Original Creditor': 'ORIGINAL BANK' }
}), 'COLLECTION', 'Collection wording with Original Creditor details is COLLECTION');
assert.equal(classify('MIDLAND CREDIT', {
    EX: { 'Account Status': 'OPEN', 'Payment Status': 'CURRENT' }
}), 'COLLECTION', 'Known collection agencies remain COLLECTION');
assert.equal(classify('Original Bank', {
    EX: { 'Account Status': 'CLOSED' }
}), 'CLOSED LP', 'Closed without collection evidence remains CLOSED LP');
assert.equal(classify('Original Bank', {
    EX: { 'Account Type': 'Collection Account' }
}), 'CHARGE OFF', 'Collection wording without Original Creditor details is CHARGE OFF');
assert.equal(classify('Original Bank', { EX: { 'Creditor Remarks': 'PLACED FOR COLLECTION' } }), 'COLLECTION');
assert.equal(classify('Original Bank', { EX: { 'Creditor Remarks': 'OTHER COLLECTION AGENCIES' } }), 'COLLECTION');
assert.equal(classify('Original Bank', { EX: { 'Account Status': 'OPEN' } }), 'OPEN LP');
assert.equal(classify('Original Bank', { EX: { 'Account Status': 'CLOSED' } }), 'CLOSED LP');
assert.equal(classify('Original Bank', { EX: { 'Account Status': 'OPEN', 'Creditor Remarks': 'CHAPTER 7 BANKRUPTCY' } }), 'INCLUDED IN BANKRUPTCY');
assert.equal(classify('Original Bank', { EX: { 'Account Status': 'CLOSED', 'Creditor Remarks': 'REPOSSESSED' } }), 'Repossessed');
assert.equal(classify('Original Bank', { EX: { 'Account Status': 'OPEN', 'Creditor Remarks': 'TRANSFERRED' } }), 'Transferred');
assert.equal(classify('Original Bank', {
    EX: { 'Account Status': 'OPEN' },
    EQU: { 'Account Type': 'Collection', 'Account Status': 'CLOSED' }
}, ['experian']), 'OPEN LP', 'Evidence from a non-negative bureau must not override the negative bureau');
assert.equal(classify('Original Bank', {
    EX: { 'Account Status': 'OPEN' },
    TU: { 'Account Status': 'CLOSED' }
}, ['experian', 'transunion']), 'OPEN LP (EX) / CLOSED LP (TU)',
    'Conflicting bureau statuses must remain separately visible');
console.log('PASS: requested status, charge-off, collection, bankruptcy, repossession, transfer, agency, and bureau-isolation cases');

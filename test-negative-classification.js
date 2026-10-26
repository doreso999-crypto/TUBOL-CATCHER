/* Regression tests for Negative-tab collection/charge-off classification.
 * Run: node test-negative-classification.js
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');

function between(begin, end) {
    const start = script.indexOf(begin);
    const stop = script.indexOf(end, start);
    assert(start !== -1 && stop > start, 'Missing classification source section');
    return script.slice(start, stop);
}
const collectionList = between('    const COLLECTION_AGENCIES = [', '    // ========================================\n    // CSS STYLES');
const agencyLogic = between('    function isKnownCollectionAgency(name) {', '    // ========================================\n    // NAME NORMALIZATION');
const normalizer = between('    function normalizeAccountName(name) {', '    function namesMatch(a, b) {');
const classifierLogic = between('    // One source of truth for Negative-tab account type.', '    function extractData() {');
const { classifyNegativeAccountType, isKnownCollectionAgency, hasCollectionEvidence } =
    new Function(collectionList + normalizer + agencyLogic + classifierLogic +
        '\nreturn { classifyNegativeAccountType, isKnownCollectionAgency, hasCollectionEvidence };')();

const examples = [
    ['Original Bank', 'Account Type: Collection Account Status: Closed', 'CHARGE OFF'],
    ['Original Bank', 'Account Status: Closed; Type: Collections', 'CHARGE OFF'],
    ['Original Bank', 'Other Collection Agencies; Status: Closed', 'CHARGE OFF'],
    ['Original Bank', 'Placed for Collection; Account Status: Closed', 'CHARGE OFF'],
    ['Original Bank', 'Account Type: Collection/Charge Off; Status: Closed', 'CHARGE OFF'],
    ['DEBT COLLECTIONS INC', 'Account Type: Collection; Status: Closed', 'CHARGE OFF'],
    ['MIDLAND CREDIT', 'Account Type: Collection; Status: Closed', 'COLLECTION'],
    ['MCM INC', 'Account Status: Closed', 'COLLECTION'],
    ['SPRING OAKS CAPITAL SPV', 'Account Type: Collection', 'COLLECTION'],
    ['Original Bank', 'Charged off; Closed account', 'CHARGE OFF'],
    ['Original Bank', 'Write off; Closed account', 'CHARGE OFF'],
    ['Original Bank', 'Account Status: Closed', 'CLOSED LP'],
    ['Original Bank', 'Original Creditor: XYZ; Account Status: Closed', 'CLOSED LP'],
    ['CREDIT ONE', 'Account Status: Closed', 'CLOSED LP'],
    ['CAPITAL ONE BANK', 'Account Status: Closed', 'CLOSED LP'],
    ['Original Bank', 'Account Status: Open', 'OPEN LP'],
    ['Original Bank', 'Account Status: Paid', 'PAID LP'],
    ['Original Bank', 'Repossessed; Closed', 'Repossessed'],
    ['Original Bank', 'Foreclosure; Closed', 'Foreclosure'],
    ['Original Bank', 'Transferred; Closed', 'Transferred'],
    ['Original Bank', 'Included in Bankruptcy; Collection; Closed', 'INCLUDED IN BANKRUPTCY'],
    ['Original Bank', 'Chapter 7; Collection; Closed', 'INCLUDED IN BANKRUPTCY']
];
for (const [creditor, report, expected] of examples) {
    assert.equal(classifyNegativeAccountType(creditor, report), expected,
        creditor + ': ' + report);
}
assert.equal(isKnownCollectionAgency('M'), false, 'Do not match short fragments');
assert.equal(hasCollectionEvidence('Collection; Closed'), true);
assert.equal(hasCollectionEvidence('Account Status: Closed'), false);
assert(script.includes('return classifyNegativeAccountType(accountName, accountTableText);'),
    'The Negative tab must call the tested classifier');
assert(script.includes("let accountTableText = grid.textContent || '';"),
    'The classifier must include account-grid text, not only bureau value cells');
console.log('PASS: ' + examples.length + ' Negative-tab cases, agency boundary checks, and classifier integration');

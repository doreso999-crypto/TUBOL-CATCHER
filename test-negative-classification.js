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
const { classifyNegativeAccountType, isKnownCollectionAgency, hasCollectionEvidence,
    getNegativeAccountTableText } =
    new Function(collectionList + normalizer + agencyLogic + classifierLogic +
        '\nreturn { classifyNegativeAccountType, isKnownCollectionAgency, hasCollectionEvidence, getNegativeAccountTableText };')();

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
for (const report of [
    'Account TypeCollectionAccount StatusClosed',
    'Type:CollectionStatus:Closed',
    'Account Type: CollectionAccount Status: Closed',
    'CollectionClosed',
    'Account TypeCOLLECTIONAccount StatusCLOSED'
]) {
    assert.equal(hasCollectionEvidence(report), true, 'Collection must survive concatenated CRC fields');
    assert.equal(classifyNegativeAccountType('CAPITAL ONE', report), 'CHARGE OFF',
        'Capital One with Collection and Closed must not become CLOSED LP: ' + report);
    assert.equal(classifyNegativeAccountType('MIDLAND CREDIT', report), 'COLLECTION',
        'Registry-listed collection agency must remain COLLECTION: ' + report);
}
const makeGrid = (textContent, cells) => ({
    textContent,
    querySelectorAll() { return cells.map(text => ({ textContent: text })); }
});
const joinedCollection = makeGrid('Account TypeCollectionAccount StatusClosed',
    ['Account Type', 'Collection', 'Account Status', 'Closed']);
assert.equal(classifyNegativeAccountType('Original Bank', getNegativeAccountTableText(joinedCollection)),
    'CHARGE OFF', 'Adjacent DOM cells must not hide collection evidence');
assert.equal(classifyNegativeAccountType('MIDLAND CREDIT', getNegativeAccountTableText(joinedCollection)),
    'COLLECTION', 'Known agency remains a collection when cells concatenate');
const onlyClosed = makeGrid('Account StatusClosed', ['Account Status', 'Closed']);
assert.equal(classifyNegativeAccountType('Original Bank', getNegativeAccountTableText(onlyClosed)),
    'CLOSED LP', 'Closed without collection evidence remains a closed account');
const joinedIntoOneCell = makeGrid('Account TypeCollectionAccount StatusClosed',
    ['Account TypeCollectionAccount StatusClosed']);
assert.equal(classifyNegativeAccountType('CAPITAL ONE', getNegativeAccountTableText(joinedIntoOneCell)),
    'CHARGE OFF', 'Collection embedded in a single CRC cell must override Closed');
// Reproduce the structure of a CRC table with COLLECTON in the account
// rating and payment status, CLOSED in account status, and the complete
// charged-off remark stored in a truncated tooltip.
const fieldsFromCapitalOneSample = [
    ['Account Rating:', 'COLLECTION'],
    ['Account Status:', 'CLOSED'],
    ['Payment Status:', 'COLLECTION'],
    ['Account Type:', 'REVOLVING'],
    ['Creditor Remarks:', 'ACCOUNT CLOSED, LAST REPORTED DELINQUENCIES: ...'],
];
const sampleCells = fieldsFromCapitalOneSample.map(([label, value]) => ({
    textContent: label + value,
    querySelectorAll(selector) {
        return selector === '[title]' && label === 'Creditor Remarks:'
            ? [{ getAttribute: key => key === 'title' ? 'ACCOUNT CLOSED, CHARGED OFF ACCOUNT' : null }]
            : [];
    }
}));
const sampleGrid = {
    textContent: fieldsFromCapitalOneSample.map(pair => pair.join('')).join(''),
    querySelectorAll() { return sampleCells; }
};
const sampleText = getNegativeAccountTableText(sampleGrid);
assert(sampleText.includes('COLLECTION'));
assert(sampleText.includes('CHARGED OFF ACCOUNT'), 'Full creditor-remark tooltip must be included');
assert.equal(classifyNegativeAccountType('CAPITAL ONE', sampleText), 'CHARGE OFF');
assert.equal(classifyNegativeAccountType('MIDLAND CREDIT', sampleText), 'COLLECTION');
const titleOnlyGrid = {
    textContent: 'Account StatusClosed',
    querySelectorAll() {
        return [{
            textContent: 'Account StatusClosed',
            querySelectorAll() { return [{getAttribute: key => key === 'title' ? 'CHARGED OFF ACCOUNT' : null}]; }
        }];
    }
};
assert.equal(classifyNegativeAccountType('CAPITAL ONE', getNegativeAccountTableText(titleOnlyGrid)),
    'CHARGE OFF', 'Truncated tooltip must supply charge-off evidence');
const collectionInsideHeader = makeGrid('CollectionAccount StatusClosed',
    ['Collection', 'Account Status', 'Closed']);
assert.equal(classifyNegativeAccountType('Original Bank', getNegativeAccountTableText(collectionInsideHeader)),
    'CHARGE OFF', 'Collection in table header must be detected');
assert(script.includes('return classifyNegativeAccountType(accountName, getNegativeAccountTableText(grid));'),
    'The Negative tab must use per-cell text collection before classification');
assert(script.includes("add(grid.textContent);"),
    'The classifier must include grid text outside the standard bureau cells');
assert(script.includes("cell.querySelectorAll('[title]')"),
    'The extractor must read untruncated CRC tooltip values');
assert(script.includes("window.__tubolCatcherVersion = TUBOL_CATCHER_VERSION;"),
    'A runtime version flag is needed to diagnose duplicate or cached loaders');
console.log('PASS: ' + examples.length + ' Negative-tab cases, agency boundary checks, and classifier integration');

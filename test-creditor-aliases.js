/* Run with: node test-creditor-aliases.js (Node 18+) */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const json = JSON.parse(fs.readFileSync(path.join(root, 'creditor-aliases.json'), 'utf8'));
const scanner = fs.readFileSync(path.join(root, 'crc-scanner.js'), 'utf8');

const start = scanner.indexOf('    // Bundled snapshot of creditor-aliases.json');
const end = scanner.indexOf('    // ========================================\n    // OPEN ACCOUNT POSITIVE / NEGATIVE MATCHING', start);
assert(start !== -1 && end > start, 'Cannot locate pure matching logic in scanner');

const { CREDITOR_ALIAS_GROUPS, matchCreditorNames, isInquiryConnectedToOpenAccount } =
    new Function(scanner.slice(start, end) +
        '\nreturn { CREDITOR_ALIAS_GROUPS, matchCreditorNames, isInquiryConnectedToOpenAccount };')();

assert.deepEqual(CREDITOR_ALIAS_GROUPS,
    json.groups.map(({id, aliases}) => ({id, aliases})),
    'JSON registry and bundled scanner aliases are out of sync');

const cases = [
    ['CAP1', 'CAPITAL ONE', true],
    ['CAP ONE NA', 'CAPITALONE', true],
    ['CAPONEAUTO', 'CAPITAL ONE AUTO FINANCE', true],
    ['JPMCB CARD', 'CHASE', true],
    ['CBNA', 'CITIBANK', true],
    ['WFBNA', 'WELLS FARGO BANK NA', true],
    ['SYNCB/AMAZON', 'AMAZON STORE CARD', true],
    ['SYNCB/PPC', 'PAYPAL CREDIT', true],
    ['MACYS/CBNA', 'MACYS CREDIT CARD', true],
    ['KOHLS/CAPONE', 'KOHLS CREDIT CARD', true],
    ['ACURA HIGHLA', 'ACURA HIGHLAND', true],
    ['GLENDALE NISSA', 'GLENDALE NISSAN', true],
    ['BANK OF AMERICA, N.A.', 'BANK OF AMERICA', true],
    ['CREDIT ONE', 'CAPITAL ONE', false],
    ['CAPITAL ONE AUTO FINANCE', 'CAP1', false],
    ['SYNCB/AMAZON', 'SYNCB/LOWES', false],
    ['SYNCB/AMAZON', 'SYNCHRONY BANK', false],
    ['CBNA', 'MACYS/CBNA', false],
    ['JPMCB CARD', 'CHASE AUTO', false],
    ['CAP1', 'CREDIT ONE BANK', false],
    ['GLENDALE NISSAN', 'GLENDALE TOYOTA', false],
    ['BANK', 'BANK', false],
];
for (const [a, b, expected] of cases) {
    assert.equal(matchCreditorNames(a, b), expected, a + ' / ' + b);
    assert.equal(matchCreditorNames(b, a), expected, b + ' / ' + a);
}
const bureauData = {
    experian: [{account: 'CAPITAL ONE'}],
    equifax: [{account: 'WELLS FARGO'}],
    transunion: []
};
assert.equal(isInquiryConnectedToOpenAccount('CAP1', 'experian', bureauData), true);
assert.equal(isInquiryConnectedToOpenAccount('CAP1', 'equifax', bureauData), false);
assert.equal(isInquiryConnectedToOpenAccount('CAP1', 'transunion', bureauData), false);

let aliasesTested = 0;
for (const group of json.groups) {
    for (const alias of group.aliases) {
        assert.equal(matchCreditorNames(alias, alias), true, 'Unmatchable alias: ' + alias);
        aliasesTested++;
    }
}
console.log('PASS: ' + cases.length * 2 + ' pair comparisons, 3 bureau checks, ' +
    aliasesTested + ' aliases, and JSON ↔ userscript synchronization');

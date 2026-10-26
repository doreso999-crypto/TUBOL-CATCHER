/* node test-creditor-alias-manager.js — no packages required */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const scanner = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');
const start = scanner.indexOf('    // Bundled snapshot of creditor-aliases.json');
const end = scanner.indexOf('    // ========================================\n    // OPEN ACCOUNT POSITIVE / NEGATIVE MATCHING', start);
assert(start >= 0 && end > start, 'Unable to locate alias matcher');
const storage = new Map();
const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
};
const makeMatcher = () => new Function('localStorage', 'console',
    scanner.slice(start, end) + '\nreturn {matchCreditorNames,addCreditorAlias,deleteCreditorAlias,resetCreditorAliases,isInquiryConnectedToOpenAccount};'
)(localStorage, console);
let m = makeMatcher();
assert.equal(m.matchCreditorNames('AMEX', 'AMERICAN EXPRESS'), true);
assert.equal(m.matchCreditorNames('AMX CARD SERV', 'AMERICAN EXPRESS'), false);
assert.equal(m.addCreditorAlias('AMX CARD SERV', 'american_express').ok, true);
assert.equal(m.matchCreditorNames('AMX CARD SERV', 'AMERICAN EXPRESS'), true);
m = makeMatcher();
assert.equal(m.matchCreditorNames('AMX CARD SERV', 'AMERICAN EXPRESS'), true, 'Local changes survive reload');
assert.equal(m.deleteCreditorAlias('AMX CARD SERV', 'american_express').ok, true);
assert.equal(m.matchCreditorNames('AMX CARD SERV', 'AMERICAN EXPRESS'), false);
assert.equal(m.deleteCreditorAlias('CAP1', 'capital_one').ok, true);
assert.equal(m.matchCreditorNames('CAP1', 'CAPITAL ONE'), false);
assert.equal(m.addCreditorAlias('CAP1', 'credit_one').ok, true);
assert.equal(m.matchCreditorNames('CAP1', 'CREDIT ONE BANK'), true);
assert.equal(m.matchCreditorNames('CAP1', 'CAPITAL ONE'), false);
m = makeMatcher();
assert.equal(m.matchCreditorNames('CAP1', 'CREDIT ONE BANK'), true);
assert.equal(m.deleteCreditorAlias('CAP1', 'credit_one').ok, true);
assert.equal(m.matchCreditorNames('CAP1', 'CREDIT ONE BANK'), false);
assert.equal(m.addCreditorAlias('CAP1', 'capital_one').ok, true);
assert.equal(m.matchCreditorNames('CAP1', 'CAPITAL ONE'), true);
assert.equal(m.deleteCreditorAlias('AMERICAN EXPRESS', 'american_express').ok, false);
assert.equal(m.addCreditorAlias('AMEX', 'capital_one').ok, false);
const bureaus = { experian: [{account: 'AMERICAN EXPRESS'}], transunion: [{account: 'CAPITAL ONE'}] };
assert.equal(m.isInquiryConnectedToOpenAccount('AMEX', 'experian', bureaus), true);
assert.equal(m.isInquiryConnectedToOpenAccount('AMEX', 'transunion', bureaus), false);
assert.equal(m.resetCreditorAliases().ok, true);
m = makeMatcher();
assert.equal(m.matchCreditorNames('AMX CARD SERV', 'AMERICAN EXPRESS'), false);
console.log('PASS: right-click alias persistence, deletion, reassignment, protections, reset, and bureau checks');

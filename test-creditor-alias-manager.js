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
    scanner.slice(start, end) + '\nreturn {matchCreditorNames,addCreditorAlias,deleteCreditorAlias,resetCreditorAliases,isInquiryConnectedToOpenAccount,createCreditorGroup,deleteUserCreditorGroup,CREDITOR_USER_GROUPS,CREDITOR_DISPLAY_NAMES,listCreditorAliases};'
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
// A new creditor can be made directly in Settings or when right-clicking
// either an inquiry or open account; canonical + observed alias both persist.
const newGroup = m.createCreditorGroup('Regional Community Bank', 'REG COMM BK');
assert.equal(newGroup.ok, true);
assert.equal(m.matchCreditorNames('REG COMM BK', 'Regional Community Bank'), true);
assert.equal(m.CREDITOR_USER_GROUPS.length, 1);
assert.equal(m.listCreditorAliases(newGroup.groupId).length, 2);
assert.equal(m.createCreditorGroup('REG COMM BK').ok, false, 'Do not create duplicates of existing aliases');
m = makeMatcher();
assert.equal(m.matchCreditorNames('REG COMM BK', 'Regional Community Bank'), true, 'New group survives reload');
assert.equal(m.CREDITOR_DISPLAY_NAMES[newGroup.groupId], 'Regional Community Bank');
assert.equal(m.addCreditorAlias('REG CMTY', newGroup.groupId).ok, true);
m = makeMatcher();
assert.equal(m.matchCreditorNames('REG CMTY', 'Regional Community Bank'), true);
assert.equal(m.deleteCreditorAlias('Regional Community Bank', newGroup.groupId).ok, false, 'Protect canonical name');
assert.equal(m.deleteUserCreditorGroup('american_express').ok, false, 'Protect built-in group');
assert.equal(m.deleteUserCreditorGroup(newGroup.groupId).ok, true);
m = makeMatcher();
assert.equal(m.CREDITOR_USER_GROUPS.length, 0);
assert.equal(m.matchCreditorNames('REG CMTY', 'Regional Community Bank'), false);

// Creating the proper name without an observed alias is supported.
const fromSettings = m.createCreditorGroup('Small Neighborhood Credit');
assert.equal(fromSettings.ok, true);
assert.equal(m.listCreditorAliases(fromSettings.groupId).length, 1);
assert.equal(m.addCreditorAlias('SNCREDIT', fromSettings.groupId).ok, true);
m = makeMatcher();
assert.equal(m.matchCreditorNames('SNCREDIT', 'Small Neighborhood Credit'), true);
assert.equal(m.resetCreditorAliases().ok, true);
m = makeMatcher();
assert.equal(m.CREDITOR_USER_GROUPS.length, 0);
assert.equal(m.matchCreditorNames('SNCREDIT', 'Small Neighborhood Credit'), false);
assert.equal(m.matchCreditorNames('AMEX', 'AMERICAN EXPRESS'), true);

// Existing storage schemas from v4.0 can be loaded without migration.
storage.set('tubol-crc-alias-overrides-v1', JSON.stringify({
    version: 1, disabled: [], custom: [{alias:'EXPRESS CARD XX', groupId:'american_express'}]
}));
m = makeMatcher();
assert.equal(m.matchCreditorNames('EXPRESS CARD XX', 'AMEX'), true);
assert.equal(m.CREDITOR_USER_GROUPS.length, 0);
m.resetCreditorAliases();

console.log('PASS: alias persistence, new custom creditor groups, open-account aliases, deletion, reset, and bureau checks');

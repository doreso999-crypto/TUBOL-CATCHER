/* node test-list-display-settings.js — independent format preferences and rendering */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');

function sourceSlice(begin, end) {
    const a = source.indexOf(begin);
    const b = source.indexOf(end, a);
    assert(a >= 0 && b > a, 'Missing source section: ' + begin);
    return source.slice(a, b);
}

// Previously saved shared mode must migrate without coupling the new choices.
const prefsCode = sourceSlice('    function normalizeCrcDisplayMode(mode) {',
    '    // ========================================\n    // JSON DATA');
const storage = new Map([['tubol-crc-list-display-mode', 'legacy']]);
const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, value); }
};
const keys = [
    'tubol-crc-list-display-mode',
    'tubol-crc-inquiries-display-mode',
    'tubol-crc-new-inquiries-display-mode',
    'tubol-crc-personal-info-display-mode'
];
const prefs = new Function('localStorage', 'CRC_DISPLAY_KEY',
    'CRC_INQUIRIES_DISPLAY_KEY', 'CRC_NEW_INQUIRIES_DISPLAY_KEY',
    'CRC_PERSONAL_DISPLAY_KEY',
    prefsCode + '\nreturn {loadCrcDisplayMode, saveCrcDisplayMode,' +
    'crcInquiryDisplayMode, crcNewInquiryDisplayMode, crcPersonalDisplayMode};')
    (localStorage, ...keys);
assert.equal(prefs.crcInquiryDisplayMode, 'legacy');
assert.equal(prefs.crcNewInquiryDisplayMode, 'legacy');
assert.equal(prefs.crcPersonalDisplayMode, 'legacy');
assert.equal(prefs.saveCrcDisplayMode(keys[1], 'modern'), 'modern');
assert.equal(prefs.loadCrcDisplayMode(keys[1]), 'modern');
assert.equal(prefs.loadCrcDisplayMode(keys[2]), 'legacy');
assert.equal(prefs.loadCrcDisplayMode(keys[3]), 'legacy');
assert.equal(storage.get(keys[0]), 'legacy', 'Original preference must remain untouched');

// The shared renderer must receive an explicit mode and format its copy text accordingly.
function element() {
    const node = {
        children: [], textContent: '', className: '',
        appendChild(child) { this.children.push(child); },
        addEventListener() {}
    };
    const classes = new Set();
    node.classList = {
        toggle(key, force) {
            const active = force === undefined ? !classes.has(key) : !!force;
            if (active) classes.add(key); else classes.delete(key);
            return active;
        },
        contains(key) { return classes.has(key); }
    };
    return node;
}
const document = {createElement() { return element(); }};
const inquiryCode = sourceSlice('    function renderInquiryBureauGroups(',
    '    // Use the same collapsible, bureau-grouped presentation as inquiries.');
const render = new Function('document',
    inquiryCode + '\nreturn renderInquiryBureauGroups;')(document);
const groups = [{
    title: 'Experian',
    items: [{ creditor: 'Capital One', date: '01/02/2026',
        action: 'Not Disputed', connectedToOpen: false }]
}];
const modernContainer = element();
const modernCopy = render(modernContainer, groups, 'No inquiries', false, null, 'modern');
assert(modernCopy.includes('CAPITAL ONE 01/02/2026(EXP)'));
assert(modernContainer.classList.contains('crc-modern-display'));
const legacyContainer = element();
const legacyCopy = render(legacyContainer, groups, 'No inquiries', false, null, 'legacy');
assert(legacyCopy.includes('EXPERIAN:'));
assert(legacyCopy.includes('capital one 01/02/2026'));
assert(!legacyContainer.classList.contains('crc-modern-display'));

// The floating panel and preview must expose separately wired controls.
for (const id of ['crc-inquiries-display-mode', 'crc-new-inquiries-display-mode',
    'crc-personal-display-mode']) {
    assert(source.includes('id="' + id + '"'));
    assert(source.includes("['#" + id + "','change']"));
}
assert(source.includes("addSelect('newDisplayMode'"));
assert(source.includes("addSelect('inquiriesDisplayMode'"));
assert(source.includes("addSelect('personalDisplayMode'"));
assert(source.includes('#crc-negative-panel button'));
assert(source.includes('.crc-preview-settings button'));
assert(source.includes('Helvetica, Arial, sans-serif'));
console.log('PASS: independent inquiry/new/personal formats, migration, rendering, preview sync and sans-serif UI');

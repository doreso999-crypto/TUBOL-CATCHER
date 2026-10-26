/* node test-inquiry-date-addresses.js — no third-party dependencies */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');

function section(start, end) {
    const a = src.indexOf(start), b = src.indexOf(end, a);
    assert(a !== -1 && b > a, 'Source section not found: ' + start);
    return src.slice(a, b);
}

const queryFns = section('    function parseInquiryDate(str) {',
    '    function filterRecentInquiries(inquiryList, days = 35) {');
const { filterInquiriesBeforeDate, parseInquiryDate } =
    new Function(queryFns + '\nreturn {filterInquiriesBeforeDate,parseInquiryDate};')();
const inquiries = [
    { creditor: 'DEC', date: '12/31/2024', experian: true },
    { creditor: 'JAN1', date: '01/01/2025', experian: true },
    { creditor: 'JAN2', date: '01/02/2025', equifax: true },
    { creditor: 'OLDER', date: '05/03/2020', transunion: true },
    { creditor: 'NO DATE', date: '', experian: true },
    { creditor: 'INVALID', date: '02/31/2024', equifax: true }
];
assert.deepEqual(filterInquiriesBeforeDate(inquiries, '2025-01-01').map(i => i.creditor),
    ['DEC', 'OLDER']);
assert.equal(filterInquiriesBeforeDate(inquiries, '').length, inquiries.length);
assert.equal(filterInquiriesBeforeDate(inquiries, 'not-a-date').length, inquiries.length);
assert.equal(filterInquiriesBeforeDate(inquiries, '2025-02-31').length, inquiries.length);
assert.equal(parseInquiryDate('02/31/2024'), null);
assert(src.includes("dateFilterWrap.hidden = view !== 'inquiries';"),
    'Date cutoff must only appear in INQUIRIES, not NEW');
assert(src.includes("filterInquiriesBeforeDate(inquiries, crcInquiryBeforeDate)"),
    'Cutoff must affect rendered inquiry groups (and copy output)');

const parseAndExtract = section('    // Address dates may be separate elements or',
    '    function extractEmployers() {');
const makeEntry = (value, paragraph = false) => ({
    textContent: value,
    querySelector() { return null; },
    matches(selector) { return paragraph && selector.includes('p.MuiTypography'); },
    closest() { return null; }
});
const makeColumn = entries => ({
    classList: { contains: x => x === 'MuiGrid-item' },
    querySelectorAll() { return entries; }
});
const makeRow = heading => ({
    children: [
        { classList: { contains: x => x === 'MuiGrid-item' }, textContent: heading },
        makeColumn([
            makeEntry('172 MAIN ST TACOMA WA 98499'),
            makeEntry('Date: 03/2021', true),
            makeEntry('255 OAK STREET SEATTLE WA 98101 02/2020'),
        ]),
        makeColumn([
            makeEntry('800 LAKE RD DALLAS TX 75201'),
            makeEntry('05/2018 - 06/2019', true)
        ]),
        makeColumn([])
    ]
});
const rows = [makeRow('Previous Address(es):'), makeRow('Previous Addresses:')];
const document = { querySelectorAll() { return rows; } };
const { parsePreviousAddressEntry, extractPreviousAddresses } =
    new Function('document', parseAndExtract +
        '\nreturn {parsePreviousAddressEntry,extractPreviousAddresses};')(document);
assert.deepEqual(parsePreviousAddressEntry('Date: 03/2021'),
    { address: '', date: '03/2021' });
assert.deepEqual(parsePreviousAddressEntry('172 MAIN ST TACOMA WA 98499 03/2021'),
    { address: '172 MAIN ST TACOMA WA 98499', date: '03/2021' });
const addresses = extractPreviousAddresses();
assert.equal(addresses.EX.length, 2);
assert.equal(addresses.EX[0].date, '03/2021');
assert.equal(addresses.EX[1].date, '02/2020');
assert.equal(addresses.EQU[0].date, '05/2018 - 06/2019');
assert.equal(addresses.TU.length, 0);
const mockDom = {
    createElement(tag) {
        return {
            tag, children: [], classList: { toggle() {} },
            appendChild(child) { this.children.push(child); },
            setAttribute() {}, addEventListener() {},
            textContent: ''
        };
    }
};
const renderFn = section('    function renderPreviousAddresses(container, addresses, kind =',
    '    function renderPersonalInfo(');
for (const mode of ['legacy', 'modern']) {
    const render = new Function('document', 'crcDisplayMode', renderFn +
        '\nreturn renderPreviousAddresses;')(mockDom, mode);
    const container = { children: [], appendChild(item) { this.children.push(item); } };
    const copy = render(container, addresses);
    assert(copy.includes('03/2021'), 'Date missing from ' + mode + ' clipboard output');
    assert(copy.includes('02/2020'), 'Inline date missing from ' + mode);
    assert(container.children.length === 3, 'Bureau groups missing');
}
assert(src.includes("const collectionWarning = accountType === 'COLLECTION'"),
    'Only collection accounts should get the red verification notice');
assert(!src.includes('VERIFY CHARGE OFF CLASSIFICATION'),
    'Charge-offs should not display the old red verification notice');
assert(src.includes('width: min(1000px') && src.includes('height: min(88vh'),
    'Settings window enlargement is missing');

console.log('PASS: date cutoff (exclusive), Previous Address(es) dates and copy, collection-only notice, expanded Settings');

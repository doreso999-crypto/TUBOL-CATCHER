/* node test-inquiry-date-popover.js — UI behavior without browser dependencies */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');
function part(start, end) {
    const a=source.indexOf(start), b=source.indexOf(end,a);
    assert(a>=0 && b>a, 'Source section missing: '+start);
    return source.slice(a,b);
}
function node(tag) {
    return {
        tag, listeners: {}, children: [], hidden: false, value: '', parent: null,
        classList: { toggle() {}, add() {}, remove() {} },
        attributes: {},
        setAttribute(k,v) { this.attributes[k]=v; },
        addEventListener(k,fn) { this.listeners[k]=fn; },
        appendChild(child) { this.children.push(child); child.parent=this; },
        contains(target) { while(target){ if(target===this)return true; target=target.parent; } return false; },
        replaceChildren(...children) { this.children=children; children.forEach(x=>x.parent=this); },
        click() {this.listeners.click?.({target:this});}
    };
}
const dateMethods=part('    function parseInquiryDate(str) {',
    '    function filterRecentInquiries(inquiryList, days = 35) {');
const {filterInquiriesBeforeDate}=new Function(dateMethods+
    '\nreturn {filterInquiriesBeforeDate};')();
const ui=part("        const dateFilterWrap = document.createElement('div');",
    "        const inquiriesView = document.createElement('div');");
const logic=part("        let regularInquiries = filterInquiriesBeforeDate(inquiries, crcInquiryBeforeDate);",
    "        // ========================================\n        // NEW INQUIRIES (today back to 35 days ago)");
const store=new Map();
const localStorage={
    setItem(k,v){store.set(k,v);},getItem(k){return store.get(k)||null;},
    removeItem(k){store.delete(k);}
};
const document={createElement:node};
const panel=node('panel'), inquiriesDiv=node('inquiries'), inquiriesView=node('inquiriesView');
const inquiries=[
    {creditor:'DEC',date:'12/31/2024',experian:true},
    {creditor:'JAN',date:'01/01/2025',experian:true},
    {creditor:'OLD',date:'05/01/2023',equifax:true},
    {creditor:'MISSING',date:'',transunion:true}
];
let renders=0;
const render=(container,groups)=>{
    renders++;
    return groups.flatMap(g=>g.items.map(i=>i.creditor)).join(',');
};
const run=new Function('document','panel','inquiriesDiv','inquiriesView',
    'inquiries','localStorage','CRC_INQUIRY_BEFORE_DATE_KEY',
    'filterInquiriesBeforeDate','renderInquiryBureauGroups','openInquiryAliasDialog',
    'crcCopyConnectedInquiries',ui+
    'let crcInquiryBeforeDate="";\n'+logic+
    '\nreturn {dateFilterWrap,dateFilterToggle,dateFilterPopover,dateFilterInput,dateFilterClear,'+
    'dateFilterApply,dateFilterCancel,dateFilterSummary,dateFilterButtonLabel,'+
    'getResults:()=>copyTextOpenInquiries,getCutoff:()=>crcInquiryBeforeDate};');
const test=run(document,panel,inquiriesDiv,inquiriesView,inquiries,
    localStorage,'tubol-crc-inquiry-before-date',filterInquiriesBeforeDate,
    render,()=>{},false);
assert.equal(renders,1);
assert.equal(test.dateFilterPopover.hidden,true);
assert.equal(test.dateFilterButtonLabel.textContent,'Filter by date');
assert.equal(test.getResults(),'DEC,JAN,OLD,MISSING');
test.dateFilterToggle.click();
assert.equal(test.dateFilterPopover.hidden,false);
assert.equal(test.dateFilterToggle.attributes['aria-expanded'],'true');
test.dateFilterInput.value='2025-01-01';
// Editing an uncommitted draft never re-renders rows or updates the cutoff.
assert.equal(renders,1);
assert.equal(test.getCutoff(),'');
test.dateFilterCancel.click();
assert.equal(test.dateFilterPopover.hidden,true);
assert.equal(renders,1);
test.dateFilterToggle.click();
test.dateFilterInput.value='2025-01-01';
test.dateFilterApply.click();
assert.equal(test.dateFilterPopover.hidden,true);
assert.equal(test.getCutoff(),'2025-01-01');
assert.equal(test.getResults(),'DEC,OLD');
assert.equal(renders,2);
assert.equal(localStorage.getItem('tubol-crc-inquiry-before-date'),'2025-01-01');
assert(test.dateFilterButtonLabel.textContent.includes('2025'));
assert.equal(test.dateFilterSummary.textContent,'2 of 4 inquiries');
// Outside click dismisses a draft without applying changes.
test.dateFilterToggle.click();
test.dateFilterInput.value='2023-01-01';
panel.listeners.pointerdown({target:node('inquiry-row')});
assert.equal(test.dateFilterPopover.hidden,true);
assert.equal(test.getCutoff(),'2025-01-01');
assert.equal(renders,2);
// Escape also closes the popover without changing results.
test.dateFilterToggle.click();
let stopped=false;
panel.listeners.keydown({key:'Escape',stopPropagation(){stopped=true;}});
assert.equal(test.dateFilterPopover.hidden,true);
assert.equal(stopped,true);
assert.equal(renders,2);
// "Show all" is the only other action that refreshes inquiry rows.
test.dateFilterToggle.click();
test.dateFilterClear.click();
assert.equal(test.getCutoff(),'');
assert.equal(test.getResults(),'DEC,JAN,OLD,MISSING');
assert.equal(renders,3);
assert.equal(localStorage.getItem('tubol-crc-inquiry-before-date'),null);
assert(source.includes("dateFilterWrap.hidden = view !== 'inquiries';"),
    'Date filter must remain scoped to the regular INQUIRIES subtab');
assert(source.includes("if (view !== 'inquiries') setInquiryDatePopoverOpen(false);"),
    'Navigating away should close an open date popover');
assert(source.includes('#crc-inquiry-date-popover[hidden] { display: none !important; }'));
console.log('PASS: date popover opens on demand, Apply/Cancel/Clear, copy sync, outside/Escape close, no focus stealing');

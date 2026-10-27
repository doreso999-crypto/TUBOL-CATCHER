/* node test-disputed-mode.js — no external dependencies */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const scanner = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');
function between(a,b) {
    const x=scanner.indexOf(a), y=scanner.indexOf(b,x);
    assert(x>=0&&y>x,'Missing source section '+a);
    return scanner.slice(x,y);
}
const state=between("    const CRC_BUREAU_PRIORITY_KEY = ",
    "    function clampPanelOpacity");
const collection=between("    // Capture all populated row values",
    "    function extractData() {");
const bankruptcy=between("    // Bankruptcy grids are one record each",
    "    function extractBankruptcies() {");
const store=new Map();
const localStorage={
    getItem:k=>store.get(k)??null,
    setItem:(k,v)=>store.set(k,v)
};
function node(tag) {
    return {tag,children:[],textContent:'',className:'',
        appendChild(child){this.children.push(child);return child;}};
}
const document={createElement:node,querySelectorAll(){return [];}};
const api = new Function('localStorage','document',state+'\n'+collection+'\n'+bankruptcy+
    '\nreturn {CRC_BUREAUS,getBureauPriorityOrder,loadBureauPriority,'+
    'collectNegativeBureauFields,groupBureauFieldValues,formatBureauValueLines,'+
    'pickPriorityBureauValue,updateNegativePreferredValues,getDisputeCategory,'+
    'buildDisputedCategories,getDisputeFieldGroups,formatDisputedAccountCopy,'+
    'renderDisputeAccountCard,extractBankruptcyTables};')(localStorage,document);
assert.deepEqual(api.getBureauPriorityOrder('equifax'),['equifax','experian','transunion']);
assert.deepEqual(api.getBureauPriorityOrder('experian'),['experian','equifax','transunion']);
assert.deepEqual(api.getBureauPriorityOrder('transunion'),['transunion','equifax','experian']);
assert.equal(api.loadBureauPriority(),'equifax');
store.set('tubol-crc-negative-bureau-priority','transunion');
assert.equal(api.loadBureauPriority(),'transunion');
store.set('tubol-crc-negative-bureau-priority','invalid');
assert.equal(api.loadBureauPriority(),'equifax');

function row(label,exp,equ,tu) {
    const values={label,experian:exp,equifax:equ,transunion:tu};
    return {querySelector(selector) {
        const key=/\[data-field="([^"]+)"\]/.exec(selector)?.[1];
        return Object.prototype.hasOwnProperty.call(values,key)
            ? {textContent:values[key]} : null;
    }};
}
const rows={
    a:row('Account #:', 'xxx123','xxx123','xxx3545'),
    b:row('Balance',' $1,000 ','1000.00','$250'),
    c:row('Status','Closed','Closed','Open'),
    d:row('Late Payment Status','30 days','60 days','90 days'),
    e:row('Comments','Exp comment','Equ comment','Tu comment'),
    f:row('Date Opened','04/2020','04/2020','05/2020')
};
const fields=api.collectNegativeBureauFields(rows,['Experian']);
assert.equal(fields.equ['Account #'],'xxx123','Capture Equifax even when not flagged negative');
assert.equal(fields.tu['Account #'],'xxx3545','Capture TransUnion even when not flagged negative');
assert.deepEqual(api.formatBureauValueLines(api.groupBureauFieldValues(fields,['Account #'])),
    ['xxx123(exp-equ)','xxx3545(tu)']);
assert.deepEqual(api.formatBureauValueLines(api.groupBureauFieldValues(fields,['Balance'],'balance')),
    ['$1,000(exp-equ)','$250(tu)']);
assert.deepEqual(api.formatBureauValueLines(api.groupBureauFieldValues(fields,['Status'])),
    ['Closed(exp-equ)','Open(tu)']);
const account={account:'Original Bank',account_type:'CHARGE OFF',bureau_fields:fields};
api.updateNegativePreferredValues([account],'transunion');
assert.equal(account.account_number,'xxx3545');
assert.equal(account.balance,'$250');
assert.equal(account.late_payment,'90 days');
assert.equal(account.comments,'Tu comment');
api.updateNegativePreferredValues([account],'equifax');
assert.equal(account.account_number,'xxx123');
assert.equal(account.balance,'1000.00');
assert.equal(account.late_payment,'60 days');
assert.equal(fields.exp['Account #'],'xxx123','Source per-bureau data must not be mutated');
const grouped=api.getDisputeFieldGroups(account);
assert.deepEqual(grouped.primary[0].lines,['xxx123(exp-equ)','xxx3545(tu)']);
assert.deepEqual(grouped.primary[1].lines,['$1,000(exp-equ)','$250(tu)']);
assert(grouped.details.some(x=>x.label==='Late Payment Status'));
const copy=api.formatDisputedAccountCopy(account);
assert(copy.includes('xxx123(exp-equ)'));
assert(copy.includes('$1,000(exp-equ)'));
assert(copy.includes('30 days(exp)'));
const rendered=api.renderDisputeAccountCard(account);
assert.equal(rendered.tag,'article');
assert(rendered.children.some(child=>child.tag==='details'));
const categorySamples={
    'COLLECTION':'delete','CHARGE OFF':'delete','Repossessed':'delete',
    'Transferred':'delete','Foreclosure':'delete',
    'OPEN LP':'updated','CLOSED LP':'updated','PAID LP':'updated',
    'INCLUDED IN BANKRUPTCY':'bankruptcy','Bankruptcy':'bankruptcy','':'updated'
};
for(const [type,group] of Object.entries(categorySamples))assert.equal(api.getDisputeCategory(type),group,type);
const items=[
    {account:'Zebra',account_type:'COLLECTION',bureau_fields:fields},
    {account:'Alpha',account_type:'CHARGE OFF',bureau_fields:fields},
    {account:'Brick',account_type:'CLOSED LP',bureau_fields:fields},
    {account:'Other',account_type:'',bureau_fields:fields}
];
const categories=api.buildDisputedCategories(items,[
    {account:'Bankruptcy',account_type:'Bankruptcy',bureau_fields:fields}
]);
assert.deepEqual(categories.delete.map(x=>x.account),['Alpha','Zebra']);
assert.equal(categories.updated.length,2);
assert.equal(categories.bankruptcy.length,1);

// A bankruptcy table is one case with its separate Experian / Equifax / TU
// information, not three separate rows that lose cross-bureau context.
const bankruptcyRows=[
    row('Type','Chapter 7 Bankruptcy','Chapter 7 Bankruptcy','Chapter 7 Bankruptcy'),
    row('Reference','ABC123','ABC123','XYZ789'),
    row('Date Filed/Reported','01/2020','01/2020','02/2020'),
    row('Status','Discharged','Discharged','Discharged')
];
const bankruptcyGrid={querySelectorAll:()=>bankruptcyRows};
document.querySelectorAll=()=>[bankruptcyGrid];
const bankruptcies=api.extractBankruptcyTables();
assert.equal(bankruptcies.length,1);
assert.deepEqual(api.getDisputeFieldGroups(bankruptcies[0]).primary[0].lines,
    ['ABC123(exp-equ)','XYZ789(tu)']);
assert.deepEqual(api.getDisputeFieldGroups(bankruptcies[0]).primary[1].lines,
    ['01/2020(exp-equ)','02/2020(tu)']);
assert.deepEqual(api.getDisputeFieldGroups(bankruptcies[0]).primary[2].lines,
    ['Discharged(exp-equ-tu)']);

// The user-facing controls are wired without changing copy settings for
// inquiries or the default Negative tab.
assert(scanner.includes('id="crc-bureau-priority"'));
assert(scanner.includes('id="crc-negative-mode-disputed"'));
for(const id of ['delete','updated','bankruptcy'])
    assert(scanner.includes('data-crc-dispute-category="'+id+'"'));
assert(scanner.includes("copyAccountText(disputedModeActive ? copyTextDisputed : copyTextNegative"));
assert(scanner.includes("renderNegativeStandard();"));
assert(scanner.includes("const bankruptcyTables = extractBankruptcyTables();"));
assert(scanner.includes("if (active) renderDisputedCategory();"));
console.log('PASS: priority selection, all-bureau extraction, deduplicated numbers/balances, sorted categories, bankruptcy records and copy');

/* node test-inquiry-date-reset.js — fresh report must start unfiltered */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'crc-scanner.js'),'utf8');

function between(start,end) {
    const a=script.indexOf(start),b=script.indexOf(end,a);
    assert(a>=0 && b>a, 'Missing source section: '+start);
    return script.slice(a,b);
}
const storageMap=new Map([
    ['tubol-crc-inquiry-before-date','2024-02-02'],
    ['tubol-crc-negative-bureau-priority','transunion']
]);
const localStorage={
    getItem:k=>storageMap.get(k)??null,
    setItem:(k,v)=>storageMap.set(k,v),
    removeItem:k=>storageMap.delete(k)
};
const dateState=between("    let crcInquiryBeforeDate = '';",
    '    function loadCrcDisplayMode()');
assert(dateState.includes('function resetInquiryDateForNewScan()'),
    'Must provide one named reset operation');
const state=new Function('localStorage','CRC_INQUIRY_BEFORE_DATE_KEY',
    dateState+'\nreturn { get:()=>crcInquiryBeforeDate, '+
    'set:value=>{crcInquiryBeforeDate=value;}, reset:resetInquiryDateForNewScan };')(
        localStorage,'tubol-crc-inquiry-before-date');

assert.equal(state.get(),'');
assert.equal(localStorage.getItem('tubol-crc-inquiry-before-date'),null);
assert.equal(localStorage.getItem('tubol-crc-negative-bureau-priority'),'transunion');

state.set('2025-01-01');
assert.equal(state.get(),'2025-01-01');
const scanner=between('        scanButton.onclick = async function() {',
    '        document.body.appendChild(scanButton);');
const button={disabled:false,textContent:'CLICK ME!'};
const checkpoints=[];
new Function('scanButton','resetInquiryDateForNewScan','expandNegativeDetails',
    'waitForNoMoreShowMore','extractData','console',
    scanner)(button,state.reset,
        ()=>checkpoints.push('expand:'+state.get()),
        async()=>checkpoints.push('wait:'+state.get()),
        ()=>checkpoints.push('extract:'+state.get()),
        {log(){},error(error){throw error;}});
async function run() {
    await button.onclick.call(button);
    assert.deepEqual(checkpoints,['expand:','wait:','extract:'],
        'Clear cutoff before starting extraction');
    assert.equal(button.disabled,false);
    assert.equal(button.textContent,'CLICK ME!');
    assert.equal(state.get(),'');

    state.set('2026-04-09');
    checkpoints.length=0;
    await button.onclick.call(button);
    assert.equal(state.get(),'');
    assert.deepEqual(checkpoints,['expand:','wait:','extract:']);
    button.disabled=true;
    state.set('2026-05-01');
    await button.onclick.call(button);
    assert.equal(state.get(),'2026-05-01',
        'Disabled scan control must not start another scan');
    button.disabled=false;

    assert(!script.includes('localStorage.setItem(CRC_INQUIRY_BEFORE_DATE_KEY'),
        'Do not save cutoff on regular Apply or full-page Settings update');
    assert(script.includes('crcInquiryBeforeDate = selected;'),
        'Regular Apply must still update the current report filter');
    assert(script.includes('refreshRegularInquiryDateFilter();'),
        'Current report filter still refreshes displayed and copied inquiries');
    assert(script.includes('beforeDate: crcInquiryBeforeDate,'),
        'New-tab preview must receive the current report cutoff');
    console.log('PASS: stale cutoff cleared on startup and every scan; per-report filter still works');
}
return run();

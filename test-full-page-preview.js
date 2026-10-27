/* node test-full-page-preview.js — minimal DOM simulation, no external packages */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'crc-scanner.js'),'utf8');
const begin = source.indexOf('    function renderFullPageReportPreview(previewWindow, snapshot) {');
const end = source.indexOf('    function showResults(negativeData) {',begin);
assert(begin>=0 && end>begin, 'Preview renderer must precede the scanner');
const implementation = source.slice(begin,end);
assert(source.includes('id="crc-open-preview-btn"'), 'Main extractor needs new-tab button');
assert(source.includes("window.open('about:blank', '_blank')"), 'Must open tab from click');
assert(source.includes('renderFullPageReportPreview(previewWindow, {'), 'Preview button needs live snapshot');
assert(source.includes('const CRC_FULL_PREVIEW_CSS = '), 'Full-screen responsive CSS needed');
assert(source.includes('max-width:1160px'), 'Full-page layout should be much wider than extractor');
assert(!implementation.includes("localStorage.setItem(CRC_PANEL_POSITION_KEY"),
    'Report content must not be stored in position settings');
assert(implementation.includes('localStorage.setItem(CRC_PREVIEW_LAYOUT_KEY'),
    'Only the selected presentation layout is persisted');
assert(!implementation.includes('fetch('), 'Must not send report information over network');
assert(!implementation.includes('innerHTML'), 'Never interpolate user credit-report values as HTML');

class Element {
    constructor(tag) {
        this.tagName=tag.toLowerCase(); this.children=[]; this.parentNode=null;
        this.style={}; this.attributes={}; this.textContent=''; this.className='';
        this.listeners={}; this.hidden=false; this.value='';
        const self=this;
        this.classList={
            contains(token){return self.className.split(/\s+/).includes(token);},
            toggle(token,value){
                const set=new Set(self.className.split(/\s+/).filter(Boolean));
                const shouldAdd=value===undefined?!set.has(token):Boolean(value);
                shouldAdd?set.add(token):set.delete(token);
                self.className=[...set].join(' ');return shouldAdd;
            },
            add(token){this.toggle(token,true);},
            remove(token){this.toggle(token,false);}
        };
    }
    appendChild(node) {
        if(node.tagName==='#fragment') {
            [...node.children].forEach(x=>this.appendChild(x));node.children=[];return node;
        }
        node.parentNode=this;this.children.push(node);return node;
    }
    replaceChildren(...items){this.children=[];items.forEach(item=>this.appendChild(item));}
    setAttribute(key,value){this.attributes[key]=String(value);if(key==='id')this.id=String(value);}
    removeAttribute(key){delete this.attributes[key];}
    addEventListener(kind,handler){(this.listeners[kind]??=[]).push(handler);}
    async click(){for(const fn of this.listeners.click||[])await fn({target:this});}
    closest(selector){
        let current=this;while(current){if(current.matches(selector))return current;current=current.parentNode;}return null;
    }
    matches(selector){
        return selector.split(',').some(part=>{
            const p=part.trim();
            if(p.startsWith('.'))return this.classList.contains(p.slice(1));
            if(p.startsWith('#'))return this.id===p.slice(1);
            return this.tagName===p.toLowerCase();
        });
    }
    querySelectorAll(selector){
        let results=[];
        for(const child of this.children){
            if(child.matches(selector))results.push(child);
            results=results.concat(child.querySelectorAll(selector));
        }
        return results;
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}
    cloneNode(deep){
        const copy=new Element(this.tagName);
        copy.className=this.className;copy.textContent=this.textContent;
        copy.style={...this.style};copy.hidden=this.hidden;
        copy.value=this.value;copy.id=this.id;copy.attributes={...this.attributes};
        if(deep)this.children.forEach(x=>copy.appendChild(x.cloneNode(true)));
        return copy;
    }
}
class PreviewDocument {
    constructor(){this.head=new Element('head');this.body=new Element('body');this.opened=false;this.closed=false;this.listeners={};}
    addEventListener(type,fn){this.listeners[type]=fn;}
    open(){this.opened=true;}
    write(markup){this.staticMarkup=markup;}
    close(){this.closed=true;}
    createElement(tag){return new Element(tag);}
    createDocumentFragment(){return new Element('#fragment');}
    execCommand(){return true;}
}
const doc=new PreviewDocument();let focusCount=0;let copied='';
const windowMock={
    document:doc,closed:false,
    navigator:{clipboard:{writeText:async value=>{copied=value;}}},
    focus(){focusCount++;},setTimeout(fn){fn();}
};
const origin=(name,text)=>{const e=new Element('div');e.className=name;e.textContent=text;return e;};
const neg=origin('negative-results','Private Account 123');
neg.id='crc-results';
const inquiries=origin('crc-inquiries-view','Inquiry Company');
const section=new Element('div');section.className='crc-inquiry-section';
const bureau=new Element('div');bureau.className='crc-inquiry-bureau';
section.appendChild(bureau);section.appendChild(origin('crc-inquiry-items','Some inquiry'));
inquiries.appendChild(section);
const open=origin('crc-open-accounts-view','Open Accounts 777');
const inlineCopy=new Element('button');inlineCopy.id='crc-open-accounts-copy-all';open.appendChild(inlineCopy);
const recent=origin('crc-new-inquiries-view','Recent Name');
const addresses=origin('crc-addresses','Previous Address');
const employers=origin('crc-employers','Employer Name');
const snap={
    negativeResults:neg,
    disputeCategories:{
        delete:[{account:'Deleted Candidate'}],
        updated:[{account:'Updated Candidate'}],
        bankruptcy:[{account:'Bankruptcy Record'}]
    },
    inquiriesView:inquiries,openAccountsView:open,newInquiriesView:recent,
    addressesView:addresses,employersView:employers,
    copyNegative:'NEGATIVE ORIGINAL',copyInquiries:'INQUIRIES ORIGINAL',
    copyOpenAccounts:'OPEN ACCOUNT ORIGINAL',copyNewInquiries:'NEW ORIGINAL',
    copyPersonalInfo:'PERSONAL ORIGINAL',
    beforeDate:'2025-01-01',activePage:'negative',
    negativeMode:'disputed',disputedCategory:'delete',inquiryMode:'new'
};
const makeDisputeCard=item=>origin('crc-dispute-card',item.account);
const copyDispute=item=>item.account+' xxx123(exp-equ)';
const fakeStorage=new Map();
const localStorageMock={
    getItem(key){return fakeStorage.get(key)||null;},
    setItem(key,value){fakeStorage.set(key,value);}
};
const renderer=new Function('CSS_STYLES','CRC_FULL_PREVIEW_CSS','CRC_PREVIEW_LAYOUT_KEY',
    'localStorage','renderDisputeAccountCard','formatDisputedAccountCopy',
    implementation+'\nreturn renderFullPageReportPreview;')(
        '#crc-negative-panel{width:440px}','.crc-preview-layout{max-width:1160px}',
        'tubol-crc-preview-layout-v1',localStorageMock,
        makeDisputeCard,copyDispute
    );
return (async()=>{
const preview=renderer(windowMock,snap);
assert(doc.opened && doc.closed,'Should initialize a local blank tab');
assert(doc.staticMarkup.includes('<title>TUBOL CATCHER - Report Preview</title>'));
assert(doc.head.children[0].textContent.includes('max-width:1160px'));
assert.equal(focusCount,1);
assert.equal(preview.pages.negative.hidden,false);
assert.equal(preview.pages.inquiries.hidden,true);
assert.equal(preview.activeCopyText(),'Deleted Candidate xxx123(exp-equ)');

preview.selectDisputedCategory('bankruptcy');
assert.equal(preview.activeCopyText(),'Bankruptcy Record xxx123(exp-equ)');
preview.selectNegativeMode('standard');
assert.equal(preview.activeCopyText(),'NEGATIVE ORIGINAL');
preview.selectPage('inquiries');
assert.equal(preview.pages.inquiries.hidden,false);
assert.equal(preview.pages.negative.hidden,true);
assert.equal(preview.activeCopyText(),'NEW ORIGINAL');
preview.selectInquiryMode('open');
assert.equal(preview.activeCopyText(),'OPEN ACCOUNT ORIGINAL');
assert.equal(doc.body.querySelector('#crc-open-accounts-copy-all'),null,'No inert duplicate copy button');
preview.selectInquiryMode('inquiries');
assert.equal(preview.activeCopyText(),'INQUIRIES ORIGINAL');
const bureauClone=doc.body.querySelector('.crc-inquiry-bureau');
assert(bureauClone,'Bureau section in full preview');
assert.equal(bureauClone.attributes['aria-expanded'],'true');
await bureauClone.click();
assert.equal(bureauClone.attributes['aria-expanded'],'false','Preview bureau headers must work');
preview.selectPage('personal');
assert.equal(preview.activeCopyText(),'PERSONAL ORIGINAL');
const button=doc.body.querySelector('.crc-preview-copy');
assert(button,'A copy-current-view action must be visible');
await button.click();
assert.equal(copied,'PERSONAL ORIGINAL','Copy action must honor currently selected tab');
assert.equal(button.textContent,'Copy current view','Button resets after copying');
assert(source.includes('Copy current view'),'Copy action should be clearly named');
assert(source.includes('Snapshot from your current report'),'Snapshot status visible');
console.log('PASS: isolated full-page snapshot, 3 report tabs, disputed & inquiry navigation, bureau expand, per-view copy and no report storage');
})();

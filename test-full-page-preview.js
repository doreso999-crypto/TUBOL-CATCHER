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
const stubDateFilter=(items,date)=>!date?items:items.filter(x=>{
    const [month,day,year]=x.date.split('/').map(Number);
    return x.date && new Date(year,month-1,day)<new Date(date+'T00:00:00');
});
const stubPriority=(items,preferred)=>items.forEach(x=>{
    const code={equifax:'equ',experian:'exp',transunion:'tu'}[preferred];
    if(x.bureau_fields?.[code]){
        x.account_number=x.bureau_fields[code]['Account #']||x.account_number;
        x.balance=x.bureau_fields[code].Balance||x.balance;
    }
});
const stubDisputeFields=item=>({
    primary:[{lines:[item.account||'']}],details:[]});
const renderer=new Function('CSS_STYLES','CRC_FULL_PREVIEW_CSS','CRC_PREVIEW_LAYOUT_KEY',
    'localStorage','renderDisputeAccountCard','formatDisputedAccountCopy',
    'filterInquiriesBeforeDate','updateNegativePreferredValues','getDisputeFieldGroups',
    'CREDITOR_ALIAS_GROUPS','CREDITOR_DISPLAY_NAMES','CREDITOR_USER_GROUPS',
    'listCreditorAliases',
    implementation+'\nreturn renderFullPageReportPreview;')(
        '#crc-negative-panel{width:440px}','.crc-preview-layout{max-width:1160px}',
        'tubol-crc-preview-layout-v1',localStorageMock,
        makeDisputeCard,copyDispute,
        stubDateFilter,stubPriority,stubDisputeFields,
        [{id:'bank'}],{bank:'Bank Co'},[],()=>[{alias:'Bank Co'}]
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

// Table, Grid and List are working, persisted presentation modes.
preview.setDisplayLayout('table');
assert.equal(fakeStorage.get('tubol-crc-preview-layout-v1'),'table');
assert.equal(preview.pages.personal.hidden,true,'Table mode hides card view');
assert(doc.body.querySelector('.crc-preview-table-pane'));
// The Table view must still expose the nested Disputed Mode categories
// and inquiry subtabs, without returning to Grid first.
preview.selectPage('negative');
preview.selectNegativeMode('disputed');
const tableSubnav=doc.body.querySelectorAll('.crc-preview-subnav')
    .find(n=>n.attributes['aria-label']==='Table section filters');
assert(tableSubnav,'Table mode must have accessible subnavigation');
assert.equal(tableSubnav.hidden,false);
const updatedTab=tableSubnav.children.find(n=>n.textContent==='Updated');
assert(updatedTab,'Updated category must remain accessible in Table mode');
await updatedTab.click();
assert(preview.activeCopyText().includes('Updated Candidate'));
preview.selectPage('inquiries');
const openTab=tableSubnav.children.find(n=>n.textContent==='Open accounts');
assert(openTab,'Open accounts subtab must remain accessible in Table mode');
await openTab.click();
assert.equal(preview.activeCopyText(),'OPEN ACCOUNT ORIGINAL');
preview.setDisplayLayout('list');
assert.equal(fakeStorage.get('tubol-crc-preview-layout-v1'),'list');
assert.equal(preview.pages.personal.hidden,false);
preview.setDisplayLayout('grid');
assert.equal(fakeStorage.get('tubol-crc-preview-layout-v1'),'grid');

// Rich snapshot data can be re-rendered when Settings change without
// changing the original report, and copy reflects those settings.
const changes=[];
snap.onSettingChange=(key,value)=>changes.push({key,value});
snap.negativeData=[{
    account:'Example Bank',account_number:'eq007',balance:'$800',
    bureau_display:'3BR-',account_type:'CHARGE OFF',
    bureau_fields:{equ:{'Account #':'eq007',Balance:'$800'},
                   exp:{'Account #':'ex008',Balance:'$900'}}
}];
snap.bankruptcies=[];
snap.inquiries=[
    {creditor:'ALPHA',date:'12/31/2024',experian:true,equifax:false,transunion:false,connectedToOpen:false},
    {creditor:'CONNECTED',date:'01/01/2025',experian:true,equifax:false,transunion:false,connectedToOpen:true}
];
snap.newInquiries=[snap.inquiries[1]];
snap.openAccounts=[{account:'Example Bank',account_number:'ex008',balance:'$900',bureau_display:'EX',account_type:'OPEN'}];
snap.previousAddresses={EX:[{address:'123 MAIN ST',date:'02/2024'}],EQU:[],TU:[]};
snap.employers={EX:[{address:'ACME',date:''}],EQU:[],TU:[]};
preview.refreshPreviewContent();
preview.selectPage('negative');
preview.selectNegativeMode('standard');
assert(preview.activeCopyText().includes('eq007'));
preview.applySetting('bureauPriority','experian');
assert(preview.activeCopyText().includes('ex008'));
assert(!preview.activeCopyText().includes('eq007'));
preview.setDisplayLayout('table');
let table=preview.currentTableModel();
assert.equal(table.rows[0][0],'Example Bank');
assert.equal(table.rows[0][1],'ex008');
preview.selectPage('inquiries');
preview.selectInquiryMode('inquiries');
preview.applySetting('beforeDate','');
table=preview.currentTableModel();
assert.equal(table.rows.length,2);
assert(!preview.activeCopyText().includes('CONNECTED'));
preview.applySetting('copyConnected',true);
assert(preview.activeCopyText().includes('CONNECTED'));
preview.applySetting('beforeDate','2025-01-01');
assert.equal(preview.currentTableModel().rows.length,1);
assert(preview.activeCopyText().includes('ALPHA'));
assert(!preview.activeCopyText().includes('CONNECTED'));
preview.selectInquiryMode('open');
preview.applySetting('openNamesOnly',true);
assert.equal(preview.currentTableModel().headers.length,1);
assert.equal(preview.activeCopyText(),'Example Bank');
preview.selectPage('personal');
assert.equal(preview.currentTableModel().rows.length,2);
preview.applySetting('displayMode','legacy');
assert(preview.activeCopyText().includes('EXPERIAN:'));
preview.applySetting('opacity',85);
assert.equal(doc.body.querySelector('#crc-negative-panel').style.opacity,'0.85');
assert(changes.some(x=>x.key==='opacity'&&x.value===85));
assert(changes.some(x=>x.key==='bureauPriority'&&x.value==='experian'));
preview.setSettingsVisible(true);
assert.equal(doc.body.querySelector('.crc-preview-settings').hidden,false);
preview.setSettingsVisible(false);
assert.equal(doc.body.querySelector('.crc-preview-settings').hidden,true);
preview.setDisplayLayout('grid');
console.log('PASS: full-page Grid/Table/List, live Settings and saved layout, priority, copy filters, date, aliases drawer and navigation');
})();

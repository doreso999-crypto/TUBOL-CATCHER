/* node test-client-name-header.js — CRC report-heading extraction */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'crc-scanner.js'),'utf8');
const begin=script.indexOf('    // Read the current client from Credit Repair Cloud');
const end=script.indexOf('    function showResults(negativeData) {',begin);
assert(begin>=0 && end>begin);
const implementation=script.slice(begin,end);
const exported=new Function('document',implementation+
  '\nreturn {getClientNameFromReportHeading,setExtractorClientHeading};');
const api=exported({querySelectorAll(){return [];}});
const mk=(title,span)=>({
  textContent:title,
  querySelectorAll:()=>span===null?[]:[{textContent:span}]
});
const doc=headings=>({querySelectorAll:()=>headings});
const sample=doc([mk('Other name (Wrong)','(Wrong)'),
    mk('Preview Credit Report (Yong Chong)','(Yong Chong)')]);
assert.equal(api.getClientNameFromReportHeading(sample),'Yong Chong');
const second=doc([mk('Preview Credit Report (Ana Marie)','(  Ana  Marie )')]);
assert.equal(api.getClientNameFromReportHeading(second),'Ana Marie');
assert.equal(api.getClientNameFromReportHeading(doc([mk('Preview Credit Report',null)])),'');
assert.equal(api.getClientNameFromReportHeading(doc([mk('Preview Credit Report Fake','Fake')])),'');
assert.equal(api.getClientNameFromReportHeading(doc([mk('Wrong title (Zoe)','(Zoe)')])),'');
const handle={textContent:'',title:''};
const panel={querySelector:()=>handle};
api.setExtractorClientHeading(panel,sample);
assert.equal(handle.textContent,'Yong Chong');
api.setExtractorClientHeading(panel,second);
assert.equal(handle.textContent,'Ana Marie');
api.setExtractorClientHeading(panel,doc([]));
assert.equal(handle.textContent,'CLIENT REPORT');
assert(!implementation.includes('innerHTML'));
assert(script.includes('setExtractorClientHeading(panel);'));
assert(script.includes('text-overflow: ellipsis;'));
assert(script.includes('#crc-negative-panel.crc-minimized #crc-drag-handle'));
console.log('PASS: CRC client title, safe DOM, no stale client, minimized header and long-name truncation');

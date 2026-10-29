/* node test-client-name-delayed.js: late title, same-origin frames and cleanup */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'crc-scanner.js'),'utf8');
const begin=script.indexOf('    // The report title may be injected asynchronously or rendered inside');
const end=script.indexOf('    function showResults(negativeData) {',begin);
assert(begin>=0&&end>begin,'Client name functions missing');
const observed=[];
class FakeObserver {
  constructor(callback){this.callback=callback;this.active=false;observed.push(this);}
  observe(target){this.target=target;this.active=true;}
  disconnect(){this.active=false;}
  emit(target){if(this.active)this.callback([{target}]);}
}
function title(text,span){
  return {textContent:text,querySelectorAll:selector=>selector==='span'&&span!==null?[{textContent:span}]:[]};
}
function doc(){
  return {documentElement:{},headings:[],frames:[],
    querySelectorAll(sel){return sel==='h1'?this.headings:sel==='iframe, frame'?this.frames:[];}};
}
function frame(inner) {
  const callbacks={};
  return {contentDocument:inner,
    addEventListener(type,cb){callbacks[type]=cb;},
    removeEventListener(type,cb){if(callbacks[type]===cb)delete callbacks[type];},
    fire(type){callbacks[type]?.();},
    callbacks};
}
const win={MutationObserver:FakeObserver};
win.parent=win;win.top=win;
const home=doc();
const api=new Function('document','window',script.slice(begin,end)+
  '\nreturn {getClientNameFromReportHeading,getClientReportContexts,getCurrentClientName,setExtractorClientHeading,watchExtractorClientHeading};')(home,win);
const label={textContent:'',title:''};
const panel={isConnected:true,querySelector:selector=>selector==='#crc-drag-handle'?label:null,contains:node=>node===label};
async function flush(){await Promise.resolve();await Promise.resolve();}
async function testRun(){
  const dispose=api.watchExtractorClientHeading(panel,home,win);
  await flush();
  assert.equal(label.textContent,'CLIENT REPORT');
  assert.equal(observed.length,1);
  home.headings=[title('Preview Credit Report (Yong Chong)','(Yong Chong)')];
  observed[0].emit(home.documentElement);
  await flush();
  assert.equal(label.textContent,'Yong Chong','Late heading should update automatically');

  // Client switch in the same page: do not keep old name.
  home.headings=[title('Preview Credit Report (Jordan Lee)','(Jordan Lee)')];
  observed[0].emit(home.documentElement);
  await flush();
  assert.equal(label.textContent,'Jordan Lee');
  home.headings=[];
  observed[0].emit(home.documentElement);
  await flush();
  assert.equal(label.textContent,'CLIENT REPORT');

  // Heading is text-only, even if the MUI span is missing.
  home.headings=[title('Preview Credit Report (Ana Marie)',null)];
  observed[0].emit(home.documentElement);
  await flush();
  assert.equal(label.textContent,'Ana Marie');
  home.headings=[];

  // A frame is attached after the scanner already started.
  const inner=doc();
  const child=frame(inner);
  home.frames=[child];
  observed[0].emit(home.documentElement);
  await flush();
  assert.equal(observed.length,2,'Frame should also receive an observer');
  inner.headings=[title('Preview Credit Report (Yong Chong)','(Yong Chong)')];
  observed[1].emit(inner.documentElement);
  await flush();
  assert.equal(label.textContent,'Yong Chong');
  inner.headings=[title('Preview Credit Report (Second Client)','(Second Client)')];
  child.fire('load');
  await flush();
  assert.equal(label.textContent,'Second Client');

  // Cross-origin content is inaccessible; never throw or display a guess.
  const forbidden={get contentDocument(){throw Error('cross origin');},
    addEventListener(){},removeEventListener(){}};
  home.frames=[forbidden];
  inner.headings=[];
  observed[0].emit(home.documentElement);
  await flush();
  assert.equal(label.textContent,'CLIENT REPORT');

  // A same-origin parent can expose the report title.
  const outer=doc();
  outer.headings=[title('Preview Credit Report (Parent Client)','(Parent Client)')];
  const embeddedWin={MutationObserver:FakeObserver,parent:{document:outer},top:{document:outer}};
  assert.equal(api.getCurrentClientName(home,embeddedWin),'Parent Client');

  dispose();
  assert(observed.every(o=>!o.active),'Rescan cleanup disconnects observers');
  assert.equal(child.callbacks.load,undefined,'Rescan cleanup removes iframe load handlers');
  home.headings=[title('Preview Credit Report (Wrong After Dispose)','(Wrong After Dispose)')];
  observed[0].emit(home.documentElement);
  await flush();
  assert.equal(label.textContent,'CLIENT REPORT','Disposed observer must not update header');
  assert(script.includes('old.__crcDisposeClientHeading?.()'),
    'Old panel observer must be disposed when rescanning');
  console.log('PASS: delayed heading, text-only fallback, same-origin iframe/parent, client changes, inaccessible frame and cleanup');
}
return testRun();

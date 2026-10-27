/* node test-extractor-appearance.js
 * Regression tests for draggable expanded/minimized extractor and opacity.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'crc-scanner.js'), 'utf8');
function slice(begin, end) {
    const start = source.indexOf(begin);
    const finish = source.indexOf(end, start);
    assert(start >= 0 && finish > start, 'Missing source section: ' + begin);
    return source.slice(start, finish);
}
const appearanceCode = slice("    const CRC_PANEL_OPACITY_KEY", "    function loadCrcBoolSetting");
const movingCode = slice("    // Keep a floating panel fully on screen", "    function showResults(negativeData) {");

const storage = new Map();
const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, val) => storage.set(key, val),
    removeItem: key => storage.delete(key)
};
const appearance = new Function('localStorage', appearanceCode +
    '\nreturn {clampPanelOpacity,getSavedPanelOpacity,applyPanelOpacity};')(localStorage);
assert.equal(appearance.getSavedPanelOpacity(), 100);
assert.equal(appearance.clampPanelOpacity(10), 60);
assert.equal(appearance.clampPanelOpacity(200), 100);
assert.equal(appearance.clampPanelOpacity('NaN'), 100);
assert.equal(appearance.clampPanelOpacity(73), 73, '1% precision must be supported');
assert.equal(appearance.clampPanelOpacity('87'), 87);
const faded = { style: {} };
assert.equal(appearance.applyPanelOpacity(faded, 75), 75);
assert.equal(faded.style.opacity, '0.75');
assert.equal(appearance.getSavedPanelOpacity(), 75);
storage.set('tubol-crc-panel-opacity', '-500');
assert.equal(appearance.getSavedPanelOpacity(), 60);
storage.delete('tubol-crc-panel-opacity');

const listeners = {};
const window = {
    innerWidth: 1280,
    innerHeight: 900,
    addEventListener(type, fn) { (listeners[type] ??= new Set()).add(fn); },
    removeEventListener(type, fn) { listeners[type]?.delete(fn); }
};
const document = { documentElement: { clientWidth: 1280, clientHeight: 900 } };
const drag = new Function('window','document','localStorage', 'CRC_PANEL_POSITION_KEY', movingCode +
    '\nreturn {clampExtractorPosition,installExtractorDragging};')(
        window,document,localStorage,'tubol-crc-panel-position-v1'
    );
assert.deepEqual(drag.clampExtractorPosition(-50, 1000, 440, 792, 1280, 900), { left: 0, top: 108 });
function makePanel() {
    let minimized = false;
    const events = {};
    const draggingClasses = new Set();
    const bar = {
        events, classList: { add(x){draggingClasses.add(x)},remove(x){draggingClasses.delete(x)} },
        addEventListener(type, fn) { events[type]=fn; },
        removeEventListener(type) { delete events[type]; },
        setPointerCapture(id) { this.pointerCaptured=id; },
        hasPointerCapture(id) { return this.pointerCaptured === id; },
        releasePointerCapture() { this.pointerCaptured=null; }
    };
    const panel = {
        style: {}, bar,
        set minimized(value){minimized=value}, get minimized(){return minimized},
        querySelector(selector) {
            if(selector==='#crc-top-bar') return bar;
            if(selector==='#crc-settings-menu') return {hidden:true};
            throw new Error('Unexpected selector: '+selector);
        },
        getBoundingClientRect() {
            const width = minimized ? 300 : 440, height = minimized ? 58 : 792;
            const left = this.style.left ? parseFloat(this.style.left) : window.innerWidth - width - 20;
            const top = this.style.top ? parseFloat(this.style.top) : 20;
            return {left,top,width,height,right:left+width,bottom:top+height};
        }
    };
    return panel;
}
function event(pointerId, clientX, clientY, control = false, button = 0) {
    return {
        pointerId, clientX,clientY,button,
        target: {closest() {return control ? {} : null}},
        preventDefault() {this.prevented=true}
    };
}
const p = makePanel();
const controller = drag.installExtractorDragging(p);
assert.equal(p.style.left,'820px');
assert.equal(p.style.top,'20px');
assert.equal(listeners.resize.size,1);
p.bar.events.pointerdown(event(1,760,35,true));
assert.equal(p.style.left,'820px', 'Button must not start dragging');
const start = event(2,760,35);
p.bar.events.pointerdown(start);
assert.equal(start.prevented,true);
p.bar.events.pointermove(event(2,2000,1200));
assert.equal(p.style.left,'840px');
assert.equal(p.style.top,'108px');
p.bar.events.pointerup(event(2,2000,1200));
assert.deepEqual(JSON.parse(storage.get('tubol-crc-panel-position-v1')), {left:840,top:108});
// Minimize anchors to the previous top-right corner: as width shrinks
// from 440 to 300, the left edge moves 140px right, not stay at 840px.
const beforeMinimize = p.getBoundingClientRect();
p.minimized=true;
controller.keepTopRightAnchor(beforeMinimize.right, beforeMinimize.top);
controller.savePosition();
assert.equal(p.style.left,'980px','Minimize should preserve the right edge');
assert.equal(p.getBoundingClientRect().right, beforeMinimize.right);
assert.equal(p.style.top,'108px');
assert.equal(JSON.parse(storage.get('tubol-crc-panel-position-v1')).left,980);
p.bar.events.pointerdown(event(3,1000,130));
p.bar.events.pointermove(event(3,0,0));
p.bar.events.pointerup(event(3,0,0));
assert.equal(p.style.left,'0px');
assert.equal(p.style.top,'0px');
const beforeRestore = p.getBoundingClientRect();
p.minimized=false;
controller.keepTopRightAnchor(beforeRestore.right, beforeRestore.top);
controller.savePosition();
assert.equal(p.style.left,'0px');
// The viewport clamp is allowed to shift a window back into view.
assert.equal(p.style.top,'0px');
window.innerWidth=480;
window.innerHeight=560;
const resize=Array.from(listeners.resize)[0];
resize();
assert.equal(p.style.left,'0px');
assert.equal(p.style.top,'0px');
controller.destroy();
assert.equal(listeners.resize.size,0);

const loaded = makePanel();
const newController=drag.installExtractorDragging(loaded);
assert.equal(loaded.style.left,'0px','Position should survive re-initialization');
newController.destroy();

// When there is enough room, minimize AND restore preserve the same right
// edge without shifting the window horizontally.
window.innerWidth=1280;
window.innerHeight=900;
const centered = makePanel();
const centeredControls=drag.installExtractorDragging(centered);
centeredControls.keepTopRightAnchor(1050,20);
const expandedRect=centered.getBoundingClientRect();
centered.minimized=true;
centeredControls.keepTopRightAnchor(expandedRect.right,expandedRect.top);
assert.equal(centered.getBoundingClientRect().right,1050);
assert.equal(centered.style.left,'750px');
const collapsedRect=centered.getBoundingClientRect();
centered.minimized=false;
centeredControls.keepTopRightAnchor(collapsedRect.right,collapsedRect.top);
assert.equal(centered.style.left,'610px');
assert.equal(centered.getBoundingClientRect().right,1050);
centeredControls.destroy();
assert.equal(listeners.resize.size,0);

assert(source.includes('id="crc-panel-opacity"'));
assert(source.includes("panelOpacityInput.addEventListener('input'"));
assert(source.includes('width: 440px;'));
assert(source.includes('height: 88vh;'));
assert(source.includes('width: 300px;'));
assert(source.includes('min-height: 58px;'));
assert(source.includes('id="crc-panel-opacity" min="60" max="100" step="1"'));
assert(!source.includes('id="crc-panel-opacity" min="60" max="100" step="5"'));
assert(source.includes('DRAG TO MOVE'));
assert(source.includes('#crc-settings-menu .crc-settings-note { font-size: 15px;'));
assert(source.includes('#crc-settings-menu .crc-settings-heading { font-size: 26px;'));
assert(source.includes('#crc-negative-panel.crc-minimized .crc-stat-row-wrapper'));

const template = slice('    const HTML_TEMPLATE = \`',
    '    // ========================================\n    // JAVASCRIPT FUNCTIONS');
const barEnd=template.indexOf('        </div>\n\n',template.indexOf('<div id="crc-top-bar">'));
const backdrop=template.indexOf('id="crc-settings-backdrop"');
assert(backdrop > barEnd, 'Settings must be outside the draggable header');
assert(source.includes('dragControls.keepTopRightAnchor(before.right, before.top);'),
    'Minimize handler must apply top-right anchoring');
assert(source.includes('dragControls.savePosition();'),
    'Minimized/restored coordinates must persist');
console.log('PASS: original size, 1% opacity, top-right minimize/restore, drag bounds, persistence and safe buttons');

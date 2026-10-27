// ==UserScript==
// @name         CRC NEGATIVE SCANNER
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Extract negative accounts, open accounts, inquiries, and previous addresses from CRC
// @match        https://app.creditrepaircloud.com/app/clients/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Prevent double-install when script is injected multiple times
    if (window.__crcScriptInstalled) return;
    window.__crcScriptInstalled = true;

    // Save preferences and only creditor names users explicitly add to the alias dictionary; never save report details.
    const CRC_DISPLAY_KEY = 'tubol-crc-list-display-mode';
    const CRC_COPY_CONNECTED_INQUIRIES_KEY = 'tubol-crc-copy-connected-inquiries';
    const CRC_COPY_CONNECTED_NEW_KEY = 'tubol-crc-copy-connected-new-inquiries';
    const CRC_OPEN_NAMES_ONLY_KEY = 'tubol-crc-open-account-names-only';
    const CRC_INQUIRY_BEFORE_DATE_KEY = 'tubol-crc-inquiry-before-date';
    const CRC_PANEL_OPACITY_KEY = 'tubol-crc-panel-opacity';
    const CRC_PANEL_POSITION_KEY = 'tubol-crc-panel-position-v1';
    const CRC_PREVIEW_LAYOUT_KEY = 'tubol-crc-preview-layout-v1';
    const CRC_BUREAU_PRIORITY_KEY = 'tubol-crc-negative-bureau-priority';
    const CRC_BUREAUS = [
        { field: 'experian', label: 'Experian', code: 'exp' },
        { field: 'equifax', label: 'Equifax', code: 'equ' },
        { field: 'transunion', label: 'TransUnion', code: 'tu' }
    ];
    function getBureauPriorityOrder(preferred) {
        const chosen = CRC_BUREAUS.some(b => b.field === preferred) ? preferred : 'equifax';
        return [chosen, ...['equifax','experian','transunion'].filter(x => x !== chosen)];
    }
    function loadBureauPriority() {
        try { return getBureauPriorityOrder(localStorage.getItem(CRC_BUREAU_PRIORITY_KEY))[0]; }
        catch (_) { return 'equifax'; }
    }
    let crcBureauPriority = loadBureauPriority();
    function clampPanelOpacity(value) {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(60, Math.min(100, Math.round(n))) : 100;
    }
    function getSavedPanelOpacity() {
        try {
            const stored = localStorage.getItem(CRC_PANEL_OPACITY_KEY);
            return stored === null ? 100 : clampPanelOpacity(stored);
        } catch (_) { return 100; }
    }
    let crcPanelOpacity = getSavedPanelOpacity();
    function applyPanelOpacity(panel, percent) {
        crcPanelOpacity = clampPanelOpacity(percent);
        panel.style.opacity = String(crcPanelOpacity / 100);
        try { localStorage.setItem(CRC_PANEL_OPACITY_KEY, String(crcPanelOpacity)); }
        catch (_) { /* Current-session setting still works. */ }
        return crcPanelOpacity;
    }
    function loadCrcBoolSetting(key, defaultValue) {
        try {
            const stored = localStorage.getItem(key);
            return stored === null ? defaultValue : stored === 'true';
        } catch (_) { return defaultValue; }
    }
    function saveCrcBoolSetting(key, value) {
        try { localStorage.setItem(key, String(value)); }
        catch (_) { /* Keep the current session preference. */ }
    }
    let crcCopyConnectedInquiries = loadCrcBoolSetting(CRC_COPY_CONNECTED_INQUIRIES_KEY, false);
    let crcCopyConnectedNew = loadCrcBoolSetting(CRC_COPY_CONNECTED_NEW_KEY, true);
    let crcOpenNamesOnly = loadCrcBoolSetting(CRC_OPEN_NAMES_ONLY_KEY, false);
    // Blank means all inquiries; YYYY-MM-DD is an exclusive upper bound.
    let crcInquiryBeforeDate = '';
    try {
        const saved = localStorage.getItem(CRC_INQUIRY_BEFORE_DATE_KEY) || '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(saved)) crcInquiryBeforeDate = saved;
    } catch (_) { /* Date selection remains available this session. */ }
    function loadCrcDisplayMode() {
        try { return localStorage.getItem(CRC_DISPLAY_KEY) === 'legacy' ? 'legacy' : 'modern'; }
        catch (_) { return 'modern'; }
    }
    let crcDisplayMode = loadCrcDisplayMode();
    function saveCrcDisplayMode(mode) {
        crcDisplayMode = mode === 'legacy' ? 'legacy' : 'modern';
        try { localStorage.setItem(CRC_DISPLAY_KEY, crcDisplayMode); }
        catch (_) { /* Remain in the selected mode for this session. */ }
    }
    // ========================================
    // JSON DATA
    // ========================================

    const COLLECTION_AGENCIES = [
        "portfolio recovery", "midland credit", "lvnv", "cavalry", "resurgent",
        "enhanced recovery", "credit control", "afni", "convergent", "ic system",
        "credence", "allied interstate", "allied collection", "sequium", "radius global",
        "transworld systems", "tsi", "national credit systems", "firstsource", "rent recovery",
        "receivables performance", "american profit recovery", "financial recovery services",
        "southwest credit systems", "central portfolio control", "wakefield", "rsa", "mcm",
        "midland funding", "erc", "convergent outsourcing", "capio", "bull city financial",
        "dynamic recovery", "phoenix financial", "professional finance company",
        "credit collection services", "cca", "bay area credit", "national recoveries",
        "revsolve", "spire recovery", "genesis credit management", "ars national",
        "commonwealth financial", "ability recovery", "continental finance",
        "receivable solutions", "aldous", "jeffcaps", "jefferson capital systems", "portfolio","JEFFERSON CAPITAL SYST",
        "spring oaks capital", "spring oaks capital llc", "spring oaks capital spv", "spring oaks capital spv llc", "spring oaks", "spring oaks capital spv",
        "MIDLANDCRE", "CONTRACT CALLERS INC", "CCI"

    ];

    // ========================================
    // CSS STYLES
    // ========================================

const CSS_STYLES = `
/* =========================================================
   CRC WORKSHOP
   MAIN PANEL
   ========================================================= */


#crc-negative-panel {
    width: 440px;
    max-width: calc(100vw - 32px);
    height: 88vh;
    max-height: 88vh;

    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;

    display: flex;
    flex-direction: column;

    box-sizing: border-box;

    padding: 0;
    margin: 0;

    background: #18191a;
    color: #e4e6eb;

    border: 1px solid #3a3b3c;
    border-radius: 14px;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif;

    overflow: hidden;

    box-shadow:
        0 12px 35px rgba(0, 0, 0, .45);
}


/* =========================================================
   TOP APP BAR
   ========================================================= */

#crc-top-bar {
    width: 100%;
    min-height: 58px;

    box-sizing: border-box;

    padding: 12px 18px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    background: #242526;

    flex-shrink: 0;
}


#crc-settings-btn {
    width: 40px;
    height: 40px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    background: transparent;
    color: #e4e6eb;

    border: none;
    border-radius: 50%;

    cursor: pointer;

    font-size: 22px;

    transition:
        background .15s ease,
        transform .1s ease;
}


#crc-settings-btn:hover {
    background: #3a3b3c;
}


#crc-settings-btn:active {
    transform: scale(.94);
}


/* Modern entries may be long: show the full address or creditor/date/code line. */
#crc-negative-panel.crc-modern-display .crc-inquiry-creditor {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.5;
}

/* Dedicated, readable Settings window (bounded inside the viewport). */
#crc-top-bar {
    position: relative;
    cursor: grab;
    touch-action: none;
    user-select: none;
}
#crc-top-bar.crc-dragging { cursor: grabbing; }
#crc-top-bar button, #crc-top-bar input, #crc-top-bar select { cursor: pointer; }
#crc-drag-handle {
    flex: 1;
    min-width: 0;
    margin: 0 12px;
    text-align: center;
    font-size: 16px;
    color: #b8bdc4;
    font-weight: 750;
    letter-spacing: .04em;
    pointer-events: none;
}
#crc-negative-panel.crc-minimized #crc-drag-handle { font-size: 15px; }
#crc-settings-backdrop[hidden] { display: none !important; }
#crc-settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(0,0,0,.65);
}
#crc-settings-menu {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    z-index: 70;
    width: min(1000px, calc(100vw - 32px));
    max-width: calc(100vw - 32px);
    height: min(88vh, 860px);
    max-height: calc(100vh - 24px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    background: #242526;
    color: #e4e6eb;
    border: 1px solid #4a4b4c;
    border-radius: 12px;
    padding: clamp(16px, 2.4vw, 28px);
    box-shadow: 0 12px 32px rgba(0,0,0,.5);
}
#crc-settings-menu[hidden] { display: none !important; }
#crc-settings-menu .crc-settings-heading {
    font-size: 22px;
    font-weight: 800;
}
#crc-settings-menu .crc-settings-heading-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
#crc-settings-close { color:#fff; background:transparent; border:0; border-radius:6px; padding:8px 10px; font-size: 19px; cursor:pointer; }
#crc-settings-tabs { display:flex; gap:8px; margin:12px 0 14px; border-bottom:1px solid #444; }
#crc-settings-tabs button { color:#d5d7da; background:transparent; border:0; padding:10px; cursor:pointer; font-size: 14px; font-weight:700; border-bottom:3px solid transparent; }
#crc-settings-tabs button.active { border-bottom-color:#3982e4; color:#fff; }
#crc-settings-content { min-height:0; overflow-y:auto; flex:1; padding:2px 4px 8px; }
#crc-settings-general[hidden],#crc-settings-aliases[hidden] { display:none !important; }
#crc-settings-menu label {
    display: block;
    font-size: 14px;
    font-weight: 700;
}
#crc-settings-menu select {
    display: block;
    width: 100%;
    margin: 8px 0 12px;
    min-height: 40px;
    padding: 8px 9px;
    background: #18191a;
    color: #e4e6eb;
    border: 1px solid #55585b;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
}
#crc-settings-menu .crc-settings-note {
    color: #b0b3b8;
    font-size: 13px;
    line-height: 1.5;
}
#crc-settings-menu .crc-settings-section-title {
    margin: 14px 0 9px;
    padding-top: 11px;
    border-top: 1px solid #3a3b3c;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: .03em;
}
#crc-settings-menu .crc-settings-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-bottom: 12px;
    cursor: pointer;
    line-height: 1.4;
    font-weight: 600;
}
#crc-settings-menu .crc-settings-checkbox input {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    margin: 1px 0 0;
    accent-color: #2374e1;
}

#crc-alias-search, #crc-alias-target, #crc-alias-new-name { width: 100%; box-sizing: border-box; background: #18191a; color: #e4e6eb; padding: 9px; border: 1px solid #55585b; border-radius: 8px; margin: 8px 0; }
#crc-alias-new-row[hidden] { display:none !important; }
#crc-alias-new-btn { display:inline-block; margin:8px 0; border:0; border-radius:7px; padding:10px 12px; color:#fff; background:#2374e1; font-weight:700; cursor:pointer; }
#crc-alias-list { max-height: none; overflow-y: visible; background: #18191a; padding: 5px; border: 1px solid #44484b; border-radius: 8px; }
.crc-alias-entity { margin-bottom: 5px; border: 1px solid #353638; border-radius: 6px; }
.crc-alias-entity summary { cursor: pointer; font-size: 13px; font-weight: 700; padding: 8px; }
.crc-alias-variation { cursor: context-menu; font-size: 13px; padding: 6px 10px; border-top: 1px solid #353638; overflow-wrap: anywhere; }
.crc-alias-variation:hover { background: #3a3b3c; }
.crc-alias-custom { color: #95caff; }
#crc-alias-reset { border-radius: 7px; padding: 8px; cursor: pointer; color: #ddd; background: transparent; border: 1px solid #55585b; margin-top: 8px; }
.crc-alias-overlay[hidden] { display: none !important; }
.crc-alias-overlay { position: fixed; inset: 0; z-index: 100; padding: 15px; background: rgba(0,0,0,.8); display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.crc-alias-card { background: #242526; border: 1px solid #53575a; border-radius: 12px; padding: 18px; width: min(480px, calc(100vw - 36px)); max-height: min(76vh, 550px); overflow-y: auto; box-sizing: border-box; }
.crc-alias-card h3 { margin: 0 0 8px; }
#crc-alias-name { font-size: 14px; margin: 8px 0; overflow-wrap: anywhere; }
.crc-alias-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.crc-alias-actions button { cursor: pointer; color: #fff; background: #3a3b3c; border: 0; padding: 9px 12px; border-radius: 7px; }
.crc-alias-actions .crc-alias-primary { background: #2374e1; }
#crc-open-accounts-copy-all {
    display: block;
    width: 100%;
    min-height: 40px;
    margin: 4px 0 14px;
    padding: 9px 12px;
    color: #fff;
    background: #2374e1;
    border: 0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 750;
    cursor: pointer;
}
#crc-open-accounts-copy-all:hover { background: #3982e4; }
#crc-open-accounts-copy-all:disabled { opacity: .55; cursor: not-allowed; }

/* =========================================================
   WINDOW CONTROLS
   ========================================================= */

#crc-window-controls {
    display: flex;
    align-items: center;

    gap: 7px;
}


.crc-window-btn {
    width: 36px;
    height: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    background: #3a3b3c;
    color: #e4e6eb;

    border: none;
    border-radius: 50%;

    cursor: pointer;

    font-size: 19px;
    font-weight: 500;

    transition:
        background .15s ease,
        transform .1s ease;
}


.crc-window-btn:hover {
    background: #4e4f50;
}


.crc-window-btn:active {
    transform: scale(.94);
}


/* =========================================================
   HEADER DIVIDER
   ========================================================= */

#crc-header-divider {
    width: 100%;
    height: 1px;

    background: #3a3b3c;

    flex-shrink: 0;
}


/* =========================================================
   STATISTICS
   ========================================================= */

#crc-header-stats {
    width: 100%;

    box-sizing: border-box;

    padding: 17px 20px 18px;

    background: #18191a;

    flex-shrink: 0;
}


#crc-header-stats div {
    min-height: 28px;

    display: flex;
    align-items: center;

    margin-bottom: 5px;
}


#crc-header-stats div:last-child {
    margin-bottom: 0;
}


#crc-header-stats label {
    width: 155px;
    min-width: 155px;

    color: #b0b3b8;

    font-size: 15px;
    font-weight: 500;
}


#crc-header-stats b {
    margin: 0;

    color: #e4e6eb;

    font-size: 16px;
    font-weight: 700;
}


/* =========================================================
   PAGE TABS
   ========================================================= */

#crc-page-tabs {
    width: 100%;

    box-sizing: border-box;

    display: flex;

    padding: 6px 8px 0;

    gap: 4px;

    background: #242526;

    border-top: 1px solid #3a3b3c;
    border-bottom: 1px solid #3a3b3c;

    flex-shrink: 0;
}


.crc-page-btn {
    position: relative;

    flex: 1;

    height: 48px;

    padding: 0 10px;

    background: transparent;
    color: #b0b3b8;

    border: none;
    border-radius: 8px 8px 0 0;

    cursor: pointer;

    font-size: 14px;
    font-weight: 700;

    transition:
        background .15s ease,
        color .15s ease;
}


.crc-page-btn:hover {
    background: #3a3b3c;
    color: #e4e6eb;
}


.crc-page-btn.active {
    color: #2d88ff;
    background: #18191a;
}


.crc-page-btn.active::after {
    content: "";

    position: absolute;

    left: 15%;
    right: 15%;
    bottom: 0;

    height: 3px;

    background: #2d88ff;

    border-radius: 3px 3px 0 0;
}


/* =========================================================
   CONTENT VIEWPORT
   ========================================================= */

#crc-page-content {
    width: 100%;

    flex: 1 1 auto;

    min-height: 0;

    box-sizing: border-box;

    position: relative;

    overflow: hidden;

    background: #18191a;
}


/* =========================================================
   PAGES
   ========================================================= */

.crc-page {
    width: 100%;
    height: 100%;

    min-height: 0;

    box-sizing: border-box;

    overflow-x: hidden;
    overflow-y: auto;

    background: #18191a;

    scrollbar-width: thin;
    scrollbar-color: #4a4b4c transparent;
}


/*
   Page visibility is controlled here.

   JavaScript changes display when tabs are clicked.
*/

#crc-page-1 {
    display: block;
}


#crc-page-2 {
    display: none;
}


/* =========================================================
   NEGATIVE RESULTS CONTAINER
   ========================================================= */

#crc-results {
    width: 100%;

    box-sizing: border-box;

    padding: 8px 14px 18px;

    background: #18191a;

    min-height: max-content;
}


/* =========================================================
   NEGATIVE ACCOUNT CARDS
   ========================================================= */

#crc-results > div {
    box-sizing: border-box;

    padding: 17px 18px;

    margin-bottom: 10px;

    background: #242526;

    border: 1px solid #3a3b3c;
    border-radius: 10px;

    transition:
        background .15s ease,
        border-color .15s ease;
}


#crc-results > div:hover {
    background: #2d2e2f;

    border-color: #4a4b4c;
}


#crc-results > div > b:first-child {
    display: block;

    margin: 0 0 9px;

    color: #e4e6eb;

    font-size: 17px;
    font-weight: 700;

    line-height: 1.35;
}


#crc-results > div > div {
    margin: 0 0 7px;

    color: #b0b3b8;

    font-size: 14px;

    line-height: 1.5;
}


#crc-results > div > div:last-child {
    margin-bottom: 0;

    color: #d8dadf;

    font-size: 13px;
    font-weight: 600;
}


/* Focused negative mode navigation; preserves the regular view. */
.crc-negative-modes, .crc-dispute-tabs {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 9px 12px;
    background: #1b1d20;
    border-bottom: 1px solid #353a42;
}
.crc-negative-modes button, .crc-dispute-tabs button {
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #aeb7c3;
    padding: 9px 11px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
}
.crc-negative-modes button.active, .crc-dispute-tabs button.active {
    background: #334254;
    color: #e7f1ff;
}
.crc-dispute-tabs { padding: 8px 12px; gap: 4px; }
.crc-dispute-tabs button {
    flex: 1;
    min-width: 0;
    padding: 9px 5px;
    font-size: 12px;
    white-space: nowrap;
}
.crc-dispute-tabs button span {
    font-size: 11px;
    padding: 2px 5px;
    border-radius: 8px;
    background: #434850;
}
#crc-negative-disputed-view[hidden], #crc-negative-standard-view[hidden] { display:none !important; }
.crc-dispute-help {
    margin: 10px 15px 6px;
    font-size: 12px;
    line-height: 1.4;
    color: #a8b1bd;
}
#crc-dispute-results { padding: 8px 12px 24px; }
.crc-dispute-card {
    background: #24272b;
    border: 1px solid #41464e;
    border-radius: 10px;
    margin: 0 0 10px;
    padding: 13px 14px;
}
.crc-dispute-card h3 {
    margin: 0 0 8px;
    color: #f0f2f5;
    font-size: 15px;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.crc-dispute-type {
    display: inline-block;
    margin-bottom: 11px;
    border-radius: 5px;
    padding: 3px 7px;
    font-size: 11px;
    font-weight: 700;
    background: #39414b;
    color: #d7e1ed;
}
.crc-dispute-field { margin: 0 0 11px; }
.crc-dispute-field > strong {
    display: block;
    margin: 0 0 4px;
    color: #abb6c5;
    font-size: 12px;
}
.crc-dispute-value {
    display: block;
    font-size: 14px;
    line-height: 1.6;
    color: #f0f2f5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
}
.crc-dispute-details {
    border-top: 1px solid #3c4148;
    margin-top: 9px;
    padding-top: 10px;
}
.crc-dispute-details summary {
    cursor: pointer;
    font-size: 12px;
    color: #b3caff;
    font-weight: 700;
}
.crc-dispute-details .crc-dispute-field:first-of-type { margin-top: 12px; }
.crc-dispute-empty {
    padding: 30px 16px;
    color: #adb8c7;
    background: #24272b;
    border-radius: 10px;
    text-align: center;
    font-size: 13px;
}

/* =========================================================
   COLLECTION WARNING
   ========================================================= */

#crc-results > div b[style*="color:red"] {
    display: inline-block;

    margin-top: 8px;
    padding: 5px 9px;

    background: rgba(237, 73, 86, .12);

    border: 1px solid rgba(237, 73, 86, .25);

    border-radius: 6px;

    color: #ff6b78 !important;

    font-size: 12px !important;
    font-weight: 700;
}


/* =========================================================
   PAGE 2 - INQUIRIES
   ========================================================= */

#crc-open-accounts {
    width: 100%;
    box-sizing: border-box;

    padding: 10px 16px 20px;

    background: #18191a;
}


/* =========================================================
   BUREAU
   ========================================================= */

.crc-inquiry-section {
    margin-bottom: 22px;
}


.crc-inquiry-bureau {
    margin: 8px 0 12px;

    padding: 4px 2px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #2d88ff;

    font-size: 15px;
    font-weight: 800;

    text-transform: uppercase;
    letter-spacing: .4px;

    cursor: pointer;

    user-select: none;
}


.crc-inquiry-bureau-arrow {
    display: inline-block;

    margin-left: 8px;

    font-size: 13px;

    transition: transform .15s ease;
}


.crc-inquiry-section.crc-collapsed .crc-inquiry-bureau-arrow {
    transform: rotate(-90deg);
}


/* =========================================================
   COLLAPSIBLE ITEMS WRAPPER
   ========================================================= */

.crc-inquiry-items {
    overflow: hidden;
}


.crc-inquiry-section.crc-collapsed .crc-inquiry-items {
    display: none;
}


/* =========================================================
   INQUIRY ROW (connection highlight applied here)
   ========================================================= */

.crc-inquiry-row {
    padding: 9px 10px 12px;
    margin-bottom: 4px;

    border-radius: 8px;
    border: 1px solid transparent;

    transition:
        background .15s ease,
        border-color .15s ease;
}


/* Connected to an OPEN account: soft green */

.crc-inquiry-row.crc-inq-connected {
    background: rgba(58, 178, 92, .10);
    border-color: rgba(58, 178, 92, .28);
}


/* NOT connected to an OPEN account: soft red */

.crc-inquiry-row.crc-inq-unconnected {
    background: rgba(224, 82, 82, .10);
    border-color: rgba(224, 82, 82, .28);
}


/* =========================================================
   CREDITOR | STATUS | DOT
   ========================================================= */

.crc-inquiry-top-row {
    display: flex;
    align-items: center;

    width: 100%;

    box-sizing: border-box;
}


.crc-inquiry-creditor {
    flex: 1;

    min-width: 0;

    color: #e4e6eb;

    font-size: 15px;
    font-weight: 700;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}


.crc-inquiry-status {
    width: 42px;

    flex-shrink: 0;

    color: #b0b3b8;

    font-size: 13px;
    font-weight: 800;

    text-align: center;
}


/* =========================================================
   DATE
   ========================================================= */

.crc-inquiry-date {
    margin-top: 2px;

    color: #8f9397;

    font-size: 13px;
    font-weight: 500;
}


/* =========================================================
   INQUIRY COPY NOTE
   ========================================================= */

#crc-inquiry-copy-note {
    width: 100%;

    box-sizing: border-box;

    padding: 6px 2px 0;

    color: #8f9397;

    font-size: 12px;
    line-height: 1.5;

    text-align: center;

    display: none;
}

#crc-inquiry-copy-note.active {
    display: block;
}


/* =========================================================
   EMPTY PAGE
   ========================================================= */

.crc-empty-page {
    min-height: 260px;

    box-sizing: border-box;

    margin: 14px;
    padding: 30px 24px;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    background: #242526;

    border: 1px solid #3a3b3c;
    border-radius: 10px;

    text-align: center;
}


.crc-page-title {
    margin-bottom: 8px;

    color: #e4e6eb;

    font-size: 19px;
    font-weight: 700;
}


.crc-page-subtitle {
    max-width: 290px;

    color: #b0b3b8;

    font-size: 14px;

    line-height: 1.6;
}


/* =========================================================
   COPY FOOTER
   ========================================================= */

#crc-copy-wrapper {
    width: 100%;

    box-sizing: border-box;

    padding: 12px 14px 14px;

    display: flex;
    flex-direction: column;

    gap: 8px;

    background: #242526;

    border-top: 1px solid #3a3b3c;

    flex-shrink: 0;
}


#crc-copy-wrapper .crc-page-copy {
    width: 100%;
    height: 42px;

    box-sizing: border-box;

    margin: 0;
    padding: 0 16px;

    display: none;

    background: #2374e1;
    color: #ffffff;

    border: none;
    border-radius: 8px;

    cursor: pointer;

    font-size: 14px;
    font-weight: 700;

    transition:
        background .15s ease,
        transform .1s ease;
}


#crc-copy-wrapper .crc-page-copy.active {
    display: block;
}


#crc-copy-wrapper .crc-page-copy:hover {
    background: #3982e4;
}


#crc-copy-wrapper .crc-page-copy:active {
    transform: scale(.98);
}

#crc-copy-wrapper .crc-page-copy:disabled {
    opacity: .55;
    cursor: not-allowed;
}


/* =========================================================
   PAGE SCROLLBAR
   ========================================================= */

.crc-page::-webkit-scrollbar {
    width: 8px;
}


.crc-page::-webkit-scrollbar-track {
    background: transparent;
}


.crc-page::-webkit-scrollbar-thumb {
    background: #4a4b4c;

    border-radius: 10px;
}


.crc-page::-webkit-scrollbar-thumb:hover {
    background: #606162;
}


/* =========================================================
   SCAN BUTTON
   ========================================================= */

#crc-scan-btn {
    position: fixed;

    right: 24px;
    bottom: 24px;

    z-index: 999999;

    min-height: 44px;

    padding: 0 20px;

    background: #2374e1;
    color: #ffffff;

    border: none;
    border-radius: 9px;

    cursor: pointer;

    font-size: 14px;
    font-weight: 700;

    box-shadow:
        0 6px 18px rgba(0, 0, 0, .3);

    transition:
        background .15s ease,
        transform .1s ease,
        box-shadow .15s ease;
}


#crc-scan-btn:hover {
    background: #3982e4;

    box-shadow:
        0 8px 22px rgba(0, 0, 0, .4);

    transform: translateY(-1px);
}


#crc-scan-btn:active {
    transform: scale(.97);
}


/* =========================================================
   MINIMIZED STATE
   ========================================================= */

#crc-negative-panel.crc-minimized {
    width: 300px;

    height: auto;
    max-width: calc(100vw - 24px);
    max-height: none;
}


#crc-negative-panel.crc-minimized #crc-header-divider,
#crc-negative-panel.crc-minimized #crc-header-stats,
#crc-negative-panel.crc-minimized .crc-stat-row-wrapper,
#crc-negative-panel.crc-minimized #crc-page-tabs,
#crc-negative-panel.crc-minimized #crc-page-content,
#crc-negative-panel.crc-minimized #crc-copy-wrapper {
    display: none;
}

/* =========================================================
STATISTICS CONTAINER
Controls padding, font, spacing, and appearance for all 3
========================================================= */

.crc-stat-row-wrapper {
    padding: 14px 20px;
    background: #18191a;
    box-sizing: border-box;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;
}

.crc-stat-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    min-height: 30px;
    margin-bottom: 5px;
}

.crc-stat-row:last-child {
    margin-bottom: 0;
}

.crc-stat-row label {
    color: #b0b3b8;
    font-size: 15px;
    font-weight: 500;
}

.crc-stat-row b {
    color: #e4e6eb;
    font-size: 16px;
    font-weight: 700;
}

/* Bureau-grouped personal information */
.crc-personal-heading { padding: 14px 16px 0; margin: 0; font-size: 14px; font-weight: 800; color: #e4e6eb; }
.crc-personal-section { margin-bottom: 16px; }
#crc-page-tabs .crc-page-btn {
    padding-left: 5px;
    padding-right: 5px;
    font-size: 13px;
}

#crc-page-3 {
    display: none;
}

#crc-employers,
#crc-previous-addresses {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 16px 20px;
    background: #18191a;
}

.crc-previous-address-card {
    padding: 11px 12px;
    margin-bottom: 7px;
    border: 1px solid #3a3b3c;
    border-radius: 8px;
    background: #242526;
    color: #e4e6eb;
    font-size: 14px;
    line-height: 1.5;
    overflow-wrap: anywhere;
}

/* =========================================================
   INQUIRIES PAGE
   ========================================================= */

#crc-inquiries {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 14px 18px;
    background: #18191a;
}

/* =========================================================
   INQUIRIES SUBTABS
   ========================================================= */
#crc-inquiries {
    position: relative;
}
/* One quiet toolbar row; the editing popover overlays rather than
   pushes the bureau list down or steals focus while scrolling. */
#crc-inquiry-date-filter {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 2px 4px 10px;
    padding: 0;
}
#crc-inquiry-date-filter[hidden] { display: none !important; }
#crc-inquiry-date-toggle {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 73%;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 10px;
    border: 1px solid #555a63;
    border-radius: 9px;
    background: #24282e;
    color: #e4e6eb;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
}
#crc-inquiry-date-toggle:hover, #crc-inquiry-date-toggle[aria-expanded="true"] {
    background: #313841;
    border-color: #7197c7;
}
#crc-inquiry-date-toggle.crc-date-active {
    color: #c6dcff;
    background: #26364b;
    border-color: #426b9d;
}
#crc-inquiry-date-toggle .crc-date-button-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
#crc-inquiry-date-summary {
    flex: 1;
    text-align: right;
    white-space: nowrap;
    font-size: 12px;
    color: #adb6c1;
    overflow: hidden;
    text-overflow: ellipsis;
}
#crc-inquiry-date-popover {
    position: absolute;
    top: calc(100% + 7px);
    left: 0;
    z-index: 40;
    width: min(325px, 100%);
    box-sizing: border-box;
    padding: 15px;
    background: #292d33;
    border: 1px solid #59616b;
    border-radius: 12px;
    box-shadow: 0 12px 30px rgba(0,0,0,.55);
}
#crc-inquiry-date-popover[hidden] { display: none !important; }
#crc-inquiry-date-popover label {
    display: block;
    margin-bottom: 8px;
    color: #f3f4f6;
    font-size: 14px;
    font-weight: 750;
}
#crc-inquiry-before-date {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 42px;
    padding: 9px 12px;
    background: #181c22;
    color: #e4e6eb;
    border: 1px solid #6a727e;
    border-radius: 8px;
    font-size: 15px;
    color-scheme: dark;
}
#crc-inquiry-before-date:focus-visible, #crc-inquiry-date-toggle:focus-visible,
.crc-date-popover-actions button:focus-visible {
    outline: 2px solid #8bb7fa;
    outline-offset: 2px;
}
.crc-date-help {
    margin: 9px 0 13px;
    color: #bac1ca;
    font-size: 12px;
    line-height: 1.45;
}
.crc-date-popover-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}
.crc-date-popover-actions button {
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid #59616b;
    background: #393e45;
    color: #eceff3;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
}
.crc-date-popover-actions .crc-date-apply {
    background: #2374e1;
    border-color: #2374e1;
    color: white;
}
#crc-inquiry-date-clear { margin-right: auto; }


.crc-subtabs {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 4px 12px;
}

.crc-subtab-btn {
    padding: 6px 10px;
    background: transparent;
    color: #b0b3b8;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 800;
}

.crc-subtab-btn.active {
    background: #3a3b3c;
    color: #e4e6eb;
}

.crc-open-account {
    box-sizing: border-box;
    padding: 12px 14px;
    margin-bottom: 10px;
    background: #242526;
    border: 1px solid #3a3b3c;
    border-radius: 10px;
}


/* =========================================================
   INQUIRY BUREAU SECTION
   ========================================================= */

.crc-inquiry-section {
    margin: 0 0 20px;
}


/* Bureau name */

.crc-inquiry-bureau-title {
    display: block;

    margin: 8px 4px 10px;

    color: #2d88ff;

    font-size: 15px;
    font-weight: 800;

    text-transform: uppercase;
    letter-spacing: .5px;
}


/* No inquiries for a bureau */

.crc-inquiry-none {
    padding: 6px 4px;

    color: #6f7174;

    font-size: 14px;
}


/* Empty inquiry page */

#crc-inquiries .crc-empty-page {
    margin: 14px 0;
}
.crc-open-negative-card {
    background: #3a2426 !important;
    border-color: #8f3a40 !important;
}

.crc-open-negative-card:hover {
    background: #48292c !important;
    border-color: #c04a52 !important;
}

/* =========================================================
   OPEN ACCOUNT - POSITIVE STANDING
   ========================================================= */

.crc-open-positive-card {
    background: #1f3a24 !important;
    border-color: #3a8f47 !important;
}

.crc-open-positive-card:hover {
    background: #254a2c !important;
    border-color: #4ac05a !important;
}

/* =========================================================
   LEGEND (?) BUTTON + POPOVER
   ========================================================= */

.crc-legend-wrap {
    position: relative;
    margin-left: auto;
    flex-shrink: 0;
}

.crc-legend-btn {
    width: 22px;
    height: 22px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    background: #3a3b3c;
    color: #e4e6eb;

    border: none;
    border-radius: 50%;

    cursor: pointer;

    font-size: 13px;
    font-weight: 800;
    line-height: 1;
}

.crc-legend-btn:hover {
    background: #4e4f50;
}

.crc-legend-popover {
    position: absolute;
    top: 30px;
    right: 0;

    width: 230px;
    box-sizing: border-box;

    padding: 12px 14px;

    background: #242526;
    border: 1px solid #3a3b3c;
    border-radius: 10px;

    box-shadow: 0 10px 26px rgba(0, 0, 0, .45);

    z-index: 30;

    display: none;
}

.crc-legend-popover.crc-show {
    display: block;
}

.crc-legend-row {
    display: flex;
    align-items: center;
    gap: 7px;

    margin-bottom: 7px;

    color: #e4e6eb;

    font-size: 13px;
    font-weight: 600;
}

.crc-legend-row:last-child {
    margin-bottom: 0;
}

.crc-legend-dot {
    width: 9px;
    height: 9px;

    flex-shrink: 0;

    border-radius: 50%;

    display: inline-block;
}

/* =========================================================
   MOBILE
   ========================================================= */

/* Readable settings typography, independently of modal dimensions */
#crc-settings-menu { font-size: 17px; }
#crc-settings-menu .crc-settings-heading { font-size: 26px; }
#crc-settings-tabs button { font-size: 18px; padding: 13px 18px; }
#crc-settings-menu label, #crc-settings-menu .crc-settings-checkbox { font-size: 17px; line-height: 1.5; }
#crc-settings-menu select, #crc-settings-menu input:not([type="checkbox"]):not([type="range"]) {
    font-size: 17px;
    min-height: 46px;
}
#crc-settings-menu .crc-settings-note { font-size: 15px; line-height: 1.6; }
#crc-settings-menu .crc-settings-section-title { font-size: 19px; margin-top: 20px; }
#crc-alias-list .crc-alias-entity summary { font-size: 17px; padding: 12px; }
#crc-alias-list .crc-alias-variation { font-size: 16px; padding: 9px 12px; }
#crc-alias-new-btn, #crc-alias-reset, #crc-settings-close { font-size: 17px; }
#crc-opacity-row { display: flex; align-items: center; gap: 16px; margin: 12px 0; }
#crc-panel-opacity { flex: 1; width: 100%; accent-color: #3982e4; cursor: pointer; }
#crc-panel-opacity-value { min-width: 54px; font-size: 18px; font-weight: 800; text-align: right; }
#crc-alias-feedback, .crc-alias-card label, .crc-alias-card button { font-size: 16px; }
#crc-negative-panel.crc-minimized #crc-top-bar { min-height: 58px; }

@media (max-width: 600px) {

    #crc-negative-panel {
        width: calc(100vw - 20px);
        max-width: calc(100vw - 20px);
        height: 90vh;
        max-height: 90vh;

        top: 10px;
        right: 10px;
    }


    #crc-negative-panel.crc-minimized {
        width: min(300px, calc(100vw - 20px));
        height: auto;
        max-height: none;
    }
    #crc-scan-btn {
        right: 12px;
        bottom: 12px;

        padding: 0 16px;
    }
}

`;

    // ========================================
    // HTML TEMPLATE
    // ========================================


    // Full-page preview lives in a separate about:blank tab, never in storage
    // or a third-party site. Its report values are added as text DOM nodes.
    const CRC_FULL_PREVIEW_CSS = `
body { margin:0; background:#14171b; color:#e4e6eb; }
*, *::before, *::after { box-sizing:border-box; }
#crc-negative-panel.crc-preview-page {
    position:static; inset:auto; width:100%; max-width:none;
    min-height:100vh; height:auto; max-height:none; margin:0; padding:0;
    border:0; border-radius:0; box-shadow:none; overflow:visible;
    display:block; background:#14171b; color:#e4e6eb;
}
.crc-preview-layout { max-width:1160px; margin:0 auto; padding:28px clamp(14px,4vw,42px) 75px; }
.crc-preview-header { display:flex; align-items:center; justify-content:space-between; gap:18px;
    flex-wrap:wrap; padding:10px 0 20px; }
.crc-preview-header h1 { margin:0; color:#fff; font-size:28px; line-height:1.25; }
.crc-preview-kicker { font-size:12px; color:#91b9f0; font-weight:800; letter-spacing:.08em; margin-bottom:7px; }
.crc-preview-meta { color:#b0b8c3; font-size:13px; margin-top:7px; line-height:1.4; }
.crc-preview-actions { display:flex; gap:10px; align-items:center; }
.crc-preview-copy { padding:12px 18px; min-height:44px; border:1px solid #347fe9;
    border-radius:9px; background:#2374e1; color:#fff; font-size:14px; font-weight:750; cursor:pointer; }
.crc-preview-copy:hover { background:#3982e4; }
.crc-preview-copy:focus-visible, .crc-preview-tab:focus-visible { outline:2px solid #9bc4ff; outline-offset:2px; }
.crc-preview-nav { display:flex; align-items:center; gap:6px; padding:8px; border:1px solid #3c434d;
    background:#22262b; border-radius:12px; margin:0 0 22px; flex-wrap:wrap; }
.crc-preview-tab { border:0; border-radius:8px; padding:11px 17px;
    background:transparent; color:#b0bac8; cursor:pointer; font-size:14px; font-weight:750; }
.crc-preview-tab.active { color:#fff; background:#384656; }
.crc-preview-view[hidden], .crc-preview-pane[hidden] { display:none !important; }
.crc-preview-view { min-height:55vh; }
.crc-preview-subnav { display:flex; align-items:center; gap:7px; flex-wrap:wrap;
    padding:0 0 14px; margin:0 0 10px; border-bottom:1px solid #38404a; }
.crc-preview-subnav .crc-preview-tab { padding:9px 13px; font-size:13px; }
.crc-preview-intro { color:#bac3cd; font-size:13px; line-height:1.5; margin:3px 0 18px; }
.crc-preview-page #crc-results { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px;
    padding:4px 0 10px; background:transparent; }
.crc-preview-page #crc-results > div { margin:0; padding:19px 20px; }
.crc-preview-page #crc-dispute-results { display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr));
    gap:14px; padding:4px 0 10px; }
.crc-preview-page .crc-dispute-card { margin:0; padding:18px 20px; }
.crc-preview-page .crc-dispute-value { font-size:15px; }
.crc-preview-page #crc-inquiries { width:100%; padding:5px 0 24px; background:transparent; }
.crc-preview-page .crc-inquiry-section { margin-bottom:16px; }
.crc-preview-page .crc-inquiry-items { padding:4px 8px 8px; }
.crc-preview-page .crc-open-accounts-view { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr));
    gap:12px; }
.crc-preview-page .crc-open-account { margin:0; }
.crc-preview-page .crc-personal-section { padding:0 0 18px; }
.crc-preview-page .crc-personal-heading { padding-left:0; margin-bottom:10px; }
.crc-preview-page .crc-inquiry-bureau { cursor:pointer; }
.crc-preview-page .crc-inquiry-bureau:focus-visible { outline:2px solid #8bb7fa; outline-offset:2px; }
.crc-preview-footer { border-top:1px solid #343a41; color:#9ea9b6; padding:20px 0 0;
    margin-top:25px; font-size:12px; line-height:1.5; }
@media(max-width:660px) {
    .crc-preview-header h1 { font-size:23px; }
    .crc-preview-page #crc-results, .crc-preview-page #crc-dispute-results,
    .crc-preview-page .crc-open-accounts-view { display:block; }
    .crc-preview-page #crc-results > div, .crc-preview-page .crc-dispute-card,
    .crc-preview-page .crc-open-account { margin-bottom:12px; }
    .crc-preview-tab { padding:10px 12px; font-size:12px; }
}

/* Full-page workspace: view toolbar, data table, settings drawer. */
.crc-preview-toolbar {
    display:flex; align-items:center; justify-content:space-between; gap:12px;
    flex-wrap:wrap; margin:0 0 16px;
}
.crc-preview-layout-control { display:inline-flex; gap:3px; padding:4px;
    background:#252a30; border:1px solid #464e59; border-radius:11px; }
.crc-preview-layout-btn { border:0; border-radius:7px; background:transparent;
    color:#abb8c6; font-size:13px; font-weight:750; cursor:pointer;
    padding:9px 14px; }
.crc-preview-layout-btn.active { color:#fff; background:#40536c; }
.crc-preview-layout-btn:focus-visible, .crc-preview-settings-btn:focus-visible,
.crc-preview-dialog button:focus-visible, .crc-preview-dialog input:focus-visible,
.crc-preview-dialog select:focus-visible { outline:2px solid #9ac3ff; outline-offset:2px; }
.crc-preview-search { flex:1; max-width:300px; min-width:155px; min-height:40px;
    border:1px solid #515b66; border-radius:8px; background:#252a30; color:#fff;
    padding:9px 12px; font:inherit; font-size:13px; }
.crc-preview-settings-btn { padding:11px 15px; border:1px solid #596575;
    border-radius:9px; background:#2d3540; color:#e8eef6; font-weight:700;
    font-size:14px; cursor:pointer; }
.crc-preview-settings-btn:hover { background:#3b4858; }
.crc-preview-table-wrap { max-width:100%; overflow:auto; background:#22262b;
    border:1px solid #3c444e; border-radius:11px; margin:4px 0 15px; }
.crc-preview-table { width:100%; border-collapse:collapse; text-align:left; font-size:14px; }
.crc-preview-table th { position:sticky; top:0; z-index:1; background:#303741;
    color:#d8e1ec; font-weight:750; font-size:12px; letter-spacing:.02em; }
.crc-preview-table th, .crc-preview-table td {
    border-bottom:1px solid #3c454f; padding:13px 15px;
    vertical-align:top; white-space:pre-line; overflow-wrap:anywhere;
}
.crc-preview-table tbody tr:hover { background:#303841; }
.crc-preview-table tbody tr:last-child td { border-bottom:0; }
.crc-preview-table td:first-child { color:#f3f6fa; font-weight:700; min-width:165px; }
.crc-preview-table td { font-variant-numeric:tabular-nums; }
.crc-preview-empty { padding:26px; color:#b3c0cf; text-align:center; font-size:14px; }
.crc-preview-page[data-crc-layout="grid"] #crc-results {
    display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:14px;
}
.crc-preview-page[data-crc-layout="grid"] #crc-dispute-results {
    display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr)); gap:14px;
}
.crc-preview-page[data-crc-layout="grid"] .crc-open-accounts-view {
    display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:12px;
}
.crc-preview-page[data-crc-layout="list"] #crc-results,
.crc-preview-page[data-crc-layout="list"] #crc-dispute-results,
.crc-preview-page[data-crc-layout="list"] .crc-open-accounts-view {
    display:flex; flex-direction:column; gap:8px; padding:2px 0;
}
.crc-preview-page[data-crc-layout="list"] #crc-results > div,
.crc-preview-page[data-crc-layout="list"] .crc-dispute-card,
.crc-preview-page[data-crc-layout="list"] .crc-open-account {
    margin:0; padding:12px 16px; width:100%;
}
.crc-preview-page[data-crc-layout="list"] .crc-inquiry-row,
.crc-preview-page[data-crc-layout="list"] .crc-previous-address-card {
    margin-bottom:4px; padding:9px 12px;
}
.crc-preview-dimmer[hidden], .crc-preview-settings[hidden] { display:none !important; }
.crc-preview-dimmer { position:fixed; inset:0; z-index:100;
    background:rgba(0,0,0,.65); }
.crc-preview-settings { position:fixed; z-index:101; top:0; right:0; height:100dvh;
    width:min(520px,100vw); background:#23272d; border-left:1px solid #4d5765;
    box-shadow:-20px 0 55px rgba(0,0,0,.55); display:flex; flex-direction:column;
    padding:22px; font-size:15px; }
.crc-preview-settings-head { display:flex; gap:12px; justify-content:space-between;
    align-items:center; border-bottom:1px solid #48505b; padding-bottom:15px; }
.crc-preview-settings-head h2 { margin:0; font-size:23px; color:#f0f3f8; }
.crc-preview-settings-close { border:0; background:transparent; color:#ebeff5;
    cursor:pointer; font-size:26px; padding:5px 10px; }
.crc-preview-settings-scroll { min-height:0; overflow:auto; padding:10px 2px 20px; }
.crc-preview-settings-scroll h3 { color:#ddeafa; margin:21px 0 9px; font-size:15px; }
.crc-preview-settings-scroll label { display:block; margin:12px 0 7px;
    color:#d8e0eb; font-size:14px; font-weight:700; }
.crc-preview-settings-scroll input[type="checkbox"] { margin:0 8px 0 0; accent-color:#3982e4; }
.crc-preview-settings-scroll .crc-preview-check { display:flex; align-items:center; gap:4px;
    font-weight:500; line-height:1.5; }
.crc-preview-settings-scroll select,.crc-preview-settings-scroll input[type="date"],
.crc-preview-settings-scroll input[type="search"], .crc-preview-settings-scroll input[type="text"] {
    width:100%; min-height:42px; background:#181c22; border:1px solid #69727e;
    border-radius:8px; padding:9px 12px; color:#f3f6fa; font-size:14px; color-scheme:dark;
}
.crc-preview-settings-scroll input[type="range"] { width:100%; accent-color:#3982e4; }
.crc-preview-setting-note { font-size:12px; line-height:1.5; color:#a7b5c6; margin:8px 0; }
.crc-preview-setting-actions { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.crc-preview-setting-actions button { background:#365275; color:#fff; border:1px solid #5676a1;
    border-radius:8px; padding:9px 13px; cursor:pointer; font-size:13px; font-weight:700; }
.crc-preview-setting-actions button.secondary { background:#353b44; border-color:#56616d; }
.crc-preview-alias-groups { max-height:230px; overflow:auto; border:1px solid #4c555f;
    border-radius:8px; padding:6px; margin-top:9px; }
.crc-preview-alias-groups details { padding:8px; border-bottom:1px solid #424b55; }
.crc-preview-alias-groups summary { cursor:pointer; font-weight:700; }
.crc-preview-alias-groups button { background:transparent; border:0; color:#bdd4ef;
    padding:5px 7px; cursor:pointer; }
.crc-preview-table details { min-width:130px; }
.crc-preview-table details summary { color:#a9c7ec; cursor:pointer; }
@media (max-width:720px) {
    .crc-preview-toolbar { flex-direction:column; align-items:stretch; }
    .crc-preview-layout-control { justify-content:center; }
    .crc-preview-search { max-width:none; width:100%; }
    .crc-preview-settings { padding:17px; }
}

`;

    const HTML_TEMPLATE = `
        <!-- TOP BAR -->
        <div id="crc-top-bar">
            <button id="crc-settings-btn" type="button" title="Settings" aria-label="Settings" aria-haspopup="dialog" aria-expanded="false" aria-controls="crc-settings-menu">⚙</button>
            <div id="crc-drag-handle" aria-hidden="true" title="Drag to move the extractor">DRAG TO MOVE</div>
            <div id="crc-window-controls">
                <button id="crc-open-preview-btn" type="button" class="crc-window-btn" title="Open report preview in a new tab" aria-label="Open full-page report preview">↗</button>
                <button id="crc-minimize-btn" class="crc-window-btn" title="Minimize">−</button>
            </div>
        </div>

            <div id="crc-settings-backdrop" hidden></div>
            <div id="crc-settings-menu" role="dialog" aria-modal="true" aria-label="Scanner settings" hidden>
                <div class="crc-settings-heading-row">
                    <div class="crc-settings-heading">Scanner Settings</div>
                    <button type="button" id="crc-settings-close" aria-label="Close settings">✕</button>
                </div>
                <div id="crc-settings-tabs" role="tablist" aria-label="Settings sections">
                    <button type="button" id="crc-settings-tab-general" class="active" role="tab" aria-selected="true">General</button>
                    <button type="button" id="crc-settings-tab-aliases" role="tab" aria-selected="false">Creditor Aliases</button>
                </div>
                <div id="crc-settings-content">
                <div id="crc-settings-general" role="tabpanel">
                <label for="crc-display-mode">List Display Format</label>
                <select id="crc-display-mode">
                    <option value="modern">Modern — Uppercase + (EXP/EQU/TU)</option>
                    <option value="legacy">Legacy Display — Original grouped lists</option>
                </select>
                <div class="crc-settings-note">List format applies to Inquiries, New Inquiries and Personal Info.</div>
                <div class="crc-settings-section-title">Negative account data priority</div>
                <label for="crc-bureau-priority">Preferred credit bureau</label>
                <select id="crc-bureau-priority">
                    <option value="equifax">Equifax first</option>
                    <option value="experian">Experian first</option>
                    <option value="transunion">TransUnion first</option>
                </select>
                <div class="crc-settings-note">Controls which bureau supplies account numbers, balances and other single-value fields in the regular Negative view. Other bureaus are used if the preferred bureau has no value. Disputed Mode always shows all reported bureaus, regardless of this setting.</div>
                <div class="crc-settings-section-title">Extractor appearance</div>
                <label for="crc-panel-opacity">Extractor opacity</label>
                <div id="crc-opacity-row">
                    <input type="range" id="crc-panel-opacity" min="60" max="100" step="1" value="100" aria-label="Extractor opacity">
                    <output id="crc-panel-opacity-value" for="crc-panel-opacity">100%</output>
                </div>
                <div class="crc-settings-note">Set how transparent the extractor appears, from 60% to 100% in 1% increments. Applies to expanded and minimized views and is saved on this device.</div>

                <div class="crc-settings-section-title">Inquiry copy settings</div>
                <label class="crc-settings-checkbox" for="crc-copy-connected-inquiries">
                    <input type="checkbox" id="crc-copy-connected-inquiries">
                    <span>Include inquiries connected to open accounts when copying INQUIRIES</span>
                </label>
                <label class="crc-settings-checkbox" for="crc-copy-connected-new">
                    <input type="checkbox" id="crc-copy-connected-new">
                    <span>Include inquiries connected to open accounts when copying NEW</span>
                </label>
                <div class="crc-settings-section-title">Open Accounts</div>
                <label class="crc-settings-checkbox" for="crc-open-names-only">
                    <input type="checkbox" id="crc-open-names-only">
                    <span>Show and copy creditor names only</span>
                </label>
                <div class="crc-settings-note">Preferences are saved on this device. Open Accounts still includes every extracted account.</div>
                </div>
                <div id="crc-settings-aliases" role="tabpanel" hidden>
                    <div class="crc-settings-note">Search and expand creditors. Right-click a name variation to remove it. Right-click an inquiry or open account to assign its name. Add a new creditor when none match.</div>
                    <input type="search" id="crc-alias-search" placeholder="Search creditor names" aria-label="Search creditor names">
                    <button type="button" id="crc-alias-new-btn">+ Add Creditor</button>
                    <div id="crc-alias-list" aria-label="Creditor alias manager"></div>
                    <button type="button" id="crc-alias-reset">Restore default aliases</button>
                </div>
                </div>
            </div>
        <div class="crc-alias-overlay" id="crc-alias-overlay" role="dialog" aria-modal="true" aria-label="Assign inquiry creditor" hidden>
            <div class="crc-alias-card">
                <h3 id="crc-alias-dialog-title">Assign Creditor Name</h3>
                <div id="crc-alias-name"></div>
                <label for="crc-alias-target">Assign to creditor</label>
                <select id="crc-alias-target"></select>
                <div id="crc-alias-new-row" hidden>
                    <label for="crc-alias-new-name">New creditor's proper name</label>
                    <input id="crc-alias-new-name" type="text" maxlength="100" placeholder="e.g. Regional Community Bank">
                </div>
                <div id="crc-alias-feedback" class="crc-settings-note">Select the correct creditor. This alias will apply across reports in this browser.</div>
                <div class="crc-alias-actions">
                    <button type="button" id="crc-alias-cancel">Cancel</button>
                    <button type="button" id="crc-alias-save" class="crc-alias-primary">Add alias</button>
                </div>
            </div>
        </div>
        <!-- HEADER DIVIDER -->
        <div id="crc-header-divider"></div>

<!-- STATISTICS -->
<div class="crc-stat-row-wrapper">

    <div class="crc-stat-row">
        <label>Negative Accounts</label>
        <b data-negative-count>0</b>
    </div>

    <div class="crc-stat-row">
        <label>Negative Items</label>
        <b data-negative-items-count>0</b>
    </div>

    <div class="crc-stat-row">
        <label>Bankruptcies</label>
        <b data-bankruptcy-count>0</b>
    </div>

</div>

        <!-- PAGE TABS -->
        <div id="crc-page-tabs">
            <button id="crc-page-1-btn" class="crc-page-btn active">NEGATIVE</button>
            <button id="crc-page-2-btn" class="crc-page-btn">INQUIRIES</button>
            <button id="crc-page-3-btn" class="crc-page-btn" type="button">PERSONAL INFO</button>
        </div>

        <!-- PAGE CONTENT -->
        <div id="crc-page-content">
            <div id="crc-page-1" class="crc-page">
                <div id="crc-negative-modes" class="crc-negative-modes" role="tablist" aria-label="Negative account modes">
                    <button type="button" id="crc-negative-mode-standard" class="active" role="tab" aria-selected="true">ALL ACCOUNTS</button>
                    <button type="button" id="crc-negative-mode-disputed" role="tab" aria-selected="false">DISPUTED MODE</button>
                </div>
                <div id="crc-negative-standard-view">
                    <div id="crc-results"></div>
                </div>
                <div id="crc-negative-disputed-view" hidden>
                    <div class="crc-dispute-tabs" role="tablist" aria-label="Disputed account categories">
                        <button type="button" class="active" data-crc-dispute-category="delete" role="tab" aria-selected="true">DELETE <span data-crc-count="delete">0</span></button>
                        <button type="button" data-crc-dispute-category="updated" role="tab" aria-selected="false">UPDATED <span data-crc-count="updated">0</span></button>
                        <button type="button" data-crc-dispute-category="bankruptcy" role="tab" aria-selected="false">BANKRUPTCY <span data-crc-count="bankruptcy">0</span></button>
                    </div>
                    <p class="crc-dispute-help">All bureau values are shown. Matching values share bureau labels. Select a card's details to see the rest of its reported fields.</p>
                    <div id="crc-dispute-results"></div>
                </div>
            </div>

        <div id="crc-page-2" class="crc-page">
    <div id="crc-inquiries"></div>
    <div id="crc-inquiry-copy-note">Only unconnected inquiries are copied.<br>Always double-check the report before disputing.</div>
</div>
        <div id="crc-page-3" class="crc-page">
            <div class="crc-personal-section"><h3 class="crc-personal-heading">PREVIOUS ADDRESSES</h3><div id="crc-previous-addresses"></div></div>
            <div class="crc-personal-section"><h3 class="crc-personal-heading">EMPLOYERS</h3><div id="crc-employers"></div></div>
        </div>
        </div>

        <!-- COPY BUTTONS (STICKY FOOTER) -->
        <div id="crc-copy-wrapper">
            <button id="crc-copy-page-1" class="crc-page-copy active">COPY NEGATIVE ACCOUNTS</button>
            <button id="crc-copy-page-2" class="crc-page-copy">COPY UNCONNECTED INQUIRIES</button>
            <button id="crc-copy-page-3" class="crc-page-copy" type="button">COPY PERSONAL INFO</button>
        </div>
    `;

    // ========================================
    // JAVASCRIPT FUNCTIONS
    // ========================================

    function isKnownCollectionAgency(name) {
        const creditor = normalizeAccountName(name);
        if (!creditor) return false;
        // Only whole-name or whole-word boundary matches; a short fragment
        // of a real collection agency's name is not enough.
        return COLLECTION_AGENCIES.some(nameInRegistry => {
            const agency = normalizeAccountName(nameInRegistry);
            return !!agency && (creditor === agency ||
                creditor.startsWith(agency + ' ') ||
                creditor.endsWith(' ' + agency));
        });
    }

    // ========================================
    // NAME NORMALIZATION / MATCHING
    // Used to connect an inquiry's creditor name
    // to an open account's name even when the two
    // strings aren't formatted identically.
    // ========================================

    function normalizeAccountName(name) {
        return (name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function namesMatch(a, b) {
        if (!a || !b) return false;
        return (a === b || a.includes(b) || b.includes(a));
    }

    // ========================================
    // INQUIRY -> OPEN ACCOUNT CONNECTION
    //
    // An inquiry is connected ONLY if:
    //   1. Creditor name matches an open account name
    //   2. AND that account is reported OPEN specifically
    //      on the SAME bureau as the inquiry.
    //
    // openAccountsByBureau: {
    //   experian:   [{account, ...}],
    //   equifax:    [{account, ...}],
    //   transunion: [{account, ...}]
    // }
    // ========================================


    // Bundled snapshot of creditor-aliases.json. Update both together.
    // Retail card programs, auto loans and card issuers are separate entries.
    const CREDITOR_ALIAS_GROUPS = [{"id":"capital_one","aliases":["CAP1","CAP ONE","CAPONE","CAPITAL ONE","CAPITALONE","CAP ONE NA","CAPITAL ONE NA","CAP ONE BANK","CAPITAL ONE BANK","CAPITAL ONE BANK USA","CAPITAL ONE BANK USA NA","CAP ONE CARD","CAP1 CARD","COBNA","CONA"]},{"id":"capital_one_auto","aliases":["CAP1AUTO","CAP1 AUTO","CAPONEAUTO","CAPONE AUTO","CAP ONE AUTO","CAP ONE AUTO FINANCE","CAPITAL ONE AUTO","CAPITAL ONE AUTO FINANCE","COAF"]},{"id":"jpmorgan_chase","aliases":["JPMCB","JPMCB CARD","CHASE","CHASE BANK","CHASE CREDIT CARD","JP MORGAN CHASE","JP MORGAN CHASE BANK","JPMORGAN CHASE","JPMORGAN CHASE BANK","JPMORGAN CHASE BANK NA"]},{"id":"chase_auto","aliases":["CHASE AUTO","CHASE AUTO FINANCE","CHASE AUTO FINANCING","JPMORGAN CHASE AUTO"]},{"id":"citibank","aliases":["CBNA","CITI","CITI CARDS","CITI CARDS CBNA","CITICARDS","CITICARDS CBNA","CITI BANK","CITIBANK","CITIBANK NA","CITIBANK USA"]},{"id":"wells_fargo","aliases":["WFBNA","WELLS FARGO","WELLS FARGO BANK","WELLS FARGO BANK NA","WELLS FARGO BANK NATIONAL ASSOCIATION","WFBNA CARD"]},{"id":"wells_fargo_auto","aliases":["WELLS FARGO AUTO","WELLS FARGO AUTO LOAN","WELLS FARGO DEALER SERVICES","WFBNA AUTO"]},{"id":"bank_of_america","aliases":["BANK OF AMERICA","BANKAMERICA","BK OF AMER","BK OF AMERICA","B OF A","BOFA","BANK OF AMER","BANK OF AMERICA NA"]},{"id":"american_express","aliases":["AMEX","AMERICAN EXPRESS","AMERICAN EXPRESS BANK","AMERICAN EXPRESS NATIONAL BANK","AMEX BANK","AMERICAN EXPRESS CARD"]},{"id":"discover","aliases":["DISCOVER","DISCOVER BANK","DISCOVER FINANCIAL","DISCOVER FINANCIAL SER","DISCOVER FINANCIAL SERVICES","DISCOVER CARD"]},{"id":"credit_one","aliases":["CREDIT ONE","CREDIT ONE BANK","CREDIT ONE BANK NA","CREDITONE","CRDONEBNK","CREDITONEBNK"]},{"id":"synchrony","aliases":["SYNCB","SYNCHRONY","SYNCHRONY BANK","SYNCHRONY FINANCIAL","SYF"]},{"id":"comenity_bank","aliases":["COMENITY","COMENITY BANK","COMENITYBK","WORLD FINANCIAL NETWORK BANK","WFNB"]},{"id":"comenity_capital_bank","aliases":["COMENITY CAPITAL BANK","COMENITYCB","COMENITY CAP BANK","WORLD FINANCIAL CAPITAL BANK","WFCB"]},{"id":"barclays","aliases":["BARCLAYS","BARCLAYS BANK","BARCLAYS BANK DELAWARE","BARCLAYS BANK DE","BARCLAYS US"]},{"id":"td_bank","aliases":["TD BANK","TD BANK USA","TD BANK USA NA","TD BANK NA"]},{"id":"us_bank","aliases":["US BANK","U S BANK","USBANK","US BANK NA","US BANK NATIONAL ASSOCIATION"]},{"id":"pnc","aliases":["PNC","PNC BANK","PNC BANK NA","PNC BANK NATIONAL ASSOCIATION"]},{"id":"fnbo","aliases":["FNBO","FIRST NATIONAL BANK OF OMAHA","FIRST NATIONAL BANK OMAHA","FIRST NATL BANK OMAHA"]},{"id":"navy_federal","aliases":["NFCU","NAVY FEDERAL","NAVY FEDERAL CREDIT UNION","NAVY FED CU"]},{"id":"penfed","aliases":["PENFED","PEN FED","PENFED CREDIT UNION","PENTAGON FEDERAL CREDIT UNION"]},{"id":"ally_auto","aliases":["ALLY FINANCIAL","ALLY FINANCIAL INC","ALLY AUTO","ALLY AUTO FINANCE","ALLY FINANCIAL AUTO"]},{"id":"santander_consumer","aliases":["SANTANDER CONSUMER","SANTANDER CONSUMER USA","SANTANDER CONSUMER USA INC","SANTANDER AUTO","SCUSA"]},{"id":"toyota_finance","aliases":["TOYOTA FINANCIAL","TOYOTA FINANCIAL SERVICES","TOYOTA MOTOR CREDIT","TOYOTA MOTOR CREDIT CORPORATION","TMCC"]},{"id":"honda_finance","aliases":["HONDA FINANCE","HONDA FINANCIAL","HONDA FINANCIAL SERVICES","AMERICAN HONDA FINANCE","AHFC"]},{"id":"acura_finance","aliases":["ACURA FINANCE","ACURA FINANCIAL","ACURA FINANCIAL SERVICES","ACURA FINANCIAL SERVICES AHFC"]},{"id":"nissan_finance","aliases":["NMAC","NISSAN MOTOR ACCEPTANCE","NISSAN MOTOR ACCEPTANCE CORPORATION","NISSAN MOTOR ACCEPTANCE CORP","NISSAN FINANCIAL SERVICES"]},{"id":"ford_credit","aliases":["FORD MOTOR CREDIT","FORD MOTOR CREDIT COMPANY","FORD CREDIT","FMCC","FORD MOTOR CREDIT CO"]},{"id":"gm_financial","aliases":["GM FINANCIAL","GMF","GENERAL MOTORS FINANCIAL","GENERAL MOTORS FINANCIAL COMPANY"]},{"id":"kia_finance","aliases":["KIA FINANCE","KIA MOTORS FINANCE","KIA FINANCE AMERICA","KIA MOTOR FINANCE","KMF"]},{"id":"hyundai_finance","aliases":["HYUNDAI MOTOR FINANCE","HYUNDAI CAPITAL AMERICA","HYUNDAI FINANCE","HMF"]},{"id":"carmax_auto_finance","aliases":["CARMAX AUTO FINANCE","CARMAX FINANCE","CAR MAX AUTO FINANCE"]},{"id":"bridgecrest","aliases":["BRIDGECREST","BRIDGECREST CREDIT","BRIDGECREST FINANCIAL"]},{"id":"synchrony_amazon_store","aliases":["SYNCB/AMAZON","SYNCB AMAZON","SYNCB AMAZON PLCC","SYNCB/AMAZON PLCC","SYNCHRONY AMAZON STORE CARD","AMAZON STORE CARD","AMAZON PRIME STORE CARD"]},{"id":"synchrony_lowes","aliases":["SYNCB/LOWES","SYNCB/LOW","SYNCB LOWES","LOWES/SYNCB","LOWES ADVANTAGE CARD"]},{"id":"synchrony_paypal_credit","aliases":["SYNCB/PPC","SYNCB PPC","SYNCB PAYPAL CREDIT","SYNCHRONY PAYPAL CREDIT","PAYPAL CREDIT","BILL ME LATER"]},{"id":"synchrony_carecredit","aliases":["SYNCB/CARECREDIT","SYNCB/CARE CREDIT","SYNCB/CARECR","SYNCB CARECREDIT","CARECREDIT","CARE CREDIT"]},{"id":"synchrony_jcpenney","aliases":["SYNCB/JCP","SYNCB JCP","JCPENNEY/SYNCB","JC PENNEY CREDIT CARD","JCPENNEY CARD"]},{"id":"synchrony_verizon","aliases":["SYNCB/VERIZON","SYNCB/VERIZO","SYNCB VERIZON","VERIZON VISA CARD"]},{"id":"capital_one_kohls","aliases":["KOHLS/CAPONE","KOHLS/CAP1","KOHLS CAPONE","KOHL S CAPITAL ONE","KOHLS CREDIT CARD","KOHLS REWARDS VISA"]},{"id":"citi_best_buy","aliases":["BBY/CBNA","BEST BUY/CBNA","BESTBUY/CBNA","MY BEST BUY CREDIT CARD","BEST BUY CREDIT CARD"]},{"id":"citi_home_depot","aliases":["THD/CBNA","HOME DEPOT/CBNA","HOME DEPOT CONSUMER CREDIT CARD","CITIBANK HOME DEPOT","HOME DEPOT CREDIT CARD"]},{"id":"citi_macys","aliases":["MACYS/CBNA","MACYS CBNA","MACYS CREDIT CARD","MACY S CREDIT CARD","CITIBANK MACYS"]},{"id":"citi_costco","aliases":["COSTCO/CITI","COSTCO CBNA","COSTCO ANYWHERE VISA","COSTCO ANYWHERE VISA CARD BY CITI"]}];
    function normalizeCreditorLabel(name) {
        return String(name || '')
            .toUpperCase()
            .replace(/&/g, ' AND ')
            .replace(/[^A-Z0-9]+/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean)
            .join(' ');
    }
    function stripCreditorLegalSuffix(name) {
        let result = name;
        while (true) {
            // Only legal suffixes are ignored, not BANK, AUTO or store names.
            const shorter = result.replace(/ (?:N A|NA|LLC|INC|CORP|CORPORATION|LTD)$/, '');
            if (!shorter || shorter === result) return result;
            result = shorter;
        }
    }

    const CREDITOR_DISPLAY_NAMES = {"capital_one":"Capital One","capital_one_auto":"Capital One Auto Finance","jpmorgan_chase":"JPMorgan Chase","chase_auto":"Chase Auto","citibank":"Citibank","wells_fargo":"Wells Fargo Bank","wells_fargo_auto":"Wells Fargo Auto","bank_of_america":"Bank of America","american_express":"American Express","discover":"Discover","credit_one":"Credit One Bank","synchrony":"Synchrony Bank","comenity_bank":"Comenity Bank","comenity_capital_bank":"Comenity Capital Bank","barclays":"Barclays Bank","td_bank":"TD Bank","us_bank":"U.S. Bank","pnc":"PNC Bank","fnbo":"First National Bank of Omaha","navy_federal":"Navy Federal Credit Union","penfed":"Pentagon Federal Credit Union","ally_auto":"Ally Auto Finance","santander_consumer":"Santander Consumer USA","toyota_finance":"Toyota Financial Services","honda_finance":"Honda Financial Services","acura_finance":"Acura Financial Services","nissan_finance":"Nissan Motor Acceptance","ford_credit":"Ford Motor Credit","gm_financial":"GM Financial","kia_finance":"Kia Finance","hyundai_finance":"Hyundai Motor Finance","carmax_auto_finance":"CarMax Auto Finance","bridgecrest":"Bridgecrest","synchrony_amazon_store":"Amazon Store Card / Synchrony","synchrony_lowes":"Lowe's / Synchrony","synchrony_paypal_credit":"PayPal Credit / Synchrony","synchrony_carecredit":"CareCredit / Synchrony","synchrony_jcpenney":"JCPenney / Synchrony","synchrony_verizon":"Verizon Card / Synchrony","capital_one_kohls":"Kohl's Card / Capital One","citi_best_buy":"Best Buy Card / Citi","citi_home_depot":"Home Depot Card / Citi","citi_macys":"Macy's Card / Citi","citi_costco":"Costco Anywhere Visa / Citi"};
    const CRC_ALIAS_KEY = 'tubol-crc-alias-overrides-v1';
    const CREDITOR_ALIAS_INDEX = new Map();
    const CREDITOR_BASE_INDEX = new Map();
    const CREDITOR_DISABLED = new Set();
    const CREDITOR_CUSTOM = new Map();
    const CREDITOR_USER_GROUPS = [];

    function creditorAliasKey(value) {
        return normalizeCreditorLabel(value);
    }
    function loadCreditorOverrides() {
        if (typeof localStorage === 'undefined') return;
        try {
            const json = localStorage.getItem(CRC_ALIAS_KEY);
            if (!json) return;
            const stored = JSON.parse(json);
            if (stored.version !== 1) return;
            // Preserve compatibility with v4.0 saved aliases. Custom groups
            // were added in v4.1, within the existing version-1 schema.
            (Array.isArray(stored.groups) ? stored.groups : []).slice(0, 200).forEach(item => {
                if (!item || typeof item.id !== 'string' || typeof item.name !== 'string') return;
                const name = item.name.trim();
                const id = item.id;
                const key = creditorAliasKey(name);
                if (!/^user-[a-z0-9-]+$/.test(id) || name.length < 2 || name.length > 100 || !key) return;
                if (CREDITOR_DISPLAY_NAMES[id] ||
                    Object.values(CREDITOR_DISPLAY_NAMES).some(other => creditorAliasKey(other) === key)) return;
                const group = { id, aliases: [name] };
                CREDITOR_USER_GROUPS.push(group);
                CREDITOR_ALIAS_GROUPS.push(group);
                CREDITOR_DISPLAY_NAMES[id] = name;
            });
            (Array.isArray(stored.disabled) ? stored.disabled : []).slice(0, 1000).forEach(value => {
                if (typeof value === 'string' && value.length <= 100 && creditorAliasKey(value)) {
                    CREDITOR_DISABLED.add(creditorAliasKey(value));
                }
            });
            (Array.isArray(stored.custom) ? stored.custom : []).slice(0, 500).forEach(item => {
                if (!item || typeof item.alias !== 'string' || !CREDITOR_DISPLAY_NAMES[item.groupId]) return;
                const alias = item.alias.trim();
                const key = creditorAliasKey(alias);
                if (alias.length >= 2 && alias.length <= 100 && key) {
                    CREDITOR_CUSTOM.set(key, { alias, groupId: item.groupId });
                }
            });
        } catch (err) {
            console.warn('Unable to load saved creditor alias settings', err);
        }
    }
    function rebuildCreditorIndex() {
        CREDITOR_ALIAS_INDEX.clear();
        CREDITOR_BASE_INDEX.clear();
        CREDITOR_ALIAS_GROUPS.forEach(group => group.aliases.forEach(value => {
            const raw = creditorAliasKey(value);
            const simplified = stripCreditorLegalSuffix(raw);
            if (!CREDITOR_BASE_INDEX.has(raw)) CREDITOR_BASE_INDEX.set(raw, group.id);
            if (!CREDITOR_BASE_INDEX.has(simplified)) CREDITOR_BASE_INDEX.set(simplified, group.id);
            if (CREDITOR_DISABLED.has(raw)) return;
            if (!CREDITOR_ALIAS_INDEX.has(raw)) CREDITOR_ALIAS_INDEX.set(raw, group.id);
            if (!CREDITOR_ALIAS_INDEX.has(simplified)) CREDITOR_ALIAS_INDEX.set(simplified, group.id);
        }));
        CREDITOR_CUSTOM.forEach((entry, key) => {
            // A user reassignment after disabling the original alias wins.
            if (!CREDITOR_ALIAS_INDEX.has(key) || CREDITOR_DISABLED.has(key)) CREDITOR_ALIAS_INDEX.set(key, entry.groupId);
        });
    }
    function resolveCreditorGroup(value) {
        const raw = creditorAliasKey(value);
        if (!raw) return null;
        if (CREDITOR_CUSTOM.has(raw)) return CREDITOR_CUSTOM.get(raw).groupId;
        if (CREDITOR_DISABLED.has(raw)) return null;
        return CREDITOR_ALIAS_INDEX.get(raw) ||
            CREDITOR_ALIAS_INDEX.get(stripCreditorLegalSuffix(raw)) || null;
    }
    function listCreditorAliases(groupId) {
        const group = CREDITOR_ALIAS_GROUPS.find(item => item.id === groupId);
        if (!group) return [];
        const entries = [];
        group.aliases.forEach(alias => {
            const key = creditorAliasKey(alias);
            if (CREDITOR_DISABLED.has(key)) return;
            const override = CREDITOR_CUSTOM.get(key);
            if (override && override.groupId !== groupId) return;
            entries.push({ alias, custom: false });
        });
        CREDITOR_CUSTOM.forEach((entry, key) => {
            if (entry.groupId === groupId && !entries.some(item => creditorAliasKey(item.alias) === key)) {
                entries.push({ alias: entry.alias, custom: true });
            }
        });
        return entries.sort((a,b) => a.alias.localeCompare(b.alias));
    }
    function commitCreditorOverrideChange(callback) {
        const disabledSnapshot = [...CREDITOR_DISABLED];
        const customSnapshot = [...CREDITOR_CUSTOM];
        const userGroupSnapshot = [...CREDITOR_USER_GROUPS];
        callback();
        try {
            localStorage.setItem(CRC_ALIAS_KEY, JSON.stringify({
                version: 1, disabled: [...CREDITOR_DISABLED], custom: [...CREDITOR_CUSTOM.values()],
                groups: CREDITOR_USER_GROUPS.map(group => ({ id: group.id, name: CREDITOR_DISPLAY_NAMES[group.id] }))
            }));
        } catch (_) {
            CREDITOR_DISABLED.clear();
            disabledSnapshot.forEach(key => CREDITOR_DISABLED.add(key));
            CREDITOR_CUSTOM.clear();
            customSnapshot.forEach(([key, value]) => CREDITOR_CUSTOM.set(key, value));
            // Reset may have already removed all custom groups before a failed save.
            for (let i = CREDITOR_ALIAS_GROUPS.length - 1; i >= 0; i--) {
                if (CREDITOR_ALIAS_GROUPS[i].id.startsWith('user-')) CREDITOR_ALIAS_GROUPS.splice(i, 1);
            }
            Object.keys(CREDITOR_DISPLAY_NAMES).forEach(id => {
                if (id.startsWith('user-')) delete CREDITOR_DISPLAY_NAMES[id];
            });
            CREDITOR_USER_GROUPS.splice(0, CREDITOR_USER_GROUPS.length, ...userGroupSnapshot);
            CREDITOR_ALIAS_GROUPS.push(...userGroupSnapshot);
            userGroupSnapshot.forEach(group => { CREDITOR_DISPLAY_NAMES[group.id] = group.aliases[0]; });
            rebuildCreditorIndex();
            return { ok: false, message: 'Could not save creditor aliases in browser storage.' };
        }
        rebuildCreditorIndex();
        return { ok: true, message: 'Creditor aliases updated.' };
    }
    function addCreditorAlias(value, groupId) {
        const alias = String(value || '').trim();
        const key = creditorAliasKey(alias);
        if (!CREDITOR_DISPLAY_NAMES[groupId]) return { ok:false, message:'Select a creditor.' };
        if (!key || alias.length < 2 || alias.length > 100) return { ok:false, message:'Alias must be 2–100 characters.' };
        const already = resolveCreditorGroup(alias);
        if (already === groupId) return { ok:true, unchanged:true, message:'This variation already belongs to the selected creditor.' };
        if (already && already !== groupId) {
            return { ok:false, message:'Already assigned to ' + CREDITOR_DISPLAY_NAMES[already] + '. Remove it from that creditor first.' };
        }
        return commitCreditorOverrideChange(() => {
            const previousGroup = CREDITOR_BASE_INDEX.get(key);
            if (previousGroup && previousGroup !== groupId) {
                // Keep the old built-in definition disabled while overriding it.
                CREDITOR_DISABLED.add(key);
                CREDITOR_CUSTOM.set(key, { alias, groupId });
            } else {
                CREDITOR_DISABLED.delete(key);
                if (previousGroup === groupId) CREDITOR_CUSTOM.delete(key);
                else CREDITOR_CUSTOM.set(key, { alias, groupId });
            }
        });
    }
    function deleteCreditorAlias(value, groupId) {
        const key = creditorAliasKey(value);
        if (!CREDITOR_DISPLAY_NAMES[groupId]) return { ok:false, message:'Unknown creditor.' };
        if (key === creditorAliasKey(CREDITOR_DISPLAY_NAMES[groupId])) {
            return { ok:false, message:'The main creditor name must remain available.' };
        }
        if (!listCreditorAliases(groupId).some(x => creditorAliasKey(x.alias) === key)) {
            return { ok:false, message:'This variation is not active for that creditor.' };
        }
        const baseAlias = CREDITOR_ALIAS_GROUPS.some(group => group.id === groupId &&
            group.aliases.some(alias => creditorAliasKey(alias) === key));
        return commitCreditorOverrideChange(() => {
            CREDITOR_CUSTOM.delete(key);
            if (baseAlias) CREDITOR_DISABLED.add(key);
        });
    }
    function createCreditorGroup(displayName, observedVariation = '') {
        const name = String(displayName || '').trim();
        const key = creditorAliasKey(name);
        const observed = String(observedVariation || '').trim();
        const observedKey = creditorAliasKey(observed);
        if (name.length < 2 || name.length > 100 || !key)
            return { ok: false, message: 'Creditor name must be 2–100 characters.' };
        if (CREDITOR_USER_GROUPS.length >= 200)
            return { ok: false, message: 'Custom creditor limit reached.' };
        const duplicateName = resolveCreditorGroup(name);
        if (duplicateName || Object.values(CREDITOR_DISPLAY_NAMES).some(label => creditorAliasKey(label) === key))
            return { ok: false, message: 'This creditor already exists. Select the existing creditor.' };
        if (observed && (observed.length < 2 || observed.length > 100 || !observedKey))
            return { ok: false, message: 'Variation must be 2–100 characters.' };
        const observedGroup = observed ? resolveCreditorGroup(observed) : null;
        if (observedGroup)
            return { ok: false, message: 'The selected variation already belongs to ' + CREDITOR_DISPLAY_NAMES[observedGroup] + '.' };
        const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let id = 'user-' + slug, count = 2;
        while (CREDITOR_DISPLAY_NAMES[id]) id = 'user-' + slug + '-' + count++;
        const result = commitCreditorOverrideChange(() => {
            const group = { id, aliases: [name] };
            CREDITOR_USER_GROUPS.push(group);
            CREDITOR_ALIAS_GROUPS.push(group);
            CREDITOR_DISPLAY_NAMES[id] = name;
            if (observed && observedKey !== key) CREDITOR_CUSTOM.set(observedKey, { alias: observed, groupId: id });
        });
        return { ...result, groupId: result.ok ? id : null };
    }
    function deleteUserCreditorGroup(groupId) {
        const index = CREDITOR_USER_GROUPS.findIndex(group => group.id === groupId);
        if (index < 0) return { ok: false, message: 'Built-in creditors cannot be deleted.' };
        return commitCreditorOverrideChange(() => {
            CREDITOR_CUSTOM.forEach((value, key) => { if (value.groupId === groupId) CREDITOR_CUSTOM.delete(key); });
            CREDITOR_DISABLED.delete(creditorAliasKey(CREDITOR_DISPLAY_NAMES[groupId]));
            const group = CREDITOR_USER_GROUPS[index];
            CREDITOR_USER_GROUPS.splice(index, 1);
            CREDITOR_ALIAS_GROUPS.splice(CREDITOR_ALIAS_GROUPS.indexOf(group), 1);
            delete CREDITOR_DISPLAY_NAMES[groupId];
        });
    }
    function resetCreditorAliases() {
        return commitCreditorOverrideChange(() => {
            CREDITOR_DISABLED.clear();
            CREDITOR_CUSTOM.clear();
            CREDITOR_ALIAS_GROUPS.splice(CREDITOR_ALIAS_GROUPS.length - CREDITOR_USER_GROUPS.length, CREDITOR_USER_GROUPS.length);
            CREDITOR_USER_GROUPS.forEach(group => { delete CREDITOR_DISPLAY_NAMES[group.id]; });
            CREDITOR_USER_GROUPS.length = 0;
        });
    }
    loadCreditorOverrides();
    rebuildCreditorIndex();
    function matchCreditorNames(inquiryCreditor, openAccountCreditor) {
        const inquiryName = stripCreditorLegalSuffix(normalizeCreditorLabel(inquiryCreditor));
        const accountName = stripCreditorLegalSuffix(normalizeCreditorLabel(openAccountCreditor));
        if (!inquiryName || !accountName) return false;

        const inquiryGroup = resolveCreditorGroup(inquiryCreditor);
        const accountGroup = resolveCreditorGroup(openAccountCreditor);
        // If either creditor is in the registry, both MUST belong to the
        // same specific group. A parent bank alone cannot match a store card.
        if (inquiryGroup || accountGroup) {
            return Boolean(inquiryGroup && inquiryGroup === accountGroup);
        }

        // For unmapped creditors, exact normalized names remain valid.
        if (inquiryName === accountName) {
            return inquiryName.length >= 5 &&
                !['BANK','CREDIT','FINANCE','FINANCIAL','AUTO','CARD','LENDER'].includes(inquiryName);
        }

        // Allow cautious last-word truncation, e.g. ACURA HIGHLA/HIGHLAND.
        // Do NOT match arbitrary substrings or fuzzy names.
        const inquiryTokens = inquiryName.split(' ');
        const accountTokens = accountName.split(' ');
        if (inquiryTokens.length !== accountTokens.length || inquiryTokens.length < 2) return false;
        for (let i = 0; i < inquiryTokens.length - 1; i++) {
            if (inquiryTokens[i] !== accountTokens[i]) return false;
        }
        const a = inquiryTokens[inquiryTokens.length - 1];
        const b = accountTokens[accountTokens.length - 1];
        const short = a.length <= b.length ? a : b;
        const long = a.length > b.length ? a : b;
        return short.length >= 5 &&
            long.length - short.length <= 4 &&
            long.startsWith(short);
    }

    function isInquiryConnectedToOpenAccount(creditorName, bureauKey, openAccountsByBureau) {
        if (!creditorName || !bureauKey || !openAccountsByBureau) return false;
        const sameBureauOpenAccounts = openAccountsByBureau[bureauKey] || [];
        return sameBureauOpenAccounts.some(acc => matchCreditorNames(creditorName, acc.account));
    }

    // ========================================
    // OPEN ACCOUNT POSITIVE / NEGATIVE MATCHING
    // An "open" account (per bureau status) is
    // treated as negative if it also shows up in
    // the negative accounts list (e.g. a charge-off
    // or collection that still reports as open).
    // ========================================

    function isOpenAccountNegative(accountName, negativeAccounts) {
        const acc = normalizeAccountName(accountName);

        if (!acc) return false;

        return (negativeAccounts || []).some(neg => {
            const negName = normalizeAccountName(neg.account);

            if (!negName) return false;

            return namesMatch(acc, negName);
        });
    }

    // ========================================
    // INQUIRY DATE PARSING / RECENCY FILTER
    // Used to build the "NEW" inquiries subtab
    // (inquiries dated within the last N days).
    // ========================================

    function parseInquiryDate(str) {
        if (!str) return null;

        const parts = str.split(/[\/\-]/);
        if (parts.length !== 3) return null;

        let [month, day, year] = parts.map(p => parseInt(p, 10));
        if (isNaN(month) || isNaN(day) || isNaN(year)) return null;

        if (year < 100) {
            year += (year <= 69 ? 2000 : 1900);
        }

        const d = new Date(year, month - 1, day);
        if (isNaN(d.getTime()) || d.getFullYear() !== year ||
            d.getMonth() !== month - 1 || d.getDate() !== day) return null;

        return d;
    }

    // Exclusive YYYY-MM-DD cutoff. E.g. 2025-01-01 shows dates
    // through December 31, 2024, not January 1, 2025.
    function filterInquiriesBeforeDate(items, beforeDate) {
        if (!beforeDate) return items || [];
        const match = String(beforeDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return items || [];
        const cutoff = new Date(+match[1], +match[2] - 1, +match[3]);
        if (cutoff.getFullYear() !== +match[1] ||
            cutoff.getMonth() !== +match[2] - 1 ||
            cutoff.getDate() !== +match[3]) return items || [];
        cutoff.setHours(0, 0, 0, 0);
        return (items || []).filter(item => {
            const date = parseInquiryDate(item.date);
            if (!date) return false; // no verified date: do not include in dated results
            date.setHours(0, 0, 0, 0);
            return date < cutoff;
        });
    }

    function filterRecentInquiries(inquiryList, days = 35) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - days);

        return (inquiryList || []).filter(item => {
            const d = parseInquiryDate(item.date);
            if (!d) return false;
            d.setHours(0, 0, 0, 0);
            return d >= cutoff && d <= today;
        });
    }

    function expandNegativeDetails() {
        // Limit clicks to buttons inside data grids to avoid unintended clicks
        const grids = document.querySelectorAll('.MuiDataGrid-root');
        grids.forEach(grid => {
            grid.querySelectorAll('div.MuiBox-root').forEach(btn => {
                let text = (btn.textContent || '').trim();
                if (text === 'Show More Details +') {
                    try { btn.click(); } catch (e) { /* ignore click errors */ }
                }
            });
        });
    }

    async function waitForNoMoreShowMore(timeout = 5000, interval = 150) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const found = Array.from(document.querySelectorAll('.MuiDataGrid-root div.MuiBox-root')).some(el => (el.textContent||'').trim() === 'Show More Details +');
            if (!found) return true;
            await new Promise(r => setTimeout(r, interval));
        }
        return false;
    }

    // ========================================
    // EXTRACT OPEN ACCOUNTS
    //
    // Returns:
    //   { list: [...], byBureau: { experian: [...], equifax: [...], transunion: [...] } }
    //
    // `list` preserves the original combined-account shape used by
    // Page 1/2 rendering. `byBureau` is new and used strictly for
    // bureau-specific inquiry connection (per-bureau OPEN status).
    // ========================================

    function extractOpenAccounts() {
        let output = [];
        let byBureau = { experian: [], equifax: [], transunion: [] };

        let grids = document.querySelectorAll(".MuiDataGrid-root");

        grids.forEach(grid => {
            let headers = {};
            grid.querySelectorAll('[role="columnheader"]').forEach(header => {
                let field = header.getAttribute("data-field");
                if (field) headers[field] = true;
            });

            if (!headers.equifax && !headers.transunion && !headers.experian) {
                return;
            }

            let rows = {};
            grid.querySelectorAll(".MuiDataGrid-row").forEach(row => {
                let id = row.getAttribute("data-id");
                if (id) rows[id] = row;
            });

            let accountName = "";
            Object.keys(rows).forEach(id => {
                if (id.includes("Account #")) {
                    let parent = id.replace("summary_", "").split("---")[0];
                    accountName = parent;
                }
            });

            if (!accountName.trim()) {
                return;
            }

            let statusRow = null;
            Object.values(rows).forEach(row => {
                let labelCell = row.querySelector('[data-field="label"]');
                if (!labelCell) return;
                let label = (labelCell.textContent || '').trim().replace(":", "").toLowerCase();
                if (label === "account status") {
                    statusRow = row;
                }
            });

            if (!statusRow) {
                return;
            }

            const bureauInfo = [
                { name: "equifax", code: "EQU" },
                { name: "experian", code: "EX" },
                { name: "transunion", code: "TU" }
            ];

            let openBureaus = [];
            bureauInfo.forEach(bureau => {
                let cell = statusRow.querySelector(`[data-field="${bureau.name}"]`);
                if (!cell) return;
                let status = (cell.textContent || '').trim().toLowerCase();
                if (status === "open") {
                    openBureaus.push(bureau.code);
                    // Per-bureau OPEN registry, used for bureau-specific
                    // inquiry connection matching.
                    if (byBureau[bureau.name]) {
                        byBureau[bureau.name].push({ account: accountName });
                    }
                }
            });

            if (openBureaus.length === 0) {
                return;
            }

            function getValueFromRow(label) {
                let targetRow = null;
                Object.values(rows).forEach(row => {
                    let labelCell = row.querySelector('[data-field="label"]');
                    if (!labelCell) return;
                    let rowLabel = (labelCell.textContent || '').trim().replace(":", "").toLowerCase();
                    if (rowLabel === label.toLowerCase()) {
                        targetRow = row;
                    }
                });

                if (!targetRow) return "";

                for (const bureau of bureauInfo) {
                    if (!openBureaus.includes(bureau.code)) continue;
                    let cell = targetRow.querySelector(`[data-field="${bureau.name}"]`);
                    if (!cell) continue;
                    let value = (cell.textContent || '').trim();
                    if (value && value !== "-" && value !== "--") {
                        return value;
                    }
                }
                return "";
            }

            let accountNumber = getValueFromRow("Account #");
            let balance = "";
            const balanceLabels = ["balance", "balance owed"];
            for (const label of balanceLabels) {
                let value = getValueFromRow(label);
                if (value) {
                    balance = value;
                    break;
                }
            }

            let accountType = "";
            let typeValue = getValueFromRow("Account Type");
            if (typeValue) {
                accountType = typeValue;
            }

            let latePayment = getValueFromRow("Late Payment Status");
            let comments = getValueFromRow("Comments");
            let bureauDisplay = openBureaus.join(" - ");

            output.push({
                account: accountName,
                account_number: accountNumber,
                bureau_display: bureauDisplay,
                balance: balance,
                account_type: accountType,
                late_payment: latePayment,
                comments: comments,
                status: "OPEN"
            });
        });

        return { list: output, byBureau: byBureau };
    }

    // One source of truth for Negative-tab account type. The word "closed"
    // describes an account's status and must never override collection evidence.
    function hasCollectionEvidence(accountTableText) {
        const text = String(accountTableText || '').toLowerCase();
        return /\bcollections?\b/.test(text) ||
            /\bplaced\s+for\s+collection\b/.test(text);
    }

    function classifyNegativeAccountType(creditorName, accountTableText) {
        const text = String(accountTableText || '').toLowerCase().replace(/\s+/g, ' ');

        if (/\b(?:included\s+in\s+bankruptcy|discharged\s+through\s+bankruptcy|chapter\s+\d+)\b/.test(text)) {
            return 'INCLUDED IN BANKRUPTCY';
        }

        // The creditor registry, not the reported OPEN/CLOSED account status,
        // decides whether collection-related data means COLLECTION or CHARGE OFF.
        if (isKnownCollectionAgency(creditorName)) return 'COLLECTION';
        if (hasCollectionEvidence(text)) return 'CHARGE OFF';

        if (/\b(?:charge(?:d)?[ -]?offs?|profit\s+and\s+loss|write[ -]?offs?|loss\s+by\s+credit\s+grantor)\b/.test(text)) {
            return 'CHARGE OFF';
        }
        if (/\b(?:repossess(?:ed|ion)?|involuntary\s+repossession)\b/.test(text)) return 'Repossessed';
        if (/\bforeclosure\b/.test(text)) return 'Foreclosure';
        if (/\btransferred\b/.test(text)) return 'Transferred';
        if (/\bclosed\b/.test(text)) return 'CLOSED LP';
        if (/\bopen\b/.test(text)) return 'OPEN LP';
        if (/\bpaid\b/.test(text)) return 'PAID LP';
        return '';
    }

    // Capture all populated row values for every negatively reporting bureau,
    // regardless of the preferred bureau used by the ordinary Negative view.
    function collectNegativeBureauFields(rows, reportingBureaus) {
        const result = {};
        CRC_BUREAUS.forEach(bureau => {
            // Include every bureau cell from the account's table, including
            // bureaus that do not have a Negative toggle on this record.
            const fields = {};
            Object.values(rows).forEach(row => {
                const labelCell = row.querySelector('[data-field="label"]');
                const label = String(labelCell?.textContent || '').replace(/:\s*$/, '').trim();
                const valueCell = row.querySelector('[data-field="' + bureau.field + '"]');
                const value = String(valueCell?.textContent || '').trim();
                if (!label || !value || value === '-' || value === '--') return;
                const prior = fields[label];
                fields[label] = prior && prior !== value ? prior + ' | ' + value : value;
            });
            result[bureau.code] = fields;
        });
        return result;
    }
    // Combine matching values, retaining all corresponding bureau labels.
    function groupBureauFieldValues(bureauFields, fieldNames, kind = 'text') {
        const groups = new Map();
        for (const bureau of CRC_BUREAUS) {
            const fields = bureauFields?.[bureau.code] || {};
            const entry = Object.entries(fields).find(([label]) =>
                fieldNames.some(name => label.trim().toLowerCase() === name.toLowerCase()));
            if (!entry) continue;
            const value = String(entry[1] || '').trim();
            if (!value || value === '-' || value === '--') continue;
            let key = value.replace(/\s+/g, ' ').toUpperCase();
            if (kind === 'balance' && /^\(?-?\$?\s*[\d,]+(?:\.\d{1,2})?\)?$/.test(value)) {
                const negative = /-/.test(value) || (value.startsWith('(') && value.endsWith(')'));
                const number = Number(value.replace(/[^\d.]/g, ''));
                if (Number.isFinite(number)) key = 'amount:' + (negative ? -number : number).toFixed(2);
            }
            if (!groups.has(key)) groups.set(key, { value, bureaus: [] });
            groups.get(key).bureaus.push(bureau.code);
        }
        return [...groups.values()];
    }
    function pickPriorityBureauValue(bureauFields, names, preferred) {
        for (const bureauName of getBureauPriorityOrder(preferred)) {
            const code = CRC_BUREAUS.find(item => item.field === bureauName)?.code;
            const fields = bureauFields?.[code] || {};
            const entry = Object.entries(fields).find(([label]) =>
                names.some(name => label.trim().toLowerCase() === name.toLowerCase()));
            if (entry && entry[1] && !['-','--'].includes(entry[1])) return entry[1];
        }
        return '';
    }
    function updateNegativePreferredValues(items, preferred) {
        (items || []).forEach(item => {
            if (!item.bureau_fields) return;
            item.account_number = pickPriorityBureauValue(item.bureau_fields,
                ['Account #','Account Number','Account No'],preferred);
            item.balance = pickPriorityBureauValue(item.bureau_fields,['Balance','Balance Owed'],preferred);
            item.late_payment = pickPriorityBureauValue(item.bureau_fields,['Late Payment Status'],preferred);
            item.comments = pickPriorityBureauValue(item.bureau_fields,['Comments'],preferred);
        });
    }
    function formatBureauValueLines(groups) {
        return groups.map(entry => entry.value + '(' + entry.bureaus.join('-') + ')');
    }
    function getDisputeCategory(accountType) {
        const type = String(accountType || '').toUpperCase();
        if (/BANKRUPTCY|CHAPTER/.test(type)) return 'bankruptcy';
        if (/COLLECTION|CHARGE OFF|REPOSSESS|TRANSFERRED|FORECLOSURE/.test(type)) return 'delete';
        // Include OPEN, CLOSED, PAID and unclassified negative items in Updated.
        return 'updated';
    }
    function sortDisputeItems(items) {
        return [...items].sort((a,b) => String(a.account || '').localeCompare(String(b.account || ''),
            undefined, { sensitivity: 'base', numeric: true }));
    }

    function extractData() {
        let output = [];
        let grids = document.querySelectorAll('.MuiDataGrid-root');

        grids.forEach(grid => {
            let headers = {};
            grid.querySelectorAll('[role="columnheader"]').forEach(header => {
                let field = header.getAttribute("data-field");
                if (field) headers[field] = true;
            });

            if (!headers.equifax && !headers.transunion && !headers.experian) {
                return;
            }

            let rows = {};
            grid.querySelectorAll('.MuiDataGrid-row').forEach(row => {
                let id = row.getAttribute("data-id");
                if (id) rows[id] = row;
            });

            let accountName = "";
            Object.keys(rows).forEach(id => {
                if (id.includes("Account #")) {
                    let parent = id.replace("summary_", "").split("---")[0];
                    accountName = parent;
                }
            });

            if (!accountName.trim()) {
                let tableText = (grid.textContent || '').toLowerCase();
                if (!tableText.includes("bankruptcy") &&
                    (tableText.includes("collection") ||
                        tableText.includes("collection/chargeoff") ||
                        tableText.includes("other collection agencies") ||
                        tableText.includes("derogatory"))) {
                    accountName = "Untitled Collection";
                } else {
                    return;
                }
            }

            let bureaus = [];
            let statusInputs = grid.parentElement.querySelectorAll('input[value="Negative"], input[value="Positive"]');
            let bureauNames = ["experian", "equifax", "transunion"];
            let reportingBureaus = [];

            bureauNames.forEach(bureau => {
                let hasData = false;
                Object.values(rows).forEach(row => {
                    let cell = row.querySelector(`[data-field="${bureau}"]`);
                    if (cell && !["", "-", "--"].includes((cell.textContent || '').trim())) {
                        hasData = true;
                    }
                });
                if (hasData) reportingBureaus.push(bureau);
            });

            statusInputs.forEach((input, index) => {
                let bureau = reportingBureaus[index];
                if (input.value === "Negative" && bureau) {
                    bureaus.push(bureau.charAt(0).toUpperCase() + bureau.slice(1));
                }
            });

            if (bureaus.length === 0) return;

            function getRowValue(label, bureau) {
                let row = grid.querySelector(`[data-id*="${label}"]`);
                if (!row) return "";
                let cell = row.querySelector(`[data-field="${bureau}"]`);
                return cell ? (cell.textContent || '').trim() : "";
            }

            function getPriorityRowValue(label) {
                const priority = getBureauPriorityOrder(crcBureauPriority);
                for (const bureau of priority) {
                    let isNegative = bureaus.map(b => b.toLowerCase()).includes(bureau);
                    if (!isNegative) continue;
                    const value = getRowValue(label, bureau);
                    if (value && value !== "-" && value !== "--") {
                        return value;
                    }
                }
                return "";
            }

            function getPriorityValue(label) {
                const priority = getBureauPriorityOrder(crcBureauPriority);
                let rows = grid.querySelectorAll('.MuiDataGrid-row');

                for (const bureau of priority) {
                    if (!bureaus.map(b => b.toLowerCase()).includes(bureau)) continue;
                    for (let row of rows) {
                        let labelCell = row.querySelector('[data-field="label"]');
                        if (!labelCell) continue;
                        let rowLabel = (labelCell.textContent || '').trim().replace(":", "").toLowerCase();
                        if (rowLabel === label.toLowerCase()) {
                            let cell = row.querySelector(`[data-field="${bureau}"]`);
                            if (cell) {
                                let value = (cell.textContent || '').trim();
                                if (value && value !== "-" && value !== "--") {
                                    return value;
                                }
                            }
                        }
                    }
                }
                return "";
            }

            let accountNumber = getPriorityValue("Account #");

            function getBalanceValue() {
                let matchingRows = [];
                grid.querySelectorAll('.MuiDataGrid-row').forEach(row => {
                    let labelCell = row.querySelector('[data-field="label"]');
                    if (!labelCell) return;
                    let label = (labelCell.textContent || '').trim().replace(":", "").toLowerCase();
                    if (label === "balance" || label === "balance owed") {
                        matchingRows.push(row);
                    }
                });

                const priority = getBureauPriorityOrder(crcBureauPriority);
                for (const bureau of priority) {
                    if (!bureaus.map(b => b.toLowerCase()).includes(bureau)) continue;
                    for (let row of matchingRows) {
                        let cell = row.querySelector(`[data-field="${bureau}"]`);
                        if (cell) {
                            let value = (cell.textContent || '').trim();
                            if (value && value !== "-" && value !== "--") {
                                return value;
                            }
                        }
                    }
                }
                return "";
            }

            function getAccountType() {
                // Include the complete account grid, not only bureau-value cells:
                // collection indicators can appear in an account-type row or label.
                let accountTableText = grid.textContent || '';
                Object.values(rows).forEach(row => {
                    bureaus.forEach(bureau => {
                        const cell = row.querySelector(`[data-field="${bureau.toLowerCase()}"]`);
                        if (cell) accountTableText += ' ' + (cell.textContent || '');
                    });
                });
                return classifyNegativeAccountType(accountName, accountTableText);
            }

            let balance = getBalanceValue();
            let accountType = getAccountType();
            let late = getPriorityRowValue("Late Payment Status");
            let comments = getPriorityRowValue("Comments");

            let bureauDisplay = "";
            let bureauSet = bureaus.map(b => b.toLowerCase());

            if (bureauSet.includes("experian") && bureauSet.includes("equifax") && bureauSet.includes("transunion")) {
                bureauDisplay = "3BR-";
            } else {
                if (bureauSet.includes("experian")) bureauDisplay += "EX - ";
                if (bureauSet.includes("equifax")) bureauDisplay += "EQU - ";
                if (bureauSet.includes("transunion")) bureauDisplay += "TU - ";
            }

            // Keep the red verification notice on COLLECTION records only.
            // CHARGE OFF entries must not display a collection warning.
            const collectionWarning = accountType === 'COLLECTION'
                ? '⚠ VERIFY COLLECTION ACCT'
                : '';

            output.push({
                account: accountName,
                bureau_fields: collectNegativeBureauFields(rows, bureaus),
                account_number: accountNumber,
                bureau_display: bureauDisplay.trim(),
                balance: balance,
                account_type: accountType,
                late_payment: late,
                comments: comments,
                warning: collectionWarning
            });
        });

        showResults(output);
    }

    // Bankruptcy grids are one record each in Disputed Mode. Capture every
    // reporting bureau and every populated row, not just a preferred reference.
    function extractBankruptcyTables() {
        const tables = [];
        document.querySelectorAll('[id^="public-record-"] .MuiDataGrid-root').forEach(grid => {
            const rows = [...grid.querySelectorAll('.MuiDataGrid-row')];
            const byCode = {};
            CRC_BUREAUS.forEach(bureau => {
                const fields = {};
                rows.forEach(row => {
                    const label = String(row.querySelector('[data-field="label"]')?.textContent || '')
                        .replace(/:\s*$/, '').trim();
                    const value = String(row.querySelector('[data-field="' + bureau.field + '"]')?.textContent || '').trim();
                    if (!label || !value || value === '-' || value === '--') return;
                    const prior = fields[label];
                    fields[label] = prior && prior !== value ? prior + ' | ' + value : value;
                });
                if (Object.keys(fields).length) byCode[bureau.code] = fields;
            });
            const isBankruptcy = Object.values(byCode).some(fields =>
                Object.entries(fields).some(([label,value]) =>
                    /^type$/i.test(label) && /bankruptcy|chapter\s*(?:7|11|13)/i.test(value)));
            if (isBankruptcy) {
                tables.push({ account: 'Bankruptcy', account_type: 'Bankruptcy',
                    bureau_fields: byCode });
            }
        });
        return tables;
    }

    function getDisputeFieldGroups(record) {
        const byBureau = record.bureau_fields || {};
        const bankruptcy = getDisputeCategory(record.account_type) === 'bankruptcy';
        const primary = bankruptcy
            ? [{ label:'Reference', names:['Reference','Reference #'] },
               { label:'Date filed / reported', names:['Date Filed/Reported','Date Filed','Date Reported'] },
               { label:'Status', names:['Status'] }]
            : [{ label:'Account number', names:['Account #','Account Number','Account No'] },
               { label:'Balance', names:['Balance','Balance Owed'], kind:'balance' }];
        const primaryRows = primary.map(field => ({
            label:field.label,
            lines:formatBureauValueLines(groupBureauFieldValues(byBureau,field.names,field.kind))
        }));
        const skip = new Set(primary.flatMap(field => field.names.map(name => name.toLowerCase())));
        const labels = [];
        CRC_BUREAUS.forEach(bureau => {
            Object.keys(byBureau[bureau.code] || {}).forEach(label => {
                if (!skip.has(label.toLowerCase()) && !labels.some(x => x.toLowerCase() === label.toLowerCase())) labels.push(label);
            });
        });
        const details = labels.map(label => ({
            label, lines:formatBureauValueLines(groupBureauFieldValues(byBureau,[label]))
        })).filter(x => x.lines.length);
        return { primary: primaryRows, details };
    }
    function buildDisputedCategories(negativeData, bankruptcyTables) {
        const grouped = { delete: [], updated: [], bankruptcy: [] };
        (negativeData || []).forEach(item => grouped[getDisputeCategory(item.account_type)].push(item));
        (bankruptcyTables || []).forEach(item => grouped.bankruptcy.push(item));
        Object.keys(grouped).forEach(key => { grouped[key] = sortDisputeItems(grouped[key]); });
        return grouped;
    }
    function formatDisputedAccountCopy(item) {
        const values = getDisputeFieldGroups(item);
        const text = [String(item.account || '(No creditor)'), String(item.account_type || '')];
        values.primary.concat(values.details).forEach(group => {
            text.push(group.label + ':');
            text.push(...(group.lines.length ? group.lines : ['Not reported']));
        });
        return text.join('\n').trim();
    }
    function renderDisputeAccountCard(item) {
        const card = document.createElement('article');
        card.className = 'crc-dispute-card';
        const heading = document.createElement('h3');
        heading.textContent = item.account || '(No creditor)';
        const type = document.createElement('span');
        type.className = 'crc-dispute-type';
        type.textContent = item.account_type || 'Unclassified';
        card.appendChild(heading);
        card.appendChild(type);
        const fields = getDisputeFieldGroups(item);
        function appendField(container, info) {
            const wrapper = document.createElement('div');
            wrapper.className = 'crc-dispute-field';
            const label = document.createElement('strong');
            label.textContent = info.label;
            wrapper.appendChild(label);
            (info.lines.length ? info.lines : ['Not reported']).forEach(value => {
                const line = document.createElement('span');
                line.className = 'crc-dispute-value';
                line.textContent = value;
                wrapper.appendChild(line);
            });
            container.appendChild(wrapper);
        }
        fields.primary.forEach(field => appendField(card,field));
        if (fields.details.length) {
            const details = document.createElement('details');
            details.className = 'crc-dispute-details';
            const summary = document.createElement('summary');
            summary.textContent = 'Other reported data (' + fields.details.length + ')';
            details.appendChild(summary);
            fields.details.forEach(field => appendField(details,field));
            card.appendChild(details);
        }
        return card;
    }

    function extractBankruptcies() {
        let results = [];
        let grids = document.querySelectorAll('[id^="public-record-"] .MuiDataGrid-root');

        grids.forEach(grid => {
            function getAllBureaus(label) {
                let row = grid.querySelector(`[data-id*="${label}"]`);
                if (!row) return [];

                let output = [];
                let bureaus = [
                    { name: "experian", code: "EX" },
                    { name: "equifax", code: "EQU" },
                    { name: "transunion", code: "TU" }
                ];

                bureaus.forEach(b => {
                    let cell = row.querySelector(`[data-field="${b.name}"]`);
                    if (cell && (cell.textContent || '').trim()) {
                        output.push({
                            bureau: b.code,
                            value: (cell.textContent || '').trim()
                        });
                    }
                });

                return output;
            }

            let types = getAllBureaus("Type");
            types.forEach(type => {
                if (!type.value.toLowerCase().includes("bankruptcy")) {
                    return;
                }

                let references = getAllBureaus("Reference");
                let dates = getAllBureaus("Date Filed/Reported");
                let statuses = getAllBureaus("Status");

                ["EX", "EQU", "TU"].forEach(code => {
                    let status = statuses.find(x => x.bureau === code);
                    if (!status) return;

                    results.push({
                        type: "Bankruptcy",
                        reference: references.find(x => x.bureau === code)?.value || "",
                        date: dates.find(x => x.bureau === code)?.value || "",
                        status: code + " - " + status.value
                    });
                });
            });
        });

        return results;
    }


    // CRC sometimes puts a previous-address date in a separate label or
    // appends it to the address. Neither layout should lose the date.
    function parsePreviousAddressEntry(value) {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return { address: '', date: '' };

        const dateOnly = text.match(/^(?:(?:date|reported|updated|as of|from|since)\s*:?\s*)?((?:\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}(?:-\d{2})?)(?:\s*(?:-|–|—|to|through)\s*(?:\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}(?:-\d{2})?))?)$/i);
        if (dateOnly) return { address: '', date: dateOnly[1] };

        const inlineDate = text.match(/^(.+?)[\s,;|]+(?:(?:date|reported|as of)\s*:\s*)?((?:\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}(?:-\d{2})?)(?:\s*(?:-|–|—|to|through)\s*(?:\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}(?:-\d{2})?))?)$/i);
        if (inlineDate && inlineDate[1].trim().length >= 7 && /\d/.test(inlineDate[1])) {
            return { address: inlineDate[1].trim().replace(/[,;|\-]+\s*$/, ''), date: inlineDate[2] };
        }
        return { address: text, date: '' };
    }

    // Read the PREVIOUS ADDRESS row from CRC's three-column report.
    // The address dates are separate labels and must not be treated as addresses.
    // Checked and unchecked items are both report data; selection is not a filter.
    function extractPreviousAddresses() {
        const addresses = { EX: [], EQU: [], TU: [] };
        const seen = { EX: new Set(), EQU: new Set(), TU: new Set() };
        const bureaus = ['EX', 'EQU', 'TU'];

        document.querySelectorAll('.MuiGrid-container.MuiGrid-grid-xs-12').forEach(row => {
            const columns = Array.from(row.children).filter(child =>
                child.classList && child.classList.contains('MuiGrid-item')
            );
            if (columns.length < 4) return;

            const heading = (columns[0].textContent || '').replace(/\s+/g, ' ').trim();
            if (!/^PREVIOUS\s+ADDRESS(?:ES|\(ES\))?\s*:?\s*$/i.test(heading)) return;

            bureaus.forEach((bureau, index) => {
                const column = columns[index + 1];
                if (!column) return;
                // Collect adjacent date paragraphs as well as checkbox labels.
                // A paragraph nested inside a label must not be processed twice.
                const entries = column.querySelectorAll('label.MuiFormControlLabel-root, p.MuiTypography-body2, p.MuiTypography-body1');
                let lastAddress = null;
                entries.forEach(entry => {
                    if (entry.matches('p.MuiTypography-body2, p.MuiTypography-body1') &&
                        entry.closest('label.MuiFormControlLabel-root')) return;
                    const textNode = entry.querySelector('.MuiFormControlLabel-label') || entry;
                    const parsed = parsePreviousAddressEntry(textNode.textContent || '');
                    if (parsed.date && !parsed.address) {
                        if (lastAddress && !lastAddress.date) lastAddress.date = parsed.date;
                        return;
                    }
                    if (!parsed.address || /^\d{4}$/.test(parsed.address)) return;

                    const key = parsed.address.toUpperCase();
                    const previous = addresses[bureau].find(item => item.address.toUpperCase() === key);
                    if (seen[bureau].has(key)) {
                        lastAddress = previous || null;
                        if (lastAddress && parsed.date && !lastAddress.date) lastAddress.date = parsed.date;
                        return;
                    }
                    seen[bureau].add(key);
                    lastAddress = { address: parsed.address, date: parsed.date };
                    addresses[bureau].push(lastAddress);
                });
            });
        });
        return addresses;
    }


    function extractEmployers() {
        const employers = { EX: [], EQU: [], TU: [] };
        document.querySelectorAll('.MuiGrid-container.MuiGrid-grid-xs-12').forEach(row => {
            const cols = Array.from(row.children).filter(cell =>
                cell.classList && cell.classList.contains('MuiGrid-item')
            );
            if (cols.length < 4 || !/^EMPLOYERS?\s*:?\s*$/i.test((cols[0].textContent || '').trim())) return;
            ['EX', 'EQU', 'TU'].forEach((bureau, index) => {
                const labels = cols[index + 1].querySelectorAll('label.MuiFormControlLabel-root');
                const entries = labels.length ? labels : cols[index + 1].querySelectorAll('p.MuiTypography-body2');
                entries.forEach(entry => {
                    const node = entry.querySelector('.MuiFormControlLabel-label') || entry;
                    const name = (node.textContent || '').replace(/\s+/g, ' ').trim();
                    if (!name || /^(?:\d{1,2}\/\d{4}|\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})$/.test(name)) return;
                    if (employers[bureau].some(item => item.address.toUpperCase() === name.toUpperCase())) return;
                    employers[bureau].push({ address: name, date: '' });
                });
            });
        });
        return employers;
    }

function extractInquiries() {
    let inquiries = [];

    const inquiryContainer =
        document.querySelector('[id*="inquir"]');

    if (!inquiryContainer) {
        return inquiries;
    }

    const grids =
        inquiryContainer.querySelectorAll(".MuiDataGrid-root");

    grids.forEach(grid => {

        let headers = {};

        grid.querySelectorAll('[role="columnheader"]').forEach(header => {
            const field = header.getAttribute("data-field");

            if (field) {
                headers[field] = true;
            }
        });

        if (
            !headers.experian &&
            !headers.equifax &&
            !headers.transunion
        ) {
            return;
        }

        const rows =
            grid.querySelectorAll(".MuiDataGrid-row");

        rows.forEach(row => {

            let creditor = "";
            let date = "";
            let action = "";

            // ========================================
            // LABEL CELL
            // ========================================

            const labelCell =
                row.querySelector('[data-field="label"]');

            if (labelCell) {

                const parentText =
                    labelCell.parentElement?.innerText ||
                    labelCell.innerText ||
                    "";

                const lines = parentText
                    .split(/\r?\n/)
                    .map(s => s.trim())
                    .filter(Boolean);

                const actionPatterns = [
                    /click to dispute this inquiry/i,
                    /already disputed/i,
                    /click to view dispute/i,
                    /click to dispute/i
                ];

                const dateRegex =
                    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;

                const bureauNames = [
                    "experian",
                    "equifax",
                    "transunion"
                ];

                for (const line of lines) {

                    // ----------------------------
                    // DATE
                    // ----------------------------

                    if (dateRegex.test(line)) {
                        continue;
                    }

                    const lower =
                        line.toLowerCase().trim();

                    // ----------------------------
                    // BUREAU
                    // ----------------------------

                    if (bureauNames.includes(lower)) {
                        continue;
                    }

                    // ----------------------------
                    // ACTION
                    // ----------------------------

                    if (
                        actionPatterns.some(rx =>
                            rx.test(line)
                        )
                    ) {
                        action = line;
                        continue;
                    }

                    // ----------------------------
                    // CREDITOR
                    // ----------------------------

                    if (!creditor) {
                        creditor = line;
                    }
                }
            }

            // ========================================
            // BUREAU CELLS
            // ========================================

            const cells = {};

            [
                "experian",
                "equifax",
                "transunion"
            ].forEach(bureau => {

                const cell =
                    row.querySelector(
                        `[data-field="${bureau}"]`
                    );

                if (!cell) return;

                const value =
                    cell.innerText.trim();

                if (
                    value &&
                    value !== "-" &&
                    value !== "--"
                ) {
                    cells[bureau] = value;
                }
            });

            // ========================================
            // DATE
            // ========================================

            const rowText =
                row.innerText.trim();

            const dateMatch =
                rowText.match(
                    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/
                );

            if (dateMatch) {
                date = dateMatch[0];
            }

            // ========================================
            // CREATE INQUIRY
            // One inquiry object PER bureau cell that
            // has a value. Each object carries its own
            // single bureauKey so bureau-specific OPEN
            // connection matching is unambiguous.
            // ========================================

            Object.entries(cells).forEach(
                ([bureau, value]) => {

                    if (!value) return;

                    const inquiryName =
                        creditor.trim();

                    // NEVER use the bureau cell as
                    // the creditor name.
                    if (!inquiryName) {
                        return;
                    }

                    inquiries.push({

                        creditor: inquiryName,

                        date: date,

                        // Keep original CRC action.
                        action: action,

                        bureauKey: bureau,

                        experian:
                            bureau === "experian",

                        equifax:
                            bureau === "equifax",

                        transunion:
                            bureau === "transunion",

                        // Filled later by showResults()
                        connectedToOpen: false
                    });
                }
            );

        });

    });

    // ========================================
    // REMOVE EXACT DUPLICATES
    // ========================================

    const unique = [];
    const seen = new Set();

    inquiries.forEach(item => {

        const key =
            `${item.creditor}|` +
            `${item.date}|` +
            `${item.action}|` +
            `${item.bureauKey}`;

        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        unique.push(item);
    });

    return unique;
}

    // ========================================
    // RENDER A SET OF BUREAU-GROUPED INQUIRIES
    // Shared by the INQUIRIES and NEW subtabs.
    // Returns plain-text copy output. INQUIRIES copies unconnected
    // items by default; NEW includes connected recent inquiries.
    // ========================================

    function renderInquiryBureauGroups(container, groups, emptyLabel, includeConnectedInCopy = false, onContext = null) {
        let copyText = '';

        groups.forEach(group => {
            const code = group.title === 'Experian' ? 'EXP'
                : group.title === 'Equifax' ? 'EQU' : 'TU';
            const section = document.createElement('div');
            section.className = 'crc-inquiry-section';
            const header = document.createElement('div');
            header.className = 'crc-inquiry-bureau';
            const headerTitle = document.createElement('span');
            headerTitle.textContent = group.title + ' (' + group.items.length + ')';
            const headerArrow = document.createElement('span');
            headerArrow.className = 'crc-inquiry-bureau-arrow';
            headerArrow.textContent = '▾';
            header.appendChild(headerTitle);
            header.appendChild(headerArrow);
            header.addEventListener('click', function() { section.classList.toggle('crc-collapsed'); });
            section.appendChild(header);

            const itemsWrap = document.createElement('div');
            itemsWrap.className = 'crc-inquiry-items';
            const unconnectedInGroup = [];

            if (group.items.length === 0) {
                const none = document.createElement('div');
                none.className = 'crc-inquiry-none';
                none.textContent = emptyLabel || 'No inquiries';
                itemsWrap.appendChild(none);
            } else {
                group.items.forEach(item => {
                    const connected = item.connectedToOpen === true;
                    if (!connected) unconnectedInGroup.push(item);

                    const inquiry = document.createElement('div');
                    inquiry.className = 'crc-inquiry-row ' +
                        (connected ? 'crc-inq-connected' : 'crc-inq-unconnected');
                    inquiry.title = (connected ? 'Possible same-bureau creditor match' : 'No reliable same-bureau OPEN match') + ' · Right-click to assign a creditor alias';
                    if (onContext) inquiry.addEventListener('contextmenu', event => {
                        event.preventDefault();
                        onContext(item);
                    });
                    const topRow = document.createElement('div');
                    topRow.className = 'crc-inquiry-top-row';
                    const creditor = document.createElement('div');
                    creditor.className = 'crc-inquiry-creditor';
                    const name = String(item.creditor || '(No creditor)').trim();
                    const dateValue = String(item.date || '').trim();
                    creditor.textContent = crcDisplayMode === 'modern'
                        ? '- ' + name.toUpperCase() + (dateValue ? ' ' + dateValue : '') + '(' + code + ')'
                        : name;

                    const status = document.createElement('div');
                    status.className = 'crc-inquiry-status';
                    status.textContent = item.action && /already disputed/i.test(item.action) ? 'AD' : 'ND';
                    topRow.appendChild(creditor);
                    topRow.appendChild(status);
                    inquiry.appendChild(topRow);

                    if (crcDisplayMode === 'legacy') {
                        const date = document.createElement('div');
                        date.className = 'crc-inquiry-date';
                        date.textContent = item.date || '';
                        inquiry.appendChild(date);
                    }
                    itemsWrap.appendChild(inquiry);
                });
            }

            section.appendChild(itemsWrap);
            container.appendChild(section);

            const copyItems = includeConnectedInCopy ? group.items : unconnectedInGroup;
            if (crcDisplayMode === 'legacy') {
                copyText += group.title.toUpperCase() + ':\n\n';
                if (!copyItems.length) {
                    copyText += includeConnectedInCopy ? '(No inquiries)\n\n' : '(No unconnected inquiries)\n\n';
                } else {
                    copyItems.forEach(item => {
                        copyText += '- ' + (item.creditor || '(No creditor)').toLowerCase() +
                            ' ' + (item.date || '') + '\n';
                    });
                    copyText += '\n';
                }
            } else {
                copyItems.forEach(item => {
                    const creditorName = String(item.creditor || '(No creditor)').trim().toUpperCase();
                    const dateValue = String(item.date || '').trim();
                    copyText += '- ' + creditorName + (dateValue ? ' ' + dateValue : '') +
                        '(' + code + ')\n';
                });
            }
        });
        return copyText.trim();
    }

    // Use the same collapsible, bureau-grouped presentation as inquiries.
    function renderPreviousAddresses(container, addresses, kind = 'address') {
        let copyText = '';
        [
            { code: 'EX', title: 'Experian' },
            { code: 'EQU', title: 'Equifax' },
            { code: 'TU', title: 'TransUnion' }
        ].forEach(bureau => {
            const items = addresses[bureau.code] || [];
            const suffix = bureau.code === 'EX' ? 'EXP' : bureau.code;
            const section = document.createElement('div');
            section.className = 'crc-inquiry-section';
            const header = document.createElement('div');
            header.className = 'crc-inquiry-bureau';
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            header.setAttribute('aria-expanded', 'true');

            const title = document.createElement('span');
            title.textContent = bureau.title + ' (' + items.length + ')';
            const arrow = document.createElement('span');
            arrow.className = 'crc-inquiry-bureau-arrow';
            arrow.textContent = '▾';
            header.appendChild(title);
            header.appendChild(arrow);
            const toggle = () => {
                const collapsed = section.classList.toggle('crc-collapsed');
                header.setAttribute('aria-expanded', String(!collapsed));
            };
            header.addEventListener('click', toggle);
            header.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggle();
                }
            });

            const list = document.createElement('div');
            list.className = 'crc-inquiry-items';
            if (!items.length) {
                const empty = document.createElement('div');
                empty.className = 'crc-inquiry-none';
                empty.textContent = kind === 'employer' ? 'No employers' : 'No previous addresses';
                list.appendChild(empty);
            } else {
                items.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'crc-previous-address-card';
                    const date = String(item.date || '').trim();
                    card.textContent = crcDisplayMode === 'modern'
                        ? '- ' + String(item.address || '').trim().toUpperCase() +
                            (date ? ' ' + date : '') + '(' + suffix + ')'
                        : item.address + (date ? ' ' + date : '');
                    list.appendChild(card);
                });
            }
            section.appendChild(header);
            section.appendChild(list);
            container.appendChild(section);

            if (crcDisplayMode === 'legacy') {
                copyText += bureau.title.toUpperCase() + ':\n';
                copyText += items.length
                    ? items.map(item => '- ' + item.address + (item.date ? ' ' + item.date : '')).join('\n') + '\n\n'
                    : (kind === 'employer' ? '(No employers)\n\n' : '(No previous addresses)\n\n');
            } else {
                items.forEach(item => {
                    const address = String(item.address || '').trim().toUpperCase();
                    const date = String(item.date || '').trim();
                    copyText += '- ' + address + (date ? ' ' + date : '') + '(' + suffix + ')\n';
                });
            }
        });
        return copyText.trim();
    }


    function renderPersonalInfo(addressDiv, employerDiv, addresses, employers) {
        const addressText = renderPreviousAddresses(addressDiv, addresses);
        const hasEmployers = Object.values(employers).some(items => items.length > 0);
        if (!hasEmployers) {
            const empty = document.createElement('div');
            empty.className = 'crc-inquiry-none';
            empty.textContent = 'No employers listed in this report.';
            employerDiv.appendChild(empty);
            return addressText;
        }
        const employerText = renderPreviousAddresses(employerDiv, employers, 'employer');
        return [addressText, 'EMPLOYERS:\n' + employerText].filter(Boolean).join('\n\n');
    }


    // Keep a floating panel fully on screen, including after minimizing,
    // maximizing and browser-window resizing.
    function clampExtractorPosition(left, top, panelWidth, panelHeight, viewportWidth, viewportHeight) {
        return {
            left: Math.min(Math.max(0, left), Math.max(0, viewportWidth - panelWidth)),
            top: Math.min(Math.max(0, top), Math.max(0, viewportHeight - panelHeight))
        };
    }

    function installExtractorDragging(panel) {
        const bar = panel.querySelector('#crc-top-bar');
        let activePointerId = null;
        let dragOrigin = null;
        let pointerStart = null;

        function movePanel(left, top) {
            const rect = panel.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const constrained = clampExtractorPosition(
                left, top, rect.width, rect.height, viewportWidth, viewportHeight
            );
            panel.style.left = constrained.left + 'px';
            panel.style.top = constrained.top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            return constrained;
        }
        function currentPosition() {
            const rect = panel.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
        }
        function reclamp() {
            const current = currentPosition();
            return movePanel(current.left, current.top);
        }
        function savePosition() {
            try {
                localStorage.setItem(CRC_PANEL_POSITION_KEY, JSON.stringify(currentPosition()));
            } catch (_) { /* Keep the on-screen position for this session. */ }
        }
        // Position survives rescans/reloads but is always constrained to the
        // available viewport, so users cannot accidentally lose the panel.
        let savedPosition = null;
        try {
            const stored = JSON.parse(localStorage.getItem(CRC_PANEL_POSITION_KEY) || 'null');
            if (stored && Number.isFinite(stored.left) && Number.isFinite(stored.top)) savedPosition = stored;
        } catch (_) { /* Use default upper-right position. */ }
        if (savedPosition) movePanel(savedPosition.left, savedPosition.top);
        else reclamp();

        function pointerDown(event) {
            // Only a primary-button drag on the top bar moves the extractor.
            // Settings/minimize/close controls remain clickable, and body text
            // retains selection, scrolling, right-click, and other interactions.
            if (event.button !== 0 || activePointerId !== null) return;
            if (!panel.querySelector('#crc-settings-menu').hidden) return;
            const clickedControl = event.target.closest?.(
                'button, input, select, textarea, a, [role="dialog"], #crc-settings-backdrop'
            );
            if (clickedControl) return;
            activePointerId = event.pointerId;
            pointerStart = { x: event.clientX, y: event.clientY };
            dragOrigin = currentPosition();
            bar.classList.add('crc-dragging');
            try { bar.setPointerCapture?.(event.pointerId); }
            catch (_) { /* The pointer remains usable without capture. */ }
            event.preventDefault();
        }
        function pointerMove(event) {
            if (event.pointerId !== activePointerId || !pointerStart) return;
            movePanel(
                dragOrigin.left + event.clientX - pointerStart.x,
                dragOrigin.top + event.clientY - pointerStart.y
            );
            event.preventDefault();
        }
        function pointerEnd(event) {
            if (event.pointerId !== activePointerId) return;
            activePointerId = null;
            dragOrigin = null;
            pointerStart = null;
            bar.classList.remove('crc-dragging');
            try {
                if (bar.hasPointerCapture?.(event.pointerId)) bar.releasePointerCapture(event.pointerId);
            } catch (_) { /* Pointer already released. */ }
            savePosition();
        }
        function handleResize() {
            reclamp();
            savePosition();
        }
        bar.addEventListener('pointerdown', pointerDown);
        bar.addEventListener('pointermove', pointerMove);
        bar.addEventListener('pointerup', pointerEnd);
        bar.addEventListener('pointercancel', pointerEnd);
        window.addEventListener('resize', handleResize);
        function destroy() {
            window.removeEventListener('resize', handleResize);
            bar.removeEventListener('pointerdown', pointerDown);
            bar.removeEventListener('pointermove', pointerMove);
            bar.removeEventListener('pointerup', pointerEnd);
            bar.removeEventListener('pointercancel', pointerEnd);
        }
        panel.__crcDisposeDrag = destroy;
        // Minimize / restore around the current upper-right corner,
        // rather than shrinking the window around its top-left corner.
        function keepTopRightAnchor(right, top) {
            const width = panel.getBoundingClientRect().width;
            return movePanel(right - width, top);
        }
        return { reclamp, keepTopRightAnchor, savePosition, destroy };
    }

    // Render a readable, self-contained snapshot from the current extraction.
    // Never persist report data in localStorage, a URL, or a remote service.
    // The button opens about:blank synchronously inside its click handler to
    // avoid popup blockers; only local DOM/text nodes cross into the new tab.
    function renderFullPageReportPreview(previewWindow, snapshot) {
        const doc = previewWindow.document;
        doc.open();
        doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TUBOL CATCHER - Report Preview</title></head><body></body></html>');
        doc.close();

        const style = doc.createElement('style');
        style.textContent = CSS_STYLES + '\n' + CRC_FULL_PREVIEW_CSS;
        doc.head.appendChild(style);

        function make(tag, className, text) {
            const item = doc.createElement(tag);
            if (className) item.className = className;
            if (text !== undefined) item.textContent = text;
            return item;
        }
        function put(parent, child) {
            parent.appendChild(child);
            return child;
        }
        function makeTab(parent, label, setSelected) {
            const button = put(parent, make('button', 'crc-preview-tab', label));
            button.type = 'button';
            button.setAttribute('role', 'tab');
            button.addEventListener('click', setSelected);
            return button;
        }
        function markSelected(buttons, current) {
            buttons.forEach((button, key) => {
                const active = key === current;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', String(active));
            });
        }
        function makePane(parent, className) {
            const pane = put(parent, make('section', 'crc-preview-pane' + (className ? ' ' + className : '')));
            pane.hidden = true;
            return pane;
        }
        function addIntro(parent, text) {
            return put(parent, make('p', 'crc-preview-intro', text));
        }
        // Cloning extracted DOM preserves its text formatting without
        // copying interactive handlers from the small extractor. Native
        // <details> still expands; bureau headers get new handlers below.
        function cloneList(original, parent) {
            const node = original.cloneNode(true);
            node.style.display = '';
            node.hidden = false;
            node.querySelectorAll('.crc-collapsed').forEach(section => {
                section.classList.remove('crc-collapsed');
            });
            node.querySelectorAll('.crc-inquiry-row, .crc-open-account').forEach(card => {
                card.removeAttribute('title'); // Alias editing happens in the original tab.
            });
            node.querySelector('#crc-open-accounts-copy-all')?.remove();
            node.querySelectorAll('.crc-inquiry-bureau').forEach(header => {
                const section = header.closest('.crc-inquiry-section');
                if (!section) return;
                header.setAttribute('role', 'button');
                header.setAttribute('tabindex', '0');
                header.setAttribute('aria-expanded', 'true');
                const toggle = () => {
                    const collapsed = section.classList.toggle('crc-collapsed');
                    header.setAttribute('aria-expanded', String(!collapsed));
                };
                header.addEventListener('click', toggle);
                header.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggle();
                    }
                });
            });
            parent.appendChild(node);
            return node;
        }

        // Full-page controls start from the extractor's saved preferences.
        // Only preferences (never report values) are written to localStorage.
        const previewSettings = Object.assign({
            bureauPriority: 'equifax',
            displayMode: 'modern',
            copyConnected: false,
            copyConnectedNew: true,
            openNamesOnly: false,
            beforeDate: snapshot.beforeDate || '',
            opacity: 100
        }, snapshot.settings || {});

        const root = put(doc.body, make('div', 'crc-preview-page'));
        root.id = 'crc-negative-panel';
        const layout = put(root, make('main', 'crc-preview-layout'));
        const header = put(layout, make('header', 'crc-preview-header'));
        const titleBox = put(header, make('div'));
        put(titleBox, make('div', 'crc-preview-kicker', 'TUBOL CATCHER'));
        put(titleBox, make('h1', '', 'Full-page report preview'));
        put(titleBox, make('div', 'crc-preview-meta',
            'Snapshot from your current report · ' + new Date().toLocaleString()));
        const copyButton = put(put(header, make('div', 'crc-preview-actions')),
            make('button', 'crc-preview-copy', 'Copy current view'));
        copyButton.type = 'button';

        const toolbar = put(layout, make('div','crc-preview-toolbar'));
        const layoutControl = put(toolbar,make('div','crc-preview-layout-control'));
        layoutControl.setAttribute('role','group');
        layoutControl.setAttribute('aria-label','Report layout');
        const layoutButtons = new Map();
        let displayLayout = 'grid';
        try {
            const storedLayout = localStorage.getItem(CRC_PREVIEW_LAYOUT_KEY);
            if (['grid','table','list'].includes(storedLayout)) displayLayout = storedLayout;
        } catch (_) { /* Default to grid. */ }
        ['grid','table','list'].forEach(name => {
            const label = name.charAt(0).toUpperCase()+name.slice(1);
            const button = put(layoutControl,make('button','crc-preview-layout-btn',label));
            button.type='button';
            button.setAttribute('aria-pressed',String(name===displayLayout));
            button.addEventListener('click',()=>setDisplayLayout(name));
            layoutButtons.set(name,button);
        });
        const settingsOpenButton = put(toolbar,make('button','crc-preview-settings-btn','Settings'));
        settingsOpenButton.type='button';
        settingsOpenButton.setAttribute('aria-haspopup','dialog');
        settingsOpenButton.setAttribute('aria-expanded','false');

        // Working Settings drawer for the full-page workspace. These
        // controls use the same preferences as the extractor and update it
        // immediately through the opener callback when available.
        const dimmer = put(doc.body,make('div','crc-preview-dimmer'));
        dimmer.hidden=true;
        const settingsDrawer = put(doc.body,make('aside','crc-preview-settings crc-preview-dialog'));
        settingsDrawer.hidden=true;
        settingsDrawer.setAttribute('role','dialog');
        settingsDrawer.setAttribute('aria-modal','true');
        settingsDrawer.setAttribute('aria-label','Full-page report settings');
        const settingsHead=put(settingsDrawer,make('div','crc-preview-settings-head'));
        put(settingsHead,make('h2','','Report settings'));
        const settingsClose=put(settingsHead,make('button','crc-preview-settings-close','×'));
        settingsClose.type='button';
        settingsClose.setAttribute('aria-label','Close Settings');
        const settingsBody=put(settingsDrawer,make('div','crc-preview-settings-scroll'));
        const preferenceControls={};
        function addSettingsHeading(value) {put(settingsBody,make('h3','',value));}
        function addSelect(key,label,choices,description) {
            const text=put(settingsBody,make('label','',label));
            const input=put(settingsBody,make('select'));
            const id='crc-preview-pref-'+key;
            text.setAttribute('for',id);input.id=id;
            choices.forEach(([value,name])=>{
                const opt=put(input,make('option','',name));
                opt.value=value;
            });
            input.value=String(previewSettings[key]);
            input.addEventListener('change',()=>applySetting(key,input.value));
            preferenceControls[key]=input;
            if(description) put(settingsBody,make('p','crc-preview-setting-note',description));
        }
        function addCheckbox(key,label) {
            const row=put(settingsBody,make('label','crc-preview-check'));
            const input=put(row,make('input'));input.type='checkbox';
            input.checked=Boolean(previewSettings[key]);
            put(row,make('span','',label));
            input.addEventListener('change',()=>applySetting(key,input.checked));
            preferenceControls[key]=input;
        }
        addSettingsHeading('Appearance');
        addSelect('bureauPriority','Preferred bureau for regular Negative view',[
            ['equifax','Equifax first'],['experian','Experian first'],
            ['transunion','TransUnion first']
        ],'Disputed Mode always shows all bureaus, regardless of priority.');
        addSelect('displayMode','Display format',[
            ['modern','Modern — uppercase and bureau labels'],
            ['legacy','Legacy — grouped original names']
        ]);
        const opacityLabel=put(settingsBody,make('label','', 'Report opacity'));
        const opacityInput=put(settingsBody,make('input'));
        opacityInput.type='range';opacityInput.min='60';opacityInput.max='100';
        opacityInput.step='1';opacityInput.value=String(previewSettings.opacity);
        const opacityText=put(settingsBody,make('p','crc-preview-setting-note',
            previewSettings.opacity+'%'));
        opacityInput.addEventListener('input',()=>{
            opacityText.textContent=opacityInput.value+'%';
            applySetting('opacity',Number(opacityInput.value));
        });
        preferenceControls.opacity=opacityInput;
        addSettingsHeading('Inquiries & open accounts');
        addCheckbox('copyConnected','Copy inquiries connected to open accounts');
        addCheckbox('copyConnectedNew','Copy connected NEW inquiries');
        addCheckbox('openNamesOnly','Show and copy open-account names only');
        const dateLabel=put(settingsBody,make('label','','Show regular inquiries BEFORE'));
        const dateInput=put(settingsBody,make('input'));dateInput.type='date';
        dateInput.id='crc-preview-date-cutoff';dateLabel.setAttribute('for',dateInput.id);
        dateInput.value=previewSettings.beforeDate||'';
        preferenceControls.beforeDate=dateInput;
        put(settingsBody,make('p','crc-preview-setting-note',
            'Exclusive cutoff: Jan 1, 2025 shows Dec 2024 and older. NEW is unaffected.'));
        const dateActions=put(settingsBody,make('div','crc-preview-setting-actions'));
        const applyDate=put(dateActions,make('button','','Apply date'));
        applyDate.type='button';
        applyDate.addEventListener('click',()=>applySetting('beforeDate',dateInput.value));
        const clearDate=put(dateActions,make('button','secondary','Show all'));
        clearDate.type='button';
        clearDate.addEventListener('click',()=>{
            dateInput.value='';applySetting('beforeDate','');
        });
        addSettingsHeading('Creditor aliases');
        put(settingsBody,make('p','crc-preview-setting-note',
            'Manage creditor aliases used to flag possible inquiry matches. Changes are saved in the same browser as the original extractor.'));
        const aliasSearch=put(settingsBody,make('input'));
        aliasSearch.type='search';aliasSearch.placeholder='Search creditors or aliases';
        aliasSearch.setAttribute('aria-label','Find creditor aliases');
        const aliasGroups=put(settingsBody,make('div','crc-preview-alias-groups'));
        const aliasActions=put(settingsBody,make('div','crc-preview-setting-actions'));
        const resetAliases=put(aliasActions,make('button','secondary','Restore default aliases'));
        resetAliases.type='button';
        const aliasNameLabel=put(settingsBody,make('label','','Creditor alias to assign'));
        const aliasName=put(settingsBody,make('input'));
        aliasName.type='text';aliasName.placeholder='Creditor name as shown on report';
        const aliasSelectLabel=put(settingsBody,make('label','','Assign to existing creditor'));
        const aliasSelect=put(settingsBody,make('select'));
        const aliasNewLabel=put(settingsBody,make('label','','Or create a new creditor'));
        const aliasNewName=put(settingsBody,make('input'));
        aliasNewName.type='text';aliasNewName.placeholder='New creditor display name';
        const aliasSaveActions=put(settingsBody,make('div','crc-preview-setting-actions'));
        const aliasSave=put(aliasSaveActions,make('button','','Save alias / creditor'));
        aliasSave.type='button';
        const aliasFeedback=put(settingsBody,make('p','crc-preview-setting-note',''));
        function notifyAliasChanged() {
            snapshot.onAliasChanged?.();
            if (Array.isArray(snapshot.inquiries) && snapshot.openAccountsByBureau) {
                snapshot.inquiries.forEach(item=>{
                    item.connectedToOpen=isInquiryConnectedToOpenAccount(
                        item.creditor,item.bureauKey,snapshot.openAccountsByBureau);
                });
            }
            renderAliasGroups();
            refreshPreviewContent();
        }
        function renderAliasGroups() {
            aliasGroups.replaceChildren();
            aliasSelect.replaceChildren();
            put(aliasSelect,make('option','','Choose creditor…')).value='';
            const query=aliasSearch.value.toLowerCase().trim();
            const groups=[...CREDITOR_ALIAS_GROUPS].sort((a,b)=>
                CREDITOR_DISPLAY_NAMES[a.id].localeCompare(CREDITOR_DISPLAY_NAMES[b.id]));
            for (const group of groups) {
                const title=CREDITOR_DISPLAY_NAMES[group.id] || group.id;
                const variations=listCreditorAliases(group.id).map(x=>x.alias);
                const option=put(aliasSelect,make('option','',title));
                option.value=group.id;
                if (query && !title.toLowerCase().includes(query) &&
                    !variations.some(n=>n.toLowerCase().includes(query))) continue;
                const details=put(aliasGroups,make('details'));
                put(details,make('summary','',title+' ('+variations.length+')'));
                variations.forEach(variant=>{
                    const row=put(details,make('div',''));
                    row.style.display='flex';row.style.justifyContent='space-between';
                    put(row,make('span','',variant));
                    const remove=put(row,make('button','','Remove'));
                    remove.type='button';remove.setAttribute('aria-label','Remove alias '+variant);
                    remove.addEventListener('click',()=>{
                        if (!previewWindow.confirm('Remove alias "'+variant+'"?')) return;
                        const result=deleteCreditorAlias(variant,group.id);
                        aliasFeedback.textContent=result.message;
                        if(result.ok)notifyAliasChanged();
                    });
                });
            }
        }
        aliasSearch.addEventListener('input',renderAliasGroups);
        resetAliases.addEventListener('click',()=>{
            if(!previewWindow.confirm('Remove all custom aliases and restore defaults?'))return;
            const result=resetCreditorAliases();
            aliasFeedback.textContent=result.message;
            if(result.ok)notifyAliasChanged();
        });
        aliasSave.addEventListener('click',()=>{
            const alias=aliasName.value.trim();
            const newName=aliasNewName.value.trim();
            const result=newName?createCreditorGroup(newName,alias):
                alias?addCreditorAlias(alias,aliasSelect.value):
                {ok:false,message:'Enter a creditor alias or a new creditor name.'};
            aliasFeedback.textContent=result.message;
            if(result.ok){
                aliasName.value='';aliasNewName.value='';
                notifyAliasChanged();
            }
        });
        function setSettingsVisible(open) {
            dimmer.hidden=!open;
            settingsDrawer.hidden=!open;
            settingsOpenButton.setAttribute('aria-expanded',String(open));
            if (open) renderAliasGroups();
        }
        settingsOpenButton.addEventListener('click',()=>setSettingsVisible(settingsDrawer.hidden));
        settingsClose.addEventListener('click',()=>setSettingsVisible(false));
        dimmer.addEventListener('click',()=>setSettingsVisible(false));
        doc.addEventListener('keydown',event=>{
            if(event.key==='Escape' && !settingsDrawer.hidden) setSettingsVisible(false);
        });
        function applySetting(key,value) {
            previewSettings[key]=value;
            if(key==='opacity') root.style.opacity=String(Number(value)/100);
            try { snapshot.onSettingChange?.(key,value); }
            catch (err) { console.warn('Source extractor settings unavailable',err); }
            refreshPreviewContent();
        }
        root.style.opacity=String(Number(previewSettings.opacity)/100);

        const nav = put(layout, make('nav', 'crc-preview-nav'));
        nav.setAttribute('aria-label', 'Report sections');
        nav.setAttribute('role', 'tablist');
        const pageNames = ['negative', 'inquiries', 'personal'];
        const pageLabels = { negative: 'Negative accounts', inquiries: 'Inquiries', personal: 'Personal info' };
        const pages = {};
        const mainTabs = new Map();
        let activePage = pageNames.includes(snapshot.activePage) ? snapshot.activePage : 'negative';
        let negativeMode = snapshot.negativeMode === 'disputed' ? 'disputed' : 'standard';
        let disputedCategory = ['delete','updated','bankruptcy'].includes(snapshot.disputedCategory)
            ? snapshot.disputedCategory : 'delete';
        let inquiryMode = ['inquiries','open','new'].includes(snapshot.inquiryMode)
            ? snapshot.inquiryMode : 'inquiries';

        pageNames.forEach(name => {
            pages[name] = makePane(layout, 'crc-preview-view');
            pages[name].setAttribute('role', 'tabpanel');
            mainTabs.set(name, makeTab(nav, pageLabels[name], () => selectPage(name)));
        });
        const tablePane = makePane(layout,'crc-preview-table-pane');
        const tableHost = put(tablePane,make('div','crc-preview-table-wrap'));


        // NEGATIVE: the same normal display plus all three Disputed Mode
        // categories, which are built from full bureau data on demand.
        const negativeTabsNav = put(pages.negative, make('div', 'crc-preview-subnav'));
        negativeTabsNav.setAttribute('role','tablist');
        const negativeTabs = new Map();
        const negativePanes = {
            standard: makePane(pages.negative),
            disputed: makePane(pages.negative)
        };
        negativeTabs.set('standard', makeTab(negativeTabsNav,'All accounts',()=>selectNegativeMode('standard')));
        negativeTabs.set('disputed', makeTab(negativeTabsNav,'Disputed Mode',()=>selectNegativeMode('disputed')));
        addIntro(negativePanes.standard,
            'Preferred-bureau summary from the extractor. Use Settings in the original tab to change priority.');
        cloneList(snapshot.negativeResults, negativePanes.standard);

        const disputeNav = put(negativePanes.disputed, make('div', 'crc-preview-subnav'));
        disputeNav.setAttribute('role','tablist');
        const disputeLabels = {delete:'Delete',updated:'Updated',bankruptcy:'Bankruptcy'};
        const disputeButtons = new Map();
        addIntro(negativePanes.disputed,
            'All bureau values; identical values share labels. Expand Other reported data to see additional fields.');
        const disputeContent = put(negativePanes.disputed, make('div'));
        disputeContent.id = 'crc-dispute-results';
        ['delete','updated','bankruptcy'].forEach(key => {
            const count = (snapshot.disputeCategories[key] || []).length;
            disputeButtons.set(key,makeTab(disputeNav,disputeLabels[key] + ' (' + count + ')',
                ()=>selectDisputedCategory(key)));
        });
        function selectDisputedCategory(name) {
            disputedCategory = name;
            markSelected(disputeButtons, name);
            if (displayLayout === 'table' && activePage === 'negative') renderPreviewTable();
            disputeContent.replaceChildren();
            const items = snapshot.disputeCategories[name] || [];
            if (!items.length) {
                put(disputeContent, make('div','crc-dispute-empty', 'No ' + name + ' records in this snapshot.'));
            } else {
                const fragment = doc.createDocumentFragment();
                items.forEach(item => fragment.appendChild(renderDisputeAccountCard(item)));
                disputeContent.appendChild(fragment);
            }
        }
        function selectNegativeMode(name) {
            negativeMode = name;
            markSelected(negativeTabs,name);
            for (const [key,pane] of Object.entries(negativePanes)) pane.hidden = key !== name;
            if (name === 'disputed') selectDisputedCategory(disputedCategory);
            if (displayLayout === 'table' && activePage === 'negative') renderPreviewTable();
        }

        // INQUIRIES: separate regular, open-account and new lists. Filters and
        // copy preferences are snapshotted; no report data goes into storage.
        const inquiryRoot = put(pages.inquiries, make('div'));
        inquiryRoot.id = 'crc-inquiries';
        const inquiryNav = put(inquiryRoot, make('div','crc-preview-subnav'));
        inquiryNav.setAttribute('role','tablist');
        const inquiryTabs = new Map();
        const inquiryPanes = {
            inquiries: makePane(inquiryRoot),
            open: makePane(inquiryRoot),
            new: makePane(inquiryRoot)
        };
        const dateNote = snapshot.beforeDate
            ? 'Showing inquiries dated before ' + snapshot.beforeDate + ' (selected date excluded).'
            : 'Showing all extracted inquiries.';
        addIntro(inquiryPanes.inquiries,
            dateNote + ' Change the date filter in the original extractor and reopen this preview to refresh.');
        cloneList(snapshot.inquiriesView,inquiryPanes.inquiries);
        addIntro(inquiryPanes.open,'All open accounts from the extracted report.');
        cloneList(snapshot.openAccountsView,inquiryPanes.open);
        addIntro(inquiryPanes.new,'Recent inquiries (last 35 days) from the extracted report.');
        cloneList(snapshot.newInquiriesView,inquiryPanes.new);
        inquiryTabs.set('inquiries',makeTab(inquiryNav,'Inquiries',()=>selectInquiryMode('inquiries')));
        inquiryTabs.set('open',makeTab(inquiryNav,'Open accounts',()=>selectInquiryMode('open')));
        inquiryTabs.set('new',makeTab(inquiryNav,'New inquiries',()=>selectInquiryMode('new')));
        function selectInquiryMode(name) {
            inquiryMode = name;
            markSelected(inquiryTabs,name);
            if (displayLayout === 'table' && activePage === 'inquiries') renderPreviewTable();
            Object.entries(inquiryPanes).forEach(([key,pane]) => { pane.hidden = key !== name; });
        }

        // PERSONAL INFO: retain bureau-grouped previous addresses and employers.
        const personalAddresses = put(pages.personal,make('section','crc-personal-section'));
        put(personalAddresses,make('h2','crc-personal-heading','PREVIOUS ADDRESSES'));
        cloneList(snapshot.addressesView,personalAddresses);
        const personalEmployers = put(pages.personal,make('section','crc-personal-section'));
        put(personalEmployers,make('h2','crc-personal-heading','EMPLOYERS'));
        cloneList(snapshot.employersView,personalEmployers);

        put(layout,make('footer','crc-preview-footer',
            'Private, local snapshot. This tab does not automatically refresh; reopen it from TUBOL CATCHER after rescanning or changing settings. No report values are placed in browser storage or sent to a server by the preview.'));

        // Table mode renders structured data (not a screenshot or text split)
        // so every tab and subtab can be compared using readable columns.
        function currentTableModel() {
            if (activePage === 'negative') {
                if (negativeMode === 'disputed') {
                    const items = snapshot.disputeCategories[disputedCategory] || [];
                    return {
                        headers:['Creditor','Type','Account # / Reference','Balance / Status','Other reported data'],
                        rows:items.map(item => {
                            const groups=getDisputeFieldGroups(item);
                            return [
                                item.account || 'Bankruptcy',item.account_type || '',
                                (groups.primary[0]?.lines || []).join('\n') || 'Not reported',
                                (groups.primary[1]?.lines || []).join('\n') || 'Not reported',
                                groups.primary.slice(2).concat(groups.details)
                                    .map(x=>x.label + ':\n'+x.lines.join('\n')).join('\n\n')
                            ];
                        })
                    };
                }
                const negative = snapshot.negativeData || [];
                const bank = snapshot.bankruptcies || [];
                return {headers:['Creditor','Account number / Reference','Balance / Filed','Bureau / Status'],
                    rows:bank.map(x=>[x.type||'Bankruptcy',x.reference||'',x.date||'',x.status||''])
                        .concat(negative.map(x=>[
                            x.account||'',x.account_number||'',x.balance||'',
                            (x.bureau_display||'')+' '+(x.account_type||'')
                        ]))};
            }
            if (activePage === 'inquiries') {
                if (inquiryMode === 'open') {
                    const columns = previewSettings.openNamesOnly
                        ? ['Creditor'] : ['Creditor','Account number','Balance','Bureau','Status'];
                    return {headers:columns,rows:(snapshot.openAccounts||[]).map(item=>
                        previewSettings.openNamesOnly?[item.account||'']:[
                            item.account||'',item.account_number||'',item.balance||'',
                            item.bureau_display||'',item.account_type||''
                        ])};
                }
                const items = inquiryMode === 'new'
                    ? (snapshot.newInquiries || [])
                    : filterInquiriesBeforeDate(snapshot.inquiries || [],previewSettings.beforeDate);
                const rows=[];
                for (const item of items) {
                    for (const bureau of [{key:'experian',code:'EXP'},{key:'equifax',code:'EQU'},{key:'transunion',code:'TU'}]) {
                        if (!item[bureau.key]) continue;
                        rows.push([item.creditor||'',item.date||'',bureau.code,
                            /already disputed/i.test(item.action||'')?'AD':'ND',
                            item.connectedToOpen?'Possible open-account match':'No confirmed open-account match']);
                    }
                }
                return {headers:['Creditor','Date','Bureau','Dispute','Match'],rows};
            }
            const rows=[];
            for (const [name,groups] of [['Previous address',snapshot.previousAddresses||{}],
                ['Employer',snapshot.employers||{}]]) {
                for (const bureau of [{key:'EX',code:'EXP'},{key:'EQU',code:'EQU'},{key:'TU',code:'TU'}]) {
                    for (const item of (groups[bureau.key]||[])) {
                        rows.push([name,item.address||'',item.date||'',bureau.code]);
                    }
                }
            }
            return {headers:['Information','Value','Date','Bureau'],rows};
        }
        function renderPreviewTable() {
            tableHost.replaceChildren();
            const model = currentTableModel();
            if (!model.rows.length) {
                put(tableHost,make('div','crc-preview-empty','No records in this section.'));
                return;
            }
            const table=put(tableHost,make('table','crc-preview-table'));
            const head=put(put(table,make('thead')),make('tr'));
            model.headers.forEach(label=>put(head,make('th','',label)));
            const body=put(table,make('tbody'));
            for(const values of model.rows) {
                const row=put(body,make('tr'));
                values.forEach(value=>put(row,make('td','',String(value ?? ''))));
            }
        }
        function setDisplayLayout(name) {
            if (!['grid','table','list'].includes(name)) return;
            displayLayout=name;
            root.setAttribute('data-crc-layout',name);
            for(const [key,button] of layoutButtons) {
                button.classList.toggle('active',key===name);
                button.setAttribute('aria-pressed',String(key===name));
            }
            try { localStorage.setItem(CRC_PREVIEW_LAYOUT_KEY,name); }
            catch (_) { /* Layout remains active for this tab. */ }
            selectPage(activePage);
        }
        function selectPage(name) {
            activePage = name;
            markSelected(mainTabs,name);
            Object.entries(pages).forEach(([key,pane]) => { pane.hidden = key !== name || displayLayout === 'table'; });
            tablePane.hidden = displayLayout !== 'table';
            if (displayLayout === 'table') renderPreviewTable();
        }
        function activeCopyText() {
            if (activePage === 'personal') return snapshot.copyPersonalInfo;
            if (activePage === 'inquiries') return inquiryMode === 'open'
                ? snapshot.copyOpenAccounts
                : inquiryMode === 'new' ? snapshot.copyNewInquiries : snapshot.copyInquiries;
            return negativeMode === 'standard'
                ? snapshot.copyNegative
                : (snapshot.disputeCategories[disputedCategory] || [])
                    .map(formatDisputedAccountCopy).join('\n\n');
        }
        copyButton.addEventListener('click', async () => {
            const copy = activeCopyText();
            let copied = false;
            try {
                await previewWindow.navigator.clipboard.writeText(copy || '');
                copied = true;
            } catch (_) {
                // Clipboard API can be unavailable on an about:blank tab.
                const textarea = make('textarea');
                textarea.value = copy || '';
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                doc.body.appendChild(textarea);
                textarea.select();
                try { copied = Boolean(doc.execCommand('copy')); } catch (_) { /* blocked */ }
                textarea.remove();
            }
            copyButton.textContent = copied ? 'Copied' : 'Copy blocked by browser';
            previewWindow.setTimeout(() => {
                if (!previewWindow.closed) copyButton.textContent = 'Copy current view';
            }, 1500);
        });

        selectNegativeMode(negativeMode);
        selectInquiryMode(inquiryMode);
        setDisplayLayout(displayLayout);
        previewWindow.focus();
        return { doc, pages, selectPage, selectNegativeMode, selectInquiryMode,
            selectDisputedCategory, activeCopyText, setDisplayLayout, currentTableModel };
    }

    function showResults(negativeData) {
        let bankruptcies = extractBankruptcies();
        const bankruptcyTables = extractBankruptcyTables();
        let openAccountsData = extractOpenAccounts();
        let openAccounts = openAccountsData.list;
        let openAccountsByBureau = openAccountsData.byBureau;
        let inquiries = extractInquiries();
        let previousAddresses = extractPreviousAddresses();
        let employers = extractEmployers();

        // ========================================
        // CONNECT INQUIRIES TO OPEN ACCOUNTS
        // Bureau-specific: an inquiry is connected ONLY
        // if the matching account is reported OPEN on
        // the SAME bureau as the inquiry itself.
        // ========================================

        inquiries.forEach(item => {
            item.connectedToOpen = isInquiryConnectedToOpenAccount(
                item.creditor,
                item.bureauKey,
                openAccountsByBureau
            );
        });

        let negativeItemCount = 0;
        negativeData.forEach(item => {
            let bureaus = item.bureau_display;
            if (bureaus.includes("3BR-")) {
                negativeItemCount += 3;
            } else {
                if (bureaus.includes("EX")) negativeItemCount++;
                if (bureaus.includes("EQU")) negativeItemCount++;
                if (bureaus.includes("TU")) negativeItemCount++;
            }
        });

        let old = document.getElementById("crc-negative-panel");
        if (old) {
            old.__crcDisposeDrag?.();
            old.remove();
        }

        let panel = document.createElement("div");
        panel.id = "crc-negative-panel";
        panel.innerHTML = HTML_TEMPLATE;
        panel.classList.toggle('crc-modern-display', crcDisplayMode === 'modern');
        document.body.appendChild(panel);
        panel.style.opacity = String(crcPanelOpacity / 100);
        const dragControls = installExtractorDragging(panel);

        // Update counters
        panel.querySelector('[data-negative-count]').textContent = negativeData.length;
        panel.querySelector('[data-negative-items-count]').textContent = negativeItemCount;
        panel.querySelector('[data-bankruptcy-count]').textContent = bankruptcies.length;

        // ========================================
        // PAGE 1 - NEGATIVE ACCOUNTS
        // ========================================

        let results = panel.querySelector("#crc-results");
        let copyTextNegative = "";

        function renderNegativeStandard() {
            updateNegativePreferredValues(negativeData,crcBureauPriority);
            copyTextNegative = '';
            results.replaceChildren();
            const resultsFrag = document.createDocumentFragment();

            bankruptcies.forEach(item => {
                let entry = `${item.type}\n${item.reference}\n${item.date}\n${item.status}\n\n`;
                copyTextNegative += entry;

                const row = document.createElement('div');
                const h = document.createElement('b'); h.textContent = 'Bankruptcy';
                const r1 = document.createElement('div'); r1.textContent = item.reference;
                const r2 = document.createElement('div'); r2.textContent = item.date;
                const r3 = document.createElement('div'); r3.textContent = item.status;
                row.appendChild(h);
                row.appendChild(r1);
                row.appendChild(r2);
                row.appendChild(r3);
                resultsFrag.appendChild(row);
            });

            negativeData.forEach(item => {
                let entry = `${item.account}\n${item.account_number}\n${item.balance}\n${item.bureau_display} ${item.account_type}\n\n`;
                copyTextNegative += entry;

                const row = document.createElement('div');
                const h = document.createElement('b'); h.textContent = item.account;
                const r1 = document.createElement('div'); r1.textContent = item.account_number;
                const r2 = document.createElement('div'); r2.textContent = item.balance;
                const r3 = document.createElement('div');
                r3.textContent = `${item.bureau_display} ${item.account_type}`;
                if (item.warning) {
                    const warn = document.createElement('b');
                    warn.style.color = 'red';
                    warn.textContent = item.warning;
                    r3.appendChild(document.createElement('br'));
                    r3.appendChild(warn);
                }
                row.appendChild(h);
                row.appendChild(r1);
                row.appendChild(r2);
                row.appendChild(r3);
                resultsFrag.appendChild(row);
            });

            results.appendChild(resultsFrag);
        }
        renderNegativeStandard();

        const disputeCategories = buildDisputedCategories(negativeData, bankruptcyTables);
        const negativeStandardView = panel.querySelector('#crc-negative-standard-view');
        const negativeDisputedView = panel.querySelector('#crc-negative-disputed-view');
        const disputeResults = panel.querySelector('#crc-dispute-results');
        const standardModeButton = panel.querySelector('#crc-negative-mode-standard');
        const disputedModeButton = panel.querySelector('#crc-negative-mode-disputed');
        const disputeTabButtons = [...panel.querySelectorAll('[data-crc-dispute-category]')];
        const categoryLabels = { delete: 'DELETE', updated: 'UPDATED', bankruptcy: 'BANKRUPTCY' };
        let disputedModeActive = false;
        let disputeCategory = 'delete';
        let copyTextDisputed = '';

        Object.keys(disputeCategories).forEach(key => {
            panel.querySelector('[data-crc-count="' + key + '"]').textContent = disputeCategories[key].length;
        });
        function negativeCopyButtonLabel() {
            return disputedModeActive ? 'COPY ' + categoryLabels[disputeCategory] + ' ACCOUNTS' : 'COPY NEGATIVE ACCOUNTS';
        }
        function renderDisputedCategory() {
            const items = disputeCategories[disputeCategory];
            disputeResults.replaceChildren();
            copyTextDisputed = items.map(formatDisputedAccountCopy).join('\n\n');
            if (!items.length) {
                const empty = document.createElement('div');
                empty.className = 'crc-dispute-empty';
                empty.textContent = 'No ' + categoryLabels[disputeCategory].toLowerCase() + ' records found.';
                disputeResults.appendChild(empty);
            } else {
                const fragment = document.createDocumentFragment();
                items.forEach(item => fragment.appendChild(renderDisputeAccountCard(item)));
                disputeResults.appendChild(fragment);
            }
            disputeTabButtons.forEach(button => {
                const selected = button.dataset.crcDisputeCategory === disputeCategory;
                button.classList.toggle('active', selected);
                button.setAttribute('aria-selected', String(selected));
            });
            panel.querySelector('#crc-copy-page-1').textContent = negativeCopyButtonLabel();
        }
        function setNegativeMode(active) {
            disputedModeActive = active;
            negativeStandardView.hidden = active;
            negativeDisputedView.hidden = !active;
            standardModeButton.classList.toggle('active', !active);
            disputedModeButton.classList.toggle('active', active);
            standardModeButton.setAttribute('aria-selected', String(!active));
            disputedModeButton.setAttribute('aria-selected', String(active));
            if (active) renderDisputedCategory();
            else panel.querySelector('#crc-copy-page-1').textContent = negativeCopyButtonLabel();
        }
        standardModeButton.addEventListener('click', () => setNegativeMode(false));
        disputedModeButton.addEventListener('click', () => setNegativeMode(true));
        disputeTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                disputeCategory = button.dataset.crcDisputeCategory;
                renderDisputedCategory();
            });
        });
        // Render category counts and copy content without changing the
        // default initial ALL ACCOUNTS experience.
        renderDisputedCategory();
        setNegativeMode(false);

        // ========================================
        // PAGE 3 - PREVIOUS ADDRESSES
        // ========================================

        const addressesDiv = panel.querySelector('#crc-previous-addresses');
        const employersDiv = panel.querySelector('#crc-employers');
        let copyTextPersonalInfo = renderPersonalInfo(addressesDiv, employersDiv, previousAddresses, employers);

        // ========================================
        // PAGE 2 - INQUIRIES
        // ========================================

        let inquiriesDiv = panel.querySelector("#crc-inquiries");

        if (!inquiriesDiv) inquiriesDiv = document.createElement('div');

        inquiriesDiv.innerHTML = "";

        // Subtabs: INQUIRIES | OPEN ACCOUNTS | NEW
        const subtabWrap = document.createElement('div');
        subtabWrap.className = 'crc-subtabs';

        const btnInquiries = document.createElement('button');
        btnInquiries.className = 'crc-subtab-btn active';
        btnInquiries.textContent = 'INQUIRIES';

        const btnOpenAccounts = document.createElement('button');
        btnOpenAccounts.className = 'crc-subtab-btn';
        btnOpenAccounts.textContent = 'OPEN ACCOUNTS';

        const btnNewInquiries = document.createElement('button');
        btnNewInquiries.className = 'crc-subtab-btn';
        btnNewInquiries.textContent = 'NEW';

        subtabWrap.appendChild(btnInquiries);
        subtabWrap.appendChild(btnOpenAccounts);
        subtabWrap.appendChild(btnNewInquiries);

        // ----------------------------------------
        // LEGEND (?) BUTTON
        // AD/ND + connected-highlight legend, click or hover
        // ----------------------------------------

        const legendWrap = document.createElement('div');
        legendWrap.className = 'crc-legend-wrap';

        const legendBtn = document.createElement('button');
        legendBtn.className = 'crc-legend-btn';
        legendBtn.textContent = '?';
        legendBtn.title = 'Legend';

        const legendPopover = document.createElement('div');
        legendPopover.className = 'crc-legend-popover';
        legendPopover.innerHTML = `
            <div class="crc-legend-row"><b>AD</b>&nbsp;=&nbsp;Already Disputed</div>
            <div class="crc-legend-row"><b>ND</b>&nbsp;=&nbsp;Not Disputed</div>
            <div class="crc-legend-row"><span class="crc-legend-dot" style="background:#3ab25c"></span>Possible same-bureau creditor match (verify inquiry separately)</div>
            <div class="crc-legend-row"><span class="crc-legend-dot" style="background:#e05252"></span>Not Connected to Open Account</div>
        `;

        legendBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            legendPopover.classList.toggle('crc-show');
        });

        legendWrap.addEventListener('mouseenter', function() {
            legendPopover.classList.add('crc-show');
        });

        legendWrap.addEventListener('mouseleave', function() {
            legendPopover.classList.remove('crc-show');
        });

        legendWrap.appendChild(legendBtn);
        legendWrap.appendChild(legendPopover);
        subtabWrap.appendChild(legendWrap);

        inquiriesDiv.appendChild(subtabWrap);

        // Date cutoff applies only to the INQUIRIES subtab. NEW remains
        // independent and continues showing inquiries from the last 35 days.
        const dateFilterWrap = document.createElement('div');
        dateFilterWrap.id = 'crc-inquiry-date-filter';

        // The toolbar is collapsed by default and does not take focus from
        // the inquiries or change the list while someone edits the date.
        const dateFilterToggle = document.createElement('button');
        dateFilterToggle.type = 'button';
        dateFilterToggle.id = 'crc-inquiry-date-toggle';
        dateFilterToggle.setAttribute('aria-haspopup', 'dialog');
        dateFilterToggle.setAttribute('aria-expanded', 'false');
        dateFilterToggle.setAttribute('aria-controls', 'crc-inquiry-date-popover');
        dateFilterToggle.title = 'Set a cutoff for INQUIRIES only';
        const dateFilterIcon = document.createElement('span');
        dateFilterIcon.setAttribute('aria-hidden', 'true');
        dateFilterIcon.textContent = '▦';
        const dateFilterButtonLabel = document.createElement('span');
        dateFilterButtonLabel.className = 'crc-date-button-label';
        dateFilterToggle.appendChild(dateFilterIcon);
        dateFilterToggle.appendChild(dateFilterButtonLabel);

        const dateFilterSummary = document.createElement('div');
        dateFilterSummary.id = 'crc-inquiry-date-summary';
        dateFilterSummary.setAttribute('aria-live', 'polite');

        const dateFilterPopover = document.createElement('div');
        dateFilterPopover.id = 'crc-inquiry-date-popover';
        dateFilterPopover.setAttribute('role', 'dialog');
        dateFilterPopover.setAttribute('aria-label', 'Inquiry date filter');
        dateFilterPopover.hidden = true;
        const dateFilterLabel = document.createElement('label');
        dateFilterLabel.htmlFor = 'crc-inquiry-before-date';
        dateFilterLabel.textContent = 'Show inquiries before';
        const dateFilterInput = document.createElement('input');
        dateFilterInput.type = 'date';
        dateFilterInput.id = 'crc-inquiry-before-date';
        dateFilterInput.value = crcInquiryBeforeDate;
        dateFilterInput.title = 'The selected date itself is excluded';
        const dateFilterHelp = document.createElement('p');
        dateFilterHelp.className = 'crc-date-help';
        dateFilterHelp.textContent = 'Example: Jan 1, 2025 shows Dec 2024 and earlier. The selected date is excluded.';
        const dateFilterActions = document.createElement('div');
        dateFilterActions.className = 'crc-date-popover-actions';
        const dateFilterClear = document.createElement('button');
        dateFilterClear.type = 'button';
        dateFilterClear.id = 'crc-inquiry-date-clear';
        dateFilterClear.textContent = 'Show all';
        const dateFilterApply = document.createElement('button');
        dateFilterApply.type = 'button';
        dateFilterApply.id = 'crc-inquiry-date-apply';
        dateFilterApply.className = 'crc-date-apply';
        dateFilterApply.textContent = 'Apply';
        const dateFilterCancel = document.createElement('button');
        dateFilterCancel.type = 'button';
        dateFilterCancel.id = 'crc-inquiry-date-cancel';
        dateFilterCancel.textContent = 'Cancel';
        dateFilterActions.appendChild(dateFilterClear);
        dateFilterActions.appendChild(dateFilterCancel);
        dateFilterActions.appendChild(dateFilterApply);
        dateFilterPopover.appendChild(dateFilterLabel);
        dateFilterPopover.appendChild(dateFilterInput);
        dateFilterPopover.appendChild(dateFilterHelp);
        dateFilterPopover.appendChild(dateFilterActions);
        dateFilterWrap.appendChild(dateFilterToggle);
        dateFilterWrap.appendChild(dateFilterSummary);
        dateFilterWrap.appendChild(dateFilterPopover);
        inquiriesDiv.appendChild(dateFilterWrap);

        const inquiriesView = document.createElement('div');
        inquiriesView.className = 'crc-inquiries-view';

        const openAccountsView = document.createElement('div');
        openAccountsView.className = 'crc-open-accounts-view';
        openAccountsView.style.display = 'none';

        const newInquiriesView = document.createElement('div');
        newInquiriesView.className = 'crc-new-inquiries-view';
        newInquiriesView.style.display = 'none';

        inquiriesDiv.appendChild(inquiriesView);
        inquiriesDiv.appendChild(openAccountsView);
        inquiriesDiv.appendChild(newInquiriesView);

        let copyTextOpenAccounts = "";

        // ========================================
        // GROUP BY BUREAU
        // ========================================

        let regularInquiries = filterInquiriesBeforeDate(inquiries, crcInquiryBeforeDate);
        let bureauGroups = [
            { title: "Experian", items: regularInquiries.filter(i => i.experian) },
            { title: "Equifax", items: regularInquiries.filter(i => i.equifax) },
            { title: "TransUnion", items: regularInquiries.filter(i => i.transunion) }
        ];
        function formatInquiryFilterDate(value) {
            if (!value) return '';
            const parts = value.split('-').map(Number);
            const date = new Date(parts[0], parts[1] - 1, parts[2]);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }
        function updateDateFilterSummary() {
            const active = Boolean(crcInquiryBeforeDate);
            dateFilterToggle.classList.toggle('crc-date-active', active);
            dateFilterButtonLabel.textContent = active
                ? 'Before ' + formatInquiryFilterDate(crcInquiryBeforeDate)
                : 'Filter by date';
            dateFilterSummary.textContent = active
                ? regularInquiries.length + ' of ' + inquiries.length + ' inquiries'
                : 'All ' + inquiries.length + ' inquiries';
            dateFilterSummary.title = active
                ? 'Only inquiries strictly before ' + crcInquiryBeforeDate +
                  '. Inquiries with no valid date are excluded.'
                : 'All inquiries shown. The NEW subtab is independent.';
        }
        function setInquiryDatePopoverOpen(open) {
            if (open && dateFilterWrap.hidden) return;
            dateFilterPopover.hidden = !open;
            dateFilterToggle.setAttribute('aria-expanded', String(open));
            if (open) {
                dateFilterInput.value = crcInquiryBeforeDate;
                dateFilterHelp.textContent = 'Example: Jan 1, 2025 shows Dec 2024 and earlier. The selected date is excluded.';
            }
            // No automatic .focus(): opening, closing and editing should not
            // interrupt inquiry-list focus or cause list re-rendering.
        }
        updateDateFilterSummary();

        let copyTextOpenInquiries = renderInquiryBureauGroups(inquiriesView, bureauGroups, "No inquiries", crcCopyConnectedInquiries, openInquiryAliasDialog);

        function refreshRegularInquiryDateFilter() {
            regularInquiries = filterInquiriesBeforeDate(inquiries, crcInquiryBeforeDate);
            bureauGroups = [
                { title: "Experian", items: regularInquiries.filter(i => i.experian) },
                { title: "Equifax", items: regularInquiries.filter(i => i.equifax) },
                { title: "TransUnion", items: regularInquiries.filter(i => i.transunion) }
            ];
            inquiriesView.replaceChildren();
            copyTextOpenInquiries = renderInquiryBureauGroups(inquiriesView, bureauGroups, 'No inquiries', crcCopyConnectedInquiries, openInquiryAliasDialog);
            updateDateFilterSummary();
        }
        dateFilterToggle.addEventListener('click', () => {
            setInquiryDatePopoverOpen(dateFilterPopover.hidden);
        });
        dateFilterApply.addEventListener('click', () => {
            const selected = dateFilterInput.value;
            if (selected) {
                const m = selected.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!m || !Number.isFinite(Date.parse(selected)) ||
                    new Date(+m[1], +m[2] - 1, +m[3]).getDate() !== +m[3]) {
                    dateFilterHelp.textContent = 'Please choose a valid date.';
                    return;
                }
            }
            crcInquiryBeforeDate = selected;
            try {
                if (selected) localStorage.setItem(CRC_INQUIRY_BEFORE_DATE_KEY, selected);
                else localStorage.removeItem(CRC_INQUIRY_BEFORE_DATE_KEY);
            } catch (_) { /* Works for the current session. */ }
            refreshRegularInquiryDateFilter();
            setInquiryDatePopoverOpen(false);
        });
        dateFilterClear.addEventListener('click', () => {
            dateFilterInput.value = '';
            crcInquiryBeforeDate = '';
            try { localStorage.removeItem(CRC_INQUIRY_BEFORE_DATE_KEY); }
            catch (_) { /* Works for the current session. */ }
            refreshRegularInquiryDateFilter();
            setInquiryDatePopoverOpen(false);
        });
        dateFilterCancel.addEventListener('click', () => {
            setInquiryDatePopoverOpen(false);
        });
        // Opening a native calendar or editing a draft date does NOT rerender
        // inquiry rows. Only explicit Apply and Show all commit a new filter.
        panel.addEventListener('pointerdown', event => {
            if (!dateFilterPopover.hidden && !dateFilterWrap.contains(event.target)) {
                setInquiryDatePopoverOpen(false);
            }
        });
        panel.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !dateFilterPopover.hidden) {
                setInquiryDatePopoverOpen(false);
                event.stopPropagation();
            }
        });

        // ========================================
        // NEW INQUIRIES (today back to 35 days ago)
        // ========================================

        const newInquiries = filterRecentInquiries(inquiries, 35);

        const newBureauGroups = [
            { title: "Experian", items: newInquiries.filter(i => i.experian) },
            { title: "Equifax", items: newInquiries.filter(i => i.equifax) },
            { title: "TransUnion", items: newInquiries.filter(i => i.transunion) }
        ];

        let copyTextNewInquiries = renderInquiryBureauGroups(newInquiriesView, newBureauGroups, "No recent inquiries", crcCopyConnectedNew, openInquiryAliasDialog);

        btnNewInquiries.textContent = `NEW (${newInquiries.length})`;

        // ========================================
        // OPEN ACCOUNTS VIEW + DEDICATED COPY BUTTON
        // ========================================

        const openAccountsCopyButton = document.createElement('button');
        openAccountsCopyButton.id = 'crc-open-accounts-copy-all';
        openAccountsCopyButton.type = 'button';
        openAccountsCopyButton.textContent = 'COPY ALL OPEN ACCOUNTS';
        openAccountsView.appendChild(openAccountsCopyButton);

        function renderOpenAccounts() {
            // Keep the button when the display preference changes.
            openAccountsView.replaceChildren(openAccountsCopyButton);
            const accounts = openAccounts || [];
            openAccountsCopyButton.disabled = accounts.length === 0;

            if (!accounts.length) {
                const empty = document.createElement('div');
                empty.className = 'crc-empty-page';
                empty.innerHTML = '<div class="crc-page-title">No open accounts</div><div class="crc-page-subtitle">No open accounts found on this report.</div>';
                openAccountsView.appendChild(empty);
                copyTextOpenAccounts = '(No open accounts)';
                return;
            }

            accounts.forEach(acc => {
                const card = document.createElement('div');
                const isNegative = isOpenAccountNegative(acc.account, negativeData);
                card.className = 'crc-open-account ' + (isNegative ? 'crc-open-negative-card' : 'crc-open-positive-card');

                const h = document.createElement('b');
                h.textContent = acc.account || '(No creditor)';
                card.appendChild(h);

                if (!crcOpenNamesOnly) {
                    const aNum = document.createElement('div'); aNum.textContent = acc.account_number || '';
                    const bal = document.createElement('div'); bal.textContent = acc.balance || '';
                    const meta = document.createElement('div'); meta.textContent = `${acc.bureau_display || ''} ${acc.account_type || ''}`;
                    card.appendChild(aNum);
                    card.appendChild(bal);
                    card.appendChild(meta);
                }

                card.title = 'Right-click to assign this open-account name to a creditor';
                card.addEventListener('contextmenu', event => {
                    event.preventDefault();
                    openInquiryAliasDialog({ creditor: acc.account }, 'open account');
                });
                openAccountsView.appendChild(card);
            });

            copyTextOpenAccounts = crcOpenNamesOnly
                ? accounts.map(acc => String(acc.account || '(No creditor)').trim()).join('\n')
                : accounts.map(acc => `${acc.account || '(No creditor)'}\n${acc.account_number || ''}\n${acc.balance || ''}\n${acc.bureau_display || ''} ${acc.account_type || ''}`).join('\n\n');
        }

        renderOpenAccounts();


        // Recompute badges and both clipboard variants without rescanning.
        function updateInquiryAliasHighlights() {
            inquiries.forEach(item => {
                item.connectedToOpen = isInquiryConnectedToOpenAccount(item.creditor, item.bureauKey, openAccountsByBureau);
            });
            inquiriesView.replaceChildren();
            copyTextOpenInquiries = renderInquiryBureauGroups(inquiriesView, bureauGroups, 'No inquiries', crcCopyConnectedInquiries, openInquiryAliasDialog);
            newInquiriesView.replaceChildren();
            copyTextNewInquiries = renderInquiryBureauGroups(newInquiriesView, newBureauGroups, 'No recent inquiries', crcCopyConnectedNew, openInquiryAliasDialog);
            updateInquiryCopyNote();
            panel.querySelector('#crc-copy-page-2').textContent = inquiryCopyButtonLabel();
        }

        const aliasList = panel.querySelector('#crc-alias-list');
        const aliasSearch = panel.querySelector('#crc-alias-search');
        const aliasDialog = panel.querySelector('#crc-alias-overlay');
        const aliasTarget = panel.querySelector('#crc-alias-target');
        const aliasFeedback = panel.querySelector('#crc-alias-feedback');
        const aliasGroupsSorted = () => [...CREDITOR_ALIAS_GROUPS].sort((a,b) =>
            CREDITOR_DISPLAY_NAMES[a.id].localeCompare(CREDITOR_DISPLAY_NAMES[b.id]));
        let selectedInquiryAlias = '';
        const aliasNewRow = panel.querySelector('#crc-alias-new-row');
        const aliasNewNameInput = panel.querySelector('#crc-alias-new-name');
        const aliasDialogTitle = panel.querySelector('#crc-alias-dialog-title');

        function renderAliasSettings() {
            const query = normalizeCreditorLabel(aliasSearch.value);
            const expanded = new Set([...aliasList.querySelectorAll('details[open]')].map(el => el.dataset.group));
            aliasList.replaceChildren();
            aliasGroupsSorted().forEach(group => {
                const displayName = CREDITOR_DISPLAY_NAMES[group.id];
                const variants = listCreditorAliases(group.id);
                if (query && !normalizeCreditorLabel(displayName).includes(query) &&
                    !variants.some(v => normalizeCreditorLabel(v.alias).includes(query))) return;
                const details = document.createElement('details');
                details.className = 'crc-alias-entity';
                details.dataset.group = group.id;
                details.open = Boolean(query) || expanded.has(group.id);
                const title = document.createElement('summary');
                title.textContent = displayName + ' (' + variants.length + ')';
                details.appendChild(title);
                if (CREDITOR_USER_GROUPS.some(custom => custom.id === group.id)) {
                    title.title = 'Right-click to delete this custom creditor';
                    title.addEventListener('contextmenu', event => {
                        event.preventDefault();
                        if (!window.confirm('Delete the custom creditor "' + displayName + '" and its variations?')) return;
                        const result = deleteUserCreditorGroup(group.id);
                        if (!result.ok) window.alert(result.message);
                        else { renderAliasSettings(); updateInquiryAliasHighlights(); }
                    });
                }
                variants.forEach(variant => {
                    const row = document.createElement('div');
                    row.className = 'crc-alias-variation' + (variant.custom ? ' crc-alias-custom' : '');
                    row.textContent = variant.alias + (variant.custom ? ' · custom' : '');
                    row.title = 'Right-click to delete this variation';
                    row.addEventListener('contextmenu', event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!window.confirm('Remove "' + variant.alias + '" from ' + displayName + '?')) return;
                        const outcome = deleteCreditorAlias(variant.alias, group.id);
                        if (!outcome.ok) window.alert(outcome.message);
                        else { renderAliasSettings(); updateInquiryAliasHighlights(); }
                    });
                    details.appendChild(row);
                });
                aliasList.appendChild(details);
            });
            if (!aliasList.children.length) {
                const none = document.createElement('div');
                none.className = 'crc-settings-note';
                none.textContent = 'No creditors match this search.';
                aliasList.appendChild(none);
            }
        }
        aliasSearch.addEventListener('input', renderAliasSettings);
        panel.querySelector('#crc-alias-reset').addEventListener('click', () => {
            if (!window.confirm('Remove all custom aliases and restore the original list?')) return;
            const result = resetCreditorAliases();
            if (!result.ok) window.alert(result.message);
            else { renderAliasSettings(); updateInquiryAliasHighlights(); }
        });
        function closeInquiryAliasDialog() {
            aliasDialog.hidden = true;
            selectedInquiryAlias = '';
        }
        function syncNewCreditorInput() {
            const creating = aliasTarget.value === '__new__';
            aliasNewRow.hidden = !creating;
            panel.querySelector('#crc-alias-save').textContent = creating ? 'Create creditor' : 'Add alias';
            if (creating) aliasNewNameInput.focus();
        }
        function openInquiryAliasDialog(item, source = 'inquiry') {
            selectedInquiryAlias = String(item?.creditor || '').trim();
            if (!selectedInquiryAlias && source !== 'manual') return;
            aliasTarget.replaceChildren();
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select a creditor...';
            aliasTarget.appendChild(placeholder);
            aliasGroupsSorted().forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = CREDITOR_DISPLAY_NAMES[group.id];
                aliasTarget.appendChild(option);
            });
            const newOption = document.createElement('option');
            newOption.value = '__new__';
            newOption.textContent = '+ Create a new creditor';
            aliasTarget.appendChild(newOption);
            aliasTarget.value = source === 'manual' ? '__new__' : (resolveCreditorGroup(selectedInquiryAlias) || '');
            aliasNewNameInput.value = '';
            aliasDialogTitle.textContent = source === 'manual' ? 'Create Creditor' : 'Assign Creditor Name';
            panel.querySelector('#crc-alias-name').textContent = selectedInquiryAlias
                ? (source === 'open account' ? 'Open account: ' : 'Inquiry: ') + selectedInquiryAlias
                : 'Enter a proper creditor name to add it to your list.';
            aliasFeedback.textContent = 'Names are stored locally. Assign only when these really refer to the same creditor.';
            aliasDialog.hidden = false;
            syncNewCreditorInput();
            if (aliasNewRow.hidden) aliasTarget.focus();
        }
        aliasTarget.addEventListener('change', syncNewCreditorInput);
        panel.querySelector('#crc-alias-new-btn').addEventListener('click', () => openInquiryAliasDialog(null, 'manual'));
        panel.querySelector('#crc-alias-cancel').addEventListener('click', closeInquiryAliasDialog);
        panel.querySelector('#crc-alias-save').addEventListener('click', () => {
            let result;
            if (aliasTarget.value === '__new__') {
                result = createCreditorGroup(aliasNewNameInput.value, selectedInquiryAlias);
            } else {
                if (!selectedInquiryAlias) {
                    aliasFeedback.textContent = 'Choose Create a new creditor to add a creditor without a variation.';
                    return;
                }
                result = addCreditorAlias(selectedInquiryAlias, aliasTarget.value);
            }
            aliasFeedback.textContent = result.message;
            if (!result.ok) return;
            renderAliasSettings();
            updateInquiryAliasHighlights();
            closeInquiryAliasDialog();
        });
        aliasDialog.addEventListener('click', event => {
            if (event.target === aliasDialog) closeInquiryAliasDialog();
        });
        renderAliasSettings();

        // Subtab switching
        function updateInquiryCopyNote() {
            const note = panel.querySelector('#crc-inquiry-copy-note');
            const isNew = btnNewInquiries.classList.contains('active');
            const isOpen = btnOpenAccounts.classList.contains('active');
            const includeConnected = isNew ? crcCopyConnectedNew : crcCopyConnectedInquiries;
            note.innerHTML = includeConnected
                ? 'All ' + (isNew ? 'new ' : '') + 'inquiries are copied, including those connected to open accounts.<br>Always double-check the report before disputing.'
                : 'Only unconnected ' + (isNew ? 'new ' : '') + 'inquiries are copied.<br>Always double-check the report before disputing.';
            note.classList.toggle('active', !isOpen);
        }
        function inquiryCopyButtonLabel() {
            if (btnOpenAccounts.classList.contains('active')) return 'COPY ALL OPEN ACCOUNTS';
            if (btnNewInquiries.classList.contains('active')) {
                return crcCopyConnectedNew ? 'COPY ALL NEW INQUIRIES' : 'COPY UNCONNECTED NEW INQUIRIES';
            }
            return crcCopyConnectedInquiries ? 'COPY ALL INQUIRIES' : 'COPY UNCONNECTED INQUIRIES';
        }

        function setActiveInquirySubtab(view) {
            btnInquiries.classList.toggle('active', view === 'inquiries');
            btnOpenAccounts.classList.toggle('active', view === 'open');
            btnNewInquiries.classList.toggle('active', view === 'new');

            inquiriesView.style.display = view === 'inquiries' ? '' : 'none';
            openAccountsView.style.display = view === 'open' ? '' : 'none';
            newInquiriesView.style.display = view === 'new' ? '' : 'none';
            dateFilterWrap.hidden = view !== 'inquiries';
            if (view !== 'inquiries') setInquiryDatePopoverOpen(false);

            updateInquiryCopyNote();
            panel.querySelector('#crc-copy-page-2').textContent = inquiryCopyButtonLabel();
        }

        btnInquiries.addEventListener('click', () => setActiveInquirySubtab('inquiries'));
        btnOpenAccounts.addEventListener('click', () => setActiveInquirySubtab('open'));
        btnNewInquiries.addEventListener('click', () => setActiveInquirySubtab('new'));

        // ========================================
        // WINDOW CONTROLS
        // ========================================

        // Gear menu: update both display and clipboard results without a rescan.
        const settingsButton = panel.querySelector('#crc-settings-btn');
        const settingsMenu = panel.querySelector('#crc-settings-menu');
        const formatSelect = panel.querySelector('#crc-display-mode');
        const copyConnectedInput = panel.querySelector('#crc-copy-connected-inquiries');
        const copyConnectedNewInput = panel.querySelector('#crc-copy-connected-new');
        const openNamesOnlyInput = panel.querySelector('#crc-open-names-only');
        const bureauPriorityInput = panel.querySelector('#crc-bureau-priority');
        bureauPriorityInput.value = crcBureauPriority;
        bureauPriorityInput.addEventListener('change', () => {
            crcBureauPriority = getBureauPriorityOrder(bureauPriorityInput.value)[0];
            try { localStorage.setItem(CRC_BUREAU_PRIORITY_KEY, crcBureauPriority); }
            catch (_) { /* Selection remains active for this session. */ }
            renderNegativeStandard();
            // Disputed Mode uses the untouched per-bureau field data.
        });
        const panelOpacityInput = panel.querySelector('#crc-panel-opacity');
        const panelOpacityValue = panel.querySelector('#crc-panel-opacity-value');
        panelOpacityInput.value = String(crcPanelOpacity);
        panelOpacityValue.textContent = crcPanelOpacity + '%';
        panelOpacityInput.addEventListener('input', () => {
            panelOpacityValue.textContent = applyPanelOpacity(panel, panelOpacityInput.value) + '%';
        });
        formatSelect.value = crcDisplayMode;
        copyConnectedInput.checked = crcCopyConnectedInquiries;
        copyConnectedNewInput.checked = crcCopyConnectedNew;
        openNamesOnlyInput.checked = crcOpenNamesOnly;

        const settingsBackdrop = panel.querySelector('#crc-settings-backdrop');
        const settingsGeneral = panel.querySelector('#crc-settings-general');
        const settingsAliases = panel.querySelector('#crc-settings-aliases');
        const settingsGeneralTab = panel.querySelector('#crc-settings-tab-general');
        const settingsAliasesTab = panel.querySelector('#crc-settings-tab-aliases');
        function selectSettingsTab(which) {
            const aliases = which === 'aliases';
            settingsGeneral.hidden = aliases;
            settingsAliases.hidden = !aliases;
            settingsGeneralTab.classList.toggle('active', !aliases);
            settingsAliasesTab.classList.toggle('active', aliases);
            settingsGeneralTab.setAttribute('aria-selected', String(!aliases));
            settingsAliasesTab.setAttribute('aria-selected', String(aliases));
        }
        function setSettingsOpen(open) {
            settingsMenu.hidden = !open;
            settingsBackdrop.hidden = !open;
            settingsButton.setAttribute('aria-expanded', String(open));
            if (open) panel.querySelector('#crc-settings-close').focus();
            else settingsButton.focus();
        }
        settingsButton.addEventListener('click', () => {
            setSettingsOpen(settingsMenu.hidden);
        });
        settingsGeneralTab.addEventListener('click', () => selectSettingsTab('general'));
        settingsAliasesTab.addEventListener('click', () => selectSettingsTab('aliases'));
        panel.querySelector('#crc-settings-close').addEventListener('click', () => setSettingsOpen(false));
        settingsBackdrop.addEventListener('click', () => setSettingsOpen(false));
        formatSelect.addEventListener('change', () => {
            saveCrcDisplayMode(formatSelect.value);
            panel.classList.toggle('crc-modern-display', crcDisplayMode === 'modern');

            addressesDiv.replaceChildren();
            employersDiv.replaceChildren();
            copyTextPersonalInfo = renderPersonalInfo(addressesDiv, employersDiv, previousAddresses, employers);

            inquiriesView.replaceChildren();
            copyTextOpenInquiries = renderInquiryBureauGroups(inquiriesView, bureauGroups, 'No inquiries', crcCopyConnectedInquiries, openInquiryAliasDialog);

            newInquiriesView.replaceChildren();
            copyTextNewInquiries = renderInquiryBureauGroups(newInquiriesView, newBureauGroups, 'No recent inquiries', crcCopyConnectedNew, openInquiryAliasDialog);
        });
        copyConnectedInput.addEventListener('change', () => {
            crcCopyConnectedInquiries = copyConnectedInput.checked;
            saveCrcBoolSetting(CRC_COPY_CONNECTED_INQUIRIES_KEY, crcCopyConnectedInquiries);
            inquiriesView.replaceChildren();
            copyTextOpenInquiries = renderInquiryBureauGroups(inquiriesView, bureauGroups, 'No inquiries', crcCopyConnectedInquiries, openInquiryAliasDialog);
            updateInquiryCopyNote();
            panel.querySelector('#crc-copy-page-2').textContent = inquiryCopyButtonLabel();
        });
        copyConnectedNewInput.addEventListener('change', () => {
            crcCopyConnectedNew = copyConnectedNewInput.checked;
            saveCrcBoolSetting(CRC_COPY_CONNECTED_NEW_KEY, crcCopyConnectedNew);
            newInquiriesView.replaceChildren();
            copyTextNewInquiries = renderInquiryBureauGroups(newInquiriesView, newBureauGroups, 'No recent inquiries', crcCopyConnectedNew, openInquiryAliasDialog);
            updateInquiryCopyNote();
            panel.querySelector('#crc-copy-page-2').textContent = inquiryCopyButtonLabel();
        });
        openNamesOnlyInput.addEventListener('change', () => {
            crcOpenNamesOnly = openNamesOnlyInput.checked;
            saveCrcBoolSetting(CRC_OPEN_NAMES_ONLY_KEY, crcOpenNamesOnly);
            renderOpenAccounts();
        });

        // Document-level Escape handler is registered once across rescans.
        if (!window.__crcSettingsDismissHandlerAdded) {
            window.__crcSettingsDismissHandlerAdded = true;
            document.addEventListener('keydown', event => {
                if (event.key !== 'Escape') return;
                const current = document.querySelector('#crc-negative-panel');
                if (!current) return;
                const aliasOverlay = current.querySelector('#crc-alias-overlay');
                if (aliasOverlay && !aliasOverlay.hidden) {
                    aliasOverlay.hidden = true;
                    return;
                }
                const modal = current.querySelector('#crc-settings-menu');
                if (!modal || modal.hidden) return;
                modal.hidden = true;
                const backdrop = current.querySelector('#crc-settings-backdrop');
                if (backdrop) backdrop.hidden = true;
                const button = current.querySelector('#crc-settings-btn');
                if (button) {
                    button.setAttribute('aria-expanded', 'false');
                    button.focus();
                }
            });
        }

        panel.querySelector("#crc-minimize-btn").onclick = function() {
            setSettingsOpen(false);
            const before = panel.getBoundingClientRect();
            panel.classList.toggle("crc-minimized");
            this.textContent = panel.classList.contains("crc-minimized") ? "+" : "−";
            // Match the prior right edge after the width changes.
            // The saved coordinates represent the current window size.
            dragControls.keepTopRightAnchor(before.right, before.top);
            dragControls.savePosition();
        };

        // ========================================
        // PAGE NAVIGATION
        // ========================================

        const pages = [
            panel.querySelector("#crc-page-1"),
            panel.querySelector("#crc-page-2"),
            panel.querySelector("#crc-page-3")
        ];

        const buttons = [
            panel.querySelector("#crc-page-1-btn"),
            panel.querySelector("#crc-page-2-btn"),
            panel.querySelector("#crc-page-3-btn")
        ];
        const copyButtons = [
            panel.querySelector("#crc-copy-page-1"),
            panel.querySelector("#crc-copy-page-2"),
            panel.querySelector("#crc-copy-page-3")
        ];

        function switchPage(pageIndex) {
            pages.forEach((page, index) => {
                page.style.display = index === pageIndex ? "block" : "none";
            });

            buttons.forEach((button, index) => {
                button.classList.toggle("active", index === pageIndex);
            });

            copyButtons.forEach((btn, idx) => {
                if (!btn) return;
                btn.classList.toggle("active", idx === pageIndex);
            });

            const note = panel.querySelector('#crc-inquiry-copy-note');
            if (note) {
                if (pageIndex !== 1) {
                    note.classList.remove('active');
                } else {
                    note.classList.toggle('active', btnOpenAccounts && !btnOpenAccounts.classList.contains('active'));
                }
            }
        }

        buttons[0].onclick = function() { switchPage(0); };
        buttons[1].onclick = function() { switchPage(1); };
        buttons[2].onclick = function() { switchPage(2); };
        // ========================================
        // COPY FUNCTIONS
        // ========================================

        async function copyAccountText(text, button, label) {
            try {
                await navigator.clipboard.writeText(text || '');
                button.textContent = '✓ COPIED';
            } catch (error) {
                console.error('Failed to copy account data:', error);
                button.textContent = 'COPY FAILED';
            }
            setTimeout(() => { button.textContent = label(); }, 1500);
        }
        openAccountsCopyButton.addEventListener('click', () => {
            if (!openAccountsCopyButton.disabled) {
                copyAccountText(copyTextOpenAccounts, openAccountsCopyButton, () => 'COPY ALL OPEN ACCOUNTS');
            }
        });

        copyButtons[0].onclick = function() {
            copyAccountText(disputedModeActive ? copyTextDisputed : copyTextNegative,
                this, negativeCopyButtonLabel);
        };

        copyButtons[1].onclick = function() {
            const text = btnOpenAccounts.classList.contains('active')
                ? copyTextOpenAccounts
                : btnNewInquiries.classList.contains('active')
                    ? copyTextNewInquiries
                    : copyTextOpenInquiries;
            copyAccountText(text, this, inquiryCopyButtonLabel);
        };

        copyButtons[2].onclick = function() {
            navigator.clipboard.writeText(copyTextPersonalInfo);
            this.textContent = "✓ COPIED";
            setTimeout(() => { this.textContent = "COPY PERSONAL INFO"; }, 1500);
        };

        panel.querySelector('#crc-open-preview-btn').addEventListener('click', () => {
            // Window.open must run directly from this click, before any awaits.
            // An empty same-origin tab never exposes the report through a URL.
            const previewWindow = window.open('about:blank', '_blank');
            if (!previewWindow) {
                window.alert('Your browser blocked the new tab. Allow pop-ups for Credit Repair Cloud, then try again.');
                return;
            }
            try {
                renderFullPageReportPreview(previewWindow, {
                    negativeResults: results,
                    disputeCategories,
                    inquiriesView,
                    openAccountsView,
                    newInquiriesView,
                    addressesView: addressesDiv,
                    employersView: employersDiv,
                    copyNegative: copyTextNegative,
                    copyInquiries: copyTextOpenInquiries,
                    copyOpenAccounts: copyTextOpenAccounts,
                    copyNewInquiries: copyTextNewInquiries,
                    copyPersonalInfo: copyTextPersonalInfo,
                    beforeDate: crcInquiryBeforeDate,
                    negativeData,
                    bankruptcies,
                    inquiries,
                    newInquiries,
                    openAccounts,
                    previousAddresses,
                    employers,
                    settings: {
                        bureauPriority: crcBureauPriority,
                        displayMode: crcDisplayMode,
                        copyConnected: crcCopyConnectedInquiries,
                        copyConnectedNew: crcCopyConnectedNew,
                        openNamesOnly: crcOpenNamesOnly,
                        beforeDate: crcInquiryBeforeDate,
                        opacity: crcPanelOpacity
                    },
                    onSettingChange(key,value) {
                        const controls = {
                            bureauPriority: ['#crc-bureau-priority','change'],
                            displayMode: ['#crc-display-mode','change'],
                            copyConnected: ['#crc-copy-connected-inquiries','change'],
                            copyConnectedNew: ['#crc-copy-connected-new','change'],
                            openNamesOnly: ['#crc-open-names-only','change'],
                            opacity: ['#crc-panel-opacity','input']
                        };
                        if (key === 'beforeDate') {
                            crcInquiryBeforeDate = value;
                            dateFilterInput.value = value;
                            try {
                                if (value) localStorage.setItem(CRC_INQUIRY_BEFORE_DATE_KEY,value);
                                else localStorage.removeItem(CRC_INQUIRY_BEFORE_DATE_KEY);
                            } catch (_) { /* Current session still works. */ }
                            refreshRegularInquiryDateFilter();
                            return;
                        }
                        const config = controls[key];
                        if (!config) return;
                        const input = panel.querySelector(config[0]);
                        if (!input) return;
                        if (input.type === 'checkbox') input.checked = Boolean(value);
                        else input.value = String(value);
                        input.dispatchEvent(new Event(config[1],{bubbles:true}));
                    },
                    onAliasChanged() {
                        inquiries.forEach(item => {
                            item.connectedToOpen = isInquiryConnectedToOpenAccount(
                                item.creditor,item.bureauKey,openAccountsByBureau);
                        });
                        renderAliasSettings();
                        updateInquiryAliasHighlights();
                    },
                    activePage: buttons[2].classList.contains('active') ? 'personal'
                        : buttons[1].classList.contains('active') ? 'inquiries' : 'negative',
                    negativeMode: disputedModeActive ? 'disputed' : 'standard',
                    disputedCategory: disputeCategory,
                    inquiryMode: btnOpenAccounts.classList.contains('active') ? 'open'
                        : btnNewInquiries.classList.contains('active') ? 'new' : 'inquiries'
                });
            } catch (err) {
                console.error('Unable to open full-page report preview:', err);
                try { previewWindow.close(); } catch (_) { /* Browser controls the tab. */ }
                window.alert('The preview could not be opened. Your extractor is still available.');
            }
        });
    }

    // ========================================
    // INITIALIZE
    // ========================================

    // Insert style once
    if (!document.getElementById('crc-styles')) {
        const styleElement = document.createElement("style");
        styleElement.id = 'crc-styles';
        styleElement.textContent = CSS_STYLES;
        document.head.appendChild(styleElement);
    }

    // Close any open legend popover when clicking outside of it
    // (delegated once so it survives panel re-creation on rescans)
    if (!window.__crcLegendListenerAdded) {
        window.__crcLegendListenerAdded = true;
        document.addEventListener('click', function(e) {
            document.querySelectorAll('.crc-legend-wrap').forEach(wrap => {
                if (!wrap.contains(e.target)) {
                    const pop = wrap.querySelector('.crc-legend-popover');
                    if (pop) pop.classList.remove('crc-show');
                }
            });
        });
    }

    // Create scan button if not already present
    if (!document.getElementById('crc-scan-btn')) {
        let scanButton = document.createElement("button");
        scanButton.id = "crc-scan-btn";
        scanButton.textContent = "CLICK ME!";

        scanButton.onclick = async function() {
            if (this.disabled) return;
            this.disabled = true;
            const prevText = this.textContent;
            this.textContent = 'Scanning...';
            try {
                expandNegativeDetails();
                await waitForNoMoreShowMore(5000, 150);
                try { extractData(); } catch (e) { console.error('extractData failed', e); }
            } catch (e) {
                console.error(e);
            } finally {
                this.disabled = false;
                this.textContent = prevText;
            }
        };

        document.body.appendChild(scanButton);
    }

})();

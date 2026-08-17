// ==UserScript==
// @name         crc test script
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Extract negative accounts + open accounts + dispute strategy from CRC
// @match        https://app.creditrepaircloud.com/app/clients/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Prevent double-install when script is injected multiple times
    if (window.__crcScriptInstalled) return;
    window.__crcScriptInstalled = true;
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
        "MIDLANDCRE"

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

    padding: 12px 14px;

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

    font-size: 21px;

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

    font-size: 18px;
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
   CLOSE BUTTON
   ========================================================= */

#crc-close-btn {
    background: #3a3b3c;
    color: #e4e6eb;
}


#crc-close-btn:hover {
    background: #e81123;
    color: #ffffff;
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

    font-size: 14px;
    font-weight: 500;
}


#crc-header-stats b {
    margin: 0;

    color: #e4e6eb;

    font-size: 15px;
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

    font-size: 13px;
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


#crc-page-2,
#crc-page-3 {
    display: none;
    font-size 16px;
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

    font-size: 16px;
    font-weight: 700;

    line-height: 1.35;
}


#crc-results > div > div {
    margin: 0 0 7px;

    color: #b0b3b8;

    font-size: 13px;

    line-height: 1.5;
}


#crc-results > div > div:last-child {
    margin-bottom: 0;

    color: #d8dadf;

    font-size: 12px;
    font-weight: 600;
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

    font-size: 11px !important;
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

    font-size: 14px;
    font-weight: 800;

    text-transform: uppercase;
    letter-spacing: .4px;

    cursor: pointer;

    user-select: none;
}


.crc-inquiry-bureau-arrow {
    display: inline-block;

    margin-left: 8px;

    font-size: 12px;

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

    font-size: 14px;
    font-weight: 700;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}


.crc-inquiry-status {
    width: 42px;

    flex-shrink: 0;

    color: #b0b3b8;

    font-size: 12px;
    font-weight: 800;

    text-align: center;
}


/* =========================================================
   DATE
   ========================================================= */

.crc-inquiry-date {
    margin-top: 2px;

    color: #8f9397;

    font-size: 12px;
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

    font-size: 11px;
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

    font-size: 18px;
    font-weight: 700;
}


.crc-page-subtitle {
    max-width: 290px;

    color: #b0b3b8;

    font-size: 13px;

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

    font-size: 13px;
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

    font-size: 13px;
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
    max-height: none;
}


#crc-negative-panel.crc-minimized #crc-header-divider,
#crc-negative-panel.crc-minimized #crc-header-stats,
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
    font-size: 14px;
    font-weight: 500;
}

.crc-stat-row b {
    color: #e4e6eb;
    font-size: 15px;
    font-weight: 700;
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
    font-size: 13px;
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

    font-size: 14px;
    font-weight: 800;

    text-transform: uppercase;
    letter-spacing: .5px;
}


/* No inquiries for a bureau */

.crc-inquiry-none {
    padding: 6px 4px;

    color: #6f7174;

    font-size: 13px;
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

    font-size: 12px;
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

    font-size: 12px;
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
   PAGE 3 - DISPUTE STRATEGY
   ========================================================= */

#crc-strategy {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 14px 18px;
    background: #18191a;
}

.crc-strategy-scan-row {
    display: flex;
    justify-content: center;
    margin: 4px 0 16px;
}

#crc-strategy-scan-btn {
    width: 100%;
    height: 42px;

    background: #2374e1;
    color: #fff;

    border: none;
    border-radius: 8px;

    cursor: pointer;

    font-size: 13px;
    font-weight: 700;

    transition: background .15s ease, transform .1s ease;
}

#crc-strategy-scan-btn:hover {
    background: #3982e4;
}

#crc-strategy-scan-btn:active {
    transform: scale(.98);
}

.crc-strategy-category {
    margin-bottom: 18px;
}

.crc-strategy-category-title {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin: 6px 2px 10px;

    color: #2d88ff;

    font-size: 14px;
    font-weight: 800;

    text-transform: uppercase;
    letter-spacing: .5px;

    cursor: pointer;
    user-select: none;
}

.crc-strategy-category-arrow {
    font-size: 12px;
    transition: transform .15s ease;
}

.crc-strategy-category.crc-collapsed .crc-strategy-category-arrow {
    transform: rotate(-90deg);
}

.crc-strategy-category.crc-collapsed .crc-strategy-items {
    display: none;
}

.crc-strategy-item {
    box-sizing: border-box;

    padding: 14px 16px;
    margin-bottom: 10px;

    background: #242526;
    border: 1px solid #3a3b3c;
    border-radius: 10px;
}

.crc-strategy-item b.crc-strategy-creditor {
    display: block;

    margin-bottom: 6px;

    color: #e4e6eb;

    font-size: 15px;
    font-weight: 700;
}

.crc-strategy-row {
    margin-bottom: 6px;

    color: #b0b3b8;

    font-size: 12.5px;
    line-height: 1.55;
}

.crc-strategy-row:last-of-type {
    margin-bottom: 10px;
}

.crc-strategy-row span.crc-strategy-label {
    color: #8f9397;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10.5px;
    letter-spacing: .4px;
    margin-right: 5px;
}

.crc-strategy-copy-btn {
    width: 100%;
    height: 36px;

    background: #3a3b3c;
    color: #e4e6eb;

    border: none;
    border-radius: 7px;

    cursor: pointer;

    font-size: 12px;
    font-weight: 700;

    transition: background .15s ease, transform .1s ease;
}

.crc-strategy-copy-btn:hover {
    background: #4e4f50;
}

.crc-strategy-copy-btn:active {
    transform: scale(.98);
}

.crc-strategy-master-copy-row {
    margin: 4px 0 18px;
}

#crc-strategy-master-copy-btn {
    width: 100%;
    height: 42px;

    background: #2374e1;
    color: #fff;

    border: none;
    border-radius: 8px;

    cursor: pointer;

    font-size: 13px;
    font-weight: 700;

    transition: background .15s ease, transform .1s ease;
}

#crc-strategy-master-copy-btn:hover {
    background: #3982e4;
}

#crc-strategy-master-copy-btn:active {
    transform: scale(.98);
}

#crc-strategy-master-copy-btn:disabled,
#crc-strategy-scan-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
}

/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 600px) {

    #crc-negative-panel {
        width: calc(100vw - 20px);

        height: 90vh;
        max-height: 90vh;

        top: 10px;
        right: 10px;
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

    const HTML_TEMPLATE = `
        <!-- TOP BAR -->
        <div id="crc-top-bar">
            <button id="crc-settings-btn" title="Settings">⚙</button>
            <div id="crc-window-controls">
                <button id="crc-minimize-btn" class="crc-window-btn" title="Minimize">−</button>
                <button id="crc-close-btn" class="crc-window-btn" title="Close">✕</button>
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
            <button id="crc-page-3-btn" class="crc-page-btn">DISPUTE STRATEGY</button>
        </div>

        <!-- PAGE CONTENT -->
        <div id="crc-page-content">
            <div id="crc-page-1" class="crc-page">
                <div id="crc-results"></div>
            </div>

        <div id="crc-page-2" class="crc-page">
    <div id="crc-inquiries"></div>
    <div id="crc-inquiry-copy-note">Only unconnected inquiries are copied.<br>Always double-check the report before disputing.</div>
</div>

            <div id="crc-page-3" class="crc-page">
                <div id="crc-strategy"></div>
            </div>
        </div>

        <!-- COPY BUTTONS (STICKY FOOTER) -->
        <div id="crc-copy-wrapper">
            <button id="crc-copy-page-1" class="crc-page-copy active">COPY NEGATIVE ACCOUNTS</button>
            <button id="crc-copy-page-2" class="crc-page-copy">COPY UNCONNECTED INQUIRIES</button>
        </div>
    `;

    // ========================================
    // JAVASCRIPT FUNCTIONS
    // ========================================

    function isKnownCollectionAgency(name) {
        let creditor = name.toLowerCase().trim();
        return COLLECTION_AGENCIES.some(agency => {
            agency = agency.toLowerCase().trim();
            return (
                creditor === agency ||
                creditor.includes(agency) ||
                agency.includes(creditor)
            );
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

    function isInquiryConnectedToOpenAccount(creditorName, bureauKey, openAccountsByBureau) {
        const creditor = normalizeAccountName(creditorName);
        if (!creditor || !bureauKey) return false;

        const list = openAccountsByBureau[bureauKey] || [];

        return list.some(acc => {
            const accName = normalizeAccountName(acc.account);
            return namesMatch(creditor, accName);
        });
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
        if (isNaN(d.getTime())) return null;

        return d;
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
                const priority = ["equifax", "experian", "transunion"];
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
                const priority = ["equifax", "experian", "transunion"];
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

                const priority = ["equifax", "experian", "transunion"];
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
                const creditor = accountName.toLowerCase().trim();

                for (const name of COLLECTION_AGENCIES) {
                    const agency = name.toLowerCase().trim();
                    if (creditor === agency || creditor.startsWith(agency + " ") || creditor.endsWith(" " + agency)) {
                        return "COLLECTION";
                    }
                }

                let text = "";
                Object.values(rows).forEach(row => {
                    bureaus.map(b => b.toLowerCase()).forEach(bureau => {
                        let cell = row.querySelector(`[data-field="${bureau}"]`);
                        if (cell) {
                            text += " " + ((cell.textContent || '').toLowerCase());
                        }
                    });
                });

                const priority = [
                    ["other collection agencies", "COLLECTION"],
                    ["original creditor", "COLLECTION"],
                    ["placed for collection", "COLLECTION"],
                    ["repossessed", "Repossessed"],
                    ["foreclosure", "Foreclosure"],
                    ["REPOSSESSION", "Repossessed"],
                    ["INVOLUNTARY REPOSSESSION", "Repossessed"],
                    ["DEBT INCLUDED IN OR DISCHARGED THROUGH BANKRUPTCY", "INCLUDED IN BANKRUPTCY"],
                    ["INCLUDED IN BANKRUPTCY", "INCLUDED IN BANKRUPTCY"],
                    ["collection/charge off", "CHARGE OFF"],
                    ["charge off", "CHARGE OFF"],
                    ["charged off", "CHARGE OFF"],
                    ["profit and loss", "CHARGE OFF"],
                    ["write off", "CHARGE OFF"],
                    ["LOSS BY CREDIT GRANTOR", "CHARGE OFF"],
                    ["COLLECTION", "CHARGE OFF"],
                    ["CHAPTER", "INCLUDED IN BANKRUPTCY"],
                    ["transferred", "Transferred"],
                    ["closed", "CLOSED LP"],
                    ["open", "OPEN LP"],
                    ["paid", "PAID LP"]
                ];

                let found = [];
                for (const [keyword, result] of priority) {
                    if (text.includes(keyword.toLowerCase())) {
                        found.push(result);
                    }
                }

                if (found.includes("INCLUDED IN BANKRUPTCY")) return "INCLUDED IN BANKRUPTCY";
                if (found.includes("COLLECTION")) return "COLLECTION";
                if (found.includes("CHARGE OFF")) return "CHARGE OFF";
                if (found.includes("Repossessed")) return "Repossessed";
                if (found.includes("Foreclosure")) return "Foreclosure";
                if (found.includes("Bankruptcy")) return "Bankruptcy";
                if (found.includes("Transferred")) return "Transferred";
                if (found.includes("CLOSED LP")) return "CLOSED LP";
                if (found.includes("OPEN LP")) return "OPEN LP";
                if (found.includes("PAID LP")) return "PAID LP";

                return "";
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

            let collectionWarning = "";

const fullAccountText = (grid.textContent || '').toLowerCase();

const collectionIndicators = [
    "original creditor",
    "placed for collection",
    "other collection agencies",
];

const hasCollectionIndicator = collectionIndicators.some(keyword =>
    fullAccountText.includes(keyword)
);

const knownCollectionAgency = isKnownCollectionAgency(accountName);

if (
    hasCollectionIndicator &&
    !knownCollectionAgency
) {
    collectionWarning = "⚠ VERIFY COLLECTION ACCT";
}

            output.push({
                account: accountName,
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
    // Returns the plain-text copy string
    // (UNCONNECTED inquiries only).
    // ========================================

    function renderInquiryBureauGroups(container, groups, emptyLabel) {
        let copyText = "";

        groups.forEach(group => {
            const section = document.createElement("div");
            section.className = "crc-inquiry-section";

            const header = document.createElement("div");
            header.className = "crc-inquiry-bureau";

            const headerTitle = document.createElement("span");
            headerTitle.textContent = `${group.title} (${group.items.length})`;

            const headerArrow = document.createElement("span");
            headerArrow.className = "crc-inquiry-bureau-arrow";
            headerArrow.textContent = "▾";

            header.appendChild(headerTitle);
            header.appendChild(headerArrow);

            header.addEventListener("click", function() {
                section.classList.toggle("crc-collapsed");
            });

            section.appendChild(header);

            const itemsWrap = document.createElement("div");
            itemsWrap.className = "crc-inquiry-items";

            let unconnectedInGroup = [];

            if (group.items.length === 0) {
                const none = document.createElement("div");
                none.className = "crc-inquiry-none";
                none.textContent = emptyLabel || "No inquiries";
                itemsWrap.appendChild(none);
            } else {
                group.items.forEach(item => {
                    const connected = item.connectedToOpen === true;

                    if (!connected) {
                        unconnectedInGroup.push(item);
                    }

                    const inquiry = document.createElement("div");
                    inquiry.className = "crc-inquiry-row " +
                        (connected ? "crc-inq-connected" : "crc-inq-unconnected");
                    inquiry.title = connected
                        ? "Connected to Open Account"
                        : "Not Connected to Open Account";

                    const topRow = document.createElement("div");
                    topRow.className = "crc-inquiry-top-row";

                    const creditor = document.createElement("div");
                    creditor.className = "crc-inquiry-creditor";
                    creditor.textContent = item.creditor || "(No creditor)";

                    const status = document.createElement("div");
                    status.className = "crc-inquiry-status";
                    status.textContent = (item.action && /already disputed/i.test(item.action)) ? "AD" : "ND";

                    topRow.appendChild(creditor);
                    topRow.appendChild(status);

                    const date = document.createElement("div");
                    date.className = "crc-inquiry-date";
                    date.textContent = item.date || "";

                    inquiry.appendChild(topRow);
                    inquiry.appendChild(date);

                    itemsWrap.appendChild(inquiry);
                });
            }

            section.appendChild(itemsWrap);
            container.appendChild(section);

            // Copy text only includes UNCONNECTED inquiries.
            copyText += `${group.title.toUpperCase()}:\n\n`;
            if (unconnectedInGroup.length === 0) {
                copyText += `(No unconnected inquiries)\n\n`;
            } else {
                unconnectedInGroup.forEach(item => {
                    copyText += `- ${(item.creditor || "(No creditor)").toLowerCase()} ${item.date || ""}\n`;
                });
                copyText += `\n`;
            }
        });

        return copyText.trim();
    }

    // ========================================================
    // PAGE 3 — DISPUTE STRATEGY ANALYSIS ENGINE
    //
    // Pipeline:
    //   CRC REPORT -> RAW TABLE ANALYSIS -> ACCOUNT NORMALIZATION
    //   -> BUREAU ANALYSIS -> STATUS CLASSIFICATION
    //   -> NEGATIVE ISSUE DETECTION -> DISPUTE STRATEGY
    //   -> LETTER PROMPT GENERATION
    //
    // This layer re-reads the raw CRC DataGrids directly. It does
    // NOT rely solely on `negativeData` (per spec section 17), so
    // it can see fields negativeData may omit.
    // ========================================================

    const STRATEGY_BUREAUS = [
        { key: "experian", label: "EXPERIAN" },
        { key: "equifax", label: "EQUIFAX" },
        { key: "transunion", label: "TRANSUNION" }
    ];

    const STRATEGY_FIELD_LABELS = [
        "account status", "account type", "account type - detail", "account type detail",
        "balance", "balance owed", "account #", "date opened", "date closed",
        "payment status", "late payment status", "payment history", "comments",
        "remarks", "bureau code", "original creditor", "high balance", "credit limit",
        "monthly payment", "past due amount", "terms", "responsibility"
    ];

    function naOrValue(v) {
        const t = (v || "").trim();
        return t && t !== "-" && t !== "--" ? t : "Not available in the report data.";
    }

    // ------------------------------------------------------
    // Read every labeled row of a single account grid into a
    // { fieldLabel: { experian: val, equifax: val, transunion: val } }
    // structure, covering every row present (not just a fixed
    // known list), so nothing in the table is skipped.
    // ------------------------------------------------------

    function readGridFieldsByBureau(grid) {
        const fields = {};

        grid.querySelectorAll('.MuiDataGrid-row').forEach(row => {
            const labelCell = row.querySelector('[data-field="label"]');
            if (!labelCell) return;

            const rawLabel = (labelCell.textContent || '').trim().replace(":", "");
            if (!rawLabel) return;

            const key = rawLabel.toLowerCase();
            if (!fields[key]) {
                fields[key] = { displayLabel: rawLabel, experian: "", equifax: "", transunion: "" };
            }

            STRATEGY_BUREAUS.forEach(b => {
                const cell = row.querySelector(`[data-field="${b.key}"]`);
                if (!cell) return;
                const val = (cell.textContent || '').trim();
                if (val && val !== "-" && val !== "--") {
                    fields[key][b.key] = val;
                }
            });
        });

        return fields;
    }

    function getField(fields, label) {
        return fields[label.toLowerCase()] || null;
    }

    function fieldValueForBureau(fields, label, bureauKey) {
        const f = getField(fields, label);
        if (!f) return "";
        return f[bureauKey] || "";
    }

    function bureauHasAnyData(fields, bureauKey) {
        return Object.values(fields).some(f => (f[bureauKey] || "").trim() !== "");
    }

    // ------------------------------------------------------
    // Determine which negative categories apply to a given
    // bureau's reporting of a single account, based ONLY on
    // that bureau's own cell values (spec section 7: never
    // attribute an issue to a bureau that isn't reporting it).
    // ------------------------------------------------------

    function classifyAccountForBureau(accountName, fields, bureauKey) {
        if (!bureauHasAnyData(fields, bureauKey)) return null;

        const categories = new Set();
        const issues = [];

        const status = (fieldValueForBureau(fields, "account status", bureauKey) || "").toLowerCase();
        const typeDetail = (
            (fieldValueForBureau(fields, "account type - detail", bureauKey) || "") + " " +
            (fieldValueForBureau(fields, "account type detail", bureauKey) || "") + " " +
            (fieldValueForBureau(fields, "account type", bureauKey) || "")
        ).toLowerCase();
        const paymentStatus = (fieldValueForBureau(fields, "payment status", bureauKey) || "").toLowerCase();
        const latePayment = (fieldValueForBureau(fields, "late payment status", bureauKey) || "").toLowerCase();
        const paymentHistory = (fieldValueForBureau(fields, "payment history", bureauKey) || "").toLowerCase();
        const comments = (fieldValueForBureau(fields, "comments", bureauKey) || "").toLowerCase();
        const remarks = (fieldValueForBureau(fields, "remarks", bureauKey) || "").toLowerCase();
        const balance = fieldValueForBureau(fields, "balance", bureauKey) || fieldValueForBureau(fields, "balance owed", bureauKey);
        const dateClosed = fieldValueForBureau(fields, "date closed", bureauKey);
        const originalCreditor = fieldValueForBureau(fields, "original creditor", bureauKey);

        const combinedText = [status, typeDetail, paymentStatus, latePayment, paymentHistory, comments, remarks].join(" ");

        const isKnownAgency = isKnownCollectionAgency(accountName);

        // ---- OPEN / CLOSED ----
        if (status === "open") categories.add("OPEN");
        if (status === "closed") categories.add("CLOSED");

        // ---- LATE PAYMENTS ----
        const hasLateSignal =
            /\b(30|60|90|120|150|180)\b.*(day|late)/.test(combinedText) ||
            /late/.test(latePayment) ||
            /\b(30|60|90|120|150|180)\b/.test(paymentHistory);

        if (hasLateSignal) {
            categories.add("LATE PAYMENTS");
            if (status === "closed") {
                issues.push("Closed account reporting late payments. Review the payment history and reporting dates for accuracy and consistency.");
            } else {
                issues.push("Late payment activity reported. Review payment history and account status fields for consistency.");
            }
        }

        // ---- CHARGE OFF ----
        if (/charge[\s-]?off|profit and loss|write[\s-]?off|loss by credit grantor/.test(combinedText)) {
            categories.add("CHARGE OFF");
            issues.push("Charge-off reported. Review balance, charge-off date, and payment status for consistency and continued accuracy.");
        }

        // ---- COLLECTION ----
        if (
            /collection/.test(combinedText) ||
            /original creditor|placed for collection|other collection agencies/.test(combinedText) ||
            isKnownAgency
        ) {
            categories.add("COLLECTION");
            let collectionIssue = "Collection account reported.";
            if (!isKnownAgency && /original creditor|placed for collection/.test(combinedText)) {
                collectionIssue += " Verify the collection agency, original creditor, balance, and account number are being reported accurately and consistently.";
            } else {
                collectionIssue += " Review balance, dates, and original creditor information for accuracy and consistency between bureaus.";
            }
            issues.push(collectionIssue);
        }

        // ---- TRANSFERRED ----
        if (/transferred/.test(combinedText)) {
            categories.add("TRANSFERRED");
            let transferIssue = "Account reported as transferred.";
            if (balance && balance !== "$0" && balance.toLowerCase() !== "0") {
                transferIssue += " A balance is still reporting on a transferred account — review whether the balance and status are consistent with the transfer.";
            } else {
                transferIssue += " Review the original creditor and new creditor/collector information for consistency.";
            }
            issues.push(transferIssue);
        }

        // ---- REPOSSESSION ----
        if (/repossess/.test(combinedText)) {
            categories.add("REPOSSESSION");
            issues.push("Repossession reported. Review status, balance, dates, and payment history for consistency across bureaus.");
        }

        // ---- FORECLOSURE ----
        if (/foreclos/.test(combinedText)) {
            categories.add("FORECLOSURE");
            issues.push("Foreclosure reported. Review status, balance, dates, and payment history for consistency across bureaus.");
        }

        // ---- BANKRUPTCY / INCLUDED IN BANKRUPTCY ----
        if (/included in bankruptcy|discharged through bankruptcy/.test(combinedText)) {
            categories.add("INCLUDED IN BANKRUPTCY");
            let bkIssue = "Account reported as included in / discharged through bankruptcy.";
            if (balance && balance !== "$0" && balance.toLowerCase() !== "0") {
                bkIssue += " A balance is still reporting on an account marked included in bankruptcy — this may need review.";
            } else {
                bkIssue += " Review remaining balance and continued collection/charge-off reporting for accuracy.";
            }
            issues.push(bkIssue);
        } else if (/bankruptcy|chapter\s*7|chapter\s*13/.test(combinedText)) {
            categories.add("BANKRUPTCY");
            issues.push("Bankruptcy-related remarks found. Review remaining balance and continued negative reporting for accuracy.");
        }

        // ---- PAID ----
        if (/\bpaid\b/.test(combinedText) && !/paid.*charge|charged off/.test(combinedText)) {
            categories.add("PAID");
        }

        // ---- Closed-account-specific continued negative reporting ----
        if (status === "closed" && dateClosed && /open|active/.test(status) === false) {
            if (hasLateSignal || /collection|charge/.test(combinedText)) {
                issues.push("Closed account still shows negative activity after the closure date. Review the closure date against continued negative reporting for consistency.");
            }
        }

        // ---- OTHER NEGATIVE (fallback) ----
        if (categories.size === 0 && /derogatory|negative/.test(combinedText)) {
            categories.add("OTHER NEGATIVE");
            issues.push("Account reflects negative reporting. Review all reported fields for accuracy and completeness.");
        }

        if (categories.size === 0) return null;

        return {
            accountName: accountName,
            bureauKey: bureauKey,
            bureauLabel: STRATEGY_BUREAUS.find(b => b.key === bureauKey).label,
            categories: Array.from(categories),
            issues: issues,
            status: naOrValue(fieldValueForBureau(fields, "account status", bureauKey)),
            accountType: naOrValue(typeDetail.trim() ? (fieldValueForBureau(fields, "account type", bureauKey) || fieldValueForBureau(fields, "account type - detail", bureauKey)) : ""),
            balance: naOrValue(balance),
            originalCreditor: naOrValue(originalCreditor)
        };
    }

    // ------------------------------------------------------
    // FULL TABLE SCAN
    // Walks every account-shaped DataGrid on the page (same
    // grid-detection approach as extractData/extractOpenAccounts)
    // and produces one classification entry per bureau that
    // actually reports a negative condition on that account.
    // ------------------------------------------------------

    function scanFullReportForStrategy() {
        const entries = [];
        const grids = document.querySelectorAll('.MuiDataGrid-root');

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

            const fields = readGridFieldsByBureau(grid);

            STRATEGY_BUREAUS.forEach(b => {
                const entry = classifyAccountForBureau(accountName, fields, b.key);
                if (entry) entries.push(entry);
            });
        });

        // De-duplicate identical account+bureau+category combos
        const seen = new Set();
        const deduped = [];
        entries.forEach(e => {
            const key = `${e.accountName}|${e.bureauKey}|${e.categories.join(',')}`;
            if (seen.has(key)) return;
            seen.add(key);
            deduped.push(e);
        });

        return deduped;
    }

    // ------------------------------------------------------
    // Legal principle mapping — used only to reference
    // applicable dispute/accuracy principles, never to
    // assert a confirmed violation (spec section 9).
    // ------------------------------------------------------

    const STRATEGY_LEGAL_PRINCIPLES =
        "the FCRA dispute and reinvestigation process (15 U.S.C. §1681i), " +
        "the requirement that consumer reporting agencies follow reasonable procedures " +
        "to assure maximum possible accuracy (15 U.S.C. §1681e(b)), and furnisher " +
        "accuracy obligations regarding disputed information (15 U.S.C. §1681s-2)";

    // ------------------------------------------------------
    // LETTER PROMPT GENERATION
    // Builds a natural-language prompt per spec sections 10-13.
    // Groups by bureau + shared category set so unrelated
    // issues are not combined, and different bureaus are
    // never combined together.
    // ------------------------------------------------------

    function buildLetterPrompt(bureauLabel, items) {
        const names = items.map(i => i.accountName);
        const uniqueNames = Array.from(new Set(names));

        const allIssues = [];
        items.forEach(i => i.issues.forEach(iss => { if (!allIssues.includes(iss)) allIssues.push(iss); }));

        const issueText = allIssues.length
            ? allIssues.join(" ")
            : "Review the reported information for accuracy and completeness.";

        if (uniqueNames.length === 1) {
            const item = items[0];
            const conditionWords = item.categories.join(" / ").toLowerCase();
            return `Make me a dispute letter for ${bureauLabel} regarding the ${item.status.toLowerCase() === "not available in the report data." ? "" : item.status.toLowerCase() + " "}${item.accountName} account` +
                `${conditionWords ? ` that is reporting ${conditionWords}` : ""}. ${issueText} ` +
                `Explain the reporting issue clearly, request a proper reinvestigation, and request correction or deletion of any information that cannot be verified as accurate. ` +
                `Apply ${STRATEGY_LEGAL_PRINCIPLES}.`;
        }

        const nameList = uniqueNames.map(n => `\n- ${n}`).join("");
        return `Make me a dispute letter for ${bureauLabel} regarding the following accounts:${nameList}\n\n` +
            `Analyze each account separately and identify any accuracy, completeness, balance, date, status, original-creditor, or reporting inconsistencies. ${issueText} ` +
            `Apply ${STRATEGY_LEGAL_PRINCIPLES} and request reinvestigation and correction or deletion of information that cannot be verified as accurate.`;
    }

    // ------------------------------------------------------
    // Build the full strategy model:
    //   { categoryName: [ { accountName, bureauLabel, ...meta, prompt } ] }
    // Grouping for prompts: same bureau + same category set
    // -> combined prompt; otherwise individual prompts.
    // ------------------------------------------------------

    const STRATEGY_CATEGORY_ORDER = [
        "OPEN", "CLOSED", "LATE PAYMENTS", "CHARGE OFF", "COLLECTION",
        "TRANSFERRED", "REPOSSESSION", "FORECLOSURE", "BANKRUPTCY",
        "INCLUDED IN BANKRUPTCY", "PAID", "OTHER NEGATIVE"
    ];

    function buildDisputeStrategyModel() {
        const entries = scanFullReportForStrategy();

        const byCategory = {};
        STRATEGY_CATEGORY_ORDER.forEach(cat => { byCategory[cat] = []; });

        entries.forEach(entry => {
            entry.categories.forEach(cat => {
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(entry);
            });
        });

        // Build per-bureau grouping keyed by category-set signature,
        // for combined prompts (spec section 13).
        const groupKeyOf = (entry) => `${entry.bureauKey}|${entry.categories.slice().sort().join(',')}`;
        const promptGroups = {};

        entries.forEach(entry => {
            const key = groupKeyOf(entry);
            if (!promptGroups[key]) promptGroups[key] = [];
            promptGroups[key].push(entry);
        });

        // Assign a generated prompt to each entry (shared across
        // its group so identical items show the same combined text).
        Object.values(promptGroups).forEach(group => {
            const bureauLabel = group[0].bureauLabel;
            const prompt = buildLetterPrompt(bureauLabel, group);
            group.forEach(e => { e.prompt = prompt; });
        });

        return { byCategory: byCategory, entries: entries, promptGroups: promptGroups };
    }

    // ------------------------------------------------------
    // RENDER PAGE 3
    // ------------------------------------------------------

    function renderStrategyPage(container, masterCopyBtn) {
        container.innerHTML = "";

        const scanRow = document.createElement("div");
        scanRow.className = "crc-strategy-scan-row";
        const scanBtn = document.createElement("button");
        scanBtn.id = "crc-strategy-scan-btn";
        scanBtn.textContent = "SCAN / ANALYZE REPORT";
        scanRow.appendChild(scanBtn);
        container.appendChild(scanRow);

        const resultsHost = document.createElement("div");
        container.appendChild(resultsHost);

        let allPromptsText = "";

        function runAnalysis() {
            resultsHost.innerHTML = "";
            allPromptsText = "";

            const model = buildDisputeStrategyModel();
            let anyResults = false;

            STRATEGY_CATEGORY_ORDER.forEach(catName => {
                const items = model.byCategory[catName] || [];
                if (items.length === 0) return;

                anyResults = true;

                const catWrap = document.createElement("div");
                catWrap.className = "crc-strategy-category";

                const catTitle = document.createElement("div");
                catTitle.className = "crc-strategy-category-title";

                const catTitleText = document.createElement("span");
                catTitleText.textContent = `${catName} (${items.length})`;

                const catArrow = document.createElement("span");
                catArrow.className = "crc-strategy-category-arrow";
                catArrow.textContent = "▾";

                catTitle.appendChild(catTitleText);
                catTitle.appendChild(catArrow);
                catTitle.addEventListener("click", () => catWrap.classList.toggle("crc-collapsed"));

                catWrap.appendChild(catTitle);

                const itemsWrap = document.createElement("div");
                itemsWrap.className = "crc-strategy-items";

                // De-dup identical account+bureau combos WITHIN this category's display
                const seenInCat = new Set();

                items.forEach(item => {
                    const dedupKey = `${item.accountName}|${item.bureauKey}`;
                    if (seenInCat.has(dedupKey)) return;
                    seenInCat.add(dedupKey);

                    const card = document.createElement("div");
                    card.className = "crc-strategy-item";

                    const nameEl = document.createElement("b");
                    nameEl.className = "crc-strategy-creditor";
                    nameEl.textContent = item.accountName;
                    card.appendChild(nameEl);

                    function addRow(label, value) {
                        const row = document.createElement("div");
                        row.className = "crc-strategy-row";
                        const lbl = document.createElement("span");
                        lbl.className = "crc-strategy-label";
                        lbl.textContent = label;
                        row.appendChild(lbl);
                        row.appendChild(document.createTextNode(value));
                        card.appendChild(row);
                    }

                    addRow("Bureau", item.bureauLabel);
                    addRow("Status", item.status);
                    addRow("Negative Condition", item.categories.join(", "));
                    addRow("Why It May Need Review", item.issues.length ? item.issues.join(" ") : "Not available in the report data.");

                    const copyBtn = document.createElement("button");
                    copyBtn.className = "crc-strategy-copy-btn";
                    copyBtn.textContent = "COPY PROMPT";
                    copyBtn.addEventListener("click", function() {
                        navigator.clipboard.writeText(item.prompt || "");
                        this.textContent = "✓ COPIED";
                        setTimeout(() => { this.textContent = "COPY PROMPT"; }, 1500);
                    });
                    card.appendChild(copyBtn);

                    itemsWrap.appendChild(card);
                });

                catWrap.appendChild(itemsWrap);
                resultsHost.appendChild(catWrap);
            });

            // Build master copy text from unique prompt groups
            const seenPrompts = new Set();
            Object.values(model.promptGroups).forEach(group => {
                const prompt = group[0].prompt;
                if (seenPrompts.has(prompt)) return;
                seenPrompts.add(prompt);
                allPromptsText += `${group[0].bureauLabel} — ${group.map(g => g.accountName).join(', ')}\n${prompt}\n\n`;
            });
            allPromptsText = allPromptsText.trim();

            if (masterCopyBtn) {
                masterCopyBtn.disabled = !anyResults;
            }

            if (!anyResults) {
                const empty = document.createElement("div");
                empty.className = "crc-empty-page";
                empty.innerHTML = '<div class="crc-page-title">No negative items detected</div><div class="crc-page-subtitle">Run a scan first, or no disputable issues were found in the report data.</div>';
                resultsHost.appendChild(empty);
            }

            return allPromptsText;
        }

        scanBtn.addEventListener("click", function() {
            this.disabled = true;
            const prevText = this.textContent;
            this.textContent = "Analyzing...";
            try {
                runAnalysis();
            } catch (e) {
                console.error("Dispute strategy analysis failed", e);
            } finally {
                this.disabled = false;
                this.textContent = prevText;
            }
        });

        if (masterCopyBtn) {
            masterCopyBtn.disabled = true;
            masterCopyBtn.onclick = function() {
                navigator.clipboard.writeText(allPromptsText || "");
                this.textContent = "✓ COPIED";
                setTimeout(() => { this.textContent = "COPY ALL STRATEGY PROMPTS"; }, 1500);
            };
        }

        return { runAnalysis: runAnalysis, getPromptsText: () => allPromptsText };
    }

    function showResults(negativeData) {
        let bankruptcies = extractBankruptcies();
        let openAccountsData = extractOpenAccounts();
        let openAccounts = openAccountsData.list;
        let openAccountsByBureau = openAccountsData.byBureau;
        let inquiries = extractInquiries();

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
        if (old) old.remove();

        let panel = document.createElement("div");
        panel.id = "crc-negative-panel";
        panel.innerHTML = HTML_TEMPLATE;
        document.body.appendChild(panel);

        // Update counters
        panel.querySelector('[data-negative-count]').textContent = negativeData.length;
        panel.querySelector('[data-negative-items-count]').textContent = negativeItemCount;
        panel.querySelector('[data-bankruptcy-count]').textContent = bankruptcies.length;

        // ========================================
        // PAGE 1 - NEGATIVE ACCOUNTS
        // ========================================

        let results = panel.querySelector("#crc-results");
        let copyTextNegative = "";

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
            <div class="crc-legend-row"><span class="crc-legend-dot" style="background:#3ab25c"></span>Connected to Open Account</div>
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

        const bureauGroups = [
            { title: "Experian", items: inquiries.filter(i => i.experian) },
            { title: "Equifax", items: inquiries.filter(i => i.equifax) },
            { title: "TransUnion", items: inquiries.filter(i => i.transunion) }
        ];

        const copyTextOpenInquiries = renderInquiryBureauGroups(inquiriesView, bureauGroups, "No inquiries");

        // ========================================
        // NEW INQUIRIES (today back to 35 days ago)
        // ========================================

        const newInquiries = filterRecentInquiries(inquiries, 35);

        const newBureauGroups = [
            { title: "Experian", items: newInquiries.filter(i => i.experian) },
            { title: "Equifax", items: newInquiries.filter(i => i.equifax) },
            { title: "TransUnion", items: newInquiries.filter(i => i.transunion) }
        ];

        const copyTextNewInquiries = renderInquiryBureauGroups(newInquiriesView, newBureauGroups, "No recent inquiries");

        btnNewInquiries.textContent = `NEW (${newInquiries.length})`;

        // ========================================
        // OPEN ACCOUNTS VIEW
        // ========================================

        if (!openAccounts || openAccounts.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'crc-empty-page';
            empty.innerHTML = '<div class="crc-page-title">No open accounts</div><div class="crc-page-subtitle">No open accounts found on this report.</div>';
            openAccountsView.appendChild(empty);
            copyTextOpenAccounts = '(No open accounts)';
        } else {
            openAccounts.forEach(acc => {
                const card = document.createElement('div');
                const isNegative = isOpenAccountNegative(acc.account, negativeData);
                card.className = 'crc-open-account ' + (isNegative ? 'crc-open-negative-card' : 'crc-open-positive-card');

                const h = document.createElement('b'); h.textContent = acc.account;
                const aNum = document.createElement('div'); aNum.textContent = acc.account_number || '';
                const bal = document.createElement('div'); bal.textContent = acc.balance || '';
                const meta = document.createElement('div'); meta.textContent = `${acc.bureau_display || ''} ${acc.account_type || ''}`;

                card.appendChild(h);
                card.appendChild(aNum);
                card.appendChild(bal);
                card.appendChild(meta);

                openAccountsView.appendChild(card);

                copyTextOpenAccounts += `${acc.account}\n${acc.account_number || ''}\n${acc.balance || ''}\n${acc.bureau_display || ''} ${acc.account_type || ''}\n\n`;
            });

            copyTextOpenAccounts = copyTextOpenAccounts.trim();
        }

        // Subtab switching
        function setActiveInquirySubtab(view) {
            btnInquiries.classList.toggle('active', view === 'inquiries');
            btnOpenAccounts.classList.toggle('active', view === 'open');
            btnNewInquiries.classList.toggle('active', view === 'new');

            inquiriesView.style.display = view === 'inquiries' ? '' : 'none';
            openAccountsView.style.display = view === 'open' ? '' : 'none';
            newInquiriesView.style.display = view === 'new' ? '' : 'none';

            // Copy note (spec section 4) only makes sense for the
            // INQUIRIES / NEW subtabs, since those are the only ones
            // filtered to unconnected items.
            const note = panel.querySelector('#crc-inquiry-copy-note');
            if (note) {
                note.classList.toggle('active', view === 'inquiries' || view === 'new');
            }
        }

        btnInquiries.addEventListener('click', () => setActiveInquirySubtab('inquiries'));
        btnOpenAccounts.addEventListener('click', () => setActiveInquirySubtab('open'));
        btnNewInquiries.addEventListener('click', () => setActiveInquirySubtab('new'));

        // ========================================
        // PAGE 3 - DISPUTE STRATEGY
        // ========================================

        const strategyContainer = panel.querySelector('#crc-strategy');

        const masterCopyRow = document.createElement('div');
        masterCopyRow.className = 'crc-strategy-master-copy-row';
        const masterCopyBtn = document.createElement('button');
        masterCopyBtn.id = 'crc-strategy-master-copy-btn';
        masterCopyBtn.textContent = 'COPY ALL STRATEGY PROMPTS';
        masterCopyRow.appendChild(masterCopyBtn);

        const strategyController = renderStrategyPage(strategyContainer, masterCopyBtn);
        strategyContainer.appendChild(masterCopyRow);

        // ========================================
        // WINDOW CONTROLS
        // ========================================

        panel.querySelector("#crc-close-btn").onclick = function() {
            panel.remove();
        };

        panel.querySelector("#crc-minimize-btn").onclick = function() {
            panel.classList.toggle("crc-minimized");
            this.textContent = panel.classList.contains("crc-minimized") ? "+" : "−";
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

        // Page 3 has its own in-page copy controls (per-item COPY
        // PROMPT + master COPY ALL STRATEGY PROMPTS), so the sticky
        // footer only toggles for pages 1 and 2.
        const copyButtons = [
            panel.querySelector("#crc-copy-page-1"),
            panel.querySelector("#crc-copy-page-2")
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

        copyButtons[0].onclick = function() {
            navigator.clipboard.writeText(copyTextNegative);
            this.textContent = "✓ COPIED";
            setTimeout(() => { this.textContent = "COPY NEGATIVE ACCOUNTS"; }, 1500);
        };

        copyButtons[1].onclick = function() {
            // Copy depending on active subtab inside inquiries.
            // Only OPEN ACCOUNTS subtab copies connected-agnostic
            // account data; INQUIRIES/NEW copy UNCONNECTED only
            // (already filtered inside renderInquiryBureauGroups).
            try {
                if (btnOpenAccounts.classList.contains('active')) {
                    navigator.clipboard.writeText(copyTextOpenAccounts || '');
                } else if (btnNewInquiries.classList.contains('active')) {
                    navigator.clipboard.writeText(copyTextNewInquiries || '');
                } else {
                    navigator.clipboard.writeText(copyTextOpenInquiries || '');
                }
            } catch (e) {
                navigator.clipboard.writeText(copyTextOpenInquiries || '');
            }
            this.textContent = "✓ COPIED";
            setTimeout(() => { this.textContent = "COPY UNCONNECTED INQUIRIES"; }, 1500);
        };
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

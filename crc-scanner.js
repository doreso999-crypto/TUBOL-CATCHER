// ==UserScript==
// @name         WORKSHOP! [WITH PAGE 2 OPEN ACCOUNTS]
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Extract negative accounts + open accounts from CRC
// @match        https://app.creditrepaircloud.com/app/clients/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

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
        "receivable solutions", "aldous", "jeffcaps", "jefferson capital systems", "portfolio"
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
   OPEN ACCOUNTS CONTAINER
   ========================================================= */

#crc-open-accounts {
    width: 100%;

    box-sizing: border-box;

    padding: 8px 14px 18px;

    background: #18191a;

    min-height: max-content;
}


/* =========================================================
   OPEN ACCOUNT CARDS
   ========================================================= */

#crc-open-accounts > div {
    box-sizing: border-box;

    padding: 17px 18px;

    margin-bottom: 10px;

    background: #243a36;

    border: 1px solid #2d5052;
    border-radius: 10px;

    transition:
        background .15s ease,
        border-color .15s ease;
}


#crc-open-accounts > div:hover {
    background: #2a4844;

    border-color: #3a6f74;
}


#crc-open-accounts > div > b:first-child {
    display: block;

    margin: 0 0 9px;

    color: #a3d5d0;

    font-size: 16px;
    font-weight: 700;

    line-height: 1.35;
}


#crc-open-accounts > div > div {
    margin: 0 0 7px;

    color: #7dbfb8;

    font-size: 13px;

    line-height: 1.5;
}


#crc-open-accounts > div > div:last-child {
    margin-bottom: 0;

    color: #9dd6d1;

    font-size: 12px;
    font-weight: 600;
}


/* =========================================================
   OPEN ACCOUNT STATUS
   ========================================================= */

#crc-open-accounts .crc-account-status {
    display: inline-block;

    margin-top: 8px;
    padding: 5px 9px;

    background: rgba(163, 213, 208, .12);

    border: 1px solid rgba(163, 213, 208, .25);

    border-radius: 6px;

    color: #6ecac0;

    font-size: 11px;
    font-weight: 700;
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
            <button id="crc-page-2-btn" class="crc-page-btn">OPEN</button>
            <button id="crc-page-3-btn" class="crc-page-btn">PAGE 3</button>
        </div>

        <!-- PAGE CONTENT -->
        <div id="crc-page-content">
            <div id="crc-page-1" class="crc-page">
                <div id="crc-results"></div>
            </div>

            <div id="crc-page-2" class="crc-page">
                <div id="crc-open-accounts"></div>
            </div>

            <div id="crc-page-3" class="crc-page">
                <div class="crc-empty-page">
                    <div class="crc-page-title">PAGE 3</div>
                    <div class="crc-page-subtitle">Content will be added here.</div>
                </div>
            </div>
        </div>

        <!-- COPY BUTTONS (STICKY FOOTER) -->
        <div id="crc-copy-wrapper">
            <button id="crc-copy-page-1" class="crc-page-copy active">COPY NEGATIVE ACCOUNTS</button>
            <button id="crc-copy-page-2" class="crc-page-copy">COPY OPEN ACCOUNTS</button>
            <button id="crc-copy-page-3" class="crc-page-copy">COPY PAGE 3</button>
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

    function expandNegativeDetails() {
        let buttons = document.querySelectorAll("div.MuiBox-root");
        buttons.forEach(btn => {
            let text = btn.innerText.trim();
            if (text === "Show More Details +") {
                btn.click();
            }
        });
    }

    function extractOpenAccounts() {
        let output = [];
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
                let label = labelCell.innerText.trim().replace(":", "").toLowerCase();
                if (label === "account status") {
                    statusRow = row;
                }
            });

            if (!statusRow) {
                return;
            }

            const bureauInfo = [
                { name: "experian", code: "EX" },
                { name: "equifax", code: "EQU" },
                { name: "transunion", code: "TU" }
            ];

            let openBureaus = [];
            bureauInfo.forEach(bureau => {
                let cell = statusRow.querySelector(`[data-field="${bureau.name}"]`);
                if (!cell) return;
                let status = cell.innerText.trim().toLowerCase();
                if (status === "open") {
                    openBureaus.push(bureau.code);
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
                    let rowLabel = labelCell.innerText.trim().replace(":", "").toLowerCase();
                    if (rowLabel === label.toLowerCase()) {
                        targetRow = row;
                    }
                });

                if (!targetRow) return "";

                for (const bureau of bureauInfo) {
                    if (!openBureaus.includes(bureau.code)) continue;
                    let cell = targetRow.querySelector(`[data-field="${bureau.name}"]`);
                    if (!cell) continue;
                    let value = cell.innerText.trim();
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

        return output;
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
                let tableText = grid.innerText.toLowerCase();
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
                    if (cell && !["", "-", "--"].includes(cell.innerText.trim())) {
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
                return cell ? cell.innerText.trim() : "";
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
                        let rowLabel = labelCell.innerText.trim().replace(":", "").toLowerCase();
                        if (rowLabel === label.toLowerCase()) {
                            let cell = row.querySelector(`[data-field="${bureau}"]`);
                            if (cell) {
                                let value = cell.innerText.trim();
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
                    let label = labelCell.innerText.trim().replace(":", "").toLowerCase();
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
                            let value = cell.innerText.trim();
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
                        return "Collection";
                    }
                }

                let text = "";
                Object.values(rows).forEach(row => {
                    bureaus.map(b => b.toLowerCase()).forEach(bureau => {
                        let cell = row.querySelector(`[data-field="${bureau}"]`);
                        if (cell) {
                            text += " " + cell.innerText.toLowerCase();
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
            if (accountType === "Collection" && !isKnownCollectionAgency(accountName)) {
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
                    if (cell && cell.innerText.trim()) {
                        output.push({
                            bureau: b.code,
                            value: cell.innerText.trim()
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

    function showResults(negativeData) {
        let bankruptcies = extractBankruptcies();
        let openAccounts = extractOpenAccounts();

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
       // Update counters
        panel.querySelector('[data-negative-count]').innerText = negativeData.length;
        panel.querySelector('[data-negative-items-count]').innerText = negativeItemCount;
        panel.querySelector('[data-bankruptcy-count]').innerText = bankruptcies.length;

        // ========================================
        // PAGE 1 - NEGATIVE ACCOUNTS
        // ========================================

        let results = panel.querySelector("#crc-results");
        let copyTextNegative = "";

        bankruptcies.forEach(item => {
            let entry = `${item.type}\n${item.reference}\n${item.date}\n${item.status}\n\n`;
            copyTextNegative += entry;
            results.innerHTML += `
                <div>
                    <b>Bankruptcy</b>
                    <div>${item.reference}</div>
                    <div>${item.date}</div>
                    <div>${item.status}</div>
                </div>
            `;
        });

        negativeData.forEach(item => {
            let entry = `${item.account}\n${item.account_number}\n${item.balance}\n${item.bureau_display} ${item.account_type}\n\n`;
            copyTextNegative += entry;
            results.innerHTML += `
                <div>
                    <b>${item.account}</b>
                    <div>${item.account_number}</div>
                    <div>${item.balance}</div>
                    <div>
                        ${item.bureau_display} ${item.account_type}
                        ${item.warning ? '<br><b style="color:red">' + item.warning + '</b>' : ''}
                    </div>
                </div>
            `;
        });

        // ========================================
        // PAGE 2 - OPEN ACCOUNTS
        // ========================================

        let openAccountsDiv = panel.querySelector("#crc-open-accounts");
        let copyTextOpen = "";

        if (openAccounts.length === 0) {
            openAccountsDiv.innerHTML = `
                <div class="crc-empty-page">
                    <div class="crc-page-title">No Open Accounts</div>
                    <div class="crc-page-subtitle">All accounts are either closed or negative.</div>
                </div>
            `;
            copyTextOpen = "No open accounts found.";
        } else {
            openAccounts.forEach(item => {
                let entry = `${item.account}\n${item.account_number}\n${item.balance}\n${item.bureau_display} ${item.account_type}\n\n`;
                copyTextOpen += entry;
                openAccountsDiv.innerHTML += `
                    <div>
                        <b>${item.account}</b>
                        <div>${item.account_number}</div>
                        <div>${item.balance}</div>
                        <div>
                            ${item.bureau_display} ${item.account_type}
                            <br><span class="crc-account-status">✓ OPEN</span>
                        </div>
                    </div>
                `;
            });
        }

        // ========================================
        // WINDOW CONTROLS
        // ========================================

        panel.querySelector("#crc-close-btn").onclick = function() {
            panel.remove();
        };

        panel.querySelector("#crc-minimize-btn").onclick = function() {
            panel.classList.toggle("crc-minimized");
            this.innerText = panel.classList.contains("crc-minimized") ? "+" : "−";
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
                btn.classList.toggle("active", idx === pageIndex);
            });
        }

        buttons[0].onclick = function() { switchPage(0); };
        buttons[1].onclick = function() { switchPage(1); };
        buttons[2].onclick = function() { switchPage(2); };

        // ========================================
        // COPY FUNCTIONS
        // ========================================

        copyButtons[0].onclick = function() {
            navigator.clipboard.writeText(copyTextNegative);
            this.innerText = "✓ COPIED";
            setTimeout(() => { this.innerText = "COPY NEGATIVE ACCOUNTS"; }, 1500);
        };

        copyButtons[1].onclick = function() {
            navigator.clipboard.writeText(copyTextOpen);
            this.innerText = "✓ COPIED";
            setTimeout(() => { this.innerText = "COPY OPEN ACCOUNTS"; }, 1500);
        };

        copyButtons[2].onclick = function() {
            navigator.clipboard.writeText("");
            this.innerText = "✓ COPIED";
            setTimeout(() => { this.innerText = "COPY PAGE 3"; }, 1500);
        };
    }

    // ========================================
    // INITIALIZE
    // ========================================

    const styleElement = document.createElement("style");
    styleElement.innerHTML = CSS_STYLES;
    document.head.appendChild(styleElement);

    let scanButton = document.createElement("button");
    scanButton.id = "crc-scan-btn";
    scanButton.innerText = "SCAN CRC NEGATIVE ITEMS";

    scanButton.onclick = async function() {
        expandNegativeDetails();
        await new Promise(resolve => setTimeout(resolve, 2000));
        extractData();
    };

    document.body.appendChild(scanButton);

})();

// ==UserScript==
// @name         testing ground
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extract negative accounts from CRC credit report preview
// @match        https://app.creditrepaircloud.com/app/clients/*
// @grant        none
// ==/UserScript==

//COLLECTION AGNECIES JSON
const COLLECTION_AGENCIES = [

    "portfolio recovery",
    "midland credit",
    "lvnv",
    "cavalry",
    "resurgent",
    "enhanced recovery",
    "credit control",
    "afni",
    "convergent",
    "ic system",
    "credence",
    "allied interstate",
    "allied collection",
    "sequium",
    "radius global",
    "transworld systems",
    "tsi",
    "national credit systems",
    "firstsource",
    "rent recovery",
    "receivables performance",
    "american profit recovery",
    "financial recovery services",
    "southwest credit systems",
    "central portfolio control",
    "wakefield",
    "rsa",
    "mcm",
    "midland funding",
    "erc",
    "convergent outsourcing",
    "capio",
    "bull city financial",
    "dynamic recovery",
    "phoenix financial",
    "professional finance company",
    "credit collection services",
    "cca",
    "bay area credit",
    "national recoveries",
    "revsolve",
    "spire recovery",
    "genesis credit management",
    "ars national",
    "commonwealth financial",
    "ability recovery",
    "continental finance",
    "receivable solutions",
    "aldous",
    "coachlla col",
    "jeffcaps",
    "jefferson capital",
    "jefferson capital systems",
    "portfolio",
    "PORTFOLIO"


];
//NOTIFIES IF THE ACCOUNT IS MARKED AS COLLECTION BUT DOES NOT EXIST IN THE CURRENT JSON COLLECTION
function isKnownCollectionAgency(name){

    let creditor =
    name.toLowerCase()
    .trim();


    return COLLECTION_AGENCIES.some(agency=>{

        agency = agency.toLowerCase().trim();


        return (
            creditor === agency ||
            creditor.includes(agency) ||
            agency.includes(creditor)
        );

    });

}
/////////////////


(function () {
    'use strict';
    function expandNegativeDetails(){

    let buttons =
    document.querySelectorAll(
        "div.MuiBox-root"
    );


    buttons.forEach(btn=>{

        let text =
        btn.innerText.trim();


        if(
            text === "Show More Details +"
        ){

            btn.click();

        }

    });

}

    function extractData() {

        let output = [];

        let grids = document.querySelectorAll('.MuiDataGrid-root');


        grids.forEach(grid => {


            let headers = {};


            grid.querySelectorAll('[role="columnheader"]').forEach(header => {

                let field = header.getAttribute("data-field");

                if(field){
                    headers[field] = true;
                }

            });



            if(
                !headers.equifax &&
                !headers.transunion &&
                !headers.experian
            ){
                return;
            }



            let rows = {};


            grid.querySelectorAll('.MuiDataGrid-row').forEach(row => {

                let id = row.getAttribute("data-id");

                if(id){
                    rows[id] = row;
                }

            });



            let accountName = "";


Object.keys(rows).forEach(id=>{

    if(id.includes("Account #")){

        let parent =
        id.replace("summary_","")
          .split("---")[0];

        accountName = parent;

    }

});


// Handle blank creditor names
if(!accountName.trim()){

    let tableText = grid.innerText.toLowerCase();

    // Do not rename public record/bankruptcy tables
    if(
        !tableText.includes("bankruptcy") &&
        (
            tableText.includes("collection") ||
            tableText.includes("collection/chargeoff") ||
            tableText.includes("other collection agencies") ||
            tableText.includes("derogatory")
        )
    ){

        accountName = "Untitled Collection";

    } else {

        return;

    }

}



            // ============================
            // FIXED NEGATIVE BUREAU LOGIC
            // ============================

            let bureaus = [];

let statusInputs =
grid.parentElement.querySelectorAll(
    'input[value="Negative"], input[value="Positive"]'
);


let bureauNames = [
    "experian",
    "equifax",
    "transunion"
];


let reportingBureaus = [];


// Find which bureaus actually have data
bureauNames.forEach(bureau=>{

    let hasData = false;


    Object.values(rows).forEach(row=>{

        let cell =
        row.querySelector(
            `[data-field="${bureau}"]`
        );


if (
    cell &&
    !["", "-", "--"].includes(cell.innerText.trim())
) {
    hasData = true;
}

    });


    if(hasData){

        reportingBureaus.push(bureau);

    }

});



// Match dropdowns only to reporting bureaus
statusInputs.forEach((input,index)=>{


    let bureau =
    reportingBureaus[index];


    if(
        input.value === "Negative" &&
        bureau
    ){

        bureaus.push(
            bureau.charAt(0).toUpperCase()
            + bureau.slice(1)
        );

    }

});


            // Skip accounts with no negative bureaus
            if(bureaus.length === 0){
                return;
            }



function getRowValue(label,bureau){

                let row =
                grid.querySelector(
                    `[data-id*="${label}"]`
                );


                if(!row) return "";


                let cell =
                row.querySelector(
                    `[data-field="${bureau}"]`
                );


                return cell ?
                cell.innerText.trim()
                :
                "";

            }

function getPriorityRowValue(label){

    const priority = [
        "equifax",
        "experian",
        "transunion"
    ];


    // First check only negative bureaus
    for(const bureau of priority){

        let isNegative =
        bureaus
        .map(b => b.toLowerCase())
        .includes(bureau);


        if(!isNegative){
            continue;
        }


        const value =
        getRowValue(label, bureau);


if(
    value &&
    value !== "-" &&
    value !== "--"
){
    return value;
}

    }


    return "";

}

function getPriorityValue(label){

    const priority = [
    "equifax",
    "experian",
    "transunion"
];


    let rows =
    grid.querySelectorAll('.MuiDataGrid-row');


    for(const bureau of priority){

    if(
        !bureaus
            .map(b => b.toLowerCase())
            .includes(bureau)
    ){
        continue;
    }

        for(let row of rows){


            let labelCell =
            row.querySelector(
                '[data-field="label"]'
            );


            if(!labelCell) continue;


            let rowLabel =
            labelCell.innerText
            .trim()
            .replace(":","")
            .toLowerCase();


            if(rowLabel === label.toLowerCase()){


                let cell =
                row.querySelector(
                    `[data-field="${bureau}"]`
                );


                if(cell){

                    let value =
                    cell.innerText.trim();


                    if(
    value &&
    value !== "-" &&
    value !== "--"
){
    return value;
}

                }

            }

        }

    }


    return "";

}



let accountNumber =
getPriorityValue(
    "Account #"
);

function getBalanceValue(){

    let matchingRows = [];


    grid.querySelectorAll('.MuiDataGrid-row').forEach(row=>{


        let labelCell =
        row.querySelector(
            '[data-field="label"]'
        );


        if(!labelCell) return;


        let label =
        labelCell.innerText
        .trim()
        .replace(":","")
        .toLowerCase();


        // ONLY ACCEPT THESE TWO
        if(
            label === "balance" ||
            label === "balance owed"
        ){

            matchingRows.push(row);

        }


    });



const priority = [
    "equifax",
    "experian",
    "transunion"
];



    for(const bureau of priority){

    if(
        !bureaus
            .map(b => b.toLowerCase())
            .includes(bureau)
    ){
        continue;
    }


        for(let row of matchingRows){


            let cell =
            row.querySelector(
                `[data-field="${bureau}"]`
            );


            if(cell){


                let value =
                cell.innerText.trim();


if(
    value &&
    value !== "-" &&
    value !== "--"
){
    return value;
}

            }


        }


    }


    return "";

}

function getAccountType(){

    const creditor = accountName.toLowerCase().trim();

    // Check if creditor is a known collection agency
    for (const name of COLLECTION_AGENCIES){

        const agency = name.toLowerCase().trim();

        if(
            creditor === agency ||
            creditor.startsWith(agency + " ") ||
            creditor.endsWith(" " + agency)
        ){
            return "Collection";
        }

    }

    // Scan account text
   let text = "";

Object.values(rows).forEach(row=>{

    bureaus
    .map(b => b.toLowerCase())
    .forEach(bureau=>{

        let cell = row.querySelector(
            `[data-field="${bureau}"]`
        );

        if(cell){
            text += " " + cell.innerText.toLowerCase();
        }

    });

});
    // If it's NOT a collection agency, don't let the
    // word "collection" classify the account.
const priority = [

    // COLLECTION INDICATORS
    ["other collection agencies", "COLLECTION"],
    ["original creditor", "COLLECTION"],
    ["placed for collection", "COLLECTION"],

    // OTHER NEGATIVE TYPES
    ["repossessed", "Repossessed"],
    ["foreclosure", "Foreclosure"],
    ["REPOSSESSION", "Repossessed"],
    ["INVOLUNTARY REPOSSESSION", "Repossessed"],

    // CHARGE OFF
    ["DEBT INCLUDED IN OR DISCHARGED THROUGH BANKRUPTCY", "CHARGE OFF"],
    ["collection/charge off", "CHARGE OFF"],
    ["charge off", "CHARGE OFF"],
    ["charged off", "CHARGE OFF"],
    ["profit and loss", "CHARGE OFF"],
    ["write off", "CHARGE OFF"],
    ["LOSS BY CREDIT GRANTOR", "CHARGE OFF"],
    ["COLLECTION", "CHARGE OFF"],
    ["CHAPTER", "CHARGE OFF"],

   // ["bankruptcy", "Bankruptcy"],

    // TRANSFEONLY
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

if (found.includes("COLLECTION")) return "Collection";
if (found.includes("CHARGE OFF")) return "Charge Off";
if (found.includes("Repossessed")) return "Repossessed";
if (found.includes("Foreclosure")) return "Foreclosure";
if (found.includes("Bankruptcy")) return "Bankruptcy";
if (found.includes("Transferred")) return "Transferred";
if (found.includes("CLOSED LP")) return "CLOSED LP";
if (found.includes("OPEN LP")) return "OPEN LP";
if (found.includes("PAID LP")) return "PAID LP";

return "";

    return "";

}


let balance =
getBalanceValue();

let accountType =
getAccountType();


let late =
getPriorityRowValue(
    "Late Payment Status"
);

let comments =
getPriorityRowValue(
    "Comments"
);



let bureauDisplay = "";


let bureauSet = bureaus.map(b => b.toLowerCase());


if(
    bureauSet.includes("experian") &&
    bureauSet.includes("equifax") &&
    bureauSet.includes("transunion")
){

    bureauDisplay = "3BR-";

}
else {

    if(bureauSet.includes("experian")){
        bureauDisplay += "EX - ";
    }

    if(bureauSet.includes("equifax")){
        bureauDisplay += "EQU - ";
    }

    if(bureauSet.includes("transunion")){
        bureauDisplay += "TU - ";
    }

}



let collectionWarning = "";


if(
    accountType === "Collection" &&
    !isKnownCollectionAgency(accountName)
){

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

function extractBankruptcies(){

    let results = [];

let grids = document.querySelectorAll(
    '[id^="public-record-"] .MuiDataGrid-root'
);


    grids.forEach(grid=>{


        function getAllBureaus(label){

            let row = grid.querySelector(
                `[data-id*="${label}"]`
            );


            if(!row) return [];


            let output = [];


            let bureaus = [
                {
                    name:"experian",
                    code:"EX"
                },
                {
                    name:"equifax",
                    code:"EQU"
                },
                {
                    name:"transunion",
                    code:"TU"
                }
            ];


            bureaus.forEach(b=>{


                let cell = row.querySelector(
                    `[data-field="${b.name}"]`
                );


                if(cell && cell.innerText.trim()){

                    output.push({

                        bureau:b.code,

                        value:
                        cell.innerText.trim()

                    });

                }

            });


            return output;

        }



        let types =
        getAllBureaus("Type");


        types.forEach(type=>{


            if(
                !type.value
                .toLowerCase()
                .includes("bankruptcy")
            ){
                return;
            }



            let references =
            getAllBureaus("Reference");


            let dates =
            getAllBureaus("Date Filed/Reported");


            let statuses =
            getAllBureaus("Status");



["EX","EQU","TU"].forEach(code=>{


    let status =
    statuses.find(x=>x.bureau===code);


    if(!status) return;


    results.push({

        type:"Bankruptcy",

        reference:
        references.find(
            x=>x.bureau===code
        )?.value || "",


        date:
        dates.find(
            x=>x.bureau===code
        )?.value || "",


        status:
        code + " - " + status.value

    });


});


        });


    });


    return results;

}
    //CSSMOTO
 const crcStyle = document.createElement("style");

crcStyle.innerHTML = `


/* =========================
   MAIN FLOATING PANEL
========================= */


#crc-negative-panel{

width:360px !important;

max-height:82vh !important;

overflow:hidden !important;

background:#fafafa !important;

color:#222 !important;

border-radius:18px !important;

border:1px solid #e8e8e8 !important;

padding:16px !important;

font-family:
"Segoe UI",
Arial,
sans-serif !important;


box-shadow:

0 20px 45px rgba(0,0,0,.14);

}



/* =========================
   HEADER
========================= */


#crc-negative-panel > div:first-child{


padding-bottom:14px;


margin-bottom:14px;


border-bottom:

1px solid #ededed;


}



#crc-negative-panel b{


font-size:16px;


font-weight:700;


color:#1f1f1f;


}



/* =========================
   CLOSE BUTTON
========================= */


#crc-close-btn{


background:#f2f2f2!important;


color:#444!important;


border:none!important;


width:30px!important;


height:30px!important;


border-radius:50%!important;


cursor:pointer;


font-size:15px;


transition:.2s;


}



#crc-close-btn:hover{


background:#e5e5e5!important;


}



/* =========================
   COPY BUTTON
========================= */


#crc-copy-btn{


background:#222!important;


color:white!important;


border:none!important;


border-radius:10px!important;


height:40px;


font-weight:600;


cursor:pointer;


transition:.2s;


}



#crc-copy-btn:hover{


opacity:.85;


}



/* =========================
   RESULTS AREA
========================= */


#crc-results{


max-height:62vh;


overflow-y:auto;


padding:4px;


background:#f7f7f7;


border-radius:14px;


}



/* =========================
   ITEM CARDS
========================= */


#crc-results > div{


background:white;


border-radius:14px;


padding:13px 16px;


margin-bottom:12px;


border:1px solid #ededed;


box-shadow:

0 10px 28px rgba(0,0,0,.14);



line-height:1.45;


transition:none;


}



/* =========================
   CREDITOR NAME
========================= */


#crc-results b{

display:block;

font-size:15px;

font-weight:700;

margin-bottom:3px;

color:#111;

letter-spacing:.2px;

line-height:1.2;

}



/* =========================
   CARD DETAILS
========================= */


#crc-results > div{


font-size:14px;


color:#444;


line-height:1.45;


}



/* =========================
   SCROLL BAR
========================= */


#crc-results::-webkit-scrollbar{


width:6px;


}



#crc-results::-webkit-scrollbar-track{


background:#f1f1f1;


border-radius:10px;


}



#crc-results::-webkit-scrollbar-thumb{


background:#cfcfcf;


border-radius:10px;


}



/* =========================
   SCAN BUTTON
========================= */


#crc-scan-btn{


position:fixed;


bottom:30px;


right:30px;


z-index:999999;



background:white;


color:#222;


border:1px solid #ddd;



padding:

13px 22px;



border-radius:14px;



font-weight:700;


cursor:pointer;



box-shadow:

0 12px 30px rgba(0,0,0,.14);



transition:.2s;



}



#crc-scan-btn:hover{


box-shadow:

0 16px 35px rgba(0,0,0,.18);



}



/* =========================
   MOBILE
========================= */


@media(max-width:600px){


#crc-negative-panel{


width:

calc(100vw - 32px)!important;


right:16px!important;


}



#crc-scan-btn{


right:16px;


bottom:16px;


}


}



`;

document.head.appendChild(crcStyle);
function showResults(data){

    let bankruptcies = extractBankruptcies();

    let negativeItemCount = 0;


data.forEach(item=>{

    let bureaus =
    item.bureau_display;


    if(bureaus.includes("3BR-")){

        negativeItemCount += 3;

    }
    else {

        if(bureaus.includes("EX")){
            negativeItemCount++;
        }

        if(bureaus.includes("EQU")){
            negativeItemCount++;
        }

        if(bureaus.includes("TU")){
            negativeItemCount++;
        }

    }

});

    let old =
    document.getElementById(
        "crc-negative-panel"
    );

    if(old) old.remove();

    let panel =
    document.createElement("div");


    panel.id =
    "crc-negative-panel";


panel.style.position = "fixed";
panel.style.top = "20px";
panel.style.right = "20px";
panel.style.zIndex = "999999";


    panel.innerHTML = `

<div style="
display:flex;
justify-content:space-between;
align-items:flex-start;
margin-bottom:12px;
">

<div>

<!-- <b>CRC Negative Scanner</b> -->

<div style="
font-size:13px;
color:#666;
margin-top:4px;
line-height:1.5;
">

Negative Accounts: <b>${data.length}</b><br>

Negative Items: <b>${negativeItemCount}</b><br>

Bankruptcies: <b>${bankruptcies.length}</b>

</div>

</div>

<button id="crc-close-btn">
✕
</button>

</div>


    <button id="crc-copy-btn"
    style="
    width:100%;
    padding:8px;
    margin-bottom:15px;
    background:#333;
    color:white;
    border:none;
    cursor:pointer;
    font-weight:bold;
    ">
    COPY ALL
    </button>

    <div id="crc-results"></div>

    `;


    let results =
    panel.querySelector("#crc-results");


    let copyText = "";

bankruptcies.forEach(item=>{

let entry = `${item.type}
${item.reference}
${item.date}
${item.status}

`;

copyText += entry;

results.innerHTML += `

<div>

<b>Bankruptcy</b>

<div>${item.reference}</div>

<div>${item.date}</div>

<div>${item.status}</div>

</div>

`;

});

    data.forEach(item=>{


let entry = `${item.account}
${item.account_number}
${item.balance}
${item.bureau_display} ${item.account_type}

`;


        copyText += entry + "\n";


results.innerHTML += `

<div>

<b>${item.account}</b>
<div>${item.account_number}</div>
<div>${item.balance}</div>
<div>
${item.bureau_display} ${item.account_type}
${item.warning ? "<br><b style='color:red'>" + item.warning + "</b>" : ""}
</div>

</div>

`;


    });



    document.body.appendChild(panel);



    // Close button

    document
    .getElementById("crc-close-btn")
    .onclick=function(){

        panel.remove();

    };



    // Copy button

    document
    .getElementById("crc-copy-btn")
    .onclick=function(){

        navigator.clipboard.writeText(copyText);

        this.innerText="COPIED";

        setTimeout(()=>{

            this.innerText="COPY ALL";

        },1500);

    };


}




    let button =
    document.createElement("button");


    button.innerText =
    "SCAN CRC NEGATIVE ITEMS";


    button.style=`

    position:fixed;
    bottom:30px;
    right:30px;
    z-index:999999;
    padding:15px;
    background:red;
    color:white;
    font-weight:bold;
    border-radius:8px;
    cursor:pointer;

    `;



button.onclick = async function(){

    expandNegativeDetails();


    await new Promise(resolve =>
        setTimeout(resolve, 2000)
    );


    extractData();

};


    document.body.appendChild(button);


})();

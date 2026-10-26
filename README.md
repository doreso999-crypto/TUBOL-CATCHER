# TUBOL-CATCHER

Takes negative accounts and inquiries from Credit Repair Cloud in one click.

## Creditor alias matching (userscript v3.9)

In **INQUIRIES**, a row is green when its creditor matches an **OPEN** account on the **same credit bureau**, using either the same normalized name or a known alias from [creditor-aliases.json](creditor-aliases.json).

Examples:
- `CAP1` ↔ `CAPITAL ONE`
- `JPMCB CARD` ↔ `CHASE`
- `CBNA` ↔ `CITIBANK`
- `WFBNA` ↔ `WELLS FARGO`
- `SYNCB/AMAZON` ↔ `AMAZON STORE CARD`

**Safety:** A creditor-name match is not proof the particular inquiry was authorized or resulted in that open account. The scanner does not equate Credit One and Capital One, separate store card programs, or card issuers and auto-finance subsidiaries merely because they share a corporate parent. Auto dealership inquiries may be from dealerships or other lenders that did not finance an account. Unknown names only match if normalized labels are equal or a short final word appears truncated.

The JSON contains a researched, **non-exhaustive** seed registry. Other names, regional dealerships, mergers, and new codes will need continued review.

### Adding an alias

1. Find the proper `groups[].id` in `creditor-aliases.json` and append a distinct label to `aliases`. Use credible evidence; do not combine unrelated issuers or distinct retailer programs.
2. **Also update the embedded `CREDITOR_ALIAS_GROUPS` snapshot in `crc-scanner.js`**, because the Tampermonkey userscript works without loading network JSON.
3. Run `node test-creditor-aliases.js` (Node.js 18+). The test checks JSON/userscript synchronization, positive matches, false positives and per-bureau restrictions.
4. Increase the userscript's `@version` before releasing an update.

No consumer credit-report data is saved in the alias registry.

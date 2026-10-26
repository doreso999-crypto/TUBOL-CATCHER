# TUBOL-CATCHER

## Negative tab: Collection vs Charge Off (v4.3)

The scanner classifies a negative account using its creditor name and the
**account's own table content**. A **CLOSED** status alone is only a fallback.

- When collection evidence appears in the account table and the creditor name
  matches an entry in the built-in `COLLECTION_AGENCIES` list, classify as
  **COLLECTION**.
- When collection evidence appears in the account table but the creditor name
  is **not** in that list, classify as **CHARGE OFF** — even when the account
  status also says **Closed**.
- A closed account **without** collection or charge-off evidence remains
  **CLOSED LP**. Explicit charge-off wording also takes precedence over Closed.
- Bankruptcy classifications retain higher priority than these rules.
  Repossession, foreclosure and other status fallbacks remain available when
  no higher-priority indicator applies.

The matching logic compares complete creditor words rather than interpreting
a short fragment as a known collection agency. An unfamiliar collection
classification should still be checked against the original credit report.
The red verification notice is displayed only on accounts classified as
**COLLECTION**, not on **CHARGE OFF**.

Run `node test-negative-classification.js` for regression coverage.

Takes negative accounts and inquiries from Credit Repair Cloud in one click.

## Personal Info: previous address dates (v4.3)

The **PREVIOUS ADDRESSES** extractor recognizes both
`Previous Addresses:` and `Previous Address(es):` headings. It pairs date
labels/paragraphs with the preceding address and also accepts dates appearing
at the end of an address line (e.g., `03/2021` or
`05/2018 - 06/2019`). Dates appear in the copied address output in both
Modern and Legacy display modes.

## INQUIRIES date cutoff (v4.3)

The regular **INQUIRIES** subtab has a **Show inquiries BEFORE** date picker.
Choosing **2025-01-01** shows only December 2024 and older inquiries;
January 1 itself is excluded. The cutoff filters both the visible list and
the copied inquiry text. Inquiries without usable dates are excluded while
a cutoff is active. Use **Show all** to remove it.

This is independent of the **NEW** subtab, which continues showing the last
35 days. The chosen date is saved locally on the device, like the other
display preferences.

**Scanner Settings** is now wider/taller but remains viewport bounded
(maximum 1000px wide, 88vh tall, responsive on smaller screens).

Run `node test-inquiry-date-addresses.js` to check the new date and
address rules.

## Creditor alias matching (userscript v4.3)

In **INQUIRIES**, a row is green when its creditor matches an **OPEN** account on the **same credit bureau**, using either the same normalized name or a known alias from [creditor-aliases.json](creditor-aliases.json).

Examples:
- `CAP1` ↔ `CAPITAL ONE`
- `JPMCB CARD` ↔ `CHASE`
- `CBNA` ↔ `CITIBANK`
- `WFBNA` ↔ `WELLS FARGO`
- `SYNCB/AMAZON` ↔ `AMAZON STORE CARD`

**Safety:** A creditor-name match is not proof the particular inquiry was authorized or resulted in that open account. The scanner does not equate Credit One and Capital One, separate store card programs, or card issuers and auto-finance subsidiaries merely because they share a corporate parent. Auto dealership inquiries may be from dealerships or other lenders that did not finance an account. Unknown names only match if normalized labels are equal or a short final word appears truncated.

The JSON contains a researched, **non-exhaustive** seed registry. Other names, regional dealerships, mergers, and new codes will need continued review.

### Managing creditor aliases in the scanner

Open the gear icon's **Settings** window. It now opens as a separate, bounded
panel (up to 740px wide and 74% viewport height), with **General** and
**Creditor Aliases** tabs rather than a cramped menu.

Under **Settings → Creditor Aliases**, use **+ Add Creditor** to create your own
proper creditor name if it is absent from the built-in dictionary. Custom
creditors are saved locally and remain after reloading the page.
Right-click a custom creditor's heading to delete it and its variations;
built-in creditor groups cannot be deleted.

Open **Settings → Creditor Name Variations** to browse the list of creditor groups.
Expand any creditor to see its aliases. Right-click a variation to remove it
(with confirmation). The main creditor name cannot be deleted. Use the search
field to find a creditor or variation quickly.

On **OPEN ACCOUNTS**, you can also right-click any account card to
assign its *reported account name* as a variation of a proper creditor name.
The dropdown contains **+ Create a new creditor** if you cannot find one.
Creating a creditor from an inquiry or open account also associates the
selected reported name with the new proper name, in one saved change.

On **INQUIRIES** or **NEW**, right-click any inquiry row, select the correct
creditor (for example, select **American Express** for a missing variant of AMEX),
then choose **Add alias**. Existing mappings are recognized and will not be
duplicated. To reassign a variant belonging to a different creditor, first
remove that variation in Settings. After changes, inquiry highlights and copied
lists immediately refresh, while matching still requires an OPEN account on
the **same bureau**.

Alias edits are stored in this browser's `localStorage`, **not** in GitHub's
`creditor-aliases.json`. The bundled registry remains the default. Use
**Restore default aliases** in Settings to discard locally added variations
and manually created creditor groups. No consumer
report data or account numbers are stored by this feature (only creditor
labels intentionally added or removed). Editing one browser does not
automatically update other devices or the shared JSON.

Run `node test-creditor-alias-manager.js` to verify custom aliases,
removal, reassignment, persistence, reset, and per-bureau restrictions.

### Adding an alias

1. Find the proper `groups[].id` in `creditor-aliases.json` and append a distinct label to `aliases`. Use credible evidence; do not combine unrelated issuers or distinct retailer programs.
2. **Also update the embedded `CREDITOR_ALIAS_GROUPS` snapshot in `crc-scanner.js`**, because the Tampermonkey userscript works without loading network JSON.
3. Run `node test-creditor-aliases.js` (Node.js 18+). The test checks JSON/userscript synchronization, positive matches, false positives and per-bureau restrictions.
4. Increase the userscript's `@version` before releasing an update.

No consumer credit-report data is saved in the alias registry.

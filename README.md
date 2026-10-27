# TUBOL-CATCHER

## Full-page report workspace (v5.0)

### Choose how to view the report

In the new browser tab, use the compact **Grid / Table / List** selector:

- **Grid** — responsive multi-column cards, ideal for browsing accounts and
  opening bureau details. This is the default.
- **Table** — structured, horizontally scrollable columns for faster comparison
  of creditors, balances, account numbers, inquiry dates, statuses, and bureau
  values. Works across Negative, Disputed Mode, Inquiries, Open Accounts, NEW,
  and Personal Info sections.
- **List** — denser, vertically stacked cards when you want to scan records
  quickly. The selected view is remembered in browser preferences.

The data shown in each layout is the same extracted report; changing layouts
does not modify the underlying report or copy settings.

### Settings work in the new tab

Click **Settings** in the top-right corner of the full-page workspace. The
drawer includes the same report preferences as the floating extractor:
preferred bureau (Equifax / Experian / TransUnion), modern/legacy display,
whether to copy connected inquiries in the regular and NEW tabs, open-account
names-only display, exclusive inquiry date cutoff, and opacity in 1% steps.
Changes update the full-page display and **Copy current view** immediately.
While the originating Credit Repair Cloud tab is open, they also update its
extractor and persist the same browser preferences.

The drawer also provides a searchable creditor alias manager with adding,
reassigning/removing variations, creating/deleting custom creditors, and
restoring defaults. In the new-tab grid/list, right-click an inquiry or open
account to open Settings prefilled with that name. Confirm alias associations
before saving. The same browser-local alias registry is shared with the small
extractor.

Note: The new tab remains a snapshot of *extracted report records*; it does
not automatically fetch rescans or follow subsequent page navigation. Reopen
the preview after scanning a different report. The layout and settings changes
do not upload credit-report contents or store those contents in localStorage.

Click the **↗ Open full-page report preview** button in the extractor's top
bar, beside **Minimize**. A separate browser tab opens with a spacious,
responsive report preview instead of the 440px-wide floating panel.

- **Negative accounts** has **All accounts** and **Disputed Mode** views.
  Disputed Mode has **Delete**, **Updated**, and **Bankruptcy** categories,
  including expandable bureau-specific details.
- **Inquiries** has **Inquiries**, **Open accounts**, and **New inquiries**.
  The currently selected inquiry cutoff and copy preferences are reflected
  in the snapshot. Bureau sections remain expandable.
- **Personal info** shows previous addresses and employers by bureau.
- The **Copy current view** button uses the selected section/subsection
  and its existing copy rules. The original extractor remains open and
  fully usable; the preview also works when the extractor is minimized.

**Privacy:** The preview opens a locally generated `about:blank` tab and
renders report data as DOM text. No report values are put into URLs,
browser storage, or outbound requests by this feature. The tab is a
**snapshot**, not a live synchronized report: after rescanning or changing
settings, reopen the preview using the ↗ button. Close the preview tab
normally when finished. If the browser blocks it, allow pop-ups for Credit
Repair Cloud.

Run `node test-full-page-preview.js` to validate Grid/Table/List
navigation, Settings updates, priority, copy filtering, date selection,
expandable bureau lists, and report-data isolation.

## Safer extractor window (v4.8)

The main extractor window no longer has an **X / Close** button, to prevent
accidental dismissal of the extracted results. **Minimize / Restore** remains
available and preserves the draggable top-right anchored window behavior.
The separate **Settings** dialog still has its own close button, and the
**CLICK ME!** scan button is unchanged.

Run `node test-extractor-appearance.js` to check that the main close button
and its event handler are absent while all other window controls remain.

## Bureau priority and Disputed Mode (v4.7)

### Preferred credit bureau in the regular Negative view

Open **Settings → General → Negative account data priority** and select
**Equifax first**, **Experian first**, or **TransUnion first**. Equifax remains
the default until changed. The selected bureau is used for the single account
number, balance, late-payment status and comments displayed/copied in the
regular **NEGATIVE → ALL ACCOUNTS** view; the other bureaus act as fallback
when that field is missing. Changes refresh the regular view immediately and
are saved only as a browser preference.

### NEGATIVE → DISPUTED MODE

Switch from **ALL ACCOUNTS** to **DISPUTED MODE** for a compact, alphabetically
sorted, three-category view:

- **DELETE** — collection, charge-off, repossession, transferred and
  foreclosure accounts
- **UPDATED** — open, closed, paid, or otherwise unclassified negative
  accounts, so no extracted negative table is silently discarded
- **BANKRUPTCY** — bankruptcy public records and negative entries classified
  as included in bankruptcy

**Disputed Mode does not use the bureau-priority preference.** It captures
every populated field from each reporting credit bureau within each extracted
negative-account table, plus bankruptcy public-record tables. Each card shows
account numbers and balances, and **Other reported data** expands to show
additional table fields (for example, late-payment status, dates, comments).
The **Copy** button exports only the currently selected disputed category,
including expanded-detail data.

If two bureaus report the identical account number, the value appears once
with the two bureau tags. For example:

```text
Account number
xxx123(exp-equ)
xxx3545(tu)

Balance
$1,000(exp-equ)
$250(tu)
```

Bureau tags are `exp` for Experian, `equ` for Equifax, and `tu` for
TransUnion. Equivalent currency values such as `$1,000` and `1000.00`
are combined. Distinct values remain separate. Missing field values are
shown as **Not reported**, rather than fabricated.

These are report-display and grouping tools, not legal determinations about
whether an account should be deleted or updated. Verify the underlying
report and dispute only information you reasonably believe is inaccurate.

Run `node test-disputed-mode.js` to test bureau selection, grouping,
categorized sorting, details, bankruptcy fields and copy output.

## Extractor appearance and dragging (v4.6)

- **Original-size extractor:** The main panel is back to **440px wide** and
  **88vh tall**; the minimized width is **300px**. It remains responsive
  on smaller screens and keeps its draggable top bar. Most extractor text is
  approximately **1px larger than the pre-v4.4 original** rather than the
  more aggressive size increase introduced in v4.4.
- **Readable Settings:** The Settings window has independently enlarged text
  (for example, 26px headings, 17px labels, and 18px settings tabs) so its
  contents no longer appear tiny inside the larger window.
- **Opacity:** Go to **Settings → General → Extractor appearance** and drag
  the **Extractor opacity** slider from 60% (more see-through) to 100%
  (fully opaque), with **1% increments** (e.g. 73%, 74%, 75%). Changes
  apply immediately to expanded and minimized views and are saved in the browser.
- **Move the entire floating panel:** Drag the top bar where it says
  **DRAG TO MOVE** or any empty area of that bar. This works when the
  extractor is **expanded or minimized**. Buttons, selections, scrolling,
  and right-click menus keep their normal behavior.
- **Position memory:** The window remembers its position across rescans
  and page reloads. Position is clamped after dragging, resizing the browser,
  or minimizing/restoring so the extractor remains accessible.
- **Top-right minimize anchor:** Minimize and restore around the panel's
  **top-right corner** (keeping its right edge and top coordinate fixed
  whenever the viewport allows), rather than leaving the top-left corner
  fixed. Dragging continues to work when minimized.

The chosen opacity and window coordinates are browser-local UI preferences.
No credit-report data is stored with these controls.

Run `node test-extractor-appearance.js` to validate opacity, dragging,
viewport bounds, saved position, and expanded/minimized behavior.

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

## Compact inquiry date filter (v4.6)

In **INQUIRIES**, the previous always-visible date picker has become a
compact **Filter by date** button with a short inquiry count alongside it.
Click the button to reveal a modern, bounded date popover.

- Choose an exclusive cutoff date, then click **Apply**. Example:
  **January 1, 2025** shows **December 2024 and older** inquiries.
- Date changes inside the popover are **drafts**. Inquiries (including
  copied text) are not changed until **Apply** is clicked.
- **Cancel**, **Escape**, and clicking outside close the popover without
  applying the draft. **Show all** clears the saved cutoff.
- The popover overlays the list rather than taking up a large permanent row.
  It does not auto-focus the date input, so navigating the inquiry list is
  unaffected. The **NEW** and **OPEN ACCOUNTS** subtabs remain independent.

Run `node test-inquiry-date-popover.js` to test the Apply/Cancel/Clear,
outside-click, Escape, and list-focus behavior.

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

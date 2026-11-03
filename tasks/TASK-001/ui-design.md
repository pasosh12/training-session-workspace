# TASK-001 UI Design

Status: implementation-ready. Resolves OQ-4 in `requirements.md`. There are no open items: the developer approved Q-1 and Q-2 (§13).

Inputs:
- `frontend-accelerator-assessment/designs/DESIGN_TOKENS.md`, the visual direction;
- `designs/sessions-dashboard-reference.svg`, a guide to hierarchy and density, not to pixels;
- `tasks/TASK-001/{requirements,architecture,api-integration}.md` (AD-1 to AD-10 and approvals P-1 to P-7; api-integration §2.3, §2.6, §6, §10).

Rulesets: `rulesets/common/ui-designer/rules/product-context.md` and `rulesets/common/shared/web-interface-guidelines/command.md`. The universal guidance applies; the Vercel brand-specific section does not. There are no framework or project ui-designer rules.

Visual direction is **given** by the supplied tokens. No alternative directions are proposed. There is no existing UI to preserve (`src/` is the Vite starter, which P-6 replaces).

---

## 1. Page Structure and Hierarchy

```text
<body>
  skip link "Skip to sessions"          (first focusable; targets the results heading)
  <header>  h1 "Training sessions" · supporting line · [Create session] (primary)
  <main>
    success banner (role=status, persistent container; empty when idle)   §7
    <section aria-labelledby="filters-h">   h2 "Filters" (visually hidden)
      Search · Status · [Clear filters]
    <section aria-labelledby="results-h">   h2 results heading = live count "5 sessions"
      table (desktop) / stacked rows (mobile) — one DOM structure        §2
  </main>
  <dialog> details drawer   (h2 = session title)                         §3
  <dialog> create drawer    (h2 "Create session")                        §4
</body>
```

- **No sidebar.** The SVG's sidebar links ("Coaches", "Locations", "Programs") point to views that are out of scope. Links that lead nowhere would be dishonest affordances. The header keeps the SVG's hierarchy: title, then supporting text, then the primary action on the right.
- **Supporting line:** "Find scheduled work, review capacity, and create sessions." This is the SVG copy, with "make schedule changes" replaced because no editing exists.
- Main content: `max-width: 1280px`, centered, with 24px page padding on desktop and 16px on mobile. Surfaces are full-width white panels with `border` dividers and no nested cards.
- Typography follows the tokens: page title 24/32/700, section title 16/24/700, body 14/20, supporting text 13/18. Numeric columns use `font-variant-numeric: tabular-nums`.

## 2. List and Filters

### 2.1 Desktop (≥ 768px; verified at 1440 × 900)

Filter bar: a white surface bar with one row and visible labels above the controls (13px, `text-muted`).

| Control | Spec |
| --- | --- |
| Search | `type="search"`. Label "Search". Placeholder "Title, coach, or location…". Width 360px. A native clear button is allowed. |
| Status | Native `<select>` labelled "Status" with options "All statuses", "Scheduled", "Full", "Cancelled", "Completed". Width 180px. |
| Clear filters | Secondary text button. **Always rendered** so the layout stays stable. Disabled (native `disabled`) when no filter is active. |

There is no type filter (P-7). The SVG's "All types" control is intentionally omitted.

Results section header: the h2 doubles as the result count ("5 sessions", "1 session", "No sessions"). Beside it, the text "Updating…" with a small spinner appears while `isRefreshing` is true (AC-S9). The text means the status doesn't rely on the spinner animation alone.

**Table** (`<table>`, `<caption>` visually hidden "Training sessions"):

| Column | Cell content (line 1 / line 2) |
| --- | --- |
| Session | **Title** as a link (`<a href="?session=<id>">`; a plain click is intercepted to push state per AD-1, while Ctrl/Cmd or middle-click opens a deep link in a new tab) / "Training · North Court" in muted text, with an "Invite only" text tag when `visibility = invite-only` |
| Start | "Mon, Aug 3, 18:00" / "90 min" (muted) |
| Coach | Coach name |
| Capacity | "14 / 18" / "4 places left" (muted). When full: "24 / 24" / "No places left". |
| Status | Status badge (§5) |

- Rows are not clickable as a whole. Only the title link opens a session (no div click handlers). Row hover uses a `surface-muted` background as visual feedback only.
- Titles (up to 80 characters) and location names **wrap** and are never truncated, so no information is hidden.
- A newly created session's row gets a "New" text tag next to its title until the success banner is dismissed (§7).

### 2.2 Mobile (< 768px; verified at 390 × 844)

**Filters:** the search field is full width. The next row holds the Status select (flexible width) and Clear filters (auto width). All controls are at least 44px tall. Filters aren't hidden behind a toggle, because there are only two controls.

**Header:** h1, then the supporting line, then a full-width "Create session" button (44px).

**List:** the **same `<table>` DOM**, reflowed with CSS into stacked rows. The design avoids duplicating markup, which would duplicate screen-reader content and test matches.

- The `table`, `row`, `cell`, and `columnheader` roles are set **explicitly** so the semantics survive the `display` change. The header row is hidden visually but stays in the accessibility tree.
- Each stacked row has this structure:

  ```text
  ┌───────────────────────────────────────────┐
  │ U14 Shooting Lab (link, 44px min) [● Scheduled] │
  │ Mon, Aug 3, 18:00 · 90 min                │
  │ Maya Brooks · North Court                 │
  │ 14 / 18 booked · 4 places left            │
  └───────────────────────────────────────────┘
  ```

- The inline joiners and "booked" are presentational text spans marked `aria-hidden`. Screen readers get the column headers from table semantics.
- Rows are separated by `border` dividers, not cards. Long words break (`overflow-wrap: anywhere`), so the page **never scrolls horizontally**.

### 2.3 List states

| State | Presentation | Actions |
| --- | --- | --- |
| Initial loading (AC-S1) | Table body area with a stable minimum height (about 5 rows), the text "Loading sessions…", and a spinner. `aria-busy="true"` on the table. Filters are enabled. | — |
| Populated (AC-S2) | Rows | Title links |
| Refreshing (AC-S9) | Previous rows kept at full opacity, "Updating…" beside the count | — |
| No sessions exist (AC-S3) | Centered in the results surface: h3 "No sessions yet"; text "Create the first session to start building the schedule." | [Create session] (primary) |
| No matches (AC-S4) | h3 "No matching sessions"; text "No sessions match “{query}” with status {Status}." The text adapts to what's active, for example "No sessions match “zzz”." or "No sessions have the status Completed." Then "Try a different search or clear the filters." | [Clear filters] (secondary) |
| Error | §6.1 copy in a danger-bordered message inside the results surface. Filters stay usable. | [Try again], plus [Clear filters] for `INVALID_FILTER` |

## 3. Details Overlay

The overlay is a native `<dialog>` opened with `showModal()`. That gives an inert background, a native focus trap, and a top layer. Its open state is derived only from `?session=` (AD-1 amended): `cancel` is `preventDefault`-ed and routed to `closeDetails()`.

| | Desktop (≥ 768px) | Mobile (< 768px) |
| --- | --- | --- |
| Shape | Right-side drawer, 440px wide, full viewport height, `surface` background, left `border`. The list stays visible to the left behind a scrim. | Full-screen sheet (`100dvh`), with `overscroll-behavior: contain` and safe-area padding. |
| Scrim | `rgba(23, 33, 36, 0.4)`. Clicking it calls `closeDetails()`. | Not visible (full screen) |
| Motion | 150ms `transform` slide from the right. **None** under `prefers-reduced-motion: reduce`. | Same |
| Header | Sticky: eyebrow "Session details" (12px, uppercase, muted), h2 = session title, close button "×" (`aria-label="Close details"`, 40px desktop / 44px mobile) | Same, sticky |
| Footer | [Back to sessions] (secondary, full width), as in the SVG | Sticky at the bottom |

**Content order** (a `<dl>` with label/value pairs; labels 12px uppercase muted, as in the SVG):

1. Status badge, then "Training · Public" (type · visibility).
2. **Cancellation block**, only when `cancellation` is set, placed above everything else: an h3 "Cancelled" with the ✕ icon, then "Cancelled on Mon, Jul 27, 13:00.", then "Reason: The gym is unavailable." or "No reason was given."
3. **Start:** "Monday, August 3, 2026, 18:00–19:30 CEST". This is the local timezone through Intl, with a short timezone name in the details only.
4. **Duration:** "90 minutes".
5. **Location:** name, then address on a second line.
6. **Coach:** name, then email as a `mailto:` link (the coach contact summary).
7. **Capacity:** "14 booked of 18 places · 4 left", or "24 booked of 24 places · Full". A meter bar (`primary` fill on `#E0E7E8`) is shown and marked `aria-hidden`, because the text carries the value.
8. **Description:** the text, or "No description." in muted italic (AC-D2).
9. **Trainer notes:** the text (with `white-space: pre-wrap`), or "No trainer notes.".
10. **Created** and **Last updated:** "Jul 20, 2026, 09:00" in supporting text.

**Details states:**

| State | Presentation |
| --- | --- |
| Loading | The h2 shows "Session details" until the data arrives (AD-1 opens before the fetch resolves). The body has `aria-busy="true"` and the text "Loading session details…". If the list already has a row with this id, its title is used for the h2 immediately. |
| Loaded | Content as above |
| Error, 404 | §6.2 copy. Only [Back to sessions]. |

## 4. Create Session

### 4.1 Placement and opening

- **Entry points:** the header [Create session] button, and the [Create session] button in the "No sessions yet" empty state.
- **Shape:** the same `<dialog>` drawer pattern as the details overlay. On desktop it is 560px wide from the right; on mobile it is a full-screen sheet. Header: h2 "Create session" and a close "×" (`aria-label="Close create form"`). The sticky footer holds [Cancel] (secondary) and [Create session] (primary).
- **Open state** is local UI state in `SessionsWorkspace` and is not in the URL. This is transient and not deep-linkable (§13 Q-1). The details and create overlays are never open at the same time.

### 4.2 Fields

The form uses `noValidate` so the app's own messages are the only validation UI (AC-C3). On desktop, short fields pair up in a 2-column grid; on mobile there is one column.

| Field | Control | Default | Notes |
| --- | --- | --- | --- |
| Title | text, `autocomplete="off"`, `maxLength` not set (so the error can explain the limit) | empty | — |
| Session type | `<select>`: Training / Camp / Private | Training | |
| Date / Start time | `type="date"` / `type="time"` inside `<fieldset>`, legend "Start" | empty | One shared error under the group, also used for server `startsAt` (api §2.6) |
| Duration (minutes) | `type="number"`, `inputmode="numeric"`, step 5 | 60 | Suffix "min" |
| Capacity | `type="number"`, `inputmode="numeric"` | empty | Suffix "places" |
| Coach | `<select>` from `useCoaches`, first option "Choose a coach" (empty value) | empty | States in §6.3 |
| Location name / Location address | text, `autocomplete="off"` | empty | Address spans the full width |
| Visibility | radio group (`<fieldset>`, legend "Visibility"): Public / Invite only | Public | Label and control share one hit target |
| Description (optional) | `<textarea>`, 3 rows | empty | |
| Trainer notes (optional) | `<textarea>`, 3 rows, with a counter "0 / 500" linked through `aria-describedby` (not live) | empty | The counter turns `danger` color and adds the text "Too long" above 500 |

**Validation timing:** first on submit. After the first submit attempt, an invalid field re-validates on change; until then it re-validates on blur once it has been touched. Field error messages are in §6.4.

**Error presentation:** the message sits directly below its control, in `danger` text with a "!" icon (`aria-hidden`). The control gets `aria-invalid="true"`, `aria-describedby` → error id, and a `danger` border.

### 4.3 Submission states

| State | Presentation |
| --- | --- |
| Idle | [Create session] enabled |
| Coaches loading or failed | [Create session] disabled (native `disabled`), with the hint "Creating is unavailable until coaches load." below it, linked through `aria-describedby` |
| Pending (AC-C5) | The button keeps its width and its label changes to "Creating…" with a spinner. It gets **`aria-disabled="true"`** and stays focusable; the AD-3 in-flight guard ignores activation. All fields become `readOnly`. Close, Cancel, and Escape are ignored while pending (§4.4). |
| Server or network failure (AC-C6) | A form-level error box (§6.4) at the top of the form body (`role="alert"`). All values are kept and the button becomes enabled again. |
| Success | The drawer closes. Banner and focus behavior are in §7 and §8. |

### 4.4 Escape or close with unsaved input

**"Dirty"** means any field differs from its default value.

| Trigger | Clean form | Dirty form | Pending |
| --- | --- | --- | --- |
| Escape, ×, [Cancel] | Close immediately | Show the **discard confirmation bar** in place of the footer | Ignored (the close button and Cancel are `aria-disabled`) |
| Escape while the confirmation bar is shown | — | Same as [Keep editing] (the safe default) | — |
| Leaving the page (reload, tab close) | — | `beforeunload` prompt | `beforeunload` prompt |

The discard confirmation bar replaces the sticky footer. It is not a nested dialog.

```text
Discard this new session? The details you entered will be lost.
[Keep editing] (secondary)   [Discard] (danger text button)
```

- It has `role="alertdialog"`-like semantics, implemented as a `role="group"` with `aria-labelledby` pointing to the question text. The question text is also in a polite status, so it is announced once.
- [Discard] closes the drawer and resets the form.
- [Keep editing] restores the normal footer.

There is no backdrop-click close for the create drawer on any viewport, so a stray click can't hit the discard path. This differs from the details overlay, which has nothing to lose.

#### 4.4.1 Guarding against the native dialog closing itself (both drawers)

**Problem.** Chrome's close-request anti-abuse rule makes the `cancel` event for a second Escape non-cancelable (`event.cancelable === false`) when there was no user activation since the previous one. The same can happen with other close requests, such as the Android back gesture. The native `<dialog>` then closes itself even though the handler calls `preventDefault()`. App state must stay authoritative: AD-1 for details, and the local create state (Q-1) for create.

**Layered rules**, applied to both drawers:

1. **Intercept Escape at `keydown`.** While a drawer is open, a `keydown` listener in the **capture phase on `document`** (not on the dialog, so it also catches keys when focus has fallen to `<body>`) handles `Escape`. It is scoped to the topmost open drawer. It calls `preventDefault()`, which stops the browser from turning the key into a close request, so no `cancel` event is fired. Then it routes the key to the app's own handler: `closeDetails()` for details, or the §4.4 table for create. Escape behavior is therefore decided by app state alone.
2. **`cancel` listener (fallback for close requests that aren't Escape).** It calls `preventDefault()` and routes the event to the same app handler. When `event.cancelable` is `false`, the handler still runs, and the dialog's own close is expected; rule 3 handles it.
3. **`close` listener (reconciliation).** Every close that the app starts itself sets an "app-initiated close" flag just before it calls `dialog.close()`. When a `close` event arrives **without** that flag, the dialog has closed itself, and it is reconciled with app state as shown in the table below.
4. **Input is never lost.** Closing a `<dialog>` doesn't unmount its children, and form values live in React state (AD-3/§4.2). Before any reopen, the drawer body's `scrollTop` is saved at `keydown`/`cancel` time and restored after `showModal()`.
5. **Reopening is silent and instant.** There is no slide animation, under any motion preference, so the drawer doesn't flicker. The live region doesn't announce anything; focus placement follows §8.
6. **Focus after reopen.** `showModal()` would move focus to the first focusable or autofocus element. The reconciliation step immediately moves focus to the target named in §8 (F35–F40).

| Drawer and state when it closed itself | App state says | Reconciliation | Result for the user |
| --- | --- | --- | --- |
| **Details**, any state | open (`?session=` present) | Treat as a close intent: call `closeDetails()`, so the URL follows and the drawer stays closed. Don't reopen, because there is nothing to lose (consistent with the AD-1 amendment). | Drawer closed and URL updated. Focus per F5/F7 (F35). |
| **Create**, clean, not pending | open | Treat as a close intent: set the local state to closed. | Drawer closed. Focus per F18 (F36). |
| **Create**, dirty, discard bar **not** shown | open | **Reopen** with `showModal()`, keeping the values, and show the discard bar, because the Escape counts as a close attempt. | Drawer still open with input intact and the discard bar shown. Focus on [Keep Editing] (F37). |
| **Create**, dirty, discard bar **shown** (the second-Escape case) | open | **Reopen** with `showModal()`, keeping the values, and hide the discard bar. §4.4 defines Escape on the bar as [Keep Editing]. | Drawer still open with input intact. Focus restored per F20 (F38). |
| **Create**, pending | open, pending | **Reopen** with `showModal()`. The request keeps running and the response is handled normally. | Drawer still open in the pending state. Focus on [Create Session] (F39). |
| **Create**, the response arrives while the drawer is closed by itself and not yet reopened | open | Reopen first, then apply the success or error handling, so the focus rules F26/F27 run against a visible drawer. | Normal success or error flow (F40). |

**Verification hook for `browser-verify`:** with the create form dirty, press Escape, Escape, Escape quickly without clicking. The drawer must remain open, every value must be intact, and focus must alternate between [Keep Editing] and the previously focused field. Repeat while a submit is pending (use the 250ms normal latency or the `create-error` scenario). With details open, press Escape twice: the drawer closes and `?session=` is removed. Whether `keydown` `preventDefault()` fully suppresses the `cancel` event in the Chrome version under test must be observed in the browser, not assumed. Rule 3 makes the outcome correct either way.

## 5. Status Indicators (non-color)

A badge is a pill with 6px radius, 12px/700 text, and 4×8 padding. It contains an **icon and a text label**. The icon is decorative (`aria-hidden`), the label carries the meaning, and color only reinforces it.

| Status | Icon (inline SVG) | Label | Text color | Background |
| --- | --- | --- | --- | --- |
| scheduled | ○ open circle | Scheduled | `success` #217A3C | `success-subtle` #DDF1E4 |
| full | ● filled circle | Full | `warning` #9A6200 | `warning-subtle` #FFF0CF |
| cancelled | ✕ cross | Cancelled | `danger` #B42318 | `danger-subtle` #FBE4E2 |
| completed | ✓ check | Completed | `text-muted` #5F6B6F | `surface-muted` #EEF2F3 |

- The three `-subtle` backgrounds come from the SVG and are added as tokens. All pairs pass AA (§10).
- Additional non-color cues: "No places left" or "Full" text in the capacity cell, and the cancellation block in the details.
- Shapes differ per status (outline, solid, cross, check), so they stay distinguishable in grayscale and for color-blind users.

## 6. Copy for Every Error Kind and Code

This covers api-integration §6 and §10. Copy is chosen by `failure.kind` and then `failure.code`. For a code not listed, the fallback shows the server `message` followed by the generic next step.

- Tone: second person, active voice, no first person.
- Every message states the problem and the next step.
- Buttons use Title Case.

### 6.1 Sessions list (`GET /api/sessions`)

| Kind / code | Title | Body | Actions |
| --- | --- | --- | --- |
| `http` 500 `SESSIONS_UNAVAILABLE` | Sessions couldn't load | Sessions can't be loaded right now. Try again in a moment. | [Try Again] |
| `http` 400 `INVALID_FILTER` | These filters can't be applied | The server didn't accept the current search or status. Clear the filters and try again. | [Clear Filters] |
| `network` | Sessions couldn't load | The connection failed. Check your network connection, then try again. | [Try Again] |
| `contract` | Sessions couldn't be shown | The server sent data the workspace can't read. Try again. If this keeps happening, report it to support. | [Try Again] |
| `http`, other code | Sessions couldn't load | {server message} Try again in a moment. | [Try Again] |

### 6.2 Session details (`GET /api/sessions/:id`)

| Kind / code | Title | Body | Actions |
| --- | --- | --- | --- |
| `http` 500 `SESSION_DETAILS_UNAVAILABLE` | Details couldn't load | Session details can't be loaded right now. Try again, or go back to the list. | [Try Again] [Back to Sessions] |
| `http` 404 `SESSION_NOT_FOUND` | Session not found | This session doesn't exist. It may have been removed, or the link may be wrong. | [Back to Sessions] |
| `network` | Details couldn't load | The connection failed. Check your network connection, then try again. | [Try Again] [Back to Sessions] |
| `contract` | Details couldn't be shown | The server sent data the workspace can't read. Try again, or go back to the list. | [Try Again] [Back to Sessions] |
| `http`, other code | Details couldn't load | {server message} Try again, or go back to the list. | [Try Again] [Back to Sessions] |

### 6.3 Coaches (`GET /api/coaches`, shown at the Coach control)

| Kind / code | Inline message (below the Coach control) | Actions |
| --- | --- | --- |
| loading | Coach select disabled, with the option text "Loading coaches…" | — |
| `http` 500 `COACHES_UNAVAILABLE` | Coaches couldn't load, so a coach can't be chosen yet. Try again. Your other entries are kept. | [Retry Loading Coaches] |
| `network` | The connection failed while loading coaches. Check your connection, then try again. | [Retry Loading Coaches] |
| `contract` / other | Coaches couldn't be shown. Try again. | [Retry Loading Coaches] |

In every coaches failure, the select stays disabled and the submit hint from §4.3 is shown (AC-C9).

### 6.4 Create (`POST /api/sessions`)

**Client validation (AC-C2)**, shown under each field:

| Field | Message |
| --- | --- |
| Title | Enter a title of 3 to 80 characters. |
| Session type | Choose a session type. |
| Start: date empty | Enter a date. |
| Start: time empty | Enter a start time. |
| Start: not in the future | Choose a start date and time in the future. |
| Duration | Enter whole minutes from 30 to 240. |
| Capacity | Enter a whole number of places from 1 to 100. |
| Coach | Choose a coach. |
| Location name | Enter a location name of 2 to 80 characters. |
| Location address | Enter an address of 3 to 120 characters. |
| Visibility | Choose who can see this session. |
| Trainer notes | Keep trainer notes to 500 characters or fewer ({n} now). |

**Server responses** (form-level error box at the top of the form, `role="alert"`, with a "!" icon and a danger border):

| Kind / code | Form-level message | Field effect |
| --- | --- | --- |
| `http` 400 `VALIDATION_FAILED` with `fieldErrors` | The session wasn't created. Fix the highlighted fields, then submit again. | Each mapped field shows the **server's** field message (api §2.6). Keys that can't be mapped are listed in the box. |
| `http` 400 without `fieldErrors` | The session wasn't created: {server message} Check the form, then submit again. | — |
| `http` 500 `CREATE_SESSION_FAILED` | The session couldn't be created. Your entries are kept. Submit again to retry. | Values preserved |
| `network` | The connection failed before the server confirmed the session. It may or may not have been created. Check the sessions list before submitting again to avoid a duplicate. | Values preserved |
| `contract` | The server responded, but its reply couldn't be read. The session may have been created. Check the sessions list before submitting again. | Values preserved |
| `http`, other code (for example 409) | The session wasn't created: {server message} | Values preserved |

For the `network` and `contract` outcomes, the box also has a [Check Sessions List] secondary action. It triggers the list refresh (`refreshKey`) without closing the drawer, so a duplicate can be ruled out. The status region then reports "List updated: {n} sessions".

## 7. Create-Success Feedback (AC-C7, AC-C8)

After a `201`:

1. The create drawer closes and the form resets.
2. A **success banner** appears at the top of `<main>`. It is a persistent `role="status"` container, `success` text with a ✓ icon, on `success-subtle`, full width, with no card nesting.
3. AD-4 refetches the list with the current filters. The banner content depends on whether the new id is in the refetched data:

| Refetch result | Banner text | Actions |
| --- | --- | --- |
| Pending | ✓ Session “{title}” created. | [Open Session] · [Dismiss] (×, `aria-label="Dismiss message"`) |
| Present in the results | ✓ Session “{title}” created. It's marked **New** in the list. | [Open Session] · [Dismiss] |
| **Hidden by the current filters** | ✓ Session “{title}” created. The current filters hide it. | [Open Session] · [Show All Sessions] (resets search and status) · [Dismiss] |
| Refetch failed | ✓ Session “{title}” created. The list couldn't refresh. | [Open Session] · [Dismiss]. The list shows its own §6.1 error with [Try Again]. |

- The banner text is set once. If the refetch resolves within 500ms, the banner renders straight to its final variant, so there is one announcement. If it resolves later, the extra sentence is appended and announced once.
- The banner persists until dismissed, until the next create, or until the session is opened through the banner and then closed again.
- **[Show All Sessions]** clears both filters, which triggers a refetch. The banner then switches to the "Present" variant, and the "New" tag is visible in the list.
- **[Open Session]** sets `?session=<id>` (AD-1). It works in every variant, because details load by id.
- The "New" tag on the row is removed when the banner is dismissed.

## 8. Focus Table

"Results heading" means the list section's h2 ("5 sessions"), with `tabindex="-1"`. "Trigger" means the element that was focused when the overlay was opened, which the overlay stores when it opens.

| # | Event | Focus moves to |
| --- | --- | --- |
| F1 | Page load (no `?session`) | Browser default (body). The skip link is the first Tab stop. |
| F2 | Page load with `?session=<id>` (deep link) | Details drawer h2 (`tabindex="-1"`, `autofocus` in the dialog) |
| F3 | Open details from a row title link | Details drawer h2 |
| F4 | Open details from banner [Open Session] | Details drawer h2 |
| F5 | Close details (×, Escape, scrim, [Back to Sessions], browser Back), opened from a row | That session's **row title link**, found by id after re-render. If the row is no longer rendered, the **results heading**. |
| F6 | Close details, opened from the banner | Banner [Open Session] if the banner still exists; otherwise F5's rule |
| F7 | Close details that were opened by a deep link (no trigger) | The row title link for that id if it's present; otherwise the results heading |
| F8 | Details [Try Again] activated | Stays on [Try Again], which is `aria-disabled` with the label "Trying again…" during the request |
| F9 | Details retry **succeeds** | Details drawer h2 |
| F10 | Details retry **fails again** | Stays on [Try Again]. The error is re-announced (§9 L4). |
| F11 | List [Try Again] activated | Stays on [Try Again] (`aria-disabled`, "Trying again…") |
| F12 | List retry succeeds | Results heading |
| F13 | List retry fails again | Stays on [Try Again], with a re-announcement |
| F14 | [Clear Filters] in the filter bar | **Search input**. The button becomes disabled, so focus can't stay on it. |
| F15 | [Clear Filters] in the no-matches state or an `INVALID_FILTER` error | Search input |
| F16 | Typing in search or changing the status | Unchanged |
| F17 | Open create (header or empty-state button) | **Title** input |
| F18 | Close create while clean (×, Escape, [Cancel]) | Trigger: the header or empty-state [Create Session]. If the empty-state button no longer exists, the header [Create Session]. |
| F19 | Close attempt while dirty | Discard bar **[Keep Editing]** |
| F20 | [Keep Editing] (or Escape on the discard bar) | The element that was focused before the close attempt; the Title input if that is unknown |
| F21 | [Discard] | Trigger (F18's rule) |
| F22 | Submit with client validation errors | **First invalid field** in DOM order. For the Start group, the empty or invalid input among date and time. |
| F23 | Submit pending | Stays on [Create Session] (`aria-disabled`, "Creating…") |
| F24 | Server `400` with mappable `fieldErrors` | First field with an error |
| F25 | Server `400` with no mappable `fieldErrors` | Form-level error box (`tabindex="-1"`) |
| F26 | Server `500`, `network`, `contract`, or other failure | Stays on [Create Session], now enabled again. The form error box is announced through `role="alert"`. |
| F27 | Create **success** | Header **[Create Session]**, because the drawer closes and the trigger may be gone. The banner announces through `role="status"`. The banner comes next in DOM order, so the next Tab reaches [Open Session]. |
| F28 | Banner [Show All Sessions] | Banner [Open Session], because the reset button disappears |
| F29 | Banner [Dismiss] | Results heading |
| F30 | Coaches [Retry Loading Coaches] activated | Stays on that button (`aria-disabled`, "Retrying…") |
| F31 | Coaches retry succeeds | **Coach select** |
| F32 | Coaches retry fails again | Stays on the retry button, with a re-announcement |
| F33 | Create [Check Sessions List] (§6.4) | Stays on the button. Results are announced through the status region. |
| F34 | Any Escape while the create form is pending | Unchanged (ignored) |
| F35 | Details drawer closes itself (non-cancelable `cancel`, §4.4.1) | Same as F5 or F7: the row title link for that id, or else the results heading. The URL is updated through `closeDetails()`. |
| F36 | Create drawer closes itself while clean and not pending | Same as F18: the trigger, or else the header [Create Session] |
| F37 | Create drawer closes itself while dirty and the discard bar isn't shown | The drawer is reopened and focus goes to the discard bar's **[Keep Editing]** (same as F19) |
| F38 | Create drawer closes itself while dirty and the discard bar is shown (the second Escape) | The drawer is reopened and the bar hidden. Focus goes to **the element focused before the first close attempt**, or the Title input if that is unknown (same as F20). |
| F39 | Create drawer closes itself while a submit is pending | The drawer is reopened and focus goes to **[Create Session]** (`aria-disabled`, "Creating…"), the same as F23 |
| F40 | Create response arrives during a self-close | The drawer is reopened first, then F26 (error) or F27 (success) applies |

Implementation rule: buttons that start a request use `aria-disabled` plus an activation guard, never native `disabled`, so focus is never dropped to `<body>`. Native `disabled` is used only for controls that are unavailable *before* any interaction: Clear filters when nothing is active, submit when coaches aren't loaded, and the coach select while it's loading.

## 9. Live-Region Rules

Live regions are **persistent containers**, rendered empty from the first paint, so content changes are announced reliably. Each event has one announcement mechanism. If focus moves to an element whose content explains the change, no live region repeats that content.

| ID | Region | Politeness | Announces | Doesn't announce |
| --- | --- | --- | --- | --- |
| L1 | Results status (visually the count and "Updating…" next to the results h2; a separate visually hidden `role="status"` node holds the sentence) | polite | "Loading sessions…" (initial load); "{n} sessions" or "No sessions match these filters" **after a filter change, a clear, a retry, or a refetch completes**; "List updated: {n} sessions" (F33) | Every keystroke (search is debounced, and only the settled result is announced); "Updating…" |
| L2 | Success banner | polite (`role="status"`) | The §7 banner text, once per create, with at most one appended sentence | Dismissal |
| L3 | Error messages: the list error, the in-drawer details error, the coaches inline error, the create form-level box | assertive (`role="alert"`), rendered inside a persistent container | Their message when shown | Field-level validation errors. Those are announced by moving focus to the field (F22, F24) plus `aria-describedby`. |
| L4 | Repeated failure on retry | Same `role="alert"` | The container is cleared and refilled, so the same message is read again | — |
| L5 | Discard confirmation question | polite | "Discard this new session? …" | — |
| L6 | Details loading | none: `aria-busy` on the drawer body, with focus on the h2 | — | "Loading session details…" is visible text only |
| L7 | Create pending | none: the label on the focused button changes to "Creating…" | — | — |
| L8 | Notes character counter | none (`aria-describedby` only) | — | Count changes |

## 10. Contrast Check (WCAG 2.2 AA)

Ratios were computed with the WCAG relative-luminance formula from the token hex values. Text needs ≥ 4.5:1. Non-text UI parts (control boundaries, focus indicators, icons that carry meaning) need ≥ 3:1.

### 10.1 Pairs that pass

| Foreground | Background | Ratio | Use |
| --- | --- | --- | --- |
| `text` #172124 | `surface` / `canvas` / `surface-muted` | 16.41 / 15.27 / 14.56 | body text |
| `text-muted` #5F6B6F | `surface` / `canvas` / `surface-muted` | 5.50 / 5.12 / 4.88 | supporting text, labels, the Completed badge |
| white | `primary` #087F72 / `primary-hover` #06675D | 4.90 / 6.76 | primary button |
| `primary` #087F72 | `surface` / `canvas` | 4.90 / 4.56 | text buttons and links |
| `success` #217A3C | `surface` / `success-subtle` #DDF1E4 | 5.37 / 4.54 | Scheduled badge, success banner |
| `warning` #9A6200 | `surface` / `warning-subtle` #FFF0CF | 5.10 / 4.52 | Full badge (marginal pass, see 10.3) |
| `danger` #B42318 | `surface` / `danger-subtle` #FBE4E2 | 6.57 / 5.42 | errors, Cancelled badge, Discard |
| `focus` #1769E0 | `surface` / `canvas` / `surface-muted` | 5.08 / 4.73 / 4.51 | focus ring (≥ 3:1) |
| `primary` #087F72 | meter track #E0E7E8 | 3.91 | meter fill (decorative; the value is also in text) |

### 10.2 Pairs that fail, and the fixes

| # | Problem | Ratio | Required | Fix |
| --- | --- | --- | --- | --- |
| X-1 | Placeholder #7A868A (SVG) on `surface` | 3.75 | 4.5 | Placeholders use **`text-muted` #5F6B6F** (5.50). They are never the only label, because visible labels always exist. |
| X-2 | Control boundary #AAB6B9 (SVG) on `surface` | 2.08 | 3.0 | New token **`border-control` #7B878B**: 3.70 on `surface`, 3.44 on `canvas`, 3.28 on `surface-muted`. Used for inputs, selects, radios, and secondary button outlines. |
| X-3 | `border` #D7DEE0 used as a control boundary | 1.36 | 3.0 | Same as X-2. `border` stays only for **dividers and surface edges**, which are decorative and exempt. |
| X-4 | `primary` text on `surface-muted` (#EEF2F3), for example a text button in a hovered row | 4.34 | 4.5 | Primary-colored **text** on `surface-muted` or on any tint uses **`primary-hover` #06675D** (6.00 on `surface-muted`, 6.07 on #EAF5F3, 6.29 on `canvas`). |
| X-5 | `primary` text on the SVG selected-row tint #EAF5F3 | 4.40 | 4.5 | The design has **no tinted selected row**, because the details overlay is modal. If the tint is ever used, apply X-4. |
| X-6 | `focus` ring directly against a `primary` fill | 1.04 | 3.0 | The focus ring is a **2px outline with a 2px offset**, so it always sits on the page or surface background (≥ 4.51), never on the button fill. The same applies to `danger` fills (1.29). |

### 10.3 Notes

- `warning` on `warning-subtle` (4.52) and `focus` on `surface-muted` (4.51) pass with almost no margin. Don't lighten these backgrounds and don't put `warning` text on any darker background. The badge text stays at least 12px/700.
- Disabled controls are exempt, but they still use `text-muted` on `surface-muted` (4.88), so their labels stay readable.
- The token additions are `border-control` #7B878B, `success-subtle` #DDF1E4, `warning-subtle` #FFF0CF, `danger-subtle` #FBE4E2, and `scrim` rgba(23,33,36,0.4). They extend the supplied palette without changing any token value.

## 11. Interaction Details

- **Focus indicator:** `:focus-visible` with a 2px `focus` outline and 2px offset, on every interactive element, including title links and the dialog headings when focused programmatically.
- **Touch:** controls are at least 44px on mobile and at least 40px on desktop. `touch-action: manipulation` on buttons.
- **Hover** is never the only cue. Row hover is decoration; the link is always underlined on hover and focus and colored `primary` at rest.
- **Motion:** only the drawer slide (150ms, transform and opacity). It is removed under reduced motion. No `transition: all`.
- **Loading text** ends with "…". Counts use numerals ("1 session", "5 sessions").
- **Dates:** in the list, "Mon, Aug 3, 18:00"; in the details, the full weekday and date with a time range and timezone. All formatting goes through `lib/datetime` (AD-5) in the user's locale.
- **Native `<select>`** controls set `background-color` and `color` explicitly.
- **The skip link** targets the results heading.

## 12. Reuse Candidates (component inventory for `writing-plans`)

`StatusBadge`, `Drawer` (the dialog shell shared by details and create: header, close, body, sticky footer, desktop/mobile shape, reduced motion), `InlineError` (title, body, actions; `role="alert"`), `EmptyState`, `FieldError` and `Field` (label, control, error, `aria-describedby` wiring), `SuccessBanner`, `RetryButton` (`aria-disabled` pending pattern). Each has one consumer pattern; no generic design-system layer is built (frontend-boundaries rule).

## 13. Resolved Questions

There are no open items. The developer resolved both in the second `/ui-designer` invocation.

| ID | Item | Resolution |
| --- | --- | --- |
| Q-1 | The create drawer's open state is local UI state, not in the URL (not deep-linkable) | **Resolved, approved by the developer:** it stays local state in `SessionsWorkspace` and is not in the URL. §4.4.1 keeps the native dialog in sync with it. |
| Q-2 | No sidebar, unlike the SVG reference (§1) | **Resolved, approved by the developer:** no sidebar |

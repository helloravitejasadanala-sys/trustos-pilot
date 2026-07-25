# P0 Components — Implementation Spec

Every component below is **P0 (essential for tonight)** unless noted. Priorities:
**P0** = pilot cannot run without it · **P1** = useful once the pilot begins · **P2** = future.

Build each against `tokens.css`. Measurements are exact. "Must not change" lines are non-negotiable — they carry the product meaning.

---

## Component priority index
| Component | Priority |
|---|---|
| Vendor app shell (rail + topbar) | **P0** |
| Mobile navigation (bottom bar) | **P0** |
| Do This First module | **P0** |
| One Clear Next Action + responsibility hand-off | **P0** |
| Projects worklist | **P0** |
| Project progress (journey stepper) | **P0** |
| Event Details completed summary | **P0** |
| Manual payment panel | **P0** |
| Free Collaboration mode | **P0** |
| Messages | **P0** |
| Delivery link (locked → add) | **P0** |
| Client current-action card | **P0** |
| Status chip | **P0** |
| Category / client marker | **P0** |
| Loading / empty / success / error states | **P0** |
| Add Client / New Project flow | **P0** |
| Create vendor account (signup) | **P0** |
| Sign in | **P0** |
| Basic Clients page | **P0** |
| Basic Preparation | **P0** |
| Client approval | **P0** |
| Archive project | **P0** |
| Edit project & client | **P0** |
| Delete test records only | **P0** |
| Simple TrustOS Admin overview | **P0** |
| Context "at a glance" rail | P1 |
| Settings (beyond profile) | P1 |
| Pay-securely-online (Stripe) mode | **not P0** |
| Templates | **not P0** |
| Team access | **not P0** |
| Advanced analytics | **not P0** |
| Automation | **not P0** |

> **P0 scope (this revision):** the full pilot loop is P0 — Vendor Today · Do This First · Projects · Clients · One Clear Next Action · Event Details · Manual payment · Free Collaboration · Preparation · Messages · Delivery · Client approval · Archive · Client Portal · Admin overview · all mobile screens. Stripe, Templates, Team access, advanced analytics and automation remain **outside P0**.

### Newly-P0 component notes
- **Create vendor account / Sign in** — build the auth screens (was P1). Signup: studio name, email, password → Empty workspace. Signin: email + password, plain-language error. Ref `desktop-reference.html` §1.
- **Basic Clients page** — the directory rows (name, project, status, last activity). Read + open only; no rich CRM. Lives in the main prototype.
- **Basic Preparation** — the checklist (tap to toggle) + venue notes. No templates. Lives in the main prototype.
- **Client approval** — client-side "Approve delivery" on the portal + vendor sees the approved state; advances stage 9. Pairs with Delivery (comp 11).
- **Archive project** — move a completed project to Archived (stage 10); worklist shows it dimmed, read-only. Confirm dialog, reversible.
- **Edit project & client** — edit core fields (title, date, location, client name/contact) from Overview / client card. Inline, validated.
- **Delete test records only** — a guarded "Delete" limited to pilot/test records, behind a typed-confirm dialog; never bulk, never real client data.
- **Simple TrustOS Admin overview** — the stat strip + active-projects table + signups + warnings only (no analytics). Admin desktop in the main prototype.

---

## 1. Vendor app shell (rail + topbar) — P0
- **Purpose:** persistent frame for every vendor screen; anchors identity and the one global action (New project).
- **Data:** workspace name + type, nav counts (today actions, live projects), current user (name, role, initials).
- **Desktop:** 232px rail (`--nav`), 20px/16px padding. Brand block (34px marker `--nav-2`/`--lime`), nav list (11px/12px pad, radius 9, active = `--nav-active` bg + `--lime` text + count badge), profile pinned bottom above a `--nav-line` rule. Main area: 60px topbar (`--canvas-2`, bottom `--line`) with date (`.num`), 300px search field, right-aligned **forest** "New project". Body scrolls, 26px pad.
- **Mobile:** rail becomes the bottom nav (component 2); topbar collapses to a compact greeting header inside the screen.
- **Type:** brand 14/700; nav 13.5/600; profile 13/600 + 11 muted.
- **Tokens:** bg `--nav`; text `--on-dark`/`--on-dark-mut`; active `--nav-active`+`--lime`; topbar `--canvas-2`.
- **Spacing:** rail width 232; topbar height 60; body pad 26; nav item gap 3.
- **Interaction:** nav item → route; active reflects route; New project → New Project flow. Hover on inactive nav lightens text to `--on-dark`.
- **States:** loading → nav visible, body skeleton. Empty → see Empty workspace screen. Error → `.banner-error` at top of body. Offline → `.banner-offline` under topbar.
- **A11y:** nav is `<nav>` with `aria-current="page"`; New project ≥44px; search focusable.
- **Copy:** "New project" (never "＋ Add" alone). Search placeholder "Search projects & clients".
- **Must not change:** rail is dark forest; New project is **forest not lime** (lime is reserved for the screen's single next-action CTA); profile stays bottom.

## 2. Mobile navigation — P0
- **Purpose:** primary vendor nav on phone.
- **Data:** four destinations (Today, Projects, Clients, Settings), active route.
- **Layout:** fixed bottom bar, `rgba(13,27,23,.96)`, height 68, radius `0 0 38px 38px` inside frame; 4 items evenly spaced; icon 18–22 + 10px label; active = `--lime` + weight 700.
- **Interaction:** tap → route; active state immediate.
- **A11y:** each item ≥44px tap target; labelled text under icon (never icon-only).
- **Must not change:** four items only; dark; labels always visible.

## 3. Do This First module — P0
- **Purpose:** the single highest-priority action across ALL live projects, on Today.
- **Required data:** project id, client + project name, category (→ marker), date block (weekday, day num, month, time), "why" line, urgency flag, CTA label + target route, stage it unlocks.
- **Desktop:** `.action` (dark). Left 96px date block (gradient `#2a4b3f→#16302a`, lime weekday kicker, 30px `.num` day). Right: marker(26)+client+`chip-coral` "Just in"; `--t-h1` headline; 13px `--on-dark-mut` why (max 46ch). Footer row: **lime CTA** + ghost-dark "Snooze" + right-aligned `.num` "~2 min · unlocks stage N".
- **Mobile:** stacked; 56px date block; full-width lime CTA; drop the snooze/meta to keep one thumb-reachable action.
- **Type:** headline `--t-h1`; kicker `--t-kicker` `--coral-deep` above the module ("● Do this first").
- **Tokens:** `.action` bg `--nav`; CTA `--lime`/`--lime-ink`; urgency chip `--coral`.
- **Spacing:** module pad 24 (mobile 20); date block gap 20 (mobile 13).
- **Interaction:** CTA → the action's route; Snooze → demote for the day (next-highest becomes Do This First).
- **States:** loading → dark module with skeleton lines. Empty (nothing urgent) → calmer variant: "You're all caught up" + muted body + no lime CTA (show a quiet "Review today's schedule" ghost). Error → `.banner-error` above. Success → after completing, module animates out and the next action takes its place.
- **A11y:** headline is the module's heading; CTA ≥44px; urgency conveyed by chip text not colour alone.
- **Copy (exact):** kicker "Do this first" · headline "Review the Rao Family's Event Details" · why "They sent everything for Saturday 8 minutes ago. Reviewing it unlocks the quote." · CTA "Review Event Details" · meta "~2 min · unlocks stage 4".
- **Must not change:** exactly one per Today; dark module; one lime CTA; always shows client, action, why, urgency, one dominant button.

## 4. One Clear Next Action + responsibility hand-off — P0
- **Purpose:** the single next step inside a project; makes responsibility unmistakable and advances the lifecycle.
- **Required data:** stage no/name, responsible party (`vendor`|`client`), from/to markers, action text, why line, primary CTA, next stage no.
- **Desktop/Mobile:** `.action` module. Top hand-off row (bottom `--nav-line` rule): **from-marker** (active party filled — vendor=`--lime`/lime-ink, client=`--lav`/white), "Responsibility / {who}" centre, `→`, **to-marker** (inactive `--nav-2`/`--on-dark-mut`). Then `--t-h1` action, `--on-dark-mut` why (≤52ch), footer **lime CTA** + `.num` "Advances to stage N".
- **Type/tokens/spacing:** as `.action` (component 3).
- **Interaction:** CTA performs the action and advances the stage machine; the module re-renders to the new current action. When responsibility is the client's, CTA becomes a nudge ("Send a friendly reminder") and the active marker is the client's.
- **States:** loading skeleton in dark module; if blocked → `.banner-error` explaining what's missing; success → stage advances, journey ticks, module updates.
- **A11y:** hand-off has text ("Your turn" / "Client's turn"), not colour only.
- **Copy (exact examples):** "Review the Event Details, then send the quote" · "The temple committee needs to confirm the Event Details" (CTA "Send a friendly reminder") · "No payment required — begin preparation" · "Add the final delivery link".
- **Must not change:** one per project; dark module; hand-off always present; CTA advances the stage; one lime CTA.

## 5. Projects worklist — P0
- **Purpose:** scan every project's state and act in seconds.
- **Required data per row:** marker+category, title, client, stage no+name, percent, responsibility chip, next-action text, date, urgency flag.
- **Desktop:** `.panel` wrapping `.wl-head` + `.wl-row`s. Grid `2.3fr 1.5fr 2fr .9fr`. Row: marker(40)+title(14.5/700)+client; stage (`.num` "3/10" + name + `.bar`); who-`chip` + next action (ellipsis); right-aligned `.num` date. **Most-urgent row** = `.urgent` (coral left edge + `--coral-soft` tint + coral date). Archived rows opacity .66.
- **Mobile:** cards, not the table — marker+title+who-chip, full-width `.bar`, then "stage · next action" + date row.
- **Tokens/type:** per `.wl-*` classes.
- **Interaction:** whole row → Project Overview. Hover → `--canvas-2`.
- **States:** loading → 2–3 skeleton rows. Empty → `.empty` "No projects yet" + "New project". Error → `.banner-error`.
- **A11y:** rows are `<button>`/`<a>`; progress has `aria-label="Stage 3 of 10"`.
- **Copy:** headers "Project / Stage / Next action / Date". Who chips: "Your turn" (lime), "Client" (lav), "Done" (success).
- **Must not change:** table not cards on desktop; at most one `.urgent` row; scan-in-seconds density.

## 6. Project progress (journey stepper) — P0
- **Purpose:** reassure on done, make current obvious, keep future quiet.
- **Data:** 10 stages, current index.
- **Layout:** horizontal in a `.panel`, 20/18 pad. 24px dots: done = `--forest` fill + white ✓; **current = `--lime`** + `--lime-deep` border + number; future = `--panel` + `--line` border + faint number. Connector 2px, `--forest` up to current then `--line`. Caption below a `--line-soft` rule: "**Now: {stage}.** {note}".
- **Mobile:** same horizontal row (dots shrink); caption below.
- **Interaction:** read-only in Phase 1 (no tap-to-jump).
- **A11y:** `aria-label` "Stage 3 of 10: Event Details, in progress".
- **Must not change:** current dot is lime; done reassures; future stays quiet; the 10 stages are fixed and ordered.

## 7. Event Details completed summary — P0
- **Purpose:** once confirmed, collapse the form into a concise, scannable summary.
- **Data:** the confirmed fields for the project type (photography vs livestream differ in content only).
- **Layout:** `.context` panel, `chip-success` "Completed" beside the heading; 2-col grid of label(`--t-xs` faint)+value(13.5). Not a form; read-only.
- **Interaction:** "Edit details" ghost link (P1).
- **Copy:** heading "Event Details"; never "Questionnaire". Photography fields: Guests & timings, Location, Must-have photos, Style. Livestream: Timings, Venue contact, Internet & platform, Audio, Power & load-in.
- **Must not change:** completed = summary (collapsed), not an open form; label is Event Details.

## 8. Manual payment panel — P0
- **Purpose:** take payment with zero Stripe; both sides confirm.
- **Data:** amount, currency, method, bank details string, client-confirm state+time, vendor-confirm state.
- **Layout:** three zones. **Amount** (`.num` 38/800 + status `chip`). **Mode** — 3 radios; selected = `.action-outline` and expands to a client-facing instructions block ("They see: Transfer £180 … ref … They confirm once sent · you confirm when it lands"). **Confirmation handshake** — `.context` with two `.panel` tiles: "Client confirms sent" (✓ + time) and "You confirm received" (forest "Mark received" button).
- **Interaction:** selecting a mode swaps only its expanded body; "Mark received" flips vendor state → payment stage satisfied.
- **States:** awaiting (amber chip) · client-sent (client tile ✓, vendor pending) · received (both ✓, success). Error → `.banner-error` in plain words.
- **Copy:** "Pay manually" · "Bank transfer or cash" · "Mark received". Never "Stripe", "gateway", "config", or an error code.
- **Must not change:** manual works without Stripe; explicit **two-sided** confirmation, both visible to both; no payment plumbing language.

## 9. Free Collaboration mode — P0
- **Purpose:** an intentional "no payment required" product mode, not a fallback.
- **Layout:** third radio in the Money panel; selected expands to: "A community collaboration — no payment. The project skips straight to preparation, and the client sees a warm 'no payment needed' note." Amount shows "—".
- **Interaction:** selecting it advances past the payment stage; client portal payment card becomes a reassuring note, not a task.
- **Must not change:** reads as deliberate and warm; never labelled "skipped"/"waived"/"free tier".

## 10. Messages — P0
- **Purpose:** client conversation inside the project (not a separate inbox app).
- **Data:** thread messages (author, text, time), current draft.
- **Layout:** `.panel`, 18 pad, 14 gap. Client bubble left (`--panel`+`--line`), vendor bubble right (`--forest`/white); 30px round avatar/marker; `.num` timestamp under bubble. Composer row: inset field + forest "Send".
- **Mobile:** same, full-width.
- **States:** empty → "No messages yet — say hello." loading → 2 skeleton bubbles. error → `.banner-error` "Message didn't send — tap to retry."
- **A11y:** log region `aria-live="polite"`; Send ≥44px.
- **Must not change:** lives in the project; not a Slack clone; vendor right/forest, client left/white.

## 11. Delivery link — P0
- **Purpose:** locked until service complete, then add the gallery link the client sees.
- **Data:** locked flag, delivery URL, delivered timestamp, client-approved flag.
- **Layout (locked):** `.action` dark, centred lock marker, "Delivery opens after the shoot" + why, disabled ghost-dark "Add delivery link · locked". **Unlocked:** panel with URL field + forest "Add delivery link"; once added → success banner + client sees it instantly.
- **States:** locked (disabled) · ready-to-add · delivered · client-approved (success chip).
- **Copy:** "Add delivery link", "Approve delivery" (client side). No file-host/config language.
- **Must not change:** locked before service complete; disabled control keeps its label; adding surfaces instantly on the portal.

## 12. Client current-action card — P0
- **Purpose:** the ONE thing the client must do now, understood in 5 seconds.
- **Data:** action title, why, field checklist (done flags), CTA.
- **Layout:** `.action-outline` (white, 2px `--forest`) — **not** dark, **not** lime. Serif title (22–25), muted why, field rows (done = `--success-soft`+✓, todo = `--canvas-2`), **forest** full-width CTA. Sits under a `--coral-deep` "What we need from you" kicker.
- **Interaction:** CTA opens the Event Details form (or the relevant task).
- **Empty/none-required state:** replace with a calm card — "You're all set — MiniMomentz is preparing your film. Nothing needed right now." No CTA.
- **A11y:** title is the page's main heading; CTA ≥44px.
- **Copy:** "Confirm your event details" · "A few practical things about the day. About 3 minutes — no account needed."
- **Must not change:** exactly one current action; CTA is forest (portal stays light/warm); calm state when nothing's needed.

## 13. Status chip — P0
- Small label, `.chip` + role variant. **One per row max.** Always carries a word. Variants: `chip-lime` (your turn / immediate), `chip-coral` (urgent/new), `chip-lav` (client), `chip-amber` (pending), `chip-success` (done/accepted), `chip-muted` (locked/soon). Must not: stack, or use colour without text.

## 14. Category / client marker — P0
- `.marker` square (radius 8; 50% only for avatars). Photography `--gold`, livestream `--lav`, done `--success`; initials for people. Replaces stock imagery. Real project image may fill the marker when available. Must not: use decorative stock photos.

## 15. Loading / Empty / Success / Error — P0
Specified once in `PHASE_1_DESIGN_SPEC.md §Global states`; classes `.skeleton`, `.empty`, `.banner-*` in `tokens.css`. Every P0 screen must implement all four. Must not: show a blank region, a raw spinner on content, or a technical error string.

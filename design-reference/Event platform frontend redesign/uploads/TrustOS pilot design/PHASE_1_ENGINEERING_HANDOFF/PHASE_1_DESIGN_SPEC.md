# PHASE 1 — Design Spec (TrustOS · MiniMomentz pilot)

Engineering-ready. The visual system is **approved and frozen** — implement it, do not make new visual decisions. Where this doc and a reference file disagree, this doc wins; where this doc is silent, copy the reference HTML markup verbatim.

**Read order:** this file → `tokens.css` → `P0_COMPONENTS.md` → `desktop-reference.html` / `mobile-reference.html` → `SCREEN_CHECKLIST.md` → `ROUTE_MAP.md` → `DEFERRED.md`.

---

## What Phase 1 is
One vendor (MiniMomentz / Ravi), a handful of real projects, and their clients on secure links. Manual-first payments. No analytics, no templates, no team, no admin analytics. The job is to run **one real project end-to-end tonight** and feel calm doing it.

## Screens in scope
Auth entry · **Create vendor account** · **Sign in** · Empty workspace · Today · Projects worklist · New Project · Add Client · Project Overview · Money · Messages · Delivery · **Client approval** · **Archive project** · **Edit project & client** · **Delete test records only** · **Basic Clients page** · **Basic Preparation** · **Simple Admin overview** · Client Portal · mobile Today / Project Overview / Client Portal. **Nothing else.** (Full exclusion list in `DEFERRED.md`.)

**Outside P0 (held back):** Stripe / pay-online · Templates · Team access · advanced analytics · automation.

## The frozen visual system (enforced)
- **Dark forest navigation** (`--nav` #0D1B17) — vendor rail + elevated action modules.
- **Warm application canvas** (`--canvas` #EAE4D6).
- **Compact operational panels** (`--panel` white, radius 10–13, `--sh-sm`).
- **Lime immediate-action CTA** (`--lime`) — **exactly one per screen**, never on ordinary controls.
- **Coral** = urgency · **lavender** = client's turn · **amber** = vendor pending · **forest** = brand/done-path · **success** = done.
- **Responsibility hand-off** (Vendor → Client markers) on every next-action module.
- **Strong tabular numerics** (`.num`) for dates, stages, amounts, counts, times.
- **Rare serif** (Instrument Serif) — welcome, project title, client header only.

### Hard rules (reject a build that breaks these)
1. **One lime CTA per screen.** Max.
2. **One large dark action module per screen.** (`.action`)
3. **Client Portal stays light & warm** — its one CTA is **forest**, not lime, not dark.
4. **No stock photography.** Real project images only; otherwise initials or category markers (`.marker-photo` gold, `.marker-stream` lavender, `.marker-done` green).
5. **Minimal animation** — screen fade-in + skeleton shimmer only. No parallax, floaty, glow.
6. **No decorative-only component.** Every element carries a function.
7. **Never expose payment plumbing** (no Stripe/config/error-code language to either user).
8. **Four surfaces are a contract** (`.panel` / `.context` / `.action` / `.action-outline`) — never restyle one to look like another.

## Tokens
All in `tokens.css`. Import it first in every view. Never hard-code a hex, font, radius or spacing a token already carries. The component layer (`.btn`, `.chip`, `.panel`, `.wl-row`, `.marker`, `.bar`, `.skeleton`, `.banner`, `.empty`) is production-usable — build against it.

## Type scale (from tokens)
| Use | Token | Value |
|---|---|---|
| Welcome / project title / client header | `--t-serif-lg` / `--t-serif-md` | Instrument Serif 32 / 25 |
| Action module headline | `--t-h1` | Hanken 700 · 22/1.15 |
| Panel titles | `--t-h2` | Hanken 700 · 15 |
| Body | `--t-body` | Hanken 500 · 14/1.5 |
| Small / meta | `--t-sm` | Hanken 500 · 13 |
| Kicker (uppercase .14em) | `--t-kicker` | Hanken 800 · 11 |
Numerics always add `.num`. Min body 12px (mobile 11.5). Serif never below 22px and never for UI/labels/paragraphs.

## Layout
**Desktop vendor:** 232px dark rail · 60px `--canvas-2` topbar (date · search · New project) · body padding 26px · **asymmetric grid** — Today `1.62fr / 1fr`, Project Overview `1.6fr / 1fr`, rail gap 20px. Window 1240px.
**Mobile vendor:** phone frame, content padding `4px 16px 90px`, dark bottom nav (Today/Projects/Clients/Settings), status bar sticky, full-width CTAs, targets ≥44px.
**Client:** desktop 920px card (2-col action+status); mobile phone. Forest-deep header, lime progress, forest CTA. No nav.

## Global states (spec once, reuse everywhere)
- **Loading:** `.skeleton` blocks matching the final layout's shape; never spinners on content areas.
- **Empty:** `.empty` block — title + one line + one action. Never a bare blank region.
- **Error:** `.banner-error` inline above the affected zone; field errors set the input border to `--coral` + a 12px helper line. Plain language, no codes.
- **Success:** `.banner-success` inline, auto-dismiss optional; confirmations name what happened ("Quote sent to Priya").
- **Offline:** `.banner-offline` pinned under the topbar: "You're offline — changes save when you reconnect."
- **Disabled:** opacity .5, `cursor:not-allowed`, keep the label (e.g. locked Delivery).

## Accessibility (baseline for every screen)
AA contrast (ink/canvas, white/forest, lime-ink/lime all pass). `:focus-visible` 2px forest ring. Targets ≥44px. No icon-only or hidden critical action. Colour never the sole signal — every status chip carries a word. Honour `prefers-reduced-motion`. Semantic headings; buttons are `<button>`, links `<a>`.

## Copy
Verbs, not systems: *Review Event Details · Send the quote · Record payment · Add delivery link · Approve delivery · Send a reminder*. One-line who+why. Warm assistant tone. British spelling, £. "Event Details" never "questionnaire". Exact strings per component in `P0_COMPONENTS.md`.

# TrustOS — Design & Engineering Handoff

**Direction: "Creative Operations Studio."** A calm professional control surface for photographers, livestream operators, DJs, makeup artists and event teams. Designed, not decorated. Live prototype: `TrustOS Pilot.dc.html` (desktop + mobile, Vendor / Client / Admin — toggle both in the top bar). The previous editorial pass is archived as `TrustOS Pilot v1 (editorial).dc.html`.

---

## 0. Before / after — why it changed
The v1 editorial pass was tasteful but read as a generic AI-SaaS template: every section a white rounded card on warm paper, vertically stacked, centred, serif-headed, soft green. It looked like a styled prototype, not a daily tool. **What changed:** a dark near-black **forest navigation anchor**, **asymmetric grids** (main column + context rail, never centred stacks), **compact modules** instead of one big card per item, **acid-lime reserved strictly for the single immediate action**, **tighter radii** (8–13px, some square), **tabular numerics** for dates/stages/amounts/counts, a **worklist** for projects, and a **responsibility hand-off visual** unique to TrustOS. Serif is now rare (welcome, project title, completion, client welcome). Product logic, workflows, stages and signature behaviours are unchanged.

---

## 1. Emotional intention
After a deposit, clients go quiet and anxious and the vendor is juggling ten tools. TrustOS makes both sides feel calm, informed and professionally supported — always clear on what happened, what's waiting, what to do next. It should feel like a confident studio assistant: warm (paper canvas, forest, ember), trustworthy (dark operational rail, restraint), and never like venture software pretending to have thousands of customers.

**Feels:** calm, warm, premium, human, quietly confident, operationally sure.
**Never:** cold, corporate, childish, over-designed, generic AI-SaaS, or a marketing page wearing a dashboard.

## 2. UX principles (preserved from v1)
1. One dominant action per screen; every screen answers who / what happened / what's waiting / what next / what after.
2. **Do This First** (Today): single highest-priority action across all live projects. Dark forest module, date block, thumbnail marker, coral "just in", lime CTA. Not a hero.
3. **One Clear Next Action** (project): dark forest module with a **Vendor → Client responsibility hand-off**, plain action, lime CTA that visibly *advances the stage*.
4. The journey reassures: done = filled forest + check; current = **lime** dot; future = quiet.
5. Client is guided, not administered: no account, no nav, one link, one action.
6. Plain language only — no internal implementation words.

## 3. Design tokens

### Colour — communicates role & state
| Token | Value | Role |
|---|---|---|
| `--canvas` / `--canvas-2` | `#EAE4D6` / `#F1ECE0` | **Surface 1** — working canvas |
| `--panel` | `#FFFFFF` | **Surface 2** — standard operational panel |
| `--nav` / `--nav-2` | `#0D1B17` / `#14261F` | **Surface 3** — dark navigation & elevated action modules |
| `--recessed` / `--sand` | `#E4DECF` / `#EDE7D9` | **Surface 4** — context / recessed panel |
| `--ink` / `--muted` / `--faint` | `#16150F` / `#636155` / `#918E7E` | Text |
| `--line` / `--line-soft` | `#D8D2C3` / `#E7E1D3` | Borders |
| `--forest` / `--forest-deep` | `#1E6E68` / `#123F3A` | Brand + secondary actions, client header |
| `--lime` / `--lime-ink` | `#C7E85A` / `#15251A` | **Signature action ONLY** — the one immediate CTA |
| `--coral` / `--coral-deep` | `#E0603A` / `#B4441F` | Urgency / most-urgent row |
| `--lav` | `#5A5FA6` | **Client's responsibility** |
| `--success` | `#1E7A51` | Done / accepted |
| `--amber` | `#A9711A` | Waiting on me / pending |
| `--gold` | `#A9812C` | Photography category marker |

Each role has a `-soft` tint for chips/fills. **Rules:** lime never appears twice on a screen and never on ordinary UI; only `--nav` and `--forest-deep` fill large surfaces; ordinary cards are never colour-filled; colour always encodes a role or state.

### Typography
- **Interface:** Hanken Grotesk (400–800). `.num` = `font-variant-numeric: tabular-nums` for **dates, stages, amounts, counts, times** — strong numerics are a signature.
- **Editorial serif:** Instrument Serif — *rare*: greeting, project title, completion, client welcome, admin headline. Never for dense UI, labels, or paragraphs.
- Min in-app body 12px (mobile 11.5), primary actions 14.5–15px.

### Radius (tightened) & elevation
`--r-xs 4 · --r-sm 6 · --r 8 · --r-md 10 · --r-lg 13`. Chips/markers use 4–8 (square-ish, tactile); panels 10–13; device frames only are large. `--sh-sm / --sh / --sh-lg` tuned to the warm canvas; dark modules use their own contrast, not neutral shadow.

### The four surface types (never share one style)
1. **Workspace canvas** — `--canvas`, the ground; holds everything.
2. **Standard operational panel** — `--panel`, 1px `--line`, radius 10–12, `--sh-sm`; lists, cards, tables.
3. **Elevated action panel** — `--nav` (dark forest) or 2px-forest outline; only Do This First, One Clear Next Action, New Project, Delivery-locked, client action card.
4. **Context / recessed panel** — `--recessed`, no border/shadow, radius 12; the right-rail context zones.

## 4. Layout system
**Desktop vendor:** persistent 232px dark forest **rail** (nav + badges + profile) · 60px top utility bar (date, search, New project) · warm canvas with an **asymmetric main column + context rail** (≈1.6 / 1). No giant centred container.
**Mobile vendor:** light canvas · compact top bar · **dark bottom nav** · signature action near top · full-width CTAs. Never a desktop sidebar squeezed onto mobile.
**Client portal:** one guided page, strong forest-deep header with compact lime progress, single current action, status revealed beside/below. Lighter and calmer than the vendor app. Desktop = 2-col (action + status); mobile = stacked.
**Admin:** 76px dark icon rail, dense stat strip + tables, restrained status colours, serif only for the one headline.

## 5. Component inventory
Rail nav (with count badges) · top utility bar · **Do This First module** · **One Clear Next Action + responsibility hand-off** · horizontal **journey stepper** (lime = current) · **worklist row** (marker · title/client · stage+progress · who-chip + next action · date; most-urgent row gets coral edge + tint) · **context-rail glance list** · service row · waiting-on-me card (amber left-edge) · waiting-on-client card (lavender) · count tile · **payment panel** (3 radio modes → expand to client-facing instructions) · **confirmation handshake** (client-confirms / you-confirm) · **preparation checklist** (tactile square checkboxes + venue notes) · **messages** (bubbles + context) · **delivery** (locked dark state) · **client concierge header** · **Event Details checklist** · status chip · admin stat card / project table / signups / warnings. Serif welcome/title. Device frames.

## 6. Mobile rules
Single column, no horizontal scroll. Targets ≥44px; primary CTAs full-width ~50px. Back = visible text+chevron. Dark bottom nav for vendor; client has none. Sticky status bar; signature action reachable one-thumb.

## 7. Accessibility
AA contrast on ink/paper, white-on-forest, and lime-ink-on-lime. `:focus-visible` = 2px forest ring. No icon-only or hidden critical actions. Colour never the sole signal — status always pairs a word. `prefers-reduced-motion` disables entrances/pulses.

## 8. Copy rules
Verbs not systems: Review Event Details / Send the quote / Record payment / Add delivery link / Approve delivery. Say who + why in one line. Warm assistant tone, British spelling, £. Client-facing: "Event Details" never "questionnaire"; never expose payment plumbing.

## 9. When NOT to use each component
- **Lime** — the one immediate action only; never twice per screen, never on ordinary controls.
- **Do This First** — Today only, once. **One Clear Next Action** — project only, for the single actionable step; if nothing's required, show a calm "nothing needed" state.
- **Dark `--nav` fill** — rail, elevated action modules, admin, delivery-locked. Not ordinary cards.
- **Instrument Serif** — moments only, never machinery.
- **Coral** — urgency/most-urgent; not decoration. **Worklist coral row treatment** — at most one row.
- **Status chips** — one per row.

## 10. Removed vs v1 (AI-template signals)
Uniform white rounded cards · repetitive icon-title-chevron rows · giant serif page headings · centred vertical stacking · pill overuse · decorative padding · generic motivational microcopy · identical layouts per screen · gradients-for-modern · random icon decoration · soft-everything radii · purple/Inter/Space-Grotesk lineage.

## 11. Decisions engineering must follow
1. Two load-bearing primitives, computed from stage + responsibility: `DoThisFirst` (one per user, across projects) and `NextAction` (one per project). Both render as **elevated dark action modules**; the CTA advances the stage machine.
2. Fixed 10-stage machine: created → link sent → Event Details → quote accepted → payment (confirmed **or** not required) → preparation → service → delivery → client approved → archived.
3. Project type drives **content only** (Event Details fields, prep checklist, delivery), never layout. One shell for photography / livestream / DJ / makeup / decor.
4. Client = tokenised secure link, no account; portal shows only that project + its one current action.
5. Payments manual-first: "Pay manually" and "No payment required" work with **zero Stripe**; online is Stripe-ready but optional. Never surface Stripe/config errors. Manual mode requires an explicit **client-confirms + vendor-confirms** handshake visible to both.
6. Both sides share one status truth. History collapsed; completed stages read-only & reassuring.
7. **Colour is semantic, not decorative** — lime=immediate action, coral=urgency, lavender=client's turn, amber=vendor pending, forest=brand/done-path, success=done. Do not reassign.
8. Four surface types are a contract: never restyle a standard panel to look elevated, or vice-versa.
9. Numerics use tabular figures. Copy strings come from the stage machine and stay human/editable.

## 12. Roadmap
Delivered: tokens + 4 surfaces, desktop + mobile Vendor (Today / Projects worklist / Project Workspace with Overview·Money·Preparation·Messages·Delivery / Clients / Settings), Client Portal (desktop + mobile), Admin overview. Next: auth + empty-workspace states, new-project & add-client flows, explicit loading / error / offline / success / archived screens, and second-shooter/team views.

# PHASE 1 ENGINEERING HANDOFF — TrustOS · MiniMomentz pilot

Engineering-ready package for Cursor. The **Creative Operations Studio** visual system is approved and frozen — implement it, don't make new visual decisions.

## Contents
| File | What it is |
|---|---|
| `PHASE_1_DESIGN_SPEC.md` | The frozen system, hard rules, layout, global states, a11y, copy. **Start here.** |
| `P0_COMPONENTS.md` | Full spec for every P0 component (purpose · data · desktop · mobile · type · tokens · spacing · interaction · 4 states · a11y · exact copy · must-not-change). |
| `tokens.css` | Single source of truth: tokens + production component classes. Import first, everywhere. |
| `desktop-reference.html` | Static, captioned desktop screens — open in a browser, lift markup. |
| `mobile-reference.html` | Static, captioned mobile screens (Today, Project Overview, Client Portal). |
| `SCREEN_CHECKLIST.md` | Tickable build list, screen by screen, with definition-of-done. |
| `ROUTE_MAP.md` | Each app route → its Phase 1 screen, components, priority. |
| `DEFERRED.md` | What's intentionally out of Phase 1, and when to revisit. |

## How to build with this
1. Drop `tokens.css` in; import it before anything. Never hard-code a value it carries.
2. Build against the component classes (`.btn`, `.chip`, `.panel`, `.context`, `.action`, `.action-outline`, `.wl-*`, `.marker`, `.bar`, `.skeleton`, `.banner`, `.empty`).
3. For each screen: follow `SCREEN_CHECKLIST.md`, open the matching reference section, read the component spec in `P0_COMPONENTS.md`.
4. Enforce the eight hard rules (`PHASE_1_DESIGN_SPEC.md`). A build that breaks one is not done.

## The non-negotiables (memorise)
- **One lime CTA per screen. One dark `.action` module per screen.**
- **Client Portal is light & warm — its CTA is forest, not lime.**
- **No stock photos** — markers/initials.
- **Never expose payment plumbing.**
- **Four surfaces are a contract.**
- **Every P0 screen ships loading + empty + error + success.**

## Live reference
The interactive prototype `../TrustOS Pilot.dc.html` (Vendor / Client / Admin × Desktop / Mobile) shows flow and interaction. This folder is the source of truth for the build; the prototype is the moving picture of it.

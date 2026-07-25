# Route → Design Mapping

Maps each existing TrustOS app route to its Phase 1 design (this handoff), the components it uses, and its status. Routes are the assumed current app paths — rename to match your router, keep the mapping.

| # | Route | Phase 1 screen | Key components (P0_COMPONENTS.md) | Reference | Status |
|---|---|---|---|---|---|
| 1 | `/` (public) | Auth entry | split panel | desktop §1 | P1 |
| 2 | `/signup` | Create vendor account | shell-less form, field validation | desktop §1 | **P0** |
| 3 | `/signin` | Sign in | form, error banner | desktop §1 | **P0** |
| 4 | `/app` (first run) | Empty workspace | 1 shell, 3 (empty variant) | desktop §4 | **P0** |
| 5 | `/app/today` | Today | 1, 3, 5(list), 13(chip), 14(marker) | desktop §5 / mobile §1 | **P0** |
| 6 | `/app/projects` | Projects worklist | 5, 6, 13, 14 | desktop §6 / mobile §2 | **P0** |
| 7 | `/app/projects/new` | New Project | flow step 2, success banner | desktop §7 | **P0** |
| 8 | `/app/clients/new` | Add Client | flow step 1, field validation | desktop §7 | **P0** |
| 9 | `/app/projects/:id` | Project Overview | 4, 6, 7, 12(chip), context rail | desktop §9 / mobile §2 | **P0** |
| 10 | `/app/projects/:id/money` | Money | 8, 9, amount zone, handshake | desktop §10 | **P0** |
| 11 | `/app/projects/:id/messages` | Messages | 10 | desktop §11 | **P0** |
| 12 | `/app/projects/:id/delivery` | Delivery | 11 | desktop §11 | **P0** |
| 13 | `/app/projects/:id/preparation` | Basic Preparation | checklist + venue notes | (in main prototype) | **P0** |
| 14 | `/app/clients` | Basic Clients page | directory rows | (in main prototype) | **P0** |
| 15 | `/app/settings` | Settings | tiles | (in main prototype) | P1 |
| 16 | `/portal/:token` | Client Portal | 12, forest header, status list | desktop §13 / mobile §3 | **P0** |
| 17 | `/admin` | Simple Admin overview | stat strip, project table, signups, warnings (no analytics) | (in main prototype) | **P0** |
| 18 | `/app/projects/:id/edit` · `/app/clients/:id/edit` | Edit project & client | inline validated fields | — | **P0** |
| 19 | `/portal/:token` (approve) | Client approval | approve delivery → stage 9 | — | **P0** |
| 20 | `/app/projects/:id` (archive / delete-test) | Archive · Delete test record | confirm dialog | — | **P0** |

## Notes for the router
- **Project Overview is the hub.** Money / Messages / Delivery / Preparation are **section tabs within** `/app/projects/:id`, not separate top-level pages — implement as in-view tabs that swap the main column (context rail persists). Deep links (`…/money`) select the tab.
- **`/portal/:token`** is unauthenticated, single-project, no nav. One token = one project.
- Stage drives the **One Clear Next Action** and **Do This First** — both are computed, not stored per-screen. See `PHASE_1_DESIGN_SPEC` + engineering decisions in the main `DESIGN.md`.
- Routes 13–17 exist in the full prototype (`TrustOS Pilot.dc.html`) but are **out of Phase 1 scope** at the priority shown — do not block the pilot on them.

## Working reference (interactive)
The full clickable prototype `../TrustOS Pilot.dc.html` demonstrates all of the above with live navigation and both device modes. Use it to see interaction/flow; use this folder for the exact build spec.

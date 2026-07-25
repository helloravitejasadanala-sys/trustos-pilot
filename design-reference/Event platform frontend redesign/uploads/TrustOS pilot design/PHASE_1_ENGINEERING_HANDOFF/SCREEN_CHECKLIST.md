# Screen-by-screen Implementation Checklist

Tick each. A screen is "done" only when its four states (loading / empty / error / success) exist and the hard rules in `PHASE_1_DESIGN_SPEC.md` pass. Ref = section in `desktop-reference.html` / `mobile-reference.html`.

Legend: ☐ to build · component numbers refer to `P0_COMPONENTS.md`.

## 1. Public authentication entry — P0
- ☐ Split layout: forest-deep brand panel (left ~44%) + form (right). Ref §1.
- ☐ No marketing hero, no gradients beyond the flat forest panel.
- ☐ Links to signup / signin. Focus rings, 44px submit.

## 2. Create vendor account — P0
- ☐ Fields: studio name, email, password. Field-level validation (coral border + helper line).
- ☐ Primary = forest "Create studio & continue". Success → Empty workspace.

## 3. Sign in — P0
- ☐ Email + password, forest CTA "Sign in". Error banner (plain: "That email or password didn't match").

## 4. Empty MiniMomentz workspace — P0 (empty state)
- ☐ Shell (comp 1) + one `.action` module "Create your first project". Ref §4.
- ☐ Exactly one lime CTA; no vanity widgets; never blank.

## 5. Today — P0
- ☐ Shell (1) + greeting (serif). Ref §5.
- ☐ Do This First module (3) — one, dark, one lime CTA, shows client/action/why/urgency.
- ☐ Today & tomorrow services `.panel` list (markers + chips).
- ☐ Waiting on me (2 tiles, amber edge) + context rail: Waiting on client (lav), Upcoming deadlines (`.num`), New project dark button.
- ☐ States: loading (skeleton rows), empty ("all caught up" calm variant), error banner, success (action completes → next promotes).

## 6. Projects worklist — P0
- ☐ Worklist (5): table desktop / cards mobile; one `.urgent` row; archived .66. Ref §6.
- ☐ States: loading skeleton rows, empty "No projects yet" + New project, error banner.

## 7. New Project — P0
- ☐ Modal/drawer over worklist. Step 2 of 2: choose work type (photography / livestream / DJ / makeup / decor) — drives content only.
- ☐ Success banner "Project created. A secure link is ready to send." Ref §7.

## 8. Add Client — P0
- ☐ Step 1 of 2: client name (required → coral validation), contact (optional). Ref §7.
- ☐ Forest CTA "Continue → choose work type". Inline error banner.

## 9. Project Overview — P0
- ☐ Shell + project header (marker, type chip, `.num` stage, serif title, client·date·location) + section tabs (Overview / Money / Messages / Delivery). Ref §9.
- ☐ One Clear Next Action + hand-off (4). Journey stepper (6). Event Details summary (7). Context "at a glance" rail (P1) + client card.
- ☐ States on the action module + each section.

## 10. Money — P0
- ☐ Amount zone (`.num` + status chip). Three modes (8/9): Pay online (P1), **Pay manually (P0)**, **Free collaboration (P0)**. Ref §10.
- ☐ Manual → client-facing instructions + two-sided confirmation handshake.
- ☐ No Stripe/config/error-code language anywhere.

## 11. Messages — P0
- ☐ In-project thread (10): client left/white, vendor right/forest, composer. Ref §11.
- ☐ States: empty "say hello", loading bubbles, error "didn't send — retry".

## 12. Delivery — P0
- ☐ Locked dark module → add-link → delivered → approved (11). Ref §11.
- ☐ Disabled control keeps label; adding surfaces on portal instantly.

## 13. Client Portal — P0
- ☐ Forest-deep header, lime progress, "Step n of 10". Ref §13 (desktop) / mobile ref.
- ☐ Client current-action card (12) — `.action-outline`, **forest** CTA, light & warm. Calm "all set" variant when nothing needed.
- ☐ "Where things stand" status list (project / quote / payment / recording).
- ☐ No account, no nav, understandable in 5 seconds.

## 14. Mobile — Today — P0
- ☐ Phone frame, greeting, Do This First near top, services, two count tiles, dark bottom nav. Mobile ref §1.

## 15. Mobile — Project Overview — P0
- ☐ Back link, header, action module + hand-off, compact section list, bottom nav. Mobile ref §2.

## 16. Mobile — Client Portal — P0
- ☐ Forest header, current-action card (forest CTA), status list. No nav. Mobile ref §3.

## 17. Basic Clients page — P0
- ☐ Directory rows: name, active project, status chip, last activity. Read + open only (no rich CRM).
- ☐ States: loading skeleton rows, empty "No clients yet".

## 18. Basic Preparation — P0
- ☐ Checklist (tap to toggle, tactile square boxes) + venue notes panel. No templates.
- ☐ "n of m done" count; lives as a section within Project Overview.

## 19. Client approval — P0
- ☐ Client side: "Approve delivery" on the portal after the gallery link is added.
- ☐ Vendor side: sees approved state; advances stage 9. Success banner both sides.

## 20. Archive project — P0
- ☐ Move completed project to Archived (stage 10); worklist shows it dimmed, read-only.
- ☐ Confirm dialog; reversible (un-archive).

## 21. Edit project & client — P0
- ☐ Edit core fields (title, date, location; client name/contact) from Overview / client card.
- ☐ Inline, validated (coral border + helper on error); success banner on save.

## 22. Delete test records only — P0
- ☐ Guarded "Delete" limited to pilot/test records, behind a typed-confirm dialog.
- ☐ Never bulk; never real client data. Clear warning copy.

## 23. Simple TrustOS Admin overview — P0
- ☐ Stat strip + active-projects table (who each waits on) + recent signups + warnings. NO analytics.
- ☐ Dark, dense, restrained. Admin desktop in main prototype.

---
### Definition of done (every P0 screen)
- ☐ One lime CTA max · one dark `.action` max · four surfaces respected.
- ☐ Loading + empty + error + success implemented.
- ☐ ≥44px targets · focus rings · chip text (not colour alone).
- ☐ Copy matches `P0_COMPONENTS.md` exact strings.
- ☐ Tokens only — no stray hex/px/font.

# Med spa: full redesign of platform pages and storefront (2026-10-25/26)

Brief: `~/Code/Euler/state/briefs/batches-2-6-full-redesign-2026-10-25.md`.

Live: https://openfront-medspa-production.up.railway.app
Commits on master, each auto-deployed: `4631f49` (redesign), `1d0d7f2` (scroller fix and after screenshots), plus the commit carrying this report.

## Critique of the previous UI (before screenshots in `before/`)
- **Platform.** In-page buttons and filters were raised pills in a recessed rounded track. Panels had 16px corners. Every page header carried an icon tile. The appointment page repeated its status counts twice, once as a metric strip and once as pill tabs.
- **Storefront.** Night-linen world: EB Garamond everywhere, folds lit along their top edge, a list of facts in filled bars, and a small portrait off to the side of the name. The hero didn't make the booking action or the practice's photography the centre.

## Platform (`features/platform/**`), Operate mode inside the shared shell
- **Kit** (`medspa-ui.tsx`, `pill.ts`):
  - `pillClass` draws flat 5px buttons: outline for secondary, solid violet only for the primary action, and a ghost style.
  - `trackClass` is a plain button row.
  - `SegmentTabs` are underline tabs on a ruled baseline, and status labels take their tone colour.
  - Panels, states and notices are bordered at 6px, and metric strips are compact.
  - Page headers lose their icon tiles and eyebrows.
  - Inputs are 5px.
- **Appointments.** The front desk's day schedule reads time, status, client, treatment and provider, and actions, one row per booking. The duplicate metric strip is gone; the status tabs carry the counts.
- **Everywhere.** 45 platform files had their 16px and 12px corners pinned to 6px. In-form segmented choices are 4px blocks, not pills. Table scrollers are positioned.

## Storefront (`features/storefront/**`, `styles/vanity.css`)
- **World.** The practice's dressing-room vanity (contract in `.impeccable/surfaces/features-storefront.md`, `seed:fb0e24a43a018c09`): black lacquer, one lit mirror in a brass-ruled frame holding the practice's own photograph, and a row of warm bulbs along its top that light one after another on load. Brass is used for rules and prices, and bulb cream for the primary action.
- **Home.** The practice name in Bodoni Moda, city and open state, Book (bulb cream) and Treatments, today's hours, phone and the treatment count as ruled facts, and category links, all beside the mirror. Then the treatment menu as ruled lines (duration, then price in brass), the concern index, providers, and the address band.
- **Booking.** Every open time is a bulb: an unlit dot on a brass-ruled slot, which lights cream when chosen. Dates, options and the ticket all sit in the same world.
- **Type.** Bodoni Moda (display) with Jost (reading) replace EB Garamond. The stylesheets are renamed (`vanity.css`, `vanity-tokens.css`) to force a fresh compile, and the `sf-*` class API is kept so every route and state renders.

## Skills used, and on what
- **impeccable:**
  - `concept-seed --scope direction --mode persuade` assigned #5 of my ranked seven (the vanity mirror with bulb lights). The previous night-linen world was excluded from the list as spent.
  - Its declined challengers each donated a discipline, named in the contract: fixed field order, the brightest element reserved, two inks, rules not boxes, one warm centre, and photography beside flat bands.
  - `surface-brief write` recorded the contract, and `craft-floor.md` set the build floor.
- **Memory traps from earlier redesigns:** the 8px dashboard radius, sr-only scroller overflow, and the stale CSS compile.
- Not run on this repo: the finish reviewer and the documenter. The other design skills named in the brief were not loaded this run.

## Gates
- **Typecheck:** `tsc --noEmit -p .` through heavy-exec, exit 0 with 0 errors. `1d0d7f2` changed only className strings.
- **Unit tests:** `family-security` passed 14/14 (exit 0); `shared-dashboard` passed 8/8 (exit 0).
- **Parity:** drift 0, missing 0, sidebar ok.
- **Live CSS:** `sf-mirror` was confirmed in the served CSS after deploy.

## Open items
- **No finish review.** No impeccable-finish-reviewer pass or documenter has run on this repo, and DESIGN.md still describes the night-linen world.
- **Missing portrait.** One provider (Lena Park) has no photo, so her frame shows the empty vanity top.
- **Unused fonts.** The vendored EB Garamond files in `public/fonts` are no longer used.

## Screenshots
`before/` and `after/` were captured at 1440 desktop and 390 phone (2x), full page, with Playwright WebKit.

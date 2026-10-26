---
version: 1
slug: "features-storefront"
primary_target: "features/storefront"
related_targets: []
---

# Storefront (client) surface brief

Scope: every client route: `/` (home), `/services`, `/services/[id]`, `/providers`, `/team`, `/team/[id]`, `/book`, `/booking/[id]`, `/appointments`, `/gallery`, `/reviews`, `/gift-cards`, `/contact`, `/account` (sign in, sign up, intake) and the not-found pages. Mode: Persuade on `/`; Operate on booking, account and intake. Audience and job are in PRODUCT.md. Constraints: every route, state and workflow stays; no medical or results claims; dark ground (owner, 2026-10-24).

Main tasks, in order: see what treatments the practice offers and what they cost; choose who treats them; book a time; find the practice and its hours; manage an appointment.

## Direction contract
THESIS: The storefront is the practice's dressing-room vanity: a black-lacquer room where one lit mirror frames the practice's own photography, a row of warm bulbs runs along its edge, and every bookable time is a bulb that lights. It refuses the white-and-blush wellness template, the gold-script luxury spa, and the previous night-linen world (EB Garamond on linen, bordered list).
OWN-WORLD: Black lacquer (#0f0d0c) with a lifted vanity top (#1a1715); warm bulb cream (#f4e6c8) for the lit state and the one primary action; brushed brass (#b39461) for frames, rules and prices; the practice's logo hue only as a quiet accent on links. Bodoni Moda (a beauty-editorial didone) for the name, headings and prices; Jost (geometric, from the beauty counter's Futura tradition) for everything read. Corners 4px or less; mirror frames are 1px brass rules; no glow, no gradient.
STORY: The client sees the practice name beside the lit mirror holding its photograph, today's open state and the Book action, scans the treatment menu with duration and price on one ruled line each, opens a provider, and books a time from a strip of bulbs where only available times are lit.
FIRST VIEWPORT: Desktop 5:7. Left, the practice name in Bodoni (up to 96px), city and open state, Book (bulb cream) and Treatments, then the first three treatments as ruled lines. Right, the mirror: the practice photograph in a brass-ruled frame with a row of bulbs along its top edge. Phone: the mirror first at 4:5 with the name under it, then Book.
FORM: Dressing-room vanity mirror with bulb lights, number 5 on my ordered list (1 printed treatment menu card at reception, 2 frosted-glass skincare bottles with minimal labels, 3 face-mapping consultation chart, 4 embossed appointment reminder card, 5 vanity mirror with bulb lights, 6 beauty-editorial magazine spread, 7 terrazzo-and-brass reception desk). seed:fb0e24a43a018c09. Raises: each treatment line is banded with its facts in one fixed order, duration then price, like a dated jar label (pickling brine calendar); the brightest element is reserved for the one focused action (alien understory); two inks at most on any surface, brass and bulb, over black (risograph); hierarchy from rules and case, not boxes (phosphor terminal); one warm centre per page, the mirror, that everything else is arranged around (kinetic sand); real photography sits beside hard flat bands of colour without blending (studio dumbar, competitive). Signature interaction: the bulbs along the mirror light one after another when the page opens, and on the booking page each available time is a bulb that lights when chosen.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

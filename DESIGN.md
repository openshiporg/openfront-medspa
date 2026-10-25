---
name: Openfront Med Spa Storefront
description: Night linen. A stack of charcoal-dyed spa linen set in EB Garamond, accented by the practice's own logo hue.
colors:
  paper: "oklch(16.5% 0.007 70)"
  paper-2: "oklch(20.5% 0.009 70)"
  paper-3: "oklch(24.5% 0.01 70)"
  card: "oklch(22% 0.009 70)"
  ink: "oklch(94.5% 0.012 82)"
  ink-2: "oklch(80% 0.013 80)"
  ink-3: "oklch(67% 0.012 78)"
  rule: "oklch(30% 0.009 70)"
  rule-strong: "oklch(40% 0.01 70)"
  accent: "oklch(76% 0.09 300)"
  accent-ink: "oklch(17% 0.03 300)"
  accent-soft: "oklch(28% 0.05 300)"
  focus: "oklch(80% 0.1 300)"
  ok: "oklch(78% 0.13 160)"
  ok-ring: "oklch(32% 0.05 160)"
  wait: "oklch(82% 0.13 80)"
  wait-ring: "oklch(34% 0.05 80)"
  stop: "oklch(72% 0.16 25)"
  stop-ring: "oklch(32% 0.06 25)"
  off: "oklch(62% 0.01 70)"
  off-ring: "oklch(30% 0.008 70)"
typography:
  display:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "clamp(3.25rem, 8.4vw, 8.5rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  display-s:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "clamp(2.375rem, 5vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "clamp(2.125rem, 4vw, 2.875rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  title:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.15
  title-s:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.15
  lead:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "1.3125rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    fontFeature: "lnum"
  label:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    letterSpacing: "0"
  figures:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "1.3125rem"
    fontWeight: 400
    letterSpacing: "0"
    fontFeature: "tnum, lnum"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  3xs: "0.25rem"
  2xs: "0.5rem"
  xs: "0.75rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2.25rem"
  xl: "3.5rem"
  2xl: "5.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 1.125rem"
    height: "2.75rem"
  button-fold:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 1.125rem"
    height: "2.75rem"
  button-fold-pressed:
    backgroundColor: "{colors.paper-2}"
  button-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
  button-quiet:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
  button-small:
    padding: "0 0.875rem"
    height: "2.25rem"
  chip:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-2}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 0.875rem"
    height: "2.25rem"
  chip-hover:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  card-hover:
    backgroundColor: "{colors.paper-3}"
  card-pressed:
    backgroundColor: "{colors.paper-2}"
  well:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.md}"
  fact-band:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.sm}"
    padding: "0.875rem 1.125rem"
  dyed-band:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
  ledger-row:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "1.125rem 0.25rem"
  input:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 0.95rem"
    height: "3rem"
  header:
    backgroundColor: "{colors.paper}"
    height: "4.25rem"
  portrait-frame:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.md}"
---

# Design System: Openfront Med Spa Storefront

Scope: the customer storefront (`features/storefront`) only. The merchant platform shell is a separate system and is not described here. Tokens live as `--sf-*` custom properties on `.storefront` in `features/storefront/styles/storefront-tokens.css`. The "Night linen" layer at the end of `features/storefront/styles/storefront.css` restates the shared components, and where the two disagree the layer is the system.

## Overview

**Creative North Star: "Night Linen"**

The storefront is a stack of charcoal-dyed spa linen. The page is the darkest fold. Every band, card, pill and fact sits one fold up, a tone lighter, and its top edge catches the light in a single 1px crease. Depth comes from tone and that crease alone: nothing is outlined, nothing glows, nothing blurs. Colour arrives as whole flat fields of linen dyed in the practice's hue, never as a wash or gradient.

One face, EB Garamond, sets everything, from the 136px practice name to the tabular prices. Its italic carries the side notes and labels. The treatment menu reads like a printed annual: names on the left, figures in one tabular column on the right, a crease between lines. Layout registers against one off-centre axis (42/58 on the home hero) rather than a centred hero.

The density is calm but factual. Treatment facts (duration, price, provider) sit beside the names in full-size figures, not behind a hover. The accent belongs to the practice: its logo hue is resolved at runtime, so no storefront hardcodes a brand colour.

**Key Characteristics:**
- Warm charcoal ground (hue 70) with three fold tones and a white 10% crease along each fold's top edge.
- A single accent derived from the practice's logo hue, used for the primary action, dyed bands and the focus ring.
- EB Garamond only (vendored, OFL, roman and italic, variable 400–800), with lining figures everywhere and tabular figures for numbers.
- Small, soft corners (4, 6, 8px). No pills at 999px, no circles.
- Folds open once as they arrive (clip from the top) and darken a tone when pressed.

## Colors

A warm charcoal tonal stack with off-white ink and one practice-owned accent. Every value is OKLCH and is canonical as written.

### Primary
- **Practice Hue** (`accent`): the practice's logo hue at 76% lightness and 0.09 chroma, set per practice in `MainLayout` via `brandHueColor`. The frontmatter value is the fallback (hue 300); the coming-soon state uses hue 221. Fills the primary action ("Book an appointment", "Book") and the text selection.
- **Hue Ink** (`accent-ink`): the same hue at 17% lightness. Text on Practice Hue fields.
- **Dyed Linen** (`accent-soft`): the hue at 28% lightness. Whole-band colour pages (By concern, the visit band), empty portrait frames, and the input focus ring.
- **Hue Focus** (`focus`): the hue at 80%. The 2px keyboard focus outline on every interactive element.

### Neutral
- **Night Linen** (`paper`): the page ground and the header. The darkest fold.
- **Second Fold** (`paper-2`): wells, fact bands, chips, inputs, states, mobile sheet and bar, portrait frames, and the pressed state of anything one fold higher.
- **Card Fold** (`card`): cards. Sits between the second and third folds.
- **Third Fold** (`paper-3`): resting buttons, and the hover state of cards and chips.
- **Linen White** (`ink`): primary text, and the fill of a selected pill or date.
- **Soft Ink** (`ink-2`): secondary text, status labels, quiet buttons, ledger figures' secondary column.
- **Faint Ink** (`ink-3`): side-note labels, metadata, placeholders, inline icons.
- **Fold Rule** (`rule`) and **Strong Rule** (`rule-strong`): hairlines for lists and tables (hours, footer) and the underline of text links. Not borders for containers.

### Status
- **Open** (`ok`, `ok-ring`), **Waiting** (`wait`, `wait-ring`), **Stopped** (`stop`, `stop-ring`), **Off** (`off`, `off-ring`): status dots, each an 8px disc with a 3px ring in its darker partner. The ring tones double as flat backgrounds for alert states (`wait-ring`) and error alerts (`stop-ring`).

### Named Rules
**The Practice Owns the Hue Rule.** The accent is always derived from the practice's logo hue at runtime. Never hardcode a hue into a component; reference the accent tokens.

**The Whole Field Rule.** Colour comes as a whole flat field: a dyed band, a filled primary button. No gradients, radial glows or washes anywhere in the storefront.

## Typography

**Display Font:** EB Garamond (with Georgia, serif)
**Body Font:** EB Garamond (with Georgia, serif)
**Label/Mono Font:** EB Garamond italic; the `--sf-font-mono` token is aliased to the same face.

**Character:** One old-style book face across the whole storefront, set large and quiet at weight 400. Hierarchy comes from size and italic, never from a second family, tracking or capitals.

### Hierarchy
- **Display** (400, clamp 52–136px, line-height 1.04, -0.02em): the practice name in the home hero only. Balanced wrapping.
- **Display S** (400, clamp 38–60px): page titles (Book an appointment, Coming soon, Page not found).
- **Headline** (400, clamp 34–46px): section heads (Treatments, By concern, Choose who treats you, the address band).
- **Title** (400, 32px, line-height 1.15): ledger names in the treatment menu; provider names on portrait cards.
- **Title S** (400, 24px): state titles, the booking calendar's date numerals, provider names in compact cards (21px).
- **Lead** (400, 21px, line-height 1.55, max 54ch, Soft Ink): intro paragraphs.
- **Body** (400, 18px base): running text, buttons (18px), chips (18px), inputs (18px). Lining figures by default.
- **Label** (italic 400, 16px, no tracking, no capitals, Faint Ink): side notes, fact labels (Treatments, Today, Call), list headings (Hours, Practice, Your visit), category names under ledger names.
- **Figures** (400, 21px in the ledger, tabular lining): durations, prices, hours, counts.

### Named Rules
**The One Face Rule.** EB Garamond sets everything. Do not introduce a sans, a mono or a system display face.

**The Side Note Rule.** Small labels are italic at 16px in sentence case. Never tracked uppercase capitals.

**The Figure Column Rule.** Numbers are tabular lining figures and align in one right-hand column (ledger figures are a fixed `auto 5.5rem auto` grid).

## Layout

Content sits in a 76rem container (44rem for narrow pages such as sign-in and intake), with 1rem side padding on phones, 1.5rem from 640px, and 2rem from 1024px. Sections pad 3.5rem vertically on phones and 5.5rem from 768px; page tops pad 2.25rem (3.5rem from 768px).

The spatial model is one off-centre axis. On the home hero (from 1024px) the grid is 42fr / 58fr, bottom-aligned: side notes, fact bands and the portrait on the left, the name, category chips and actions on the right. On phones the name and booking come first (the notes column is reordered after). Dyed bands split 0.8fr / 1.2fr, putting the headline left and the ledger on the axis. Booking uses a main column beside a 20rem sticky ticket from 1024px.

Spacing follows a stepped rhythm (4, 8, 12, 16, 24, 36, 56, 88px). Pills and fact bands stack with a tight 6px gap; the ledger has no gap, only creases. Below 600px ledger figures drop under the name. On phones a fixed bottom bar carries the booking action, and the header opens a full-width sheet.

## Elevation & Depth

Flat, tonal layering. There are no drop shadows: the elevation tokens `--sf-shadow-raised`, `-hover`, `-recessed` and `-card` are all `none`. Depth is the fold: a surface one tone lighter than what it sits on, with a 1px inset highlight along its top edge (`inset 0 1px 0 oklch(100% 0 0 / 0.1)`).

### Shadow Vocabulary
- **Crease** (`box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.1)`): every fold, including pills, chips, cards, wells, states, fact bands, dyed bands, the header, the mobile sheet links and the mobile bar. The selected (ink) pill and quiet pill drop it.
- **Ledger crease** (`border-bottom: 1px solid oklch(100% 0 0 / 0.1)`): the printed rule between ledger lines.
- **Status ring** (`box-shadow: 0 0 0 3px <tone>-ring`): status dots only.

### Named Rules
**The Fold Rule.** A surface is raised by being one tone lighter with a crease on its top edge, never by an outline, drop shadow, glow or blur.

**The Press Darkens Rule.** Pressing a fold drops it a tone (to Second Fold, or to black 22% on a ledger row). Hover lifts it a tone.

## Shapes

Soft, small corners. Pills, chips, fact bands and inputs use 4px; portrait and lens frames and wells use 6px; cards use 8px. Nothing is fully round except status dots and the spinner. Ledger rows are square-cornered and borderless, divided only by creases. Portrait frames are 3:4, lens frames 1:1; both clip their image and scale it 1.03 on card hover.

## Components

### Buttons
Linen tabs: flat, filled, lightly creased.
- **Shape:** gently rounded rectangle (4px), 44px tall (36px small), 18px Garamond at weight 500 with 1.125rem side padding (0.875rem small). 16px inline SVG icons.
- **Primary:** Practice Hue fill with Hue Ink text. Hover mixes the accent 86% with white.
- **Fold (default):** Third Fold fill with crease. Hover mixes Third Fold 70% with Faint Ink; pressed drops to Second Fold.
- **Selected / current page / current step:** Linen White fill with Night Linen text, no crease. Used for the booking step indicator.
- **Quiet:** transparent, Soft Ink text, no crease.
- **Track:** pills stand directly on the linen in a row with a 6px gap; no recessed container.
- **Focus:** 2px Hue Focus outline at 2px offset. Disabled: 50% opacity.

### Chips
- **Style:** Second Fold fill with crease, 4px corners, 36px tall, 18px Soft Ink text.
- **State:** linked chips hover to Third Fold with Linen White text. On the services page from 1024px the jump list turns into a vertical list.

### Cards / Containers
- **Corner Style:** 8px (cards), 6px (wells).
- **Background:** Card Fold; wells, states and fact bands use Second Fold.
- **Shadow Strategy:** the crease only (see Elevation & Depth).
- **Border:** none.
- **Interaction:** linked cards hover to Third Fold and press to Second Fold.
- **States:** empty and unavailable states are Second Fold panels with an Off dot beside the title. Alert states use the `wait-ring` tone as a flat fill; error alerts use `stop-ring`.

### Inputs / Fields
- **Style:** Second Fold fill with a 1px Strong Rule stroke, 4px corners, 48px minimum height, 18px text, Faint Ink placeholder. Labels above at 16px weight 500 in Soft Ink. Fields are the one control that keeps a stroke: a one-tone fill alone does not mark a typing boundary on Night Linen.
- **Focus:** the border shifts to Practice Hue with a solid 3px Dyed Linen ring.

### Navigation
- **Header:** a solid Night Linen top fold with a crease, sticky, 68px row: logo and practice name left, text links centre, a primary "Book" pill and a menu pill right.
- **Mobile:** the menu opens a Second Fold sheet of 32px Garamond links separated by creases (current page in Practice Hue). A fixed Second Fold bottom bar carries the booking action below 768px.

### Treatment Ledger (signature)
The menu as a printed annual. Each row is a 32px Garamond name with its italic category below, and a right-hand figures grid (duration, price, arrow) in 21px tabular figures, separated by a white 10% crease. Hover slides the row's padding in to 0.75rem over a white 3% tint; press darkens it. Below 600px the figures move under the name.

### Fact Bands (signature)
Home-hero facts (treatment count, today's hours, phone) as a single-column stack of Second Fold bands with a 4px radius and crease: italic label left, figure right.

### Dyed Band (signature)
A full-bleed section in Dyed Linen with a crease, used for the category index and the visit band. Labels inside take Linen White mixed 72% with the accent.

### Unfold Motion
Hero columns and ledger rows open once on arrival: opacity 0 to 1, `clip-path: inset(0 0 60% 0)` to none, and an 8px drop, over 640ms on `cubic-bezier(0.23, 1, 0.32, 1)`, staggered 70ms per item and capped at 260ms. State transitions run 160ms. Reduced-motion users get no animation.

## Do's and Don'ts

### Do:
- **Do** raise a surface by one fold tone plus the crease (`inset 0 1px 0 oklch(100% 0 0 / 0.1)`).
- **Do** derive every accent from the practice's logo hue through the `--sf-accent*` tokens.
- **Do** set every word in EB Garamond, with italic 16px for side notes and labels.
- **Do** align prices, durations and hours as tabular lining figures in one right-hand column.
- **Do** use 4px for controls, 6px for frames and wells, 8px for cards.
- **Do** mark a chosen pill, step or date with a Linen White fill and Night Linen text.
- **Do** use hairline rules only between list lines (ledger, hours, footer), under text links, and around text fields.

### Don't:
- **Don't** outline cards, options, chips or pills; the fold is the edge.
- **Don't** use drop shadows, glows, gradients, radial washes or backdrop blur.
- **Don't** use tracked uppercase labels or a second typeface.
- **Don't** use fully rounded 999px pills or circular frames; corners stop at 8px.
- **Don't** hardcode a brand hue or a bone or blush light ground; the ground is Night Linen.
- **Don't** show an empty image placeholder where a photo is missing; omit the frame.

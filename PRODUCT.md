# Product

<!-- impeccable:product-schema 1 -->

Inferred on 2026-10-25 from the repository (storefront source, QA audits) and the owner's redesign brief (`~/Code/Euler/state/briefs/design-skills-redesign-2026-10-25.md`). The owner ordered the work without an approval stage, so no interview took place. Every line below is inferred, not confirmed.

## Platform

web

## Users
- **Client (storefront):** someone choosing an aesthetic treatment (injectables, facials, laser, body) at one med spa practice, comparing treatments, durations and prices, choosing a provider and booking a time, then completing intake for the appointment. Often on a phone.
- **Merchant (platform):** front desk, providers and practice owners. The platform shell is shared with Openfront E-commerce and isn't in scope for storefront work.

## Product Purpose
The practice's public site and booking flow: treatments by category, treatment detail, providers and their profiles, gallery, reviews, gift cards, contact and hours, booking (service, provider, date, time), booking confirmation, the client account (appointments, intake forms), sign in and sign up.

## Positioning
Booking reads the practice's real availability: providers who perform the treatment, published hours in the practice's timezone, and open slots.

## Operating Context
Routes: `/`, `/services`, `/services/[id]`, `/team`, `/team/[id]`, `/providers`, `/gallery`, `/reviews`, `/gift-cards`, `/contact`, `/book`, `/booking/[id]`, `/appointments`, `/account`, `/account/sign-in`, `/account/sign-up`, `/account/intake/[appointmentId]`, `/join`, and the coming-soon and not-found states.

## Capabilities and Constraints
- No clinical claims or outcomes. Reviews show only what the practice published. Unavailable catalog or providers show explicit states.
- Provider photos and treatment images are optional.

## Brand Commitments
- The practice's name, logo SVG and logo hue (the one accent) are the brand.
- Owner direction for this redesign (2026-10-24): dark, considered and premium; no grey, washed-out grounds; no generic SaaS cards; UI copy is labels, states and errors only; phone width must work. Tessier (`~/Code/shops/tessier`) is the reference the owner likes.

## Evidence on Hand
Live services, providers, hours and reviews where published. No invented testimonials, before-and-after results or credentials.

## Product Principles
1. Booking is always one step away and never claims availability it doesn't have.
2. The treatment's facts (duration, price, provider) come before mood.
3. Every route, state and workflow stays. Presentation changes; behaviour doesn't.

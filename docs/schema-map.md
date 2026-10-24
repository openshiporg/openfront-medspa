# Openfront Med Spa schema map

This is the source read behind the platform coverage pass (2026-10-23). It covers 98 Keystone lists in `features/keystone/models/**` and 70+ workflow mutations in `features/keystone/mutations/**`, plus onboarding (`features/platform/onboarding/lib/seed.json`).

## How writes work in this schema

Almost every list is write-locked (`create/update/delete: () => false`). Business writes go through workflow mutations, which check the actor, the practice scope, revisions and idempotency keys.

- **Direct GraphQL CRUD** (`activeListPermissions`): Service, ServiceCategory, ServiceVariant (`canManagePractice`), Vendor (`canManageInventory`), MessageTemplate (`canManageCommunications`), PaymentProvider (`canManageIntegrations`), MedSpaImage and WidgetConfiguration (`canManagePractice`). Practice and User allow update only.
- **Everything else** is created by a mutation, or by the system as a side effect of one. A platform page for those lists must call the mutation, never `create<List>`.
- **Tenancy:** every list carries `practice` (via `tenantAccess.ts`). Query filters scope to `session.data.practice.id`. Lists marked `q=ALL` still rely on that tenant filter.
- **Roles** (`Role`): canManagePeople, canManageRoles, canAccessDashboard, canManageOnboarding, canManagePractice, canSchedule, canReadClients, canManageClinical, canManageSensitiveRecords, canManageInventory, canManageFinance, canManageCommunications, canViewReports, canManageIntegrations.

## Lists

Columns: **Created by** is M (merchant/staff via a dashboard workflow), C (customer via the storefront), S (system side effect) or O (onboarding). **States** lists the select values that drive work.

### Practice, people and access
| List | Purpose | Key fields / relations | Created by | States |
|---|---|---|---|---|
| Practice | The med spa business (tenant) | name, slug, currencyCode, isDemo; users, locations, storefrontSetting, memberships | O (`runMedSpaOnboarding`) | isActive |
| Location | A clinic site with hours and timezone | address, phone, email, hours json, timezone; resources, providers, clients, schedules, lots, purchase orders | O (no other create path) | isActive |
| StorefrontSetting | Public identity and publish switch | displayName, primaryLocation, accentHue, logoSvg, logoHue, revision | O, M (`publishStorefrontSettings`) | isPublished |
| WidgetConfiguration | Embeddable booking widget | colours, show flags, embed code | M (CRUD) | — |
| User | Login identity for staff and clients | name, email, phone, role, practice; providerProfile, clientProfile | S (init, `registerCustomer`, `bookAppointment`, `acceptStaffInvitation`) | status active/disabled, onboardingStatus |
| Role | Capability bundle | 14 capability flags; assignedTo | M (`upsertAccessRole`) | — |
| StaffInvitation | Invite a staff email to a role and locations | email, role, locations, tokenHash, expiresAt | M (`inviteStaff`), accepted via `acceptStaffInvitation` | pending/accepted/expired/revoked |
| PracticeMembership | Staff member's scheduling membership and locations | user, locations | S (onboarding, invite acceptance) | active/suspended/ended |
| Provider | Bookable staff profile | user, role (provider/esthetician/nurse/physician/assistant), tier, title, bio, isPublic, photo; specializations→Service, locations, schedules, credentials, authorizations | M (`createProviderProfile`), O | status active/on_leave/inactive, isActive |
| AuditEvent | Append-only audit trail | actor, action, resourceType/Id, evidenceHash | S | — |

### Catalog
| List | Purpose | Key fields / relations | Created by | States |
|---|---|---|---|---|
| ServiceCategory | Menu grouping | name, slug, parent, displayOrder, icon | M (CRUD), O | isVisible |
| Service | A treatment | baseDuration, price/basePrice (cents), deposit, cleanupBufferMinutes, staffAuthorizationRequired, requiresConsultation, requiresIntakeReview, requiresLotTraceability; category, requiredResources→Resource, specialists←Provider, clinicalProducts→Product, variants, image | M (CRUD), O | status active/inactive, isPublic |
| ServiceVariant | Price/duration tier of a treatment | price, duration, staffLevel, displayOrder | M (CRUD) | — |
| MedSpaImage | Catalog/provider image (not clinical photos) | image, imagePath, altText | M (CRUD), O | — |
| Resource | Room, device or equipment | type, capacity, location, isPublic, readinessStatus, manufacturer/model/serial/UDI, maintenance and calibration dates; services, reservations, readinessEvents | O only (**no create mutation**); `setResourceAvailability` toggles active | readinessStatus: acceptance_testing, available, in_use, cleaning, maintenance_due, out_of_service, incident_lockout, recall_quarantine, retired |
| ResourceScheduleBlock | Room/device downtime | type maintenance/unavailable/reserved, startsAt/endsAt | S | — |
| DeviceReadinessEvent | Device release/lockout history | action, from/toStatus, qualifiedReleaseBy | M (`transitionDeviceReadiness`) | — |

### Availability and booking
| List | Purpose | Key fields / relations | Created by | States |
|---|---|---|---|---|
| ProviderSchedule | Weekly hours, one-time hours and time off | type recurring/one_time/time_off, dayOfWeek, localDate, start/end, break, isAvailable, isPublic, revision | M (`upsertProviderSchedule`, `setProviderScheduleAvailability`), O | isAvailable |
| Client | A patient/client relationship | user, homeLocation, preferredProvider, DOB, contactPreferences, operationalNotes, visits, lifetimeValue, marketing consents | C (`registerCustomer`, `bookAppointment`), M (front desk via `bookAppointment`) | — (**no profile-edit mutation**) |
| Appointment | A booked visit | start/end/duration, status, deposit, notes, client, provider, room/device, revision, idempotencyKey; lineItems, consultation, treatmentSessions, consents, transaction, review | C/M (`bookAppointment`), transitions via `transitionAppointment` | pending → confirmed → in_progress → completed; cancelled, no_show |
| AppointmentLineItem | Snapshot of each booked treatment | serviceTitle, duration, price, staff | S (booking) | — |
| AppointmentResourceReservation / AppointmentSupervisorReservation | Room, device and supervisor holds | segment, startsAt/endsAt, status | S (booking), M (`scheduleAppointmentResources`) | reserved/released |
| WaitlistEntry | Demand for a treatment with no slot | client or guest, service, preferredProviders, preferred days/time, date range, notes | C/M (`joinWaitlist`) | active → notified → converted/removed (`transitionWaitlistEntry`) |

### Clinical record (controlled; `canManageClinical` / `canManageSensitiveRecords`)
| List | Purpose | Created by | States |
|---|---|---|---|
| IntakeForm / FormTemplate | Intake and consent form definitions | O; **no create/edit mutation** for FormTemplate | isActive |
| FormSubmission / IntakeReviewAction | Client intake answers and their review | C/M (`submitIntake`), M (`reviewIntake`) | submitted → in_review → reviewed / superseded |
| Consultation | Clinical assessment and candidacy decision | M (`recordConsultation`) | requested, in_review, completed, needs_follow_up, closed; candidacy candidate/deferred/declined/referred |
| ContraindicationFinding / ContraindicationDecision | Rule hits and clinician disposition | M (`recordContraindicationFinding`, `decideContraindication`) | — |
| TreatmentPlan / TreatmentPlanItem | Approved plan of sessions | M (`approveTreatmentPlan`) | draft, active, paused, completed, cancelled |
| ClinicalOrder / ClinicalOrderAction | Order authorizing a performer | M (`issueClinicalOrder`, `transitionClinicalOrder`) | active, partially_fulfilled, fulfilled, held, revoked, expired, entered_in_error |
| ConsentTemplateVersion | Versioned treatment consent text | M (`publishConsentTemplate`) | effective window |
| ConsentRecord / ConsentAction | Signed treatment consent | M (`signTreatmentConsent`, `withdrawTreatmentConsent`) | effective, withdrawn, expired, superseded, invalidated |
| TreatmentSession | One treatment delivery | M (`prepareTreatmentSession`, `startTreatmentSession`) | planned, ready, in_progress, completed, stopped, cancelled |
| TreatmentAdministration / AdministrationLot | What was administered, and from which lot | M (`recordTreatmentAdministration`) | — |
| ClientNote | Signed clinical note (append-only, supersedable) | M (`appendSignedClinicalNote`) | — |
| ClientAsset / AssetAccessEvent / PhotoConsent / PhotoConsentAction | Clinical photos and documents, access log, photo consent | M (`createClinicalAssetIntent`, `markClinicalAssetReady`, `authorizeClinicalAssetAccess`, `releaseClinicalAsset`, `tombstoneClinicalAsset`, `grantPhotoConsent`, `withdrawPhotoConsent`) | quarantined → ready → tombstoned |
| ProviderCredential | License for a provider | M (`registerProviderCredential`) | pending, verified, restricted, suspended, expired, revoked |
| ProviderAuthorization | Provider × treatment × location authority | M (`configureProviderAuthorization`, `transitionProviderAuthority`) | active, suspended, expired |
| ClinicalAuthorityEvent | Authority decision log | S | — |
| FollowUpTask / FollowUpAction | Aftercare task after a session | M (`scheduleFollowUp`, `appendFollowUpAction`), C (`submitFollowUpResponse`) | open, in_progress, completed, cancelled |

### Money
| List | Purpose | Created by | States |
|---|---|---|---|
| MedSpaTransaction / MedSpaTransactionLineItem | The checkout ticket and its lines | S (`completeAppointmentCheckout`) | open/completed/voided; paymentStatus pending/paid/partially_paid/refunded |
| Payment | Settlement record | S (checkout, `processPayment`) | pending, processing, completed, failed, refunded, partially_refunded |
| PaymentSession | Provider session (card) | S (`processPayment`, `processAppointmentDeposit`) | pending … refunded |
| Refund | Refund against a payment | M (`refundPayment`, `reverseAppointmentSettlement`) | pending/completed/failed |
| PaymentProvider | Manual or Stripe adapter | M (CRUD), O | isInstalled, isDefault |
| PaymentWebhookEvent / WebhookInbox | Provider webhooks | S | processed/ignored; received/processed/rejected/failed |
| Commission | Provider commission per sale | S (checkout), paid via `payoutCommissions` | isPaid |
| GiftCard / GiftCardTransaction | Stored value | C/M (`purchaseGiftCard`, `confirmGiftCardPurchase`), M (`applyGiftCardBalance`) | isActive; tx purchase/redemption/refund |
| Membership | Membership plan | O only (**no create mutation**) | isActive |
| ClientMembership / MembershipAgreement / MembershipLedgerEntry | A client's membership, signed terms and ledger | **no create mutation**; `acceptMembershipAgreement`, `transitionMembership` | active, paused, cancelled |
| ServicePackage | Package plan (prepaid treatments) | O only (**no create mutation**) | isActive |
| ClientPackage / ClientPackageUsage / ClientPackageAdjustment | A sold package, its redemptions and adjustments | **no sale mutation**; `redeemClientPackage`, `reverseClientPackageUsage` | active, expired, fully-used, cancelled |
| LoyaltyProgram / ClientPoints / Referral | Loyalty and referrals (schema only, no workflow writes) | — | referral pending/completed/expired |

### Inventory
| List | Purpose | Created by | States |
|---|---|---|---|
| Product | Retail or clinical consumable | O only (**no create mutation**) | isActive, trackLots |
| Vendor | Supplier | M (CRUD) | isActive |
| PurchaseOrder / PurchaseOrderLine | Order from a vendor | **no create mutation**; received via `receivePurchaseOrder` | draft, submitted, partially_received, received, cancelled |
| GoodsReceipt / GoodsReceiptLine | Received shipment and its lines | S (`receivePurchaseOrder`) | — |
| InventoryLot | Lot with expiry | S (receipt) | available, quarantined, recalled, expired, depleted, returned, destroyed (`dispositionInventoryLot`) |
| StockMovement | Lot-level movement | S | receive, consume, retail_sale, return, adjustment, transfer, expire |
| InventoryMovement | Product-level movement | M (`adjustMedSpaInventory`), S (checkout) | receive, adjustment, sale, return |
| ProductSale | Legacy retail sale record | S | — |

### Safety and governance (`canManageSensitiveRecords`)
| List | Purpose | Created by | States |
|---|---|---|---|
| Incident / IncidentAction | Adverse event and its handling | M (`reportIncident`, `appendIncidentAction`) | open, under_review, closed; severity low → critical |
| RecallCase / RecallExposure / RecallAction | Lot/device recall and exposed clients | M (`openRecallCase`, `appendRecallAction`) | open → … → closed |
| PatientRightsRequest / PatientRightsAction | Access/export/amendment requests | M (`requestPatientRights`, `appendPatientRightsAction`) | received → … → closed |
| LegalHold | Hold on records | M (`placeLegalHold`, `releaseLegalHold`) | active/released |
| RetentionPolicy | Record retention rules | M (`publishRetentionPolicy`) | effective window |
| BreakGlassEvent | Emergency record access | M (`openBreakGlass`) | — |

### Communications, reputation and system
| List | Purpose | Created by | States |
|---|---|---|---|
| MessageTemplate | Reminder, confirmation and marketing text | M (CRUD), O | isActive |
| MessageLog | Sent message record | S | sent/delivered/failed |
| Review | Client review of a visit | **no create or moderation mutation** | isApproved |
| DomainEvent / OutboxEvent | Event outbox | S | pending/processing/delivered/dead_letter |

## Merchant workflows end to end

1. **Open the practice:** onboarding (Practice, Location, StorefrontSetting, Role, PracticeMembership), then storefront settings to publish.
2. **Build the menu:** ServiceCategory → Service (+ ServiceVariant, required Resource, image) → assign specialists (Provider.specializations).
3. **Set up rooms and devices:** Resource → readiness (DeviceReadinessEvent) → downtime (ResourceScheduleBlock).
4. **Staff the practice:** Role → StaffInvitation → User + PracticeMembership → Provider profile → credentials (ProviderCredential) → per-treatment authority (ProviderAuthorization).
5. **Publish availability:** ProviderSchedule (weekly hours, one-time hours, time off) inside Location hours.
6. **Book:** a client books from the storefront, or staff book from the front desk (`bookAppointment`). This creates Client/User if needed, Appointment, AppointmentLineItem and reservations. Demand with no slot goes to WaitlistEntry.
7. **Arrive and intake:** confirm/check in (`transitionAppointment`) → intake FormSubmission → review.
8. **Consult and plan (clinical treatments):** Consultation → contraindications → TreatmentPlan → ClinicalOrder.
9. **Treat:** ConsentRecord → TreatmentSession (prepare/start) → TreatmentAdministration + AdministrationLot + StockMovement → ClientNote / ClientAsset.
10. **Check out:** MedSpaTransaction + Payment, with package or membership benefits, retail InventoryMovement, Commission, tip, discount. Refunds go through Refund.
11. **Aftercare:** FollowUpTask/Action, MessageTemplate → MessageLog.
12. **Sell value:** membership plans, packages and gift cards (Membership, ServicePackage, GiftCard), sold to ClientMembership/ClientPackage and redeemed at checkout.
13. **Run stock:** Product, Vendor, PurchaseOrder → GoodsReceipt → InventoryLot → movements; lot disposition and recall.
14. **Stay safe and compliant:** Incident, RecallCase, PatientRightsRequest, LegalHold, RetentionPolicy.
15. **Pay staff and read the business:** Commission payout; reports on payments, refunds, appointments and liabilities.
16. **Integrations:** PaymentProvider, webhooks, event outbox.

## Coverage before this pass (commit `b51ebd3`)

| Workflow / list | Platform page | Status |
|---|---|---|
| Appointments: day sheet, detail, transitions, front-desk booking | `/platform/appointments`, `/[id]`, `/new` (appointments) | OK |
| Consultations and plans | `/platform/appointments/plans`, `/[consultationId]` (appointments) | OK |
| Checkout | `/platform/checkout`, `/[id]` (checkout) | OK |
| Commission payout | `/platform/commissions` (commissions) | OK |
| Storefront identity / publish | `/platform/storefront` (storefront-settings) | OK |
| Treatments, categories, variants | `/platform/catalog` (workspaces, read-only) | THIN |
| Rooms and devices | `/platform/resources` (resources: activate/deactivate only) | THIN |
| Provider hours | `/platform/schedules` (schedules: block/restore only) | THIN |
| Staff, roles, invitations, provider profiles | none (generic lists only) | MISSING |
| Locations and hours | none (Location is create-locked) | MISSING |
| Credentials and treatment authority | `/platform/administration` (read-only list) | THIN |
| Clients | `/platform/clients` (read-only list) | THIN |
| Waitlist | `/platform/engagement` (notify/remove only) | THIN |
| Message templates and log | none | MISSING |
| Memberships, packages, gift cards | `/platform/benefits` (read-only list) | THIN |
| Payments and refunds | none | MISSING |
| Products, vendors, purchase orders, lots | `/platform/inventory` (adjust only) | THIN |
| Intake forms, consent templates, intake review | none | MISSING |
| Treatment delivery (consent, session, administration) | appointment detail shows counts only | MISSING |
| Follow-ups | none | MISSING |
| Incidents and recalls | none | MISSING |
| Patient rights, legal holds, retention | none | MISSING |
| Reviews | none | MISSING |
| Reports | `/platform/reports` (metric list) | THIN |
| Payment providers, webhooks, events | `/platform/integrations` (read-only) | THIN |

Join, log and system lists that a parent page covers: AppointmentLineItem, Appointment*Reservation (appointment detail); AuditEvent and ClinicalAuthorityEvent (record detail timelines); MedSpaTransactionLineItem (checkout); GoodsReceipt*, StockMovement, InventoryMovement (inventory); ClientPackageUsage/Adjustment and MembershipLedgerEntry (benefits); IncidentAction, RecallAction/Exposure (safety); PatientRightsAction (privacy); PaymentWebhookEvent, WebhookInbox, DomainEvent, OutboxEvent (integrations); AssetAccessEvent (client record); ProductSale (legacy, reports).

## Coverage after this pass

| Workflow / list | Before | After: route (slice) | Notes |
|---|---|---|---|
| Appointments day sheet, detail, transitions, front-desk booking | OK | `/platform/appointments`, `/[id]`, `/new` (appointments) | Guest requests now schedulable; searchable client picker; pending banner |
| Treatment delivery: consultation, contraindications, order, consent, session, administration, note, follow-up | MISSING | `/platform/appointments/[id]/treatment` (treatment) | Existing clinical mutations only |
| Consultations and plans | OK | `/platform/appointments/plans`, `/[consultationId]` (appointments) | — |
| Checkout | OK | `/platform/checkout`, `/[id]` (checkout) | Practice tax rate |
| Payments and refunds | MISSING | `/platform/payments`, `/[id]` (payments) | Deposit refunds; checkout-settlement reversal stays disabled in the existing mutation |
| Commission payout | OK | `/platform/commissions` (commissions) | — |
| Treatments, categories, variants | THIN | `/platform/catalog`, `/[id]` (catalog) | Direct Service/ServiceCategory/ServiceVariant CRUD |
| Rooms and devices, device readiness | THIN | `/platform/resources` (resources) | New `upsertResource`; `transitionDeviceReadiness` |
| Provider hours, one-off hours, time off | THIN | `/platform/schedules` (schedules) | `upsertProviderSchedule` gains `isPublic` |
| Staff, roles, invitations, provider profiles, credentials, authority | MISSING / THIN | `/platform/staff`, `/[id]` (staff); public `/join` | New `updateProviderProfile`; `inviteStaff`, `upsertAccessRole`, `createProviderProfile`, `registerProviderCredential`, `configureProviderAuthorization`, `transitionProviderAuthority` |
| Locations and hours | MISSING | `/platform/locations` (locations) | New `upsertLocation` |
| Practice hub | THIN | `/platform/administration` (administration) | Tiles plus a needs-attention list |
| Clients | THIN | `/platform/clients`, `/[id]` (clients) | New `updateClientProfile`, `medspaClientDirectory`, `medspaClientRecord` |
| Waitlist, message templates, message log | THIN / MISSING | `/platform/engagement` (engagement) | `joinWaitlist`, `transitionWaitlistEntry`, MessageTemplate CRUD, `medspaWaitlistBoard`, `medspaMessageLog` |
| Follow-ups | MISSING | `/platform/follow-ups` (follow-ups) | `appendFollowUpAction` |
| Reviews | MISSING | `/platform/reviews` (reviews) | New `moderateReview`, `medspaReviewBoard` |
| Membership plans, client memberships, packages, gift cards | THIN | `/platform/benefits` (benefits) | New `upsertMembershipPlan`, `upsertServicePackage`, `enrollClientMembership`, `sellClientPackage`, `issueGiftCard`; existing `transitionMembership`, `acceptMembershipAgreement`, `reverseClientPackageUsage`, `applyGiftCardBalance` |
| Products, vendors, purchase orders, receiving, lots, movements | THIN | `/platform/inventory`, `/purchase-orders/[id]` (inventory) | New `upsertProduct`, `draftPurchaseOrder`, `transitionPurchaseOrder`; existing `receivePurchaseOrder`, `dispositionInventoryLot`, `adjustMedSpaInventory` |
| Intake forms, form templates, consent versions, intake review | MISSING | `/platform/forms` (forms) | New `upsertIntakeForm`, `upsertFormTemplate`; `publishConsentTemplate`, `reviewIntake` |
| Incidents, recalls, device readiness log | MISSING | `/platform/safety`, `/incidents/[id]`, `/recalls/[id]` (safety) | `reportIncident`, `appendIncidentAction`, `openRecallCase`, `appendRecallAction` |
| Patient rights, legal holds, retention, break-glass | MISSING | `/platform/privacy`, `/requests/[id]` (privacy) | `requestPatientRights` gets a 30-day default; holds, retention |
| Reports | THIN | `/platform/reports` (reports) | Revenue by day, treatments, providers, liabilities |
| Payment methods, email status, event log, webhooks | THIN | `/platform/integrations` (integrations) | PaymentProvider flags; only failures count as attention |
| Storefront identity, publish, checkout tax | OK | `/platform/storefront` (storefront-settings) | `Practice.taxRate` |

Lists covered by a parent page rather than their own: AppointmentLineItem and the reservation lists (appointment detail); TreatmentAdministration, AdministrationLot, ClinicalOrderAction, ConsentAction (treatment workspace); MedSpaTransactionLineItem (checkout and payments); GoodsReceipt*, StockMovement, InventoryMovement (inventory); ClientPackageUsage/Adjustment, MembershipAgreement, MembershipLedgerEntry, GiftCardTransaction (benefits); IncidentAction, RecallAction/Exposure, DeviceReadinessEvent (safety); PatientRightsAction, BreakGlassEvent (privacy); FormSubmission, IntakeReviewAction (forms); FollowUpAction (follow-ups); DomainEvent, PaymentWebhookEvent (integrations); AuditEvent and ClinicalAuthorityEvent (record timelines).

Still without a dashboard page:
- **WidgetConfiguration** (embed widget): it has direct CRUD through Models, but no storefront embed consumes it.
- **LoyaltyProgram, ClientPoints and Referral**: schema only; no workflow writes them.
- **ResourceScheduleBlock** (room downtime): no mutation.
- **ClientAsset and PhotoConsent** (clinical photos): the workflow mutations exist, but uploading clinical files needs an encrypted object-store intent flow that isn't wired to any storage. Not built.
- **ProductSale**: legacy.
- **OutboxEvent and WebhookInbox**: system lists.

/*
  Warnings:

  - You are about to drop the column `canCreateTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canEditOtherPeople` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canManageAllTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canSeeOtherPeople` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the `Todo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TodoImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_Todo_todoImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AppointmentStatusType" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentResourceReservationPurposeType" AS ENUM ('room', 'device', 'equipment', 'recovery', 'supervision');

-- CreateEnum
CREATE TYPE "AppointmentResourceReservationStatusType" AS ENUM ('reserved', 'in_use', 'released', 'cancelled', 'superseded');

-- CreateEnum
CREATE TYPE "AppointmentSupervisorReservationStatusType" AS ENUM ('reserved', 'released', 'cancelled', 'superseded');

-- CreateEnum
CREATE TYPE "AssetAccessEventActionType" AS ENUM ('upload_intent', 'validate', 'view', 'download', 'release', 'restrict', 'tombstone', 'delete_request', 'delete_complete', 'retention_hold');

-- CreateEnum
CREATE TYPE "BreakGlassEventStatusType" AS ENUM ('opened', 'reviewed', 'approved', 'inappropriate', 'closed');

-- CreateEnum
CREATE TYPE "ClientAssetCategoryType" AS ENUM ('photo', 'document', 'intake_attachment', 'incident_attachment');

-- CreateEnum
CREATE TYPE "ClientAssetStatusType" AS ENUM ('quarantined', 'ready', 'tombstoned');

-- CreateEnum
CREATE TYPE "ClientAssetAccessClassType" AS ENUM ('clinical_restricted', 'incident_restricted', 'client_released', 'marketing_authorized');

-- CreateEnum
CREATE TYPE "ClientPackageAdjustmentTypeType" AS ENUM ('purchase', 'reservation', 'release', 'consume', 'reverse', 'refund', 'expire', 'transfer');

-- CreateEnum
CREATE TYPE "ClinicalAuthorityEventStageType" AS ENUM ('scheduling', 'order', 'consent', 'treatment_start', 'administration', 'completion');

-- CreateEnum
CREATE TYPE "ClinicalAuthorityEventDecisionType" AS ENUM ('allowed', 'denied', 'review_required');

-- CreateEnum
CREATE TYPE "ClinicalOrderStatusType" AS ENUM ('active', 'partially_fulfilled', 'fulfilled', 'held', 'revoked', 'expired', 'entered_in_error');

-- CreateEnum
CREATE TYPE "ClinicalOrderActionActionType" AS ENUM ('hold', 'release', 'partially_fulfill', 'fulfill', 'revoke', 'expire', 'enter_in_error');

-- CreateEnum
CREATE TYPE "ConsentActionActionType" AS ENUM ('withdraw', 'expire', 'supersede', 'invalidate');

-- CreateEnum
CREATE TYPE "ConsentRecordStatusType" AS ENUM ('effective', 'withdrawn', 'expired', 'superseded', 'invalidated');

-- CreateEnum
CREATE TYPE "ConsentRecordSignerRoleType" AS ENUM ('self', 'parent', 'guardian', 'representative');

-- CreateEnum
CREATE TYPE "ContraindicationDecisionDispositionType" AS ENUM ('cleared_with_rationale', 'deferred', 'hard_stop', 'referred', 'reopened');

-- CreateEnum
CREATE TYPE "ContraindicationFindingSeverityType" AS ENUM ('information', 'precaution', 'clinician_review', 'hard_stop');

-- CreateEnum
CREATE TYPE "ConsultationStatusType" AS ENUM ('requested', 'in_review', 'completed', 'needs_follow_up', 'closed');

-- CreateEnum
CREATE TYPE "ConsultationCandidacyDecisionType" AS ENUM ('candidate', 'deferred', 'declined', 'referred');

-- CreateEnum
CREATE TYPE "DomainEventOperationType" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "DomainEventStatusType" AS ENUM ('pending', 'processing', 'delivered', 'dead_letter');

-- CreateEnum
CREATE TYPE "FollowUpActionActionType" AS ENUM ('schedule', 'contact', 'patient_response', 'escalate', 'complete', 'cancel');

-- CreateEnum
CREATE TYPE "FollowUpActionRedFlagType" AS ENUM ('none', 'review', 'urgent');

-- CreateEnum
CREATE TYPE "FollowUpTaskStatusType" AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "FormSubmissionStatusType" AS ENUM ('submitted', 'in_review', 'reviewed', 'superseded');

-- CreateEnum
CREATE TYPE "IncidentSeverityType" AS ENUM ('low', 'moderate', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatusType" AS ENUM ('open', 'under_review', 'closed');

-- CreateEnum
CREATE TYPE "IncidentActionActionType" AS ENUM ('report', 'triage', 'clinical_review', 'intervention', 'referral', 'emergency_transfer', 'manufacturer_notice', 'regulatory_decision', 'regulatory_submit', 'capa_assign', 'capa_verify', 'clinical_resolve', 'close');

-- CreateEnum
CREATE TYPE "LegalHoldStatusType" AS ENUM ('active', 'released');

-- CreateEnum
CREATE TYPE "IntakeReviewActionDispositionType" AS ENUM ('reviewed', 'needs_clarification', 'escalated', 'superseded');

-- CreateEnum
CREATE TYPE "InventoryLotStatusType" AS ENUM ('available', 'quarantined', 'recalled', 'expired', 'depleted', 'returned', 'destroyed');

-- CreateEnum
CREATE TYPE "InventoryMovementTypeType" AS ENUM ('receive', 'adjustment', 'sale', 'return');

-- CreateEnum
CREATE TYPE "MedSpaTransactionTypeType" AS ENUM ('appointment', 'walk_in', 'retail');

-- CreateEnum
CREATE TYPE "MedSpaTransactionPaymentMethodType" AS ENUM ('cash', 'card', 'split', 'gift_card', 'package');

-- CreateEnum
CREATE TYPE "MedSpaTransactionPaymentStatusType" AS ENUM ('pending', 'paid', 'partially_paid', 'refunded');

-- CreateEnum
CREATE TYPE "MedSpaTransactionStatusType" AS ENUM ('open', 'completed', 'voided');

-- CreateEnum
CREATE TYPE "MedSpaTransactionLineItemItemTypeType" AS ENUM ('service', 'product');

-- CreateEnum
CREATE TYPE "MembershipLedgerEntryTypeType" AS ENUM ('activate', 'renewal_due', 'charge_authorized', 'charge_settled', 'charge_failed', 'benefit_issue', 'benefit_use', 'benefit_reverse', 'freeze', 'resume', 'nonrenew', 'cancel', 'expire');

-- CreateEnum
CREATE TYPE "OutboxEventStatusType" AS ENUM ('pending', 'processing', 'delivered', 'dead_letter');

-- CreateEnum
CREATE TYPE "PaymentProviderAdapterType" AS ENUM ('manual', 'stripe');

-- CreateEnum
CREATE TYPE "PaymentSessionStatusType" AS ENUM ('pending', 'requires_action', 'authorized', 'completed', 'failed', 'cancelled', 'partially_refunded', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentWebhookEventStatusType" AS ENUM ('processed', 'ignored');

-- CreateEnum
CREATE TYPE "PatientRightsActionActionType" AS ENUM ('receive', 'verify_identity', 'assign', 'collect_records', 'approve', 'partial', 'deny_with_basis', 'deliver', 'close');

-- CreateEnum
CREATE TYPE "PatientRightsRequestTypeType" AS ENUM ('access', 'export', 'amendment', 'restriction', 'disclosure_accounting', 'representative_update', 'deletion_review');

-- CreateEnum
CREATE TYPE "PatientRightsRequestStatusType" AS ENUM ('received', 'identity_review', 'in_progress', 'fulfilled', 'partially_fulfilled', 'denied_with_basis', 'closed');

-- CreateEnum
CREATE TYPE "PhotoConsentPurposeType" AS ENUM ('clinical_care', 'measurement', 'education', 'marketing');

-- CreateEnum
CREATE TYPE "PhotoConsentStatusType" AS ENUM ('granted', 'partially_withdrawn', 'withdrawn', 'expired', 'superseded');

-- CreateEnum
CREATE TYPE "PhotoConsentActionActionType" AS ENUM ('grant', 'partial_withdrawal', 'withdrawal', 'expire', 'supersede', 'publication_record', 'takedown_attempt');

-- CreateEnum
CREATE TYPE "PracticeMembershipStatusType" AS ENUM ('active', 'suspended', 'ended');

-- CreateEnum
CREATE TYPE "ProductKindType" AS ENUM ('retail', 'consumable', 'both');

-- CreateEnum
CREATE TYPE "ProviderTierType" AS ENUM ('junior', 'senior', 'master', 'celebrity');

-- CreateEnum
CREATE TYPE "ProviderRoleType" AS ENUM ('provider', 'esthetician', 'nurse', 'physician', 'assistant');

-- CreateEnum
CREATE TYPE "ProviderStatusType" AS ENUM ('active', 'on_leave', 'inactive');

-- CreateEnum
CREATE TYPE "ProviderEmploymentTypeType" AS ENUM ('full_time', 'part_time', 'contractor');

-- CreateEnum
CREATE TYPE "ProviderAuthorizationStatusType" AS ENUM ('active', 'suspended', 'expired');

-- CreateEnum
CREATE TYPE "ProviderCredentialStatusType" AS ENUM ('pending', 'verified', 'restricted', 'suspended', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "ProviderScheduleTypeType" AS ENUM ('recurring', 'one_time', 'time_off');

-- CreateEnum
CREATE TYPE "ProviderScheduleDayOfWeekLegacyType" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatusType" AS ENUM ('draft', 'submitted', 'partially_received', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "RecallActionActionType" AS ENUM ('open', 'assess', 'quarantine', 'identify_exposure', 'notify', 'clinical_assessment', 'dispose', 'close');

-- CreateEnum
CREATE TYPE "RecallCaseStatusType" AS ENUM ('open', 'applicability_review', 'quarantined', 'patients_identified', 'notifications_in_progress', 'disposition_complete', 'closed');

-- CreateEnum
CREATE TYPE "RecallExposureStatusType" AS ENUM ('identified', 'reviewed', 'notified', 'assessed', 'closed');

-- CreateEnum
CREATE TYPE "RefundStatusType" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ResourceTypeType" AS ENUM ('room', 'device', 'equipment', 'station', 'other');

-- CreateEnum
CREATE TYPE "ResourceReadinessStatusType" AS ENUM ('acceptance_testing', 'available', 'in_use', 'cleaning', 'maintenance_due', 'out_of_service', 'incident_lockout', 'recall_quarantine', 'retired');

-- CreateEnum
CREATE TYPE "ResourceScheduleBlockTypeType" AS ENUM ('maintenance', 'unavailable', 'reserved');

-- CreateEnum
CREATE TYPE "DeviceReadinessEventActionType" AS ENUM ('acceptance_test', 'clean', 'maintenance_due', 'lockout', 'service', 'recall_quarantine', 'release', 'retire');

-- CreateEnum
CREATE TYPE "ServiceStatusType" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "StaffInvitationStatusType" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "StockMovementTypeType" AS ENUM ('receive', 'consume', 'retail_sale', 'return', 'adjustment', 'transfer', 'expire');

-- CreateEnum
CREATE TYPE "TreatmentAdministrationStatusType" AS ENUM ('completed', 'aborted', 'entered_in_error');

-- CreateEnum
CREATE TYPE "TreatmentPlanStatusType" AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TreatmentPlanItemStatusType" AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TreatmentSessionStatusType" AS ENUM ('planned', 'ready', 'in_progress', 'completed', 'stopped', 'cancelled');

-- CreateEnum
CREATE TYPE "UserOnboardingStatusType" AS ENUM ('not_started', 'in_progress', 'completed', 'dismissed');

-- CreateEnum
CREATE TYPE "UserStatusType" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "WebhookInboxStatusType" AS ENUM ('received', 'processed', 'rejected', 'failed');

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_B_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "canCreateTodos",
DROP COLUMN "canEditOtherPeople",
DROP COLUMN "canManageAllTodos",
DROP COLUMN "canSeeOtherPeople",
ADD COLUMN     "canManageClinical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageCommunications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageFinance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageIntegrations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageInventory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePractice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageSensitiveRecords" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadClients" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewReports" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "practice" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "onboardingStatus" "UserOnboardingStatusType" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "practice" TEXT,
ADD COLUMN     "status" "UserStatusType" NOT NULL DEFAULT 'active',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Todo";

-- DropTable
DROP TABLE "TodoImage";

-- DropTable
DROP TABLE "_Todo_todoImages";

-- CreateTable
CREATE TABLE "AdministrationLot" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "administration" TEXT,
    "lot" TEXT,
    "product" TEXT,
    "quantity" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "doseSnapshot" JSONB,
    "anatomicSite" TEXT NOT NULL DEFAULT '',
    "lotNumberSnapshot" TEXT NOT NULL DEFAULT '',
    "expirationSnapshot" TIMESTAMP(3) NOT NULL,
    "concentration" TEXT NOT NULL DEFAULT '',
    "diluentLot" TEXT NOT NULL DEFAULT '',
    "reconstitutedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "discardAt" TIMESTAMP(3),
    "wasteQuantity" TEXT NOT NULL DEFAULT '',
    "wasteReason" TEXT NOT NULL DEFAULT '',
    "witness" TEXT,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrationLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER DEFAULT 60,
    "status" "AppointmentStatusType" NOT NULL DEFAULT 'pending',
    "depositAmount" INTEGER,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "bookedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "clientNotes" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "client" TEXT,
    "provider" TEXT,
    "resource" TEXT,
    "room" TEXT,
    "device" TEXT,
    "consultation" TEXT,
    "payment" TEXT,
    "transaction" TEXT,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentLineItem" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "service" TEXT,
    "staff" TEXT,
    "serviceTitle" TEXT NOT NULL DEFAULT '',
    "serviceImagePath" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "appointment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentResourceReservation" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "appointment" TEXT,
    "treatmentSession" TEXT,
    "resource" TEXT,
    "segmentKey" TEXT NOT NULL DEFAULT '',
    "purpose" "AppointmentResourceReservationPurposeType" NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentResourceReservationStatusType" NOT NULL DEFAULT 'reserved',
    "revision" INTEGER DEFAULT 1,
    "assignmentEvidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentResourceReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentSupervisorReservation" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "appointment" TEXT,
    "supervisor" TEXT,
    "service" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentSupervisorReservationStatusType" DEFAULT 'reserved',
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentSupervisorReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAccessEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "asset" TEXT,
    "actor" TEXT,
    "action" "AssetAccessEventActionType" NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "sessionReferenceHash" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "actor" TEXT,
    "action" TEXT NOT NULL DEFAULT '',
    "resourceType" TEXT NOT NULL DEFAULT '',
    "resourceId" TEXT NOT NULL DEFAULT '',
    "correlationId" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakGlassEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "actor" TEXT,
    "status" "BreakGlassEventStatusType" NOT NULL DEFAULT 'opened',
    "emergencyReason" TEXT NOT NULL DEFAULT '',
    "requestedScope" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reviewer" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT NOT NULL DEFAULT '',
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakGlassEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "user" TEXT,
    "homeLocation" TEXT,
    "preferredProvider" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "contactPreferences" TEXT NOT NULL DEFAULT '',
    "operationalNotes" TEXT NOT NULL DEFAULT '',
    "firstVisit" TIMESTAMP(3),
    "lastVisit" TIMESTAMP(3),
    "totalVisits" INTEGER DEFAULT 0,
    "lifetimeValue" INTEGER DEFAULT 0,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "photoMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAsset" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "treatmentSession" TEXT,
    "incident" TEXT,
    "note" TEXT,
    "photoConsent" TEXT,
    "category" "ClientAssetCategoryType" NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "encryptionKeyReference" TEXT NOT NULL DEFAULT '',
    "storageRegion" TEXT NOT NULL DEFAULT '',
    "originalFilename" TEXT NOT NULL DEFAULT '',
    "contentType" TEXT NOT NULL DEFAULT '',
    "byteSize" TEXT NOT NULL DEFAULT '',
    "checksum" TEXT NOT NULL DEFAULT '',
    "status" "ClientAssetStatusType" NOT NULL DEFAULT 'quarantined',
    "releasedToClient" BOOLEAN NOT NULL DEFAULT false,
    "accessClass" "ClientAssetAccessClassType" NOT NULL DEFAULT 'clinical_restricted',
    "retentionClass" TEXT NOT NULL DEFAULT '',
    "retainUntil" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "deletionRequestedAt" TIMESTAMP(3),
    "tombstonedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "readyAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMembership" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "membership" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "status" TEXT DEFAULT 'active',
    "pausedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPackageAdjustment" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "clientPackage" TEXT,
    "usage" TEXT,
    "actor" TEXT,
    "type" "ClientPackageAdjustmentTypeType" NOT NULL,
    "valueDelta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPackageAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAuthorityEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "provider" TEXT,
    "supervisor" TEXT,
    "credential" TEXT,
    "authorization" TEXT,
    "service" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "treatmentSession" TEXT,
    "stage" "ClinicalAuthorityEventStageType" NOT NULL,
    "decision" "ClinicalAuthorityEventDecisionType" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "policyVersion" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAuthorityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalOrder" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "client" TEXT,
    "consultation" TEXT,
    "plan" TEXT,
    "service" TEXT,
    "orderedBy" TEXT,
    "authorizedPerformer" TEXT,
    "requiredSupervisor" TEXT,
    "status" "ClinicalOrderStatusType" NOT NULL DEFAULT 'active',
    "instructionSnapshot" JSONB,
    "protocolVersion" TEXT NOT NULL DEFAULT '',
    "indication" TEXT NOT NULL DEFAULT '',
    "anatomicSite" TEXT NOT NULL DEFAULT '',
    "doseRange" TEXT NOT NULL DEFAULT '',
    "performerConstraints" TEXT NOT NULL DEFAULT '',
    "supervisionSnapshot" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "supersededBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalOrderAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "order" TEXT,
    "actor" TEXT,
    "action" "ClinicalOrderActionActionType" NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalOrderAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "consent" TEXT,
    "actor" TEXT,
    "action" "ConsentActionActionType" NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "service" TEXT,
    "templateVersion" TEXT,
    "presentedBy" TEXT,
    "status" "ConsentRecordStatusType" NOT NULL DEFAULT 'effective',
    "signerName" TEXT NOT NULL DEFAULT '',
    "signerRole" "ConsentRecordSignerRoleType" NOT NULL,
    "representativeAuthority" TEXT NOT NULL DEFAULT '',
    "interpreter" TEXT NOT NULL DEFAULT '',
    "witness" TEXT NOT NULL DEFAULT '',
    "discussionEvidence" JSONB,
    "signatureEvidenceHash" TEXT NOT NULL DEFAULT '',
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "supersededBy" TEXT,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTemplateVersion" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "service" TEXT,
    "jurisdiction" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '',
    "contentSnapshot" JSONB,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "supersededBy" TEXT,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContraindicationDecision" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "finding" TEXT,
    "decidedBy" TEXT,
    "disposition" "ContraindicationDecisionDispositionType" NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "authorityEvidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContraindicationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContraindicationFinding" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "consultation" TEXT,
    "service" TEXT,
    "ruleCode" TEXT NOT NULL DEFAULT '',
    "ruleVersion" TEXT NOT NULL DEFAULT '',
    "sourceEvidence" JSONB,
    "sourceEvidenceHash" TEXT NOT NULL DEFAULT '',
    "severity" "ContraindicationFindingSeverityType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContraindicationFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "client" TEXT,
    "author" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "appointment" TEXT,
    "practice" TEXT,
    "type" TEXT NOT NULL DEFAULT 'clinical',
    "status" TEXT NOT NULL DEFAULT 'signed',
    "signedAt" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "lateEntryReason" TEXT NOT NULL DEFAULT '',
    "supersededBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPackage" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "package" TEXT,
    "purchasedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT DEFAULT 'active',
    "totalValue" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL,
    "usedValue" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPackageUsage" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "clientPackage" TEXT,
    "appointment" TEXT,
    "service" TEXT,
    "quantityUsed" INTEGER DEFAULT 1,
    "valueUsed" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPackageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPoints" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "transactions" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "saleAmount" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "provider" TEXT,
    "service" TEXT,
    "payment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "client" TEXT,
    "service" TEXT,
    "provider" TEXT,
    "status" "ConsultationStatusType" NOT NULL DEFAULT 'requested',
    "historySnapshot" JSONB,
    "examinationSnapshot" JSONB,
    "goalsSnapshot" JSONB,
    "alternativesSnapshot" JSONB,
    "summary" TEXT NOT NULL DEFAULT '',
    "indication" TEXT NOT NULL DEFAULT '',
    "candidacyDecision" "ConsultationCandidacyDecisionType",
    "staffDecisionRecorded" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "revision" TEXT NOT NULL DEFAULT '1',
    "protocolVersion" TEXT NOT NULL DEFAULT '',
    "contraindicationProtocolVersion" TEXT NOT NULL DEFAULT '',
    "contraindicationReviewHash" TEXT NOT NULL DEFAULT '',
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "supersededBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "eventKey" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL DEFAULT '',
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "aggregateType" TEXT NOT NULL DEFAULT '',
    "aggregateId" TEXT NOT NULL DEFAULT '',
    "operation" "DomainEventOperationType" NOT NULL,
    "actorId" TEXT NOT NULL DEFAULT '',
    "locationId" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "payloadHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" "DomainEventStatusType" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "task" TEXT,
    "actor" TEXT,
    "action" "FollowUpActionActionType" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "redFlag" "FollowUpActionRedFlagType" DEFAULT 'none',
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "treatmentSession" TEXT,
    "assignedTo" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "status" "FollowUpTaskStatusType" NOT NULL DEFAULT 'open',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "templateVersion" INTEGER NOT NULL,
    "status" "FormSubmissionStatusType" NOT NULL DEFAULT 'submitted',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "supersededBy" TEXT,
    "data" JSONB,
    "acknowledgement" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "client" TEXT,
    "form" TEXT,
    "template" TEXT,
    "appointment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT DEFAULT 'intake',
    "description" TEXT NOT NULL DEFAULT '',
    "fields" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "code" TEXT NOT NULL DEFAULT '',
    "initialValue" INTEGER NOT NULL,
    "currentBalance" INTEGER NOT NULL,
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "recipientName" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "purchasedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardTransaction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "giftCard" TEXT,
    "appointment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "purchaseOrder" TEXT,
    "receiptNumber" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receivedBy" TEXT,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "receipt" TEXT,
    "purchaseOrderLine" TEXT,
    "product" TEXT,
    "lot" TEXT,
    "quantity" INTEGER NOT NULL,
    "lotNumberSnapshot" TEXT NOT NULL DEFAULT '',
    "expirationSnapshot" TIMESTAMP(3),
    "condition" TEXT NOT NULL DEFAULT '',
    "temperatureEvidence" JSONB,
    "quarantineReason" TEXT NOT NULL DEFAULT '',
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "treatmentSession" TEXT,
    "administration" TEXT,
    "suspectLot" TEXT,
    "suspectDevice" TEXT,
    "reportedBy" TEXT,
    "assignedTo" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "severity" "IncidentSeverityType" NOT NULL,
    "status" "IncidentStatusType" NOT NULL DEFAULT 'open',
    "triageDisposition" TEXT NOT NULL DEFAULT '',
    "interventions" JSONB,
    "emergencyTransferEvidence" JSONB,
    "regulatoryStatus" TEXT NOT NULL DEFAULT 'reportability_pending',
    "qualityStatus" TEXT NOT NULL DEFAULT 'investigating',
    "revision" INTEGER DEFAULT 1,
    "closedAt" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "incident" TEXT,
    "actor" TEXT,
    "clinician" TEXT,
    "action" "IncidentActionActionType" NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "asset" TEXT,
    "incident" TEXT,
    "status" "LegalHoldStatusType" NOT NULL DEFAULT 'active',
    "reason" TEXT NOT NULL DEFAULT '',
    "authorityReference" TEXT NOT NULL DEFAULT '',
    "placedBy" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "releasedBy" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT NOT NULL DEFAULT '',
    "releaseAuthorityReference" TEXT NOT NULL DEFAULT '',
    "releaseEvidenceHash" TEXT NOT NULL DEFAULT '',
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "fields" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeReviewAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "submission" TEXT,
    "reviewer" TEXT,
    "disposition" "IntakeReviewActionDispositionType" NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "findings" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "product" TEXT,
    "vendor" TEXT,
    "lotNumber" TEXT NOT NULL DEFAULT '',
    "receivedQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "InventoryLotStatusType" NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "type" "InventoryMovementTypeType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "product" TEXT,
    "appointment" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zipCode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "hours" JSONB DEFAULT '{"monday":{"open":"09:00","close":"18:00","closed":false},"tuesday":{"open":"09:00","close":"18:00","closed":false},"wednesday":{"open":"09:00","close":"18:00","closed":false},"thursday":{"open":"09:00","close":"18:00","closed":false},"friday":{"open":"09:00","close":"18:00","closed":false},"saturday":{"open":"09:00","close":"17:00","closed":false},"sunday":{"open":null,"close":null,"closed":true}}',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "pointsPerDollar" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "redemptionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "tiers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedSpaImage" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "image_id" TEXT,
    "image_filesize" INTEGER,
    "image_width" INTEGER,
    "image_height" INTEGER,
    "image_extension" TEXT,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "altText" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedSpaImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedSpaTransaction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "type" "MedSpaTransactionTypeType" NOT NULL DEFAULT 'appointment',
    "location" TEXT,
    "client" TEXT,
    "staff" TEXT,
    "tip" INTEGER DEFAULT 0,
    "paymentMethod" "MedSpaTransactionPaymentMethodType",
    "paymentStatus" "MedSpaTransactionPaymentStatusType" NOT NULL DEFAULT 'pending',
    "status" "MedSpaTransactionStatusType" NOT NULL DEFAULT 'open',
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedSpaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedSpaTransactionLineItem" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "transaction" TEXT,
    "itemType" "MedSpaTransactionLineItemItemTypeType" NOT NULL,
    "service" TEXT,
    "product" TEXT,
    "staff" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "discount" INTEGER DEFAULT 0,
    "commissionRate" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedSpaTransactionLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "monthlyPrice" INTEGER NOT NULL,
    "discountPercent" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipAgreement" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "clientMembership" TEXT,
    "client" TEXT,
    "membership" TEXT,
    "termsVersion" TEXT NOT NULL DEFAULT '',
    "termsHash" TEXT NOT NULL DEFAULT '',
    "priceMinorSnapshot" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT '',
    "benefitSnapshot" JSONB,
    "renewalDisclosure" JSONB,
    "cancellationDisclosure" JSONB,
    "affirmativeConsentHash" TEXT NOT NULL DEFAULT '',
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipLedgerEntry" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "clientMembership" TEXT,
    "agreement" TEXT,
    "actor" TEXT,
    "type" "MembershipLedgerEntryTypeType" NOT NULL,
    "amountMinor" INTEGER DEFAULT 0,
    "benefitDelta" INTEGER DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "recipient" TEXT,
    "template" TEXT,
    "sentAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "status" TEXT DEFAULT 'sent',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "eventKey" TEXT NOT NULL DEFAULT '',
    "topic" TEXT NOT NULL DEFAULT '',
    "version" INTEGER DEFAULT 1,
    "aggregateType" TEXT NOT NULL DEFAULT '',
    "aggregateId" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "status" "OutboxEventStatusType" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER DEFAULT 0,
    "availableAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER DEFAULT 0,
    "tip" INTEGER DEFAULT 0,
    "discount" INTEGER DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'credit_card',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT NOT NULL DEFAULT '',
    "stripeChargeId" TEXT NOT NULL DEFAULT '',
    "stripeRefundId" TEXT NOT NULL DEFAULT '',
    "cardBrand" TEXT NOT NULL DEFAULT '',
    "cardLast4" TEXT NOT NULL DEFAULT '',
    "refundedAmount" INTEGER DEFAULT 0,
    "refundReason" TEXT NOT NULL DEFAULT '',
    "tipDistributed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "session" TEXT,
    "processedBy" TEXT,
    "receiptSent" BOOLEAN NOT NULL DEFAULT false,
    "receiptEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "adapter" "PaymentProviderAdapterType" NOT NULL,
    "isInstalled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "appointment" TEXT,
    "provider" TEXT,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentSessionStatusType" NOT NULL DEFAULT 'pending',
    "providerReference" TEXT NOT NULL DEFAULT '',
    "data" JSONB DEFAULT '{}',
    "authorizedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "provider" TEXT,
    "replayKey" TEXT NOT NULL DEFAULT '',
    "eventId" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT '',
    "providerReference" TEXT NOT NULL DEFAULT '',
    "payloadHash" TEXT NOT NULL DEFAULT '',
    "status" "PaymentWebhookEventStatusType" NOT NULL DEFAULT 'processed',
    "data" JSONB DEFAULT '{}',
    "processedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRightsAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "request" TEXT,
    "actor" TEXT,
    "action" "PatientRightsActionActionType" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientRightsAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRightsRequest" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "requestedBy" TEXT,
    "assignedTo" TEXT,
    "type" "PatientRightsRequestTypeType" NOT NULL,
    "status" "PatientRightsRequestStatusType" NOT NULL DEFAULT 'received',
    "scope" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "legalBasis" TEXT NOT NULL DEFAULT '',
    "responseEvidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientRightsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoConsent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "purpose" "PhotoConsentPurposeType" NOT NULL,
    "status" "PhotoConsentStatusType" NOT NULL DEFAULT 'granted',
    "mediaScope" JSONB,
    "audienceScope" JSONB,
    "compensationDisclosure" TEXT NOT NULL DEFAULT '',
    "signerName" TEXT NOT NULL DEFAULT '',
    "signerRole" TEXT NOT NULL DEFAULT '',
    "signatureEvidenceHash" TEXT NOT NULL DEFAULT '',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoConsentAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "consent" TEXT,
    "actor" TEXT,
    "action" "PhotoConsentActionActionType" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "scope" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoConsentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeMembership" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "user" TEXT,
    "status" "PracticeMembershipStatusType" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "kind" "ProductKindType" NOT NULL DEFAULT 'retail',
    "trackLots" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL DEFAULT '',
    "sku" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "cost" INTEGER,
    "quantity" INTEGER DEFAULT 0,
    "reorderPoint" INTEGER DEFAULT 5,
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSale" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "appointment" TEXT,
    "products" JSONB DEFAULT '[]',
    "total" INTEGER NOT NULL,
    "soldBy" TEXT,
    "soldAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "user" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "tier" "ProviderTierType" DEFAULT 'junior',
    "role" "ProviderRoleType" DEFAULT 'provider',
    "baseCommissionRate" DOUBLE PRECISION DEFAULT 0,
    "commissionRate" DOUBLE PRECISION DEFAULT 0,
    "bio" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProviderStatusType" NOT NULL DEFAULT 'inactive',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "hireDate" TIMESTAMP(3),
    "employmentType" "ProviderEmploymentTypeType",
    "photo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAuthorization" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "provider" TEXT,
    "service" TEXT,
    "credential" TEXT,
    "requiredSupervisor" TEXT,
    "status" "ProviderAuthorizationStatusType" NOT NULL DEFAULT 'active',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "supervisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "supervisionMode" TEXT NOT NULL DEFAULT '',
    "policyVersion" TEXT NOT NULL DEFAULT '',
    "authorityEvidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "evidenceLabel" TEXT NOT NULL DEFAULT '',
    "evidenceReference" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "provider" TEXT,
    "location" TEXT,
    "licenseType" TEXT NOT NULL DEFAULT '',
    "licenseNumber" TEXT NOT NULL DEFAULT '',
    "jurisdiction" TEXT NOT NULL DEFAULT '',
    "status" "ProviderCredentialStatusType" NOT NULL DEFAULT 'pending',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verificationSource" TEXT NOT NULL DEFAULT '',
    "primarySourceVerified" BOOLEAN NOT NULL DEFAULT false,
    "supervisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "supervisor" TEXT,
    "scopeEvidenceHash" TEXT NOT NULL DEFAULT '',
    "evidenceReference" TEXT NOT NULL DEFAULT '',
    "protocolVersion" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSchedule" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "type" "ProviderScheduleTypeType" NOT NULL DEFAULT 'recurring',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "dayOfWeek" INTEGER,
    "dayOfWeekLegacy" "ProviderScheduleDayOfWeekLegacyType",
    "localDate" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3),
    "startTime" TEXT NOT NULL DEFAULT '',
    "endTime" TEXT NOT NULL DEFAULT '',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT NOT NULL DEFAULT '',
    "breakEnd" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "vendor" TEXT,
    "number" TEXT NOT NULL DEFAULT '',
    "status" "PurchaseOrderStatusType" NOT NULL DEFAULT 'draft',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "totalMinor" INTEGER DEFAULT 0,
    "orderedAt" TIMESTAMP(3),
    "expectedAt" TIMESTAMP(3),
    "revision" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrder" TEXT,
    "product" TEXT,
    "productTitle" TEXT NOT NULL DEFAULT '',
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER DEFAULT 0,
    "unitCostMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallAction" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "recall" TEXT,
    "exposure" TEXT,
    "actor" TEXT,
    "action" "RecallActionActionType" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallCase" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "lot" TEXT,
    "device" TEXT,
    "openedBy" TEXT,
    "sourceReference" TEXT NOT NULL DEFAULT '',
    "scopeReason" TEXT NOT NULL DEFAULT '',
    "status" "RecallCaseStatusType" NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallExposure" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "recall" TEXT,
    "client" TEXT,
    "administration" TEXT,
    "administrationLot" TEXT,
    "status" "RecallExposureStatusType" NOT NULL DEFAULT 'identified',
    "identifiedAt" TIMESTAMP(3) NOT NULL,
    "notificationDueAt" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallExposure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "referrer" TEXT,
    "referred" TEXT,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "rewardType" TEXT NOT NULL DEFAULT 'points',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "payment" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "providerReference" TEXT NOT NULL DEFAULT '',
    "status" "RefundStatusType" NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "jurisdiction" TEXT NOT NULL DEFAULT '',
    "recordClass" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '',
    "retainMonths" INTEGER NOT NULL,
    "minorsRule" TEXT NOT NULL DEFAULT '',
    "dispositionRule" TEXT NOT NULL DEFAULT '',
    "sourceCitations" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "type" "ResourceTypeType" NOT NULL DEFAULT 'room',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "readinessStatus" "ResourceReadinessStatusType" NOT NULL DEFAULT 'acceptance_testing',
    "manufacturer" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "udi" TEXT NOT NULL DEFAULT '',
    "softwareVersion" TEXT NOT NULL DEFAULT '',
    "maintenanceDueAt" TIMESTAMP(3),
    "calibrationDueAt" TIMESTAMP(3),
    "cleanedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "roomCapabilities" JSONB,
    "trainingRequirements" JSONB,
    "metadata" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceScheduleBlock" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "resource" TEXT,
    "type" "ResourceScheduleBlockTypeType" NOT NULL DEFAULT 'unavailable',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceReadinessEvent" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "resource" TEXT,
    "actor" TEXT,
    "qualifiedReleaseBy" TEXT,
    "action" "DeviceReadinessEventActionType" NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceReadinessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "client" TEXT,
    "service" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "cleanupBufferMinutes" INTEGER DEFAULT 15,
    "staffAuthorizationRequired" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "baseDuration" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "basePrice" INTEGER,
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" INTEGER,
    "status" "ServiceStatusType" DEFAULT 'active',
    "metadata" JSONB,
    "pricingTier" JSONB,
    "requiresConsultation" BOOLEAN NOT NULL DEFAULT false,
    "requiresIntakeReview" BOOLEAN NOT NULL DEFAULT true,
    "requiresLotTraceability" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "parent" TEXT,
    "displayOrder" INTEGER DEFAULT 0,
    "sortOrder" INTEGER DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "totalPrice" INTEGER NOT NULL,
    "savingsAmount" INTEGER DEFAULT 0,
    "validDays" INTEGER DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceVariant" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "service" TEXT,
    "price" INTEGER NOT NULL,
    "duration" INTEGER,
    "staffLevel" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvitation" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "email" TEXT NOT NULL DEFAULT '',
    "role" TEXT,
    "invitedBy" TEXT,
    "acceptedUser" TEXT,
    "tokenHash" TEXT NOT NULL DEFAULT '',
    "status" "StaffInvitationStatusType" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "lot" TEXT,
    "product" TEXT,
    "type" "StockMovementTypeType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "actor" TEXT,
    "treatmentSession" TEXT,
    "transactionLine" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentAdministration" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "treatmentSession" TEXT,
    "order" TEXT,
    "consent" TEXT,
    "performer" TEXT,
    "supervisor" TEXT,
    "service" TEXT,
    "room" TEXT,
    "device" TEXT,
    "status" "TreatmentAdministrationStatusType" NOT NULL,
    "protocolVersion" TEXT NOT NULL DEFAULT '',
    "timeOutEvidence" JSONB,
    "anatomicMap" JSONB,
    "deviceSettings" JSONB,
    "technique" TEXT NOT NULL DEFAULT '',
    "immediateOutcome" TEXT NOT NULL DEFAULT '',
    "aftercareSnapshot" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "consultation" TEXT,
    "createdBy" TEXT,
    "status" "TreatmentPlanStatusType" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL DEFAULT '',
    "goals" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "supersededBy" TEXT,
    "portalVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlanItem" (
    "id" TEXT NOT NULL,
    "plan" TEXT,
    "service" TEXT,
    "serviceTitle" TEXT NOT NULL DEFAULT '',
    "plannedSessions" INTEGER DEFAULT 1,
    "completedSessions" INTEGER DEFAULT 0,
    "intervalNotes" TEXT NOT NULL DEFAULT '',
    "status" "TreatmentPlanItemStatusType" NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentSession" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "location" TEXT,
    "plan" TEXT,
    "appointment" TEXT,
    "client" TEXT,
    "provider" TEXT,
    "service" TEXT,
    "order" TEXT,
    "consent" TEXT,
    "supervisor" TEXT,
    "room" TEXT,
    "device" TEXT,
    "serviceTitle" TEXT NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL,
    "status" "TreatmentSessionStatusType" NOT NULL DEFAULT 'planned',
    "staffAuthorizationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "protocolVersion" TEXT NOT NULL DEFAULT '',
    "timeOutEvidence" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3),
    "evidenceHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "revision" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "client" TEXT,
    "guestName" TEXT NOT NULL DEFAULT '',
    "guestPhone" TEXT NOT NULL DEFAULT '',
    "service" TEXT,
    "preferredDays" JSONB,
    "preferredTimeRange" TEXT NOT NULL DEFAULT '',
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requestKey" TEXT NOT NULL DEFAULT '',
    "notifiedAt" TIMESTAMP(3),
    "transitionedAt" TIMESTAMP(3),
    "transitionReason" TEXT NOT NULL DEFAULT '',
    "convertedAppointment" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookInbox" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "providerCode" TEXT NOT NULL DEFAULT '',
    "providerEventId" TEXT NOT NULL DEFAULT '',
    "signatureVerifiedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "status" "WebhookInboxStatusType" NOT NULL DEFAULT 'received',
    "processedAt" TIMESTAMP(3),
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetConfiguration" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "secondaryColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "showServices" BOOLEAN NOT NULL DEFAULT true,
    "showProviders" BOOLEAN NOT NULL DEFAULT true,
    "customCSS" TEXT NOT NULL DEFAULT '',
    "embedCode" TEXT NOT NULL DEFAULT '',
    "buttonText" TEXT NOT NULL DEFAULT 'Book Now',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "width" TEXT NOT NULL DEFAULT '100%',
    "height" TEXT NOT NULL DEFAULT '600px',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Appointment_services" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_FormTemplate_requiredForCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_IntakeForm_requiredForServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Location_staff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Location_providers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PracticeMembership_locations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_StaffInvitation_locations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Membership_includedServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Service_clinicalProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Provider_specializations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Provider_waitlistEntries" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Resource_services" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ServicePackage_services" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "AdministrationLot_practice_idx" ON "AdministrationLot"("practice");

-- CreateIndex
CREATE INDEX "AdministrationLot_administration_idx" ON "AdministrationLot"("administration");

-- CreateIndex
CREATE INDEX "AdministrationLot_lot_idx" ON "AdministrationLot"("lot");

-- CreateIndex
CREATE INDEX "AdministrationLot_product_idx" ON "AdministrationLot"("product");

-- CreateIndex
CREATE INDEX "AdministrationLot_witness_idx" ON "AdministrationLot"("witness");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_idempotencyKey_key" ON "Appointment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_consultation_key" ON "Appointment"("consultation");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_payment_key" ON "Appointment"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_transaction_key" ON "Appointment"("transaction");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_review_key" ON "Appointment"("review");

-- CreateIndex
CREATE INDEX "Appointment_practice_idx" ON "Appointment"("practice");

-- CreateIndex
CREATE INDEX "Appointment_location_idx" ON "Appointment"("location");

-- CreateIndex
CREATE INDEX "Appointment_client_idx" ON "Appointment"("client");

-- CreateIndex
CREATE INDEX "Appointment_provider_idx" ON "Appointment"("provider");

-- CreateIndex
CREATE INDEX "Appointment_resource_idx" ON "Appointment"("resource");

-- CreateIndex
CREATE INDEX "Appointment_room_idx" ON "Appointment"("room");

-- CreateIndex
CREATE INDEX "Appointment_device_idx" ON "Appointment"("device");

-- CreateIndex
CREATE INDEX "AppointmentLineItem_practice_idx" ON "AppointmentLineItem"("practice");

-- CreateIndex
CREATE INDEX "AppointmentLineItem_service_idx" ON "AppointmentLineItem"("service");

-- CreateIndex
CREATE INDEX "AppointmentLineItem_staff_idx" ON "AppointmentLineItem"("staff");

-- CreateIndex
CREATE INDEX "AppointmentLineItem_appointment_idx" ON "AppointmentLineItem"("appointment");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentResourceReservation_idempotencyKey_key" ON "AppointmentResourceReservation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AppointmentResourceReservation_practice_idx" ON "AppointmentResourceReservation"("practice");

-- CreateIndex
CREATE INDEX "AppointmentResourceReservation_location_idx" ON "AppointmentResourceReservation"("location");

-- CreateIndex
CREATE INDEX "AppointmentResourceReservation_appointment_idx" ON "AppointmentResourceReservation"("appointment");

-- CreateIndex
CREATE INDEX "AppointmentResourceReservation_treatmentSession_idx" ON "AppointmentResourceReservation"("treatmentSession");

-- CreateIndex
CREATE INDEX "AppointmentResourceReservation_resource_idx" ON "AppointmentResourceReservation"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentSupervisorReservation_idempotencyKey_key" ON "AppointmentSupervisorReservation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AppointmentSupervisorReservation_practice_idx" ON "AppointmentSupervisorReservation"("practice");

-- CreateIndex
CREATE INDEX "AppointmentSupervisorReservation_location_idx" ON "AppointmentSupervisorReservation"("location");

-- CreateIndex
CREATE INDEX "AppointmentSupervisorReservation_appointment_idx" ON "AppointmentSupervisorReservation"("appointment");

-- CreateIndex
CREATE INDEX "AppointmentSupervisorReservation_supervisor_idx" ON "AppointmentSupervisorReservation"("supervisor");

-- CreateIndex
CREATE INDEX "AppointmentSupervisorReservation_service_idx" ON "AppointmentSupervisorReservation"("service");

-- CreateIndex
CREATE UNIQUE INDEX "AssetAccessEvent_idempotencyKey_key" ON "AssetAccessEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AssetAccessEvent_practice_idx" ON "AssetAccessEvent"("practice");

-- CreateIndex
CREATE INDEX "AssetAccessEvent_asset_idx" ON "AssetAccessEvent"("asset");

-- CreateIndex
CREATE INDEX "AssetAccessEvent_actor_idx" ON "AssetAccessEvent"("actor");

-- CreateIndex
CREATE INDEX "AuditEvent_practice_idx" ON "AuditEvent"("practice");

-- CreateIndex
CREATE INDEX "AuditEvent_location_idx" ON "AuditEvent"("location");

-- CreateIndex
CREATE INDEX "AuditEvent_actor_idx" ON "AuditEvent"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "BreakGlassEvent_idempotencyKey_key" ON "BreakGlassEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BreakGlassEvent_practice_idx" ON "BreakGlassEvent"("practice");

-- CreateIndex
CREATE INDEX "BreakGlassEvent_client_idx" ON "BreakGlassEvent"("client");

-- CreateIndex
CREATE INDEX "BreakGlassEvent_actor_idx" ON "BreakGlassEvent"("actor");

-- CreateIndex
CREATE INDEX "BreakGlassEvent_reviewer_idx" ON "BreakGlassEvent"("reviewer");

-- CreateIndex
CREATE UNIQUE INDEX "Client_user_key" ON "Client"("user");

-- CreateIndex
CREATE INDEX "Client_practice_idx" ON "Client"("practice");

-- CreateIndex
CREATE INDEX "Client_homeLocation_idx" ON "Client"("homeLocation");

-- CreateIndex
CREATE INDEX "Client_preferredProvider_idx" ON "Client"("preferredProvider");

-- CreateIndex
CREATE INDEX "ClientAsset_practice_idx" ON "ClientAsset"("practice");

-- CreateIndex
CREATE INDEX "ClientAsset_client_idx" ON "ClientAsset"("client");

-- CreateIndex
CREATE INDEX "ClientAsset_appointment_idx" ON "ClientAsset"("appointment");

-- CreateIndex
CREATE INDEX "ClientAsset_treatmentSession_idx" ON "ClientAsset"("treatmentSession");

-- CreateIndex
CREATE INDEX "ClientAsset_incident_idx" ON "ClientAsset"("incident");

-- CreateIndex
CREATE INDEX "ClientAsset_note_idx" ON "ClientAsset"("note");

-- CreateIndex
CREATE INDEX "ClientAsset_photoConsent_idx" ON "ClientAsset"("photoConsent");

-- CreateIndex
CREATE INDEX "ClientAsset_uploadedBy_idx" ON "ClientAsset"("uploadedBy");

-- CreateIndex
CREATE INDEX "ClientMembership_practice_idx" ON "ClientMembership"("practice");

-- CreateIndex
CREATE INDEX "ClientMembership_client_idx" ON "ClientMembership"("client");

-- CreateIndex
CREATE INDEX "ClientMembership_membership_idx" ON "ClientMembership"("membership");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPackageAdjustment_idempotencyKey_key" ON "ClientPackageAdjustment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ClientPackageAdjustment_practice_idx" ON "ClientPackageAdjustment"("practice");

-- CreateIndex
CREATE INDEX "ClientPackageAdjustment_clientPackage_idx" ON "ClientPackageAdjustment"("clientPackage");

-- CreateIndex
CREATE INDEX "ClientPackageAdjustment_usage_idx" ON "ClientPackageAdjustment"("usage");

-- CreateIndex
CREATE INDEX "ClientPackageAdjustment_actor_idx" ON "ClientPackageAdjustment"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalAuthorityEvent_idempotencyKey_key" ON "ClinicalAuthorityEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_practice_idx" ON "ClinicalAuthorityEvent"("practice");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_location_idx" ON "ClinicalAuthorityEvent"("location");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_provider_idx" ON "ClinicalAuthorityEvent"("provider");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_supervisor_idx" ON "ClinicalAuthorityEvent"("supervisor");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_credential_idx" ON "ClinicalAuthorityEvent"("credential");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_authorization_idx" ON "ClinicalAuthorityEvent"("authorization");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_service_idx" ON "ClinicalAuthorityEvent"("service");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_client_idx" ON "ClinicalAuthorityEvent"("client");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_appointment_idx" ON "ClinicalAuthorityEvent"("appointment");

-- CreateIndex
CREATE INDEX "ClinicalAuthorityEvent_treatmentSession_idx" ON "ClinicalAuthorityEvent"("treatmentSession");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalOrder_idempotencyKey_key" ON "ClinicalOrder"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalOrder_supersededBy_key" ON "ClinicalOrder"("supersededBy");

-- CreateIndex
CREATE INDEX "ClinicalOrder_practice_idx" ON "ClinicalOrder"("practice");

-- CreateIndex
CREATE INDEX "ClinicalOrder_location_idx" ON "ClinicalOrder"("location");

-- CreateIndex
CREATE INDEX "ClinicalOrder_client_idx" ON "ClinicalOrder"("client");

-- CreateIndex
CREATE INDEX "ClinicalOrder_consultation_idx" ON "ClinicalOrder"("consultation");

-- CreateIndex
CREATE INDEX "ClinicalOrder_plan_idx" ON "ClinicalOrder"("plan");

-- CreateIndex
CREATE INDEX "ClinicalOrder_service_idx" ON "ClinicalOrder"("service");

-- CreateIndex
CREATE INDEX "ClinicalOrder_orderedBy_idx" ON "ClinicalOrder"("orderedBy");

-- CreateIndex
CREATE INDEX "ClinicalOrder_authorizedPerformer_idx" ON "ClinicalOrder"("authorizedPerformer");

-- CreateIndex
CREATE INDEX "ClinicalOrder_requiredSupervisor_idx" ON "ClinicalOrder"("requiredSupervisor");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalOrderAction_idempotencyKey_key" ON "ClinicalOrderAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ClinicalOrderAction_practice_idx" ON "ClinicalOrderAction"("practice");

-- CreateIndex
CREATE INDEX "ClinicalOrderAction_order_idx" ON "ClinicalOrderAction"("order");

-- CreateIndex
CREATE INDEX "ClinicalOrderAction_actor_idx" ON "ClinicalOrderAction"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentAction_idempotencyKey_key" ON "ConsentAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ConsentAction_practice_idx" ON "ConsentAction"("practice");

-- CreateIndex
CREATE INDEX "ConsentAction_consent_idx" ON "ConsentAction"("consent");

-- CreateIndex
CREATE INDEX "ConsentAction_actor_idx" ON "ConsentAction"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_supersededBy_key" ON "ConsentRecord"("supersededBy");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_idempotencyKey_key" ON "ConsentRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ConsentRecord_practice_idx" ON "ConsentRecord"("practice");

-- CreateIndex
CREATE INDEX "ConsentRecord_client_idx" ON "ConsentRecord"("client");

-- CreateIndex
CREATE INDEX "ConsentRecord_appointment_idx" ON "ConsentRecord"("appointment");

-- CreateIndex
CREATE INDEX "ConsentRecord_service_idx" ON "ConsentRecord"("service");

-- CreateIndex
CREATE INDEX "ConsentRecord_templateVersion_idx" ON "ConsentRecord"("templateVersion");

-- CreateIndex
CREATE INDEX "ConsentRecord_presentedBy_idx" ON "ConsentRecord"("presentedBy");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplateVersion_supersededBy_key" ON "ConsentTemplateVersion"("supersededBy");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplateVersion_idempotencyKey_key" ON "ConsentTemplateVersion"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ConsentTemplateVersion_practice_idx" ON "ConsentTemplateVersion"("practice");

-- CreateIndex
CREATE INDEX "ConsentTemplateVersion_service_idx" ON "ConsentTemplateVersion"("service");

-- CreateIndex
CREATE UNIQUE INDEX "ContraindicationDecision_idempotencyKey_key" ON "ContraindicationDecision"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ContraindicationDecision_practice_idx" ON "ContraindicationDecision"("practice");

-- CreateIndex
CREATE INDEX "ContraindicationDecision_finding_idx" ON "ContraindicationDecision"("finding");

-- CreateIndex
CREATE INDEX "ContraindicationDecision_decidedBy_idx" ON "ContraindicationDecision"("decidedBy");

-- CreateIndex
CREATE UNIQUE INDEX "ContraindicationFinding_idempotencyKey_key" ON "ContraindicationFinding"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ContraindicationFinding_practice_idx" ON "ContraindicationFinding"("practice");

-- CreateIndex
CREATE INDEX "ContraindicationFinding_client_idx" ON "ContraindicationFinding"("client");

-- CreateIndex
CREATE INDEX "ContraindicationFinding_consultation_idx" ON "ContraindicationFinding"("consultation");

-- CreateIndex
CREATE INDEX "ContraindicationFinding_service_idx" ON "ContraindicationFinding"("service");

-- CreateIndex
CREATE UNIQUE INDEX "ClientNote_idempotencyKey_key" ON "ClientNote"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClientNote_supersededBy_key" ON "ClientNote"("supersededBy");

-- CreateIndex
CREATE INDEX "ClientNote_client_idx" ON "ClientNote"("client");

-- CreateIndex
CREATE INDEX "ClientNote_author_idx" ON "ClientNote"("author");

-- CreateIndex
CREATE INDEX "ClientNote_appointment_idx" ON "ClientNote"("appointment");

-- CreateIndex
CREATE INDEX "ClientNote_practice_idx" ON "ClientNote"("practice");

-- CreateIndex
CREATE INDEX "ClientPackage_practice_idx" ON "ClientPackage"("practice");

-- CreateIndex
CREATE INDEX "ClientPackage_client_idx" ON "ClientPackage"("client");

-- CreateIndex
CREATE INDEX "ClientPackage_package_idx" ON "ClientPackage"("package");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPackageUsage_idempotencyKey_key" ON "ClientPackageUsage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_practice_idx" ON "ClientPackageUsage"("practice");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_clientPackage_idx" ON "ClientPackageUsage"("clientPackage");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_appointment_idx" ON "ClientPackageUsage"("appointment");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_service_idx" ON "ClientPackageUsage"("service");

-- CreateIndex
CREATE INDEX "ClientPoints_practice_idx" ON "ClientPoints"("practice");

-- CreateIndex
CREATE INDEX "ClientPoints_client_idx" ON "ClientPoints"("client");

-- CreateIndex
CREATE INDEX "Commission_practice_idx" ON "Commission"("practice");

-- CreateIndex
CREATE INDEX "Commission_provider_idx" ON "Commission"("provider");

-- CreateIndex
CREATE INDEX "Commission_service_idx" ON "Commission"("service");

-- CreateIndex
CREATE INDEX "Commission_payment_idx" ON "Commission"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_idempotencyKey_key" ON "Consultation"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_supersededBy_key" ON "Consultation"("supersededBy");

-- CreateIndex
CREATE INDEX "Consultation_practice_idx" ON "Consultation"("practice");

-- CreateIndex
CREATE INDEX "Consultation_location_idx" ON "Consultation"("location");

-- CreateIndex
CREATE INDEX "Consultation_client_idx" ON "Consultation"("client");

-- CreateIndex
CREATE INDEX "Consultation_service_idx" ON "Consultation"("service");

-- CreateIndex
CREATE INDEX "Consultation_provider_idx" ON "Consultation"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "DomainEvent_eventKey_key" ON "DomainEvent"("eventKey");

-- CreateIndex
CREATE INDEX "DomainEvent_practice_idx" ON "DomainEvent"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpAction_idempotencyKey_key" ON "FollowUpAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FollowUpAction_practice_idx" ON "FollowUpAction"("practice");

-- CreateIndex
CREATE INDEX "FollowUpAction_task_idx" ON "FollowUpAction"("task");

-- CreateIndex
CREATE INDEX "FollowUpAction_actor_idx" ON "FollowUpAction"("actor");

-- CreateIndex
CREATE INDEX "FollowUpTask_practice_idx" ON "FollowUpTask"("practice");

-- CreateIndex
CREATE INDEX "FollowUpTask_location_idx" ON "FollowUpTask"("location");

-- CreateIndex
CREATE INDEX "FollowUpTask_client_idx" ON "FollowUpTask"("client");

-- CreateIndex
CREATE INDEX "FollowUpTask_appointment_idx" ON "FollowUpTask"("appointment");

-- CreateIndex
CREATE INDEX "FollowUpTask_treatmentSession_idx" ON "FollowUpTask"("treatmentSession");

-- CreateIndex
CREATE INDEX "FollowUpTask_assignedTo_idx" ON "FollowUpTask"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_idempotencyKey_key" ON "FormSubmission"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_supersededBy_key" ON "FormSubmission"("supersededBy");

-- CreateIndex
CREATE INDEX "FormSubmission_practice_idx" ON "FormSubmission"("practice");

-- CreateIndex
CREATE INDEX "FormSubmission_reviewedBy_idx" ON "FormSubmission"("reviewedBy");

-- CreateIndex
CREATE INDEX "FormSubmission_client_idx" ON "FormSubmission"("client");

-- CreateIndex
CREATE INDEX "FormSubmission_form_idx" ON "FormSubmission"("form");

-- CreateIndex
CREATE INDEX "FormSubmission_template_idx" ON "FormSubmission"("template");

-- CreateIndex
CREATE INDEX "FormSubmission_appointment_idx" ON "FormSubmission"("appointment");

-- CreateIndex
CREATE INDEX "FormTemplate_practice_idx" ON "FormTemplate"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_practice_idx" ON "GiftCard"("practice");

-- CreateIndex
CREATE INDEX "GiftCard_purchasedBy_idx" ON "GiftCard"("purchasedBy");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardTransaction_idempotencyKey_key" ON "GiftCardTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_practice_idx" ON "GiftCardTransaction"("practice");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_giftCard_idx" ON "GiftCardTransaction"("giftCard");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_appointment_idx" ON "GiftCardTransaction"("appointment");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_idempotencyKey_key" ON "GoodsReceipt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GoodsReceipt_practice_idx" ON "GoodsReceipt"("practice");

-- CreateIndex
CREATE INDEX "GoodsReceipt_location_idx" ON "GoodsReceipt"("location");

-- CreateIndex
CREATE INDEX "GoodsReceipt_purchaseOrder_idx" ON "GoodsReceipt"("purchaseOrder");

-- CreateIndex
CREATE INDEX "GoodsReceipt_receivedBy_idx" ON "GoodsReceipt"("receivedBy");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptLine_lot_key" ON "GoodsReceiptLine"("lot");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptLine_idempotencyKey_key" ON "GoodsReceiptLine"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_practice_idx" ON "GoodsReceiptLine"("practice");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_receipt_idx" ON "GoodsReceiptLine"("receipt");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_purchaseOrderLine_idx" ON "GoodsReceiptLine"("purchaseOrderLine");

-- CreateIndex
CREATE INDEX "GoodsReceiptLine_product_idx" ON "GoodsReceiptLine"("product");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_idempotencyKey_key" ON "Incident"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Incident_practice_idx" ON "Incident"("practice");

-- CreateIndex
CREATE INDEX "Incident_location_idx" ON "Incident"("location");

-- CreateIndex
CREATE INDEX "Incident_client_idx" ON "Incident"("client");

-- CreateIndex
CREATE INDEX "Incident_appointment_idx" ON "Incident"("appointment");

-- CreateIndex
CREATE INDEX "Incident_treatmentSession_idx" ON "Incident"("treatmentSession");

-- CreateIndex
CREATE INDEX "Incident_administration_idx" ON "Incident"("administration");

-- CreateIndex
CREATE INDEX "Incident_suspectLot_idx" ON "Incident"("suspectLot");

-- CreateIndex
CREATE INDEX "Incident_suspectDevice_idx" ON "Incident"("suspectDevice");

-- CreateIndex
CREATE INDEX "Incident_reportedBy_idx" ON "Incident"("reportedBy");

-- CreateIndex
CREATE INDEX "Incident_assignedTo_idx" ON "Incident"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentAction_idempotencyKey_key" ON "IncidentAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "IncidentAction_practice_idx" ON "IncidentAction"("practice");

-- CreateIndex
CREATE INDEX "IncidentAction_incident_idx" ON "IncidentAction"("incident");

-- CreateIndex
CREATE INDEX "IncidentAction_actor_idx" ON "IncidentAction"("actor");

-- CreateIndex
CREATE INDEX "IncidentAction_clinician_idx" ON "IncidentAction"("clinician");

-- CreateIndex
CREATE UNIQUE INDEX "LegalHold_idempotencyKey_key" ON "LegalHold"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LegalHold_practice_idx" ON "LegalHold"("practice");

-- CreateIndex
CREATE INDEX "LegalHold_client_idx" ON "LegalHold"("client");

-- CreateIndex
CREATE INDEX "LegalHold_asset_idx" ON "LegalHold"("asset");

-- CreateIndex
CREATE INDEX "LegalHold_incident_idx" ON "LegalHold"("incident");

-- CreateIndex
CREATE INDEX "LegalHold_placedBy_idx" ON "LegalHold"("placedBy");

-- CreateIndex
CREATE INDEX "LegalHold_releasedBy_idx" ON "LegalHold"("releasedBy");

-- CreateIndex
CREATE INDEX "IntakeForm_practice_idx" ON "IntakeForm"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeReviewAction_idempotencyKey_key" ON "IntakeReviewAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "IntakeReviewAction_practice_idx" ON "IntakeReviewAction"("practice");

-- CreateIndex
CREATE INDEX "IntakeReviewAction_submission_idx" ON "IntakeReviewAction"("submission");

-- CreateIndex
CREATE INDEX "IntakeReviewAction_reviewer_idx" ON "IntakeReviewAction"("reviewer");

-- CreateIndex
CREATE INDEX "InventoryLot_practice_idx" ON "InventoryLot"("practice");

-- CreateIndex
CREATE INDEX "InventoryLot_location_idx" ON "InventoryLot"("location");

-- CreateIndex
CREATE INDEX "InventoryLot_product_idx" ON "InventoryLot"("product");

-- CreateIndex
CREATE INDEX "InventoryLot_vendor_idx" ON "InventoryLot"("vendor");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_idempotencyKey_key" ON "InventoryMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryMovement_practice_idx" ON "InventoryMovement"("practice");

-- CreateIndex
CREATE INDEX "InventoryMovement_location_idx" ON "InventoryMovement"("location");

-- CreateIndex
CREATE INDEX "InventoryMovement_product_idx" ON "InventoryMovement"("product");

-- CreateIndex
CREATE INDEX "InventoryMovement_appointment_idx" ON "InventoryMovement"("appointment");

-- CreateIndex
CREATE INDEX "Location_practice_idx" ON "Location"("practice");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_practice_idx" ON "LoyaltyProgram"("practice");

-- CreateIndex
CREATE INDEX "MedSpaImage_practice_idx" ON "MedSpaImage"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "MedSpaTransaction_idempotencyKey_key" ON "MedSpaTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MedSpaTransaction_practice_idx" ON "MedSpaTransaction"("practice");

-- CreateIndex
CREATE INDEX "MedSpaTransaction_location_idx" ON "MedSpaTransaction"("location");

-- CreateIndex
CREATE INDEX "MedSpaTransaction_client_idx" ON "MedSpaTransaction"("client");

-- CreateIndex
CREATE INDEX "MedSpaTransaction_staff_idx" ON "MedSpaTransaction"("staff");

-- CreateIndex
CREATE INDEX "MedSpaTransactionLineItem_practice_idx" ON "MedSpaTransactionLineItem"("practice");

-- CreateIndex
CREATE INDEX "MedSpaTransactionLineItem_transaction_idx" ON "MedSpaTransactionLineItem"("transaction");

-- CreateIndex
CREATE INDEX "MedSpaTransactionLineItem_service_idx" ON "MedSpaTransactionLineItem"("service");

-- CreateIndex
CREATE INDEX "MedSpaTransactionLineItem_product_idx" ON "MedSpaTransactionLineItem"("product");

-- CreateIndex
CREATE INDEX "MedSpaTransactionLineItem_staff_idx" ON "MedSpaTransactionLineItem"("staff");

-- CreateIndex
CREATE INDEX "Membership_practice_idx" ON "Membership"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipAgreement_idempotencyKey_key" ON "MembershipAgreement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MembershipAgreement_practice_idx" ON "MembershipAgreement"("practice");

-- CreateIndex
CREATE INDEX "MembershipAgreement_clientMembership_idx" ON "MembershipAgreement"("clientMembership");

-- CreateIndex
CREATE INDEX "MembershipAgreement_client_idx" ON "MembershipAgreement"("client");

-- CreateIndex
CREATE INDEX "MembershipAgreement_membership_idx" ON "MembershipAgreement"("membership");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipLedgerEntry_idempotencyKey_key" ON "MembershipLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MembershipLedgerEntry_practice_idx" ON "MembershipLedgerEntry"("practice");

-- CreateIndex
CREATE INDEX "MembershipLedgerEntry_clientMembership_idx" ON "MembershipLedgerEntry"("clientMembership");

-- CreateIndex
CREATE INDEX "MembershipLedgerEntry_agreement_idx" ON "MembershipLedgerEntry"("agreement");

-- CreateIndex
CREATE INDEX "MembershipLedgerEntry_actor_idx" ON "MembershipLedgerEntry"("actor");

-- CreateIndex
CREATE INDEX "MessageLog_practice_idx" ON "MessageLog"("practice");

-- CreateIndex
CREATE INDEX "MessageLog_recipient_idx" ON "MessageLog"("recipient");

-- CreateIndex
CREATE INDEX "MessageLog_template_idx" ON "MessageLog"("template");

-- CreateIndex
CREATE INDEX "MessageTemplate_practice_idx" ON "MessageTemplate"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_eventKey_key" ON "OutboxEvent"("eventKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_practice_idx" ON "OutboxEvent"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_session_key" ON "Payment"("session");

-- CreateIndex
CREATE INDEX "Payment_practice_idx" ON "Payment"("practice");

-- CreateIndex
CREATE INDEX "Payment_processedBy_idx" ON "Payment"("processedBy");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_code_key" ON "PaymentProvider"("code");

-- CreateIndex
CREATE INDEX "PaymentProvider_practice_idx" ON "PaymentProvider"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_idempotencyKey_key" ON "PaymentSession"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentSession_practice_idx" ON "PaymentSession"("practice");

-- CreateIndex
CREATE INDEX "PaymentSession_appointment_idx" ON "PaymentSession"("appointment");

-- CreateIndex
CREATE INDEX "PaymentSession_provider_idx" ON "PaymentSession"("provider");

-- CreateIndex
CREATE INDEX "PaymentSession_providerReference_idx" ON "PaymentSession"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_replayKey_key" ON "PaymentWebhookEvent"("replayKey");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_practice_idx" ON "PaymentWebhookEvent"("practice");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_idx" ON "PaymentWebhookEvent"("provider");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerReference_idx" ON "PaymentWebhookEvent"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "PatientRightsAction_idempotencyKey_key" ON "PatientRightsAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PatientRightsAction_practice_idx" ON "PatientRightsAction"("practice");

-- CreateIndex
CREATE INDEX "PatientRightsAction_request_idx" ON "PatientRightsAction"("request");

-- CreateIndex
CREATE INDEX "PatientRightsAction_actor_idx" ON "PatientRightsAction"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "PatientRightsRequest_idempotencyKey_key" ON "PatientRightsRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PatientRightsRequest_practice_idx" ON "PatientRightsRequest"("practice");

-- CreateIndex
CREATE INDEX "PatientRightsRequest_client_idx" ON "PatientRightsRequest"("client");

-- CreateIndex
CREATE INDEX "PatientRightsRequest_requestedBy_idx" ON "PatientRightsRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "PatientRightsRequest_assignedTo_idx" ON "PatientRightsRequest"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoConsent_idempotencyKey_key" ON "PhotoConsent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PhotoConsent_practice_idx" ON "PhotoConsent"("practice");

-- CreateIndex
CREATE INDEX "PhotoConsent_client_idx" ON "PhotoConsent"("client");

-- CreateIndex
CREATE INDEX "PhotoConsent_appointment_idx" ON "PhotoConsent"("appointment");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoConsentAction_idempotencyKey_key" ON "PhotoConsentAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PhotoConsentAction_practice_idx" ON "PhotoConsentAction"("practice");

-- CreateIndex
CREATE INDEX "PhotoConsentAction_consent_idx" ON "PhotoConsentAction"("consent");

-- CreateIndex
CREATE INDEX "PhotoConsentAction_actor_idx" ON "PhotoConsentAction"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "Practice_slug_key" ON "Practice"("slug");

-- CreateIndex
CREATE INDEX "PracticeMembership_practice_idx" ON "PracticeMembership"("practice");

-- CreateIndex
CREATE INDEX "PracticeMembership_user_idx" ON "PracticeMembership"("user");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_practice_idx" ON "Product"("practice");

-- CreateIndex
CREATE INDEX "Product_image_idx" ON "Product"("image");

-- CreateIndex
CREATE INDEX "ProductSale_practice_idx" ON "ProductSale"("practice");

-- CreateIndex
CREATE INDEX "ProductSale_appointment_idx" ON "ProductSale"("appointment");

-- CreateIndex
CREATE INDEX "ProductSale_soldBy_idx" ON "ProductSale"("soldBy");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_user_key" ON "Provider"("user");

-- CreateIndex
CREATE INDEX "Provider_practice_idx" ON "Provider"("practice");

-- CreateIndex
CREATE INDEX "Provider_photo_idx" ON "Provider"("photo");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAuthorization_idempotencyKey_key" ON "ProviderAuthorization"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderAuthorization_practice_idx" ON "ProviderAuthorization"("practice");

-- CreateIndex
CREATE INDEX "ProviderAuthorization_location_idx" ON "ProviderAuthorization"("location");

-- CreateIndex
CREATE INDEX "ProviderAuthorization_provider_idx" ON "ProviderAuthorization"("provider");

-- CreateIndex
CREATE INDEX "ProviderAuthorization_service_idx" ON "ProviderAuthorization"("service");

-- CreateIndex
CREATE INDEX "ProviderAuthorization_credential_idx" ON "ProviderAuthorization"("credential");

-- CreateIndex
CREATE INDEX "ProviderAuthorization_requiredSupervisor_idx" ON "ProviderAuthorization"("requiredSupervisor");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredential_idempotencyKey_key" ON "ProviderCredential"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderCredential_practice_idx" ON "ProviderCredential"("practice");

-- CreateIndex
CREATE INDEX "ProviderCredential_provider_idx" ON "ProviderCredential"("provider");

-- CreateIndex
CREATE INDEX "ProviderCredential_location_idx" ON "ProviderCredential"("location");

-- CreateIndex
CREATE INDEX "ProviderCredential_supervisor_idx" ON "ProviderCredential"("supervisor");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSchedule_idempotencyKey_key" ON "ProviderSchedule"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderSchedule_practice_idx" ON "ProviderSchedule"("practice");

-- CreateIndex
CREATE INDEX "ProviderSchedule_location_idx" ON "ProviderSchedule"("location");

-- CreateIndex
CREATE INDEX "ProviderSchedule_provider_idx" ON "ProviderSchedule"("provider");

-- CreateIndex
CREATE INDEX "PurchaseOrder_practice_idx" ON "PurchaseOrder"("practice");

-- CreateIndex
CREATE INDEX "PurchaseOrder_location_idx" ON "PurchaseOrder"("location");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendor_idx" ON "PurchaseOrder"("vendor");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrder_idx" ON "PurchaseOrderLine"("purchaseOrder");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_product_idx" ON "PurchaseOrderLine"("product");

-- CreateIndex
CREATE UNIQUE INDEX "RecallAction_idempotencyKey_key" ON "RecallAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RecallAction_practice_idx" ON "RecallAction"("practice");

-- CreateIndex
CREATE INDEX "RecallAction_recall_idx" ON "RecallAction"("recall");

-- CreateIndex
CREATE INDEX "RecallAction_exposure_idx" ON "RecallAction"("exposure");

-- CreateIndex
CREATE INDEX "RecallAction_actor_idx" ON "RecallAction"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "RecallCase_idempotencyKey_key" ON "RecallCase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RecallCase_practice_idx" ON "RecallCase"("practice");

-- CreateIndex
CREATE INDEX "RecallCase_location_idx" ON "RecallCase"("location");

-- CreateIndex
CREATE INDEX "RecallCase_lot_idx" ON "RecallCase"("lot");

-- CreateIndex
CREATE INDEX "RecallCase_device_idx" ON "RecallCase"("device");

-- CreateIndex
CREATE INDEX "RecallCase_openedBy_idx" ON "RecallCase"("openedBy");

-- CreateIndex
CREATE INDEX "RecallExposure_practice_idx" ON "RecallExposure"("practice");

-- CreateIndex
CREATE INDEX "RecallExposure_recall_idx" ON "RecallExposure"("recall");

-- CreateIndex
CREATE INDEX "RecallExposure_client_idx" ON "RecallExposure"("client");

-- CreateIndex
CREATE INDEX "RecallExposure_administration_idx" ON "RecallExposure"("administration");

-- CreateIndex
CREATE INDEX "RecallExposure_administrationLot_idx" ON "RecallExposure"("administrationLot");

-- CreateIndex
CREATE INDEX "Referral_practice_idx" ON "Referral"("practice");

-- CreateIndex
CREATE INDEX "Referral_referrer_idx" ON "Referral"("referrer");

-- CreateIndex
CREATE INDEX "Referral_referred_idx" ON "Referral"("referred");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_practice_idx" ON "Refund"("practice");

-- CreateIndex
CREATE INDEX "Refund_payment_idx" ON "Refund"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_idempotencyKey_key" ON "RetentionPolicy"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RetentionPolicy_practice_idx" ON "RetentionPolicy"("practice");

-- CreateIndex
CREATE INDEX "RetentionPolicy_approvedBy_idx" ON "RetentionPolicy"("approvedBy");

-- CreateIndex
CREATE INDEX "Resource_practice_idx" ON "Resource"("practice");

-- CreateIndex
CREATE INDEX "Resource_location_idx" ON "Resource"("location");

-- CreateIndex
CREATE INDEX "ResourceScheduleBlock_practice_idx" ON "ResourceScheduleBlock"("practice");

-- CreateIndex
CREATE INDEX "ResourceScheduleBlock_location_idx" ON "ResourceScheduleBlock"("location");

-- CreateIndex
CREATE INDEX "ResourceScheduleBlock_resource_idx" ON "ResourceScheduleBlock"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceReadinessEvent_idempotencyKey_key" ON "DeviceReadinessEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DeviceReadinessEvent_practice_idx" ON "DeviceReadinessEvent"("practice");

-- CreateIndex
CREATE INDEX "DeviceReadinessEvent_resource_idx" ON "DeviceReadinessEvent"("resource");

-- CreateIndex
CREATE INDEX "DeviceReadinessEvent_actor_idx" ON "DeviceReadinessEvent"("actor");

-- CreateIndex
CREATE INDEX "DeviceReadinessEvent_qualifiedReleaseBy_idx" ON "DeviceReadinessEvent"("qualifiedReleaseBy");

-- CreateIndex
CREATE INDEX "Review_practice_idx" ON "Review"("practice");

-- CreateIndex
CREATE INDEX "Review_client_idx" ON "Review"("client");

-- CreateIndex
CREATE INDEX "Review_service_idx" ON "Review"("service");

-- CreateIndex
CREATE INDEX "Review_provider_idx" ON "Review"("provider");

-- CreateIndex
CREATE INDEX "Service_practice_idx" ON "Service"("practice");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE INDEX "Service_image_idx" ON "Service"("image");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_practice_idx" ON "ServiceCategory"("practice");

-- CreateIndex
CREATE INDEX "ServiceCategory_parent_idx" ON "ServiceCategory"("parent");

-- CreateIndex
CREATE INDEX "ServicePackage_practice_idx" ON "ServicePackage"("practice");

-- CreateIndex
CREATE INDEX "ServiceVariant_practice_idx" ON "ServiceVariant"("practice");

-- CreateIndex
CREATE INDEX "ServiceVariant_service_idx" ON "ServiceVariant"("service");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_idempotencyKey_key" ON "StaffInvitation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StaffInvitation_practice_idx" ON "StaffInvitation"("practice");

-- CreateIndex
CREATE INDEX "StaffInvitation_role_idx" ON "StaffInvitation"("role");

-- CreateIndex
CREATE INDEX "StaffInvitation_invitedBy_idx" ON "StaffInvitation"("invitedBy");

-- CreateIndex
CREATE INDEX "StaffInvitation_acceptedUser_idx" ON "StaffInvitation"("acceptedUser");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON "StockMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StockMovement_practice_idx" ON "StockMovement"("practice");

-- CreateIndex
CREATE INDEX "StockMovement_location_idx" ON "StockMovement"("location");

-- CreateIndex
CREATE INDEX "StockMovement_lot_idx" ON "StockMovement"("lot");

-- CreateIndex
CREATE INDEX "StockMovement_product_idx" ON "StockMovement"("product");

-- CreateIndex
CREATE INDEX "StockMovement_actor_idx" ON "StockMovement"("actor");

-- CreateIndex
CREATE INDEX "StockMovement_treatmentSession_idx" ON "StockMovement"("treatmentSession");

-- CreateIndex
CREATE INDEX "StockMovement_transactionLine_idx" ON "StockMovement"("transactionLine");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentAdministration_idempotencyKey_key" ON "TreatmentAdministration"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_practice_idx" ON "TreatmentAdministration"("practice");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_location_idx" ON "TreatmentAdministration"("location");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_client_idx" ON "TreatmentAdministration"("client");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_appointment_idx" ON "TreatmentAdministration"("appointment");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_treatmentSession_idx" ON "TreatmentAdministration"("treatmentSession");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_order_idx" ON "TreatmentAdministration"("order");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_consent_idx" ON "TreatmentAdministration"("consent");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_performer_idx" ON "TreatmentAdministration"("performer");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_supervisor_idx" ON "TreatmentAdministration"("supervisor");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_service_idx" ON "TreatmentAdministration"("service");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_room_idx" ON "TreatmentAdministration"("room");

-- CreateIndex
CREATE INDEX "TreatmentAdministration_device_idx" ON "TreatmentAdministration"("device");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlan_idempotencyKey_key" ON "TreatmentPlan"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlan_supersededBy_key" ON "TreatmentPlan"("supersededBy");

-- CreateIndex
CREATE INDEX "TreatmentPlan_practice_idx" ON "TreatmentPlan"("practice");

-- CreateIndex
CREATE INDEX "TreatmentPlan_client_idx" ON "TreatmentPlan"("client");

-- CreateIndex
CREATE INDEX "TreatmentPlan_consultation_idx" ON "TreatmentPlan"("consultation");

-- CreateIndex
CREATE INDEX "TreatmentPlan_createdBy_idx" ON "TreatmentPlan"("createdBy");

-- CreateIndex
CREATE INDEX "TreatmentPlanItem_plan_idx" ON "TreatmentPlanItem"("plan");

-- CreateIndex
CREATE INDEX "TreatmentPlanItem_service_idx" ON "TreatmentPlanItem"("service");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentSession_idempotencyKey_key" ON "TreatmentSession"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TreatmentSession_practice_idx" ON "TreatmentSession"("practice");

-- CreateIndex
CREATE INDEX "TreatmentSession_location_idx" ON "TreatmentSession"("location");

-- CreateIndex
CREATE INDEX "TreatmentSession_plan_idx" ON "TreatmentSession"("plan");

-- CreateIndex
CREATE INDEX "TreatmentSession_appointment_idx" ON "TreatmentSession"("appointment");

-- CreateIndex
CREATE INDEX "TreatmentSession_client_idx" ON "TreatmentSession"("client");

-- CreateIndex
CREATE INDEX "TreatmentSession_provider_idx" ON "TreatmentSession"("provider");

-- CreateIndex
CREATE INDEX "TreatmentSession_service_idx" ON "TreatmentSession"("service");

-- CreateIndex
CREATE INDEX "TreatmentSession_order_idx" ON "TreatmentSession"("order");

-- CreateIndex
CREATE INDEX "TreatmentSession_consent_idx" ON "TreatmentSession"("consent");

-- CreateIndex
CREATE INDEX "TreatmentSession_supervisor_idx" ON "TreatmentSession"("supervisor");

-- CreateIndex
CREATE INDEX "TreatmentSession_room_idx" ON "TreatmentSession"("room");

-- CreateIndex
CREATE INDEX "TreatmentSession_device_idx" ON "TreatmentSession"("device");

-- CreateIndex
CREATE INDEX "Vendor_practice_idx" ON "Vendor"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_requestKey_key" ON "WaitlistEntry"("requestKey");

-- CreateIndex
CREATE INDEX "WaitlistEntry_practice_idx" ON "WaitlistEntry"("practice");

-- CreateIndex
CREATE INDEX "WaitlistEntry_client_idx" ON "WaitlistEntry"("client");

-- CreateIndex
CREATE INDEX "WaitlistEntry_service_idx" ON "WaitlistEntry"("service");

-- CreateIndex
CREATE INDEX "WaitlistEntry_convertedAppointment_idx" ON "WaitlistEntry"("convertedAppointment");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookInbox_providerEventId_key" ON "WebhookInbox"("providerEventId");

-- CreateIndex
CREATE INDEX "WebhookInbox_practice_idx" ON "WebhookInbox"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetConfiguration_name_key" ON "WidgetConfiguration"("name");

-- CreateIndex
CREATE INDEX "WidgetConfiguration_practice_idx" ON "WidgetConfiguration"("practice");

-- CreateIndex
CREATE UNIQUE INDEX "_Appointment_services_AB_unique" ON "_Appointment_services"("A", "B");

-- CreateIndex
CREATE INDEX "_Appointment_services_B_index" ON "_Appointment_services"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FormTemplate_requiredForCategories_AB_unique" ON "_FormTemplate_requiredForCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_FormTemplate_requiredForCategories_B_index" ON "_FormTemplate_requiredForCategories"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_IntakeForm_requiredForServices_AB_unique" ON "_IntakeForm_requiredForServices"("A", "B");

-- CreateIndex
CREATE INDEX "_IntakeForm_requiredForServices_B_index" ON "_IntakeForm_requiredForServices"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Location_staff_AB_unique" ON "_Location_staff"("A", "B");

-- CreateIndex
CREATE INDEX "_Location_staff_B_index" ON "_Location_staff"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Location_providers_AB_unique" ON "_Location_providers"("A", "B");

-- CreateIndex
CREATE INDEX "_Location_providers_B_index" ON "_Location_providers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PracticeMembership_locations_AB_unique" ON "_PracticeMembership_locations"("A", "B");

-- CreateIndex
CREATE INDEX "_PracticeMembership_locations_B_index" ON "_PracticeMembership_locations"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_StaffInvitation_locations_AB_unique" ON "_StaffInvitation_locations"("A", "B");

-- CreateIndex
CREATE INDEX "_StaffInvitation_locations_B_index" ON "_StaffInvitation_locations"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Membership_includedServices_AB_unique" ON "_Membership_includedServices"("A", "B");

-- CreateIndex
CREATE INDEX "_Membership_includedServices_B_index" ON "_Membership_includedServices"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Service_clinicalProducts_AB_unique" ON "_Service_clinicalProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_Service_clinicalProducts_B_index" ON "_Service_clinicalProducts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Provider_specializations_AB_unique" ON "_Provider_specializations"("A", "B");

-- CreateIndex
CREATE INDEX "_Provider_specializations_B_index" ON "_Provider_specializations"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Provider_waitlistEntries_AB_unique" ON "_Provider_waitlistEntries"("A", "B");

-- CreateIndex
CREATE INDEX "_Provider_waitlistEntries_B_index" ON "_Provider_waitlistEntries"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Resource_services_AB_unique" ON "_Resource_services"("A", "B");

-- CreateIndex
CREATE INDEX "_Resource_services_B_index" ON "_Resource_services"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ServicePackage_services_AB_unique" ON "_ServicePackage_services"("A", "B");

-- CreateIndex
CREATE INDEX "_ServicePackage_services_B_index" ON "_ServicePackage_services"("B");

-- CreateIndex
CREATE INDEX "Role_practice_idx" ON "Role"("practice");

-- CreateIndex
CREATE INDEX "User_practice_idx" ON "User"("practice");

-- AddForeignKey
ALTER TABLE "AdministrationLot" ADD CONSTRAINT "AdministrationLot_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrationLot" ADD CONSTRAINT "AdministrationLot_administration_fkey" FOREIGN KEY ("administration") REFERENCES "TreatmentAdministration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrationLot" ADD CONSTRAINT "AdministrationLot_lot_fkey" FOREIGN KEY ("lot") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrationLot" ADD CONSTRAINT "AdministrationLot_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrationLot" ADD CONSTRAINT "AdministrationLot_witness_fkey" FOREIGN KEY ("witness") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_resource_fkey" FOREIGN KEY ("resource") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_room_fkey" FOREIGN KEY ("room") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_device_fkey" FOREIGN KEY ("device") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_consultation_fkey" FOREIGN KEY ("consultation") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_transaction_fkey" FOREIGN KEY ("transaction") REFERENCES "MedSpaTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_review_fkey" FOREIGN KEY ("review") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLineItem" ADD CONSTRAINT "AppointmentLineItem_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLineItem" ADD CONSTRAINT "AppointmentLineItem_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLineItem" ADD CONSTRAINT "AppointmentLineItem_staff_fkey" FOREIGN KEY ("staff") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLineItem" ADD CONSTRAINT "AppointmentLineItem_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentResourceReservation" ADD CONSTRAINT "AppointmentResourceReservation_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentResourceReservation" ADD CONSTRAINT "AppointmentResourceReservation_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentResourceReservation" ADD CONSTRAINT "AppointmentResourceReservation_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentResourceReservation" ADD CONSTRAINT "AppointmentResourceReservation_treatmentSession_fkey" FOREIGN KEY ("treatmentSession") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentResourceReservation" ADD CONSTRAINT "AppointmentResourceReservation_resource_fkey" FOREIGN KEY ("resource") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSupervisorReservation" ADD CONSTRAINT "AppointmentSupervisorReservation_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSupervisorReservation" ADD CONSTRAINT "AppointmentSupervisorReservation_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSupervisorReservation" ADD CONSTRAINT "AppointmentSupervisorReservation_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSupervisorReservation" ADD CONSTRAINT "AppointmentSupervisorReservation_supervisor_fkey" FOREIGN KEY ("supervisor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSupervisorReservation" ADD CONSTRAINT "AppointmentSupervisorReservation_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAccessEvent" ADD CONSTRAINT "AssetAccessEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAccessEvent" ADD CONSTRAINT "AssetAccessEvent_asset_fkey" FOREIGN KEY ("asset") REFERENCES "ClientAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAccessEvent" ADD CONSTRAINT "AssetAccessEvent_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakGlassEvent" ADD CONSTRAINT "BreakGlassEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakGlassEvent" ADD CONSTRAINT "BreakGlassEvent_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakGlassEvent" ADD CONSTRAINT "BreakGlassEvent_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakGlassEvent" ADD CONSTRAINT "BreakGlassEvent_reviewer_fkey" FOREIGN KEY ("reviewer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_homeLocation_fkey" FOREIGN KEY ("homeLocation") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_preferredProvider_fkey" FOREIGN KEY ("preferredProvider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_treatmentSession_fkey" FOREIGN KEY ("treatmentSession") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_incident_fkey" FOREIGN KEY ("incident") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_note_fkey" FOREIGN KEY ("note") REFERENCES "ClientNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_photoConsent_fkey" FOREIGN KEY ("photoConsent") REFERENCES "PhotoConsent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_client_fkey" FOREIGN KEY ("client") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_membership_fkey" FOREIGN KEY ("membership") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageAdjustment" ADD CONSTRAINT "ClientPackageAdjustment_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageAdjustment" ADD CONSTRAINT "ClientPackageAdjustment_clientPackage_fkey" FOREIGN KEY ("clientPackage") REFERENCES "ClientPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageAdjustment" ADD CONSTRAINT "ClientPackageAdjustment_usage_fkey" FOREIGN KEY ("usage") REFERENCES "ClientPackageUsage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageAdjustment" ADD CONSTRAINT "ClientPackageAdjustment_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_supervisor_fkey" FOREIGN KEY ("supervisor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_credential_fkey" FOREIGN KEY ("credential") REFERENCES "ProviderCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_authorization_fkey" FOREIGN KEY ("authorization") REFERENCES "ProviderAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuthorityEvent" ADD CONSTRAINT "ClinicalAuthorityEvent_treatmentSession_fkey" FOREIGN KEY ("treatmentSession") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_consultation_fkey" FOREIGN KEY ("consultation") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_plan_fkey" FOREIGN KEY ("plan") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_orderedBy_fkey" FOREIGN KEY ("orderedBy") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_authorizedPerformer_fkey" FOREIGN KEY ("authorizedPerformer") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_requiredSupervisor_fkey" FOREIGN KEY ("requiredSupervisor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrder" ADD CONSTRAINT "ClinicalOrder_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrderAction" ADD CONSTRAINT "ClinicalOrderAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrderAction" ADD CONSTRAINT "ClinicalOrderAction_order_fkey" FOREIGN KEY ("order") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalOrderAction" ADD CONSTRAINT "ClinicalOrderAction_actor_fkey" FOREIGN KEY ("actor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAction" ADD CONSTRAINT "ConsentAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAction" ADD CONSTRAINT "ConsentAction_consent_fkey" FOREIGN KEY ("consent") REFERENCES "ConsentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAction" ADD CONSTRAINT "ConsentAction_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_templateVersion_fkey" FOREIGN KEY ("templateVersion") REFERENCES "ConsentTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_presentedBy_fkey" FOREIGN KEY ("presentedBy") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "ConsentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateVersion" ADD CONSTRAINT "ConsentTemplateVersion_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateVersion" ADD CONSTRAINT "ConsentTemplateVersion_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateVersion" ADD CONSTRAINT "ConsentTemplateVersion_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "ConsentTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContraindicationDecision" ADD CONSTRAINT "ContraindicationDecision_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContraindicationDecision" ADD CONSTRAINT "ContraindicationDecision_finding_fkey" FOREIGN KEY ("finding") REFERENCES "ContraindicationFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContraindicationDecision" ADD CONSTRAINT "ContraindicationDecision_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContraindicationFinding" ADD CONSTRAINT "ContraindicationFinding_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContraindicationFinding" ADD CONSTRAINT "ContraindicationFinding_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContraindicationFinding" ADD CONSTRAINT "ContraindicationFinding_consultation_fkey" FOREIGN KEY ("consultation") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContraindicationFinding" ADD CONSTRAINT "ContraindicationFinding_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_author_fkey" FOREIGN KEY ("author") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "ClientNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_client_fkey" FOREIGN KEY ("client") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_package_fkey" FOREIGN KEY ("package") REFERENCES "ServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_clientPackage_fkey" FOREIGN KEY ("clientPackage") REFERENCES "ClientPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPoints" ADD CONSTRAINT "ClientPoints_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPoints" ADD CONSTRAINT "ClientPoints_client_fkey" FOREIGN KEY ("client") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEvent" ADD CONSTRAINT "DomainEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAction" ADD CONSTRAINT "FollowUpAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAction" ADD CONSTRAINT "FollowUpAction_task_fkey" FOREIGN KEY ("task") REFERENCES "FollowUpTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAction" ADD CONSTRAINT "FollowUpAction_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_treatmentSession_fkey" FOREIGN KEY ("treatmentSession") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "FormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_client_fkey" FOREIGN KEY ("client") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_form_fkey" FOREIGN KEY ("form") REFERENCES "IntakeForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_template_fkey" FOREIGN KEY ("template") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCard_fkey" FOREIGN KEY ("giftCard") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrder_fkey" FOREIGN KEY ("purchaseOrder") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_receipt_fkey" FOREIGN KEY ("receipt") REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_purchaseOrderLine_fkey" FOREIGN KEY ("purchaseOrderLine") REFERENCES "PurchaseOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_lot_fkey" FOREIGN KEY ("lot") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_treatmentSession_fkey" FOREIGN KEY ("treatmentSession") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_administration_fkey" FOREIGN KEY ("administration") REFERENCES "TreatmentAdministration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_suspectLot_fkey" FOREIGN KEY ("suspectLot") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_suspectDevice_fkey" FOREIGN KEY ("suspectDevice") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAction" ADD CONSTRAINT "IncidentAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAction" ADD CONSTRAINT "IncidentAction_incident_fkey" FOREIGN KEY ("incident") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAction" ADD CONSTRAINT "IncidentAction_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAction" ADD CONSTRAINT "IncidentAction_clinician_fkey" FOREIGN KEY ("clinician") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_asset_fkey" FOREIGN KEY ("asset") REFERENCES "ClientAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_incident_fkey" FOREIGN KEY ("incident") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_placedBy_fkey" FOREIGN KEY ("placedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_releasedBy_fkey" FOREIGN KEY ("releasedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeReviewAction" ADD CONSTRAINT "IntakeReviewAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeReviewAction" ADD CONSTRAINT "IntakeReviewAction_submission_fkey" FOREIGN KEY ("submission") REFERENCES "FormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeReviewAction" ADD CONSTRAINT "IntakeReviewAction_reviewer_fkey" FOREIGN KEY ("reviewer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_vendor_fkey" FOREIGN KEY ("vendor") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaImage" ADD CONSTRAINT "MedSpaImage_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransaction" ADD CONSTRAINT "MedSpaTransaction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransaction" ADD CONSTRAINT "MedSpaTransaction_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransaction" ADD CONSTRAINT "MedSpaTransaction_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransaction" ADD CONSTRAINT "MedSpaTransaction_staff_fkey" FOREIGN KEY ("staff") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransactionLineItem" ADD CONSTRAINT "MedSpaTransactionLineItem_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransactionLineItem" ADD CONSTRAINT "MedSpaTransactionLineItem_transaction_fkey" FOREIGN KEY ("transaction") REFERENCES "MedSpaTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransactionLineItem" ADD CONSTRAINT "MedSpaTransactionLineItem_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransactionLineItem" ADD CONSTRAINT "MedSpaTransactionLineItem_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedSpaTransactionLineItem" ADD CONSTRAINT "MedSpaTransactionLineItem_staff_fkey" FOREIGN KEY ("staff") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAgreement" ADD CONSTRAINT "MembershipAgreement_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAgreement" ADD CONSTRAINT "MembershipAgreement_clientMembership_fkey" FOREIGN KEY ("clientMembership") REFERENCES "ClientMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAgreement" ADD CONSTRAINT "MembershipAgreement_client_fkey" FOREIGN KEY ("client") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAgreement" ADD CONSTRAINT "MembershipAgreement_membership_fkey" FOREIGN KEY ("membership") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLedgerEntry" ADD CONSTRAINT "MembershipLedgerEntry_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLedgerEntry" ADD CONSTRAINT "MembershipLedgerEntry_clientMembership_fkey" FOREIGN KEY ("clientMembership") REFERENCES "ClientMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLedgerEntry" ADD CONSTRAINT "MembershipLedgerEntry_agreement_fkey" FOREIGN KEY ("agreement") REFERENCES "MembershipAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLedgerEntry" ADD CONSTRAINT "MembershipLedgerEntry_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_recipient_fkey" FOREIGN KEY ("recipient") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_template_fkey" FOREIGN KEY ("template") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_session_fkey" FOREIGN KEY ("session") REFERENCES "PaymentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProvider" ADD CONSTRAINT "PaymentProvider_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_provider_fkey" FOREIGN KEY ("provider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_provider_fkey" FOREIGN KEY ("provider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsAction" ADD CONSTRAINT "PatientRightsAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsAction" ADD CONSTRAINT "PatientRightsAction_request_fkey" FOREIGN KEY ("request") REFERENCES "PatientRightsRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsAction" ADD CONSTRAINT "PatientRightsAction_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsRequest" ADD CONSTRAINT "PatientRightsRequest_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsRequest" ADD CONSTRAINT "PatientRightsRequest_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsRequest" ADD CONSTRAINT "PatientRightsRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRightsRequest" ADD CONSTRAINT "PatientRightsRequest_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsent" ADD CONSTRAINT "PhotoConsent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsent" ADD CONSTRAINT "PhotoConsent_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsent" ADD CONSTRAINT "PhotoConsent_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsentAction" ADD CONSTRAINT "PhotoConsentAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsentAction" ADD CONSTRAINT "PhotoConsentAction_consent_fkey" FOREIGN KEY ("consent") REFERENCES "PhotoConsent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoConsentAction" ADD CONSTRAINT "PhotoConsentAction_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeMembership" ADD CONSTRAINT "PracticeMembership_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeMembership" ADD CONSTRAINT "PracticeMembership_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_image_fkey" FOREIGN KEY ("image") REFERENCES "MedSpaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_soldBy_fkey" FOREIGN KEY ("soldBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_photo_fkey" FOREIGN KEY ("photo") REFERENCES "MedSpaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAuthorization" ADD CONSTRAINT "ProviderAuthorization_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAuthorization" ADD CONSTRAINT "ProviderAuthorization_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAuthorization" ADD CONSTRAINT "ProviderAuthorization_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAuthorization" ADD CONSTRAINT "ProviderAuthorization_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAuthorization" ADD CONSTRAINT "ProviderAuthorization_credential_fkey" FOREIGN KEY ("credential") REFERENCES "ProviderCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAuthorization" ADD CONSTRAINT "ProviderAuthorization_requiredSupervisor_fkey" FOREIGN KEY ("requiredSupervisor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_supervisor_fkey" FOREIGN KEY ("supervisor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSchedule" ADD CONSTRAINT "ProviderSchedule_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSchedule" ADD CONSTRAINT "ProviderSchedule_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSchedule" ADD CONSTRAINT "ProviderSchedule_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendor_fkey" FOREIGN KEY ("vendor") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrder_fkey" FOREIGN KEY ("purchaseOrder") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAction" ADD CONSTRAINT "RecallAction_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAction" ADD CONSTRAINT "RecallAction_recall_fkey" FOREIGN KEY ("recall") REFERENCES "RecallCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAction" ADD CONSTRAINT "RecallAction_exposure_fkey" FOREIGN KEY ("exposure") REFERENCES "RecallExposure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAction" ADD CONSTRAINT "RecallAction_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCase" ADD CONSTRAINT "RecallCase_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCase" ADD CONSTRAINT "RecallCase_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCase" ADD CONSTRAINT "RecallCase_lot_fkey" FOREIGN KEY ("lot") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCase" ADD CONSTRAINT "RecallCase_device_fkey" FOREIGN KEY ("device") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCase" ADD CONSTRAINT "RecallCase_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallExposure" ADD CONSTRAINT "RecallExposure_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallExposure" ADD CONSTRAINT "RecallExposure_recall_fkey" FOREIGN KEY ("recall") REFERENCES "RecallCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallExposure" ADD CONSTRAINT "RecallExposure_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallExposure" ADD CONSTRAINT "RecallExposure_administration_fkey" FOREIGN KEY ("administration") REFERENCES "TreatmentAdministration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallExposure" ADD CONSTRAINT "RecallExposure_administrationLot_fkey" FOREIGN KEY ("administrationLot") REFERENCES "AdministrationLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrer_fkey" FOREIGN KEY ("referrer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referred_fkey" FOREIGN KEY ("referred") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceScheduleBlock" ADD CONSTRAINT "ResourceScheduleBlock_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceScheduleBlock" ADD CONSTRAINT "ResourceScheduleBlock_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceScheduleBlock" ADD CONSTRAINT "ResourceScheduleBlock_resource_fkey" FOREIGN KEY ("resource") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReadinessEvent" ADD CONSTRAINT "DeviceReadinessEvent_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReadinessEvent" ADD CONSTRAINT "DeviceReadinessEvent_resource_fkey" FOREIGN KEY ("resource") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReadinessEvent" ADD CONSTRAINT "DeviceReadinessEvent_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReadinessEvent" ADD CONSTRAINT "DeviceReadinessEvent_qualifiedReleaseBy_fkey" FOREIGN KEY ("qualifiedReleaseBy") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_category_fkey" FOREIGN KEY ("category") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_image_fkey" FOREIGN KEY ("image") REFERENCES "MedSpaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_parent_fkey" FOREIGN KEY ("parent") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVariant" ADD CONSTRAINT "ServiceVariant_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVariant" ADD CONSTRAINT "ServiceVariant_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_acceptedUser_fkey" FOREIGN KEY ("acceptedUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lot_fkey" FOREIGN KEY ("lot") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_treatmentSession_fkey" FOREIGN KEY ("treatmentSession") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_transactionLine_fkey" FOREIGN KEY ("transactionLine") REFERENCES "MedSpaTransactionLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_treatmentSession_fkey" FOREIGN KEY ("treatmentSession") REFERENCES "TreatmentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_order_fkey" FOREIGN KEY ("order") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_consent_fkey" FOREIGN KEY ("consent") REFERENCES "ConsentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_performer_fkey" FOREIGN KEY ("performer") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_supervisor_fkey" FOREIGN KEY ("supervisor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_room_fkey" FOREIGN KEY ("room") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentAdministration" ADD CONSTRAINT "TreatmentAdministration_device_fkey" FOREIGN KEY ("device") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_consultation_fkey" FOREIGN KEY ("consultation") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_plan_fkey" FOREIGN KEY ("plan") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_plan_fkey" FOREIGN KEY ("plan") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_provider_fkey" FOREIGN KEY ("provider") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_order_fkey" FOREIGN KEY ("order") REFERENCES "ClinicalOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_consent_fkey" FOREIGN KEY ("consent") REFERENCES "ConsentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_supervisor_fkey" FOREIGN KEY ("supervisor") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_room_fkey" FOREIGN KEY ("room") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_device_fkey" FOREIGN KEY ("device") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_client_fkey" FOREIGN KEY ("client") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_convertedAppointment_fkey" FOREIGN KEY ("convertedAppointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookInbox" ADD CONSTRAINT "WebhookInbox_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetConfiguration" ADD CONSTRAINT "WidgetConfiguration_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Appointment_services" ADD CONSTRAINT "_Appointment_services_A_fkey" FOREIGN KEY ("A") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Appointment_services" ADD CONSTRAINT "_Appointment_services_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormTemplate_requiredForCategories" ADD CONSTRAINT "_FormTemplate_requiredForCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormTemplate_requiredForCategories" ADD CONSTRAINT "_FormTemplate_requiredForCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IntakeForm_requiredForServices" ADD CONSTRAINT "_IntakeForm_requiredForServices_A_fkey" FOREIGN KEY ("A") REFERENCES "IntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IntakeForm_requiredForServices" ADD CONSTRAINT "_IntakeForm_requiredForServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Location_staff" ADD CONSTRAINT "_Location_staff_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Location_staff" ADD CONSTRAINT "_Location_staff_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Location_providers" ADD CONSTRAINT "_Location_providers_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Location_providers" ADD CONSTRAINT "_Location_providers_B_fkey" FOREIGN KEY ("B") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PracticeMembership_locations" ADD CONSTRAINT "_PracticeMembership_locations_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PracticeMembership_locations" ADD CONSTRAINT "_PracticeMembership_locations_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffInvitation_locations" ADD CONSTRAINT "_StaffInvitation_locations_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffInvitation_locations" ADD CONSTRAINT "_StaffInvitation_locations_B_fkey" FOREIGN KEY ("B") REFERENCES "StaffInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Membership_includedServices" ADD CONSTRAINT "_Membership_includedServices_A_fkey" FOREIGN KEY ("A") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Membership_includedServices" ADD CONSTRAINT "_Membership_includedServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Service_clinicalProducts" ADD CONSTRAINT "_Service_clinicalProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Service_clinicalProducts" ADD CONSTRAINT "_Service_clinicalProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Provider_specializations" ADD CONSTRAINT "_Provider_specializations_A_fkey" FOREIGN KEY ("A") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Provider_specializations" ADD CONSTRAINT "_Provider_specializations_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Provider_waitlistEntries" ADD CONSTRAINT "_Provider_waitlistEntries_A_fkey" FOREIGN KEY ("A") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Provider_waitlistEntries" ADD CONSTRAINT "_Provider_waitlistEntries_B_fkey" FOREIGN KEY ("B") REFERENCES "WaitlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Resource_services" ADD CONSTRAINT "_Resource_services_A_fkey" FOREIGN KEY ("A") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Resource_services" ADD CONSTRAINT "_Resource_services_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServicePackage_services" ADD CONSTRAINT "_ServicePackage_services_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServicePackage_services" ADD CONSTRAINT "_ServicePackage_services_B_fkey" FOREIGN KEY ("B") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Controlled provider schedules use fixed-width local wall-clock values. Fixed
-- width makes lexical comparisons equivalent to HH:MM chronological ordering.
ALTER TABLE "ProviderSchedule" ADD CONSTRAINT "ProviderSchedule_time_shape_check" CHECK (
  "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  AND "startTime" < "endTime"
);

-- Empty strings are the model defaults for no break; otherwise both values
-- must be valid, ordered, and contained by the working interval.
ALTER TABLE "ProviderSchedule" ADD CONSTRAINT "ProviderSchedule_break_shape_check" CHECK (
  ("breakStart" = '' AND "breakEnd" = '')
  OR (
    "breakStart" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "breakEnd" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "startTime" <= "breakStart"
    AND "breakStart" < "breakEnd"
    AND "breakEnd" <= "endTime"
  )
);

-- Recurring entries use a weekday and no local date. One-time/time-off entries
-- use a bounded YYYY-MM-DD local-date shape and no weekday. Calendar validity
-- remains in scheduleWorkflows.normalize; no exception-raising date cast is used.
ALTER TABLE "ProviderSchedule" ADD CONSTRAINT "ProviderSchedule_kind_shape_check" CHECK (
  (
    "type" = 'recurring'
    AND "dayOfWeek" BETWEEN 0 AND 6
    AND "localDate" = ''
  )
  OR (
    "type" IN ('one_time', 'time_off')
    AND "dayOfWeek" IS NULL
    AND "localDate" ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    AND ("type" <> 'time_off' OR "isAvailable" = false)
  )
);

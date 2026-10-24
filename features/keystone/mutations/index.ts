import { graphql } from "@keystone-6/core";
import { mergeSchemas } from "@graphql-tools/schema";
import type { GraphQLSchema } from 'graphql';
import redirectToInit from "./redirectToInit";
import { paymentMutations } from "./processPayment";
import { giftCardMutations } from "./purchaseGiftCard";
import { bookAppointment } from "./bookAppointment";
import { checkAvailability } from "../extendGraphqlSchema/checkAvailability";
import { calculateCommission } from "../extendGraphqlSchema/calculateCommission";
import { storefrontProviders, storefrontProvider } from "../extendGraphqlSchema/storefrontProviders";
import { storefrontServices } from "../extendGraphqlSchema/storefrontServices";
import { publicStorefrontSettings } from "../extendGraphqlSchema/storefrontSettings";
import { medspaPlanJourney, medspaConsultationQueue, medspaAppointmentClinicalHeader } from "../extendGraphqlSchema/medspaPlanJourney";
import { medspaAppointmentSchedule } from '../extendGraphqlSchema/appointmentSchedule';
import { medspaOperationsWorkspace } from "../extendGraphqlSchema/medspaOperationsWorkspace";
import { clientPortal } from "../extendGraphqlSchema/clientPortal";
import { runMedSpaOnboarding } from "./runMedSpaOnboarding";
import { completeAppointmentCheckout } from "./completeAppointmentCheckout";
import { processAppointmentDeposit, transitionAppointment } from "./appointmentWorkflows";
import { redeemClientPackage, reverseClientPackageUsage } from "./packageWorkflows";
import { joinWaitlist, transitionWaitlistEntry } from "./waitlistWorkflows";
import { setProviderScheduleAvailability, upsertProviderSchedule } from "./scheduleWorkflows";
import { payoutCommissions } from "./commissionWorkflows";
import { adjustMedSpaInventory } from "./inventoryWorkflows";
import { setResourceAvailability } from "./resourceWorkflows";
import { configureProviderAuthorization, publishConsentTemplate, registerProviderCredential, transitionProviderAuthority } from "./authorityPackWorkflows";
import { approveTreatmentPlan, decideContraindication, issueClinicalOrder, prepareTreatmentSession, recordConsultation, recordContraindicationFinding, recordTreatmentAdministration, signTreatmentConsent, startTreatmentSession } from "./clinicalWorkflows";
import { appendSignedClinicalNote, transitionClinicalOrder, withdrawTreatmentConsent } from "./clinicalRecordActions";
import { authorizeClinicalAssetAccess, createClinicalAssetIntent, grantPhotoConsent, markClinicalAssetReady, releaseClinicalAsset, tombstoneClinicalAsset, withdrawPhotoConsent } from "./clinicalAssetWorkflows";
import { appendFollowUpAction, scheduleFollowUp, submitFollowUpResponse } from "./followUpWorkflows";
import { reviewIntake, submitIntake } from "./intakeWorkflows";
import { dispositionInventoryLot, receivePurchaseOrder, returnRetailLot } from "./inventoryCustodyWorkflows";
import { acceptMembershipAgreement, appendPatientRightsAction, openBreakGlass, placeLegalHold, publishRetentionPolicy, releaseLegalHold, requestPatientRights, transitionMembership } from "./governanceWorkflows";
import { appendIncidentAction, appendRecallAction, openRecallCase, reportIncident, transitionDeviceReadiness } from "./safetyWorkflows";
import { scheduleAppointmentResources } from "./resourceReservationWorkflows";
import { acceptStaffInvitation, createProviderProfile, inviteStaff, upsertAccessRole } from "./staffAccessWorkflows";
import { publishStorefrontSettings } from "./storefrontSettings";
import { registerCustomer } from "./registerCustomer";
import { upsertResource } from "./resourceCatalogWorkflows";
import { updateProviderProfile, upsertLocation } from "./practiceAdminWorkflows";
import { medspaClientDirectory, medspaClientRecord, medspaMessageLog, medspaReviewBoard, medspaWaitlistBoard, moderateReview, updateClientProfile } from "./clientRelationshipWorkflows";
import { enrollClientMembership, issueGiftCard, sellClientPackage, upsertMembershipPlan, upsertServicePackage } from "./benefitCatalogWorkflows";
import { createPurchaseOrder, transitionPurchaseOrder, upsertProduct } from "./procurementWorkflows";
import { upsertFormTemplate, upsertIntakeForm } from "./formWorkflows";
import { cancelGuestAppointment, clientIntakeForms, requestWaitlistSpot, storefrontAppointment, storefrontReviews, submitAppointmentReview } from "./storefrontClientWorkflows";

const gql = String.raw;

export const extendGraphqlSchema = graphql.extend((base) => ({
  query: {
    redirectToInit: graphql.field({
      type: graphql.Boolean,
      resolve: redirectToInit,
    }),
    checkAvailability,
    calculateCommission,
    storefrontProviders,
    storefrontProvider,
    storefrontServices,
    publicStorefrontSettings,
    medspaOperationsWorkspace,
    medspaPlanJourney,
    medspaConsultationQueue,
    medspaAppointmentSchedule,
    medspaAppointmentClinicalHeader,
    clientPortal,
    clientIntakeForms,
    storefrontReviews,
    storefrontAppointment,
    medspaClientDirectory,
    medspaClientRecord,
    medspaWaitlistBoard,
    medspaMessageLog,
    medspaReviewBoard,
  },
  mutation: {
    registerCustomer,
    bookAppointment,
    processPayment: paymentMutations.processPayment,
    confirmPayment: paymentMutations.confirmPayment,
    refundPayment: paymentMutations.refundPayment,
    reverseAppointmentSettlement: paymentMutations.reverseAppointmentSettlement,
    distributeTip: paymentMutations.distributeTip,
    purchaseGiftCard: giftCardMutations.purchaseGiftCard,
    confirmGiftCardPurchase: giftCardMutations.confirmGiftCardPurchase,
    applyGiftCardBalance: giftCardMutations.applyGiftCardBalance,
    transitionAppointment,
    processAppointmentDeposit,
    redeemClientPackage,
    reverseClientPackageUsage,
    joinWaitlist,
    transitionWaitlistEntry,
    upsertProviderSchedule,
    setProviderScheduleAvailability,
    payoutCommissions,
    adjustMedSpaInventory,
    setResourceAvailability,
    registerProviderCredential,
    configureProviderAuthorization,
    transitionProviderAuthority,
    publishConsentTemplate,
    submitIntake,
    reviewIntake,
    scheduleFollowUp,
    appendFollowUpAction,
    submitFollowUpResponse,
    recordConsultation,
    appendSignedClinicalNote,
    recordContraindicationFinding,
    decideContraindication,
    issueClinicalOrder,
    transitionClinicalOrder,
    signTreatmentConsent,
    withdrawTreatmentConsent,
    approveTreatmentPlan,
    prepareTreatmentSession,
    startTreatmentSession,
    recordTreatmentAdministration,
    grantPhotoConsent,
    withdrawPhotoConsent,
    createClinicalAssetIntent,
    markClinicalAssetReady,
    authorizeClinicalAssetAccess,
    releaseClinicalAsset,
    tombstoneClinicalAsset,
    reportIncident,
    appendIncidentAction,
    openRecallCase,
    appendRecallAction,
    transitionDeviceReadiness,
    scheduleAppointmentResources,
    receivePurchaseOrder,
    dispositionInventoryLot,
    returnRetailLot,
    acceptMembershipAgreement,
    transitionMembership,
    requestPatientRights,
    appendPatientRightsAction,
    openBreakGlass,
    placeLegalHold,
    releaseLegalHold,
    publishRetentionPolicy,
    runMedSpaOnboarding,
    upsertAccessRole,
    inviteStaff,
    acceptStaffInvitation,
    createProviderProfile,
    publishStorefrontSettings,
    completeAppointmentCheckout,
    submitAppointmentReview,
    requestWaitlistSpot,
    cancelGuestAppointment,
    upsertResource,
    updateProviderProfile,
    upsertLocation,
    updateClientProfile,
    moderateReview,
    upsertMembershipPlan,
    upsertServicePackage,
    enrollClientMembership,
    sellClientPackage,
    issueGiftCard,
    upsertProduct,
    // Keystone already generates createPurchaseOrder for the list.
    draftPurchaseOrder: createPurchaseOrder,
    transitionPurchaseOrder,
    upsertIntakeForm,
    upsertFormTemplate,
  },
}));

import { GRAPHQL_MAX_TAKE } from '../security/graphql-budget'
import { resolveTenantPractice } from './tenantAccess'
import { AdministrationLot } from './AdministrationLot'
import { Appointment } from './Appointment'
import { AppointmentLineItem } from './AppointmentLineItem'
import { AppointmentSupervisorReservation } from './AppointmentSupervisorReservation'
import { AppointmentResourceReservation } from './AppointmentResourceReservation'
import { AssetAccessEvent } from './AssetAccessEvent'
import { AuditEvent } from './AuditEvent'
import { BreakGlassEvent } from './BreakGlassEvent'
import { Client } from './Client'
import { ClientAsset } from './ClientAsset'
import { ClientMembership } from './ClientMembership'
import { ClientPackageAdjustment } from './ClientPackageAdjustment'
import { ClinicalAuthorityEvent } from './ClinicalAuthorityEvent'
import { ClinicalOrder } from './ClinicalOrder'
import { ClinicalOrderAction } from './ClinicalOrderAction'
import { ConsentAction } from './ConsentAction'
import { ConsentRecord } from './ConsentRecord'
import { ConsentTemplateVersion } from './ConsentTemplateVersion'
import { ContraindicationDecision } from './ContraindicationDecision'
import { ContraindicationFinding } from './ContraindicationFinding'
import { ClientNote } from './ClientNote'
import { ClientPackage } from './ClientPackage'
import { ClientPackageUsage } from './ClientPackageUsage'
import { ClientPoints } from './ClientPoints'
import { Commission } from './Commission'
import { Consultation } from './Consultation'
import { DomainEvent } from './DomainEvent'
import { FollowUpAction } from './FollowUpAction'
import { FollowUpTask } from './FollowUpTask'
import { FormSubmission } from './FormSubmission'
import { FormTemplate } from './FormTemplate'
import { GiftCard } from './GiftCard'
import { GiftCardTransaction } from './GiftCardTransaction'
import { GoodsReceipt } from './GoodsReceipt'
import { GoodsReceiptLine } from './GoodsReceiptLine'
import { Incident } from './Incident'
import { IncidentAction } from './IncidentAction'
import { LegalHold } from './LegalHold'
import { IntakeForm } from './IntakeForm'
import { IntakeReviewAction } from './IntakeReviewAction'
import { InventoryLot } from './InventoryLot'
import { InventoryMovement } from './InventoryMovement'
import { Location } from './Location'
import { LoyaltyProgram } from './LoyaltyProgram'
import { MedSpaImage } from './MedSpaImage'
import { MedSpaTransaction } from './MedSpaTransaction'
import { MedSpaTransactionLineItem } from './MedSpaTransactionLineItem'
import { Membership } from './Membership'
import { MembershipAgreement } from './MembershipAgreement'
import { MembershipLedgerEntry } from './MembershipLedgerEntry'
import { MessageLog } from './MessageLog'
import { MessageTemplate } from './MessageTemplate'
import { OutboxEvent } from './OutboxEvent'
import { Payment } from './Payment'
import { PaymentProvider } from './PaymentProvider'
import { PaymentSession } from './PaymentSession'
import { PaymentWebhookEvent } from './PaymentWebhookEvent'
import { PatientRightsAction } from './PatientRightsAction'
import { PatientRightsRequest } from './PatientRightsRequest'
import { PhotoConsent } from './PhotoConsent'
import { PhotoConsentAction } from './PhotoConsentAction'
import { Practice } from './Practice'
import { PracticeMembership } from './PracticeMembership'
import { Product } from './Product'
import { ProductSale } from './ProductSale'
import { Provider } from './Provider'
import { ProviderAuthorization } from './ProviderAuthorization'
import { ProviderCredential } from './ProviderCredential'
import { ProviderSchedule } from './ProviderSchedule'
import { PurchaseOrder } from './PurchaseOrder'
import { PurchaseOrderLine } from './PurchaseOrderLine'
import { RecallAction } from './RecallAction'
import { RecallCase } from './RecallCase'
import { RecallExposure } from './RecallExposure'
import { Referral } from './Referral'
import { Refund } from './Refund'
import { RetentionPolicy } from './RetentionPolicy'
import { Resource } from './Resource'
import { ResourceScheduleBlock } from './ResourceScheduleBlock'
import { DeviceReadinessEvent } from './DeviceReadinessEvent'
import { Review } from './Review'
import { Role } from './Role'
import { Service } from './Service'
import { ServiceCategory } from './ServiceCategory'
import { ServicePackage } from './ServicePackage'
import { ServiceVariant } from './ServiceVariant'
import { StaffInvitation } from './StaffInvitation'
import { StockMovement } from './StockMovement'
import { StorefrontSetting } from './StorefrontSetting'
import { TreatmentAdministration } from './TreatmentAdministration'
import { TreatmentPlan } from './TreatmentPlan'
import { TreatmentPlanItem } from './TreatmentPlanItem'
import { TreatmentSession } from './TreatmentSession'
import { User } from './User'
import { Vendor } from './Vendor'
import { WaitlistEntry } from './WaitlistEntry'
import { WebhookInbox } from './WebhookInbox'
import { WidgetConfiguration } from './WidgetConfiguration'

export const models = {
  AdministrationLot,
  Appointment,
  AppointmentLineItem,
  AppointmentResourceReservation,
  AppointmentSupervisorReservation,
  AssetAccessEvent,
  AuditEvent,
  BreakGlassEvent,
  Client,
  ClientAsset,
  ClientMembership,
  ClientPackageAdjustment,
  ClinicalAuthorityEvent,
  ClinicalOrder,
  ClinicalOrderAction,
  ConsentAction,
  ConsentRecord,
  ConsentTemplateVersion,
  ContraindicationDecision,
  ContraindicationFinding,
  ClientNote,
  ClientPackage,
  ClientPackageUsage,
  ClientPoints,
  Commission,
  Consultation,
  DomainEvent,
  FollowUpAction,
  FollowUpTask,
  FormSubmission,
  FormTemplate,
  GiftCard,
  GiftCardTransaction,
  GoodsReceipt,
  GoodsReceiptLine,
  Incident,
  IncidentAction,
  LegalHold,
  IntakeForm,
  IntakeReviewAction,
  InventoryLot,
  InventoryMovement,
  Location,
  LoyaltyProgram,
  MedSpaImage,
  MedSpaTransaction,
  MedSpaTransactionLineItem,
  Membership,
  MembershipAgreement,
  MembershipLedgerEntry,
  MessageLog,
  MessageTemplate,
  OutboxEvent,
  Payment,
  PaymentProvider,
  PaymentSession,
  PaymentWebhookEvent,
  PatientRightsAction,
  PatientRightsRequest,
  PhotoConsent,
  PhotoConsentAction,
  Practice,
  PracticeMembership,
  Product,
  ProductSale,
  Provider,
  ProviderAuthorization,
  ProviderCredential,
  ProviderSchedule,
  PurchaseOrder,
  PurchaseOrderLine,
  RecallAction,
  RecallCase,
  RecallExposure,
  Referral,
  Refund,
  RetentionPolicy,
  Resource,
  ResourceScheduleBlock,
  DeviceReadinessEvent,
  Review,
  Role,
  Service,
  ServiceCategory,
  ServicePackage,
  ServiceVariant,
  StaffInvitation,
  StockMovement,
  StorefrontSetting,
  TreatmentAdministration,
  TreatmentPlan,
  TreatmentPlanItem,
  TreatmentSession,
  User,
  Vendor,
  WaitlistEntry,
  WebhookInbox,
  WidgetConfiguration,
}

// Native AdminMeta must not advertise raw lifecycle writes that GraphQL denies.
// Reuse each model's actual operation access, including current-session checks;
// this changes presentation only and never grants mutation access.
for (const [listKey, model] of Object.entries(models)) {
  // Pinned native maxTake also caps relationship queries and supplies a bounded
  // default; do not emulate pagination by bypassing Keystone's query API.
  model.graphql = { ...model.graphql, maxTake: Math.min(model.graphql?.maxTake ?? GRAPHQL_MAX_TAKE, GRAPHQL_MAX_TAKE) };
  const access = model.access;
  if (!access || typeof access === 'function' || !access.operation) continue;
  const create = typeof access.operation === 'function' ? access.operation : access.operation.create;
  const remove = typeof access.operation === 'function' ? access.operation : access.operation.delete;
  const update = typeof access.operation === 'function' ? access.operation : access.operation.update;
  const practice = model.fields.practice;
  if (practice) {
    model.fields.practice = (data) => {
      const field = practice(data);
      return { ...field, ui: { ...field.ui, createView: { ...field.ui?.createView, fieldMode: 'hidden' }, itemView: { ...field.ui?.itemView, fieldMode: 'read' } } };
    };
    const resolveInput = model.hooks?.resolveInput;
    model.hooks = { ...model.hooks, resolveInput: async (args) => {
      let resolvedData = args.resolvedData;
      if (typeof resolveInput === 'function') resolvedData = await resolveInput(args);
      else if (args.operation === 'create' && resolveInput?.create) resolvedData = await resolveInput.create({ ...args, operation: 'create' });
      else if (args.operation === 'update' && resolveInput?.update) resolvedData = await resolveInput.update({ ...args, operation: 'update' });
      return resolveTenantPractice({ ...args, resolvedData });
    } };
  }
  const original = model.ui;
  model.ui = {
    ...original,
    itemView: { ...original?.itemView, defaultFieldMode: async (args) => {
      const originalMode = original?.itemView?.defaultFieldMode;
      const mode = typeof originalMode === 'function' ? await originalMode(args) : originalMode || 'edit';
      if (mode !== 'edit') return mode;
      return (typeof update === 'function' ? await update({ ...args, listKey, operation: 'update' }) : update !== false) ? 'edit' : 'read';
    } },
    hideCreate: async (args) => {
      if (typeof original?.hideCreate === 'function' ? await original.hideCreate(args) : original?.hideCreate) return true;
      return typeof create === 'function' ? !(await create({ ...args, listKey, operation: 'create' })) : create === false;
    },
    hideDelete: async (args) => {
      if (typeof original?.hideDelete === 'function' ? await original.hideDelete(args) : original?.hideDelete) return true;
      return typeof remove === 'function' ? !(await remove({ ...args, listKey, operation: 'delete' })) : remove === false;
    },
  };
}

export default models

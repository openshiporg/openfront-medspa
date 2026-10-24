export type CatalogStatus = 'all' | 'active' | 'inactive' | 'online';

export interface CatalogVariant { id: string; name: string; price: number | null; duration: number | null; staffLevel: string | null; displayOrder: number | null }

export interface CatalogTreatment {
  id: string;
  name: string;
  description: string | null;
  baseDuration: number | null;
  price: number | null;
  depositRequired: boolean | null;
  depositAmount: number | null;
  cleanupBufferMinutes: number | null;
  status: 'active' | 'inactive' | null;
  isPublic: boolean | null;
  staffAuthorizationRequired: boolean | null;
  requiresConsultation: boolean | null;
  requiresIntakeReview: boolean | null;
  requiresLotTraceability: boolean | null;
  category: { id: string; name: string } | null;
  requiredResources: Array<{ id: string; name: string; type: string | null }>;
  specialists: Array<{ id: string; user: { name: string } | null }>;
  variants: CatalogVariant[];
}

export interface CatalogCategory { id: string; name: string; slug: string | null; displayOrder: number | null; isVisible: boolean | null; servicesCount: number }

export interface CatalogOptions {
  categories: CatalogCategory[];
  resources: Array<{ id: string; name: string; type: string | null }>;
  providers: Array<{ id: string; user: { name: string } | null }>;
}

export interface CatalogData {
  availability: 'loaded' | 'unavailable';
  treatments: CatalogTreatment[];
  counts: { all: number; active: number; inactive: number; online: number };
  options: CatalogOptions;
}

export type CatalogSaveState = { status: 'idle' | 'saved' | 'error'; message: string; id?: string | null };

export const CLINICAL_FLAGS = [
  { key: 'staffAuthorizationRequired', label: 'Provider authority' },
  { key: 'requiresConsultation', label: 'Consultation first' },
  { key: 'requiresIntakeReview', label: 'Intake review' },
  { key: 'requiresLotTraceability', label: 'Lot tracking' },
] as const;

import { Building2, CircleCheck, Package } from 'lucide-react';

export interface MedSpaTemplate {
  name: string;
  description: string;
  icon: React.ReactNode;
  displayNames: Record<'medspaInfo' | 'categories' | 'resources' | 'services' | 'staff' | 'clients' | 'intakeForms' | 'memberships' | 'retail' | 'appointments', string[]>;
}

const boundedDisplay: MedSpaTemplate['displayNames'] = {
  medspaInfo: ['Bounded Med Spa Demo — configuration required'],
  categories: ['Consultations', 'Medical Aesthetics'],
  resources: ['Consultation Room', 'Treatment Room', 'Unconfigured Energy Device'],
  services: ['Medical Aesthetics Consultation', 'Inactive injectable placeholder', 'Inactive energy-device placeholder'],
  staff: ['No staff or clinical authority is fabricated'],
  clients: ['No patient records are fabricated'],
  intakeForms: ['Medical History Intake v1 (not treatment consent)'],
  memberships: ['No consumer contracts are enabled'],
  retail: ['No tracked inventory is received by onboarding'],
  appointments: ['No appointment or treatment evidence is fabricated'],
};

export const MEDSPA_TEMPLATES: Record<'full' | 'minimal' | 'custom', MedSpaTemplate> = {
  full: { name: 'Bounded Med Spa Setup', description: 'Create fail-closed operational placeholders without inventing clinical, legal, provider, patient, payment, or inventory evidence.', icon: <Building2 className="h-5 w-5" />, displayNames: boundedDisplay },
  minimal: { name: 'Essential Fail-Closed Setup', description: 'Create the same bounded foundation; medical activation still requires approved authority and policy packs.', icon: <Package className="h-5 w-5" />, displayNames: boundedDisplay },
  custom: { name: 'Custom Bounded Setup', description: 'Customize non-regulated setup data while preserving empty appointments and controlled authority, consent, asset, and lot workflows.', icon: <CircleCheck className="h-5 w-5" />, displayNames: boundedDisplay },
};

export interface SectionDefinition { id: number; type: string; label: string; getItemsFn: (template: 'full' | 'minimal' | 'custom') => string[] }
const definitions: Array<[string, string]> = [
  ['medspaInfo', 'Med Spa Location'], ['categories', 'Service Categories'], ['resources', 'Rooms & Equipment'], ['services', 'Services'], ['staff', 'Staff & Authority'], ['clients', 'Patient Records'], ['intakeForms', 'Intake (Not Consent)'], ['memberships', 'Consumer Contracts'], ['retail', 'Inventory & Messages'], ['appointments', 'Appointment Evidence'],
];
export const SECTION_DEFINITIONS: SectionDefinition[] = definitions.map(([type, label], index) => ({ id: index + 1, type, label, getItemsFn: template => MEDSPA_TEMPLATES[template].displayNames[type as keyof MedSpaTemplate['displayNames']] }));
export const STORE_TEMPLATES = MEDSPA_TEMPLATES;

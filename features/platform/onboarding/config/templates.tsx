import { Building2, CircleCheck, Package } from 'lucide-react';

export interface MedSpaTemplate {
  name: string;
  description: string;
  icon: React.ReactNode;
  displayNames: Record<'medspaInfo' | 'categories' | 'resources' | 'services' | 'staff' | 'intakeForms' | 'retail', string[]>;
}

const sampleDisplay: MedSpaTemplate['displayNames'] = {
  medspaInfo: ['Juniper Vale Med Spa'],
  categories: ['Consultations', 'Facials & peels', 'Injectables', 'Light & skin renewal'],
  resources: ['Consultation room', 'Treatment room', 'Light therapy suite'],
  services: ['New client consultation', 'Injectables consultation', 'Signature hydrating facial', 'Glow chemical peel', 'Dermaplaning', 'LED light therapy'],
  staff: ['Maya Ortiz', 'Lena Park'],
  intakeForms: ['Medical history', 'Medical history acknowledgement'],
  retail: ['Appointment reminder'],
};

export const MEDSPA_TEMPLATES: Record<'full' | 'minimal' | 'custom', MedSpaTemplate> = {
  full: { name: 'Sample med spa', description: 'Treatments, rooms, two providers and weekly hours. Published and bookable.', icon: <Building2 className="h-5 w-5" />, displayNames: sampleDisplay },
  minimal: { name: 'Start small', description: 'Your location, one consultation and one provider. Published.', icon: <Package className="h-5 w-5" />, displayNames: sampleDisplay },
  custom: { name: 'Custom', description: 'Edit the setup data before it is created.', icon: <CircleCheck className="h-5 w-5" />, displayNames: sampleDisplay },
};

export interface SectionDefinition { id: number; type: string; label: string; getItemsFn: (template: 'full' | 'minimal' | 'custom') => string[] }
const definitions: Array<[keyof MedSpaTemplate['displayNames'], string]> = [
  ['medspaInfo', 'Practice & location'], ['categories', 'Categories'], ['resources', 'Rooms'], ['services', 'Treatments'], ['staff', 'Providers & hours'], ['intakeForms', 'Intake forms'], ['retail', 'Messages'],
];
export const SECTION_DEFINITIONS: SectionDefinition[] = definitions.map(([type, label], index) => ({ id: index + 1, type, label, getItemsFn: template => MEDSPA_TEMPLATES[template].displayNames[type] }));
export const STORE_TEMPLATES = MEDSPA_TEMPLATES;

import type { Option } from '@/features/platform/forms/types';

export const REQUEST_TYPES: Option[] = [
  { value: 'access', label: 'Access to records' }, { value: 'export', label: 'Export records' }, { value: 'amendment', label: 'Amend records' },
  { value: 'restriction', label: 'Restrict use' }, { value: 'disclosure_accounting', label: 'Disclosure accounting' },
  { value: 'representative_update', label: 'Representative update' }, { value: 'deletion_review', label: 'Deletion review' },
];

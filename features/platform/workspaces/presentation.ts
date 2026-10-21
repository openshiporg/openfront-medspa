import type { WorkspaceSection } from './actions/workspaces';

export const workspaceTitles: Record<WorkspaceSection, string> = {
  clients: 'Clients', catalog: 'Services & catalog', benefits: 'Memberships & packages', inventory: 'Inventory & custody',
  engagement: 'Waitlist & communications', administration: 'Staff & locations', reports: 'Reports', integrations: 'Integrations & delivery',
};
const statusLabels: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', pending: 'Pending', paused: 'Paused', cancelled: 'Cancelled', expired: 'Expired',
  suspended: 'Suspended', revoked: 'Revoked', verified: 'Verified', unverified: 'Unverified', submitted: 'Submitted',
  completed: 'Completed', partially_refunded: 'Partially refunded', refunded: 'Refunded', 'fully-used': 'Fully used',
  available: 'Available', depleted: 'Depleted', quarantined: 'Quarantined', quarantine: 'Quarantined', recalled: 'Recalled', destroyed: 'Destroyed',
  installed: 'Installed', installed_default: 'Installed (default)', not_installed: 'Not installed', notified: 'Notified',
  acceptance_testing: 'Acceptance testing', maintenance_due: 'Maintenance due', incident_lockout: 'Incident lockout', recall_quarantine: 'Recall quarantine',
  ready: 'Ready', in_service: 'In service', out_of_service: 'Out of service', retired: 'Retired',
  'Care relationship': 'Care relationship',
};
export function workspaceStatus(value: string): string { return statusLabels[value] || 'Status unavailable'; }
export function workspaceMetricUnit(section: WorkspaceSection, id: string): string {
  if (section === 'clients') return 'visits';
  if (section === 'catalog') return 'required resources';
  if (id.startsWith('product:')) return 'units on hand across all locations';
  if (id.startsWith('lot:')) return 'units remaining in this lot';
  return 'items (scope unavailable)';
}

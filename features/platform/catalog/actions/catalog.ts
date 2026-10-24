'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { CatalogData, CatalogOptions, CatalogSaveState, CatalogTreatment } from '../types';

const TREATMENT_FIELDS = `
  id name description baseDuration price depositRequired depositAmount cleanupBufferMinutes status isPublic
  staffAuthorizationRequired requiresConsultation requiresIntakeReview requiresLotTraceability
  category { id name }
  requiredResources(orderBy: { name: asc }) { id name type }
  specialists(take: 50) { id user { name } }
  variants(orderBy: { displayOrder: asc }) { id name price duration staffLevel displayOrder }
`;

const OPTIONS_QUERY = `
  categories: serviceCategories(orderBy: { displayOrder: asc }, take: 200) { id name slug displayOrder isVisible servicesCount }
  resources(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 200) { id name type }
  providers(where: { status: { equals: active } }, take: 200) { id user { name } }
`;

const emptyOptions: CatalogOptions = { categories: [], resources: [], providers: [] };

function whereFor(status: string, category: string, search: string) {
  const and: Record<string, unknown>[] = [];
  if (status === 'active') and.push({ status: { equals: 'active' } });
  if (status === 'inactive') and.push({ status: { equals: 'inactive' } });
  if (status === 'online') and.push({ status: { equals: 'active' } }, { isPublic: { equals: true } });
  if (category === 'none') and.push({ category: null });
  else if (category) and.push({ category: { id: { equals: category } } });
  if (search) and.push({ name: { contains: search, mode: 'insensitive' } });
  return and.length ? { AND: and } : {};
}

export async function getCatalog(params: { status: string; category: string; search: string }): Promise<CatalogData> {
  const response = await keystoneClient<{ services: CatalogTreatment[]; all: number; active: number; inactive: number; online: number } & CatalogOptions>(`
    query PlatformCatalog($where: ServiceWhereInput!) {
      services(where: $where, orderBy: { name: asc }, take: 200) { ${TREATMENT_FIELDS} }
      all: servicesCount
      active: servicesCount(where: { status: { equals: active } })
      inactive: servicesCount(where: { status: { equals: inactive } })
      online: servicesCount(where: { status: { equals: active }, isPublic: { equals: true } })
      ${OPTIONS_QUERY}
    }
  `, { where: whereFor(params.status, params.category, params.search) }, { cache: 'no-store' });
  if (!response.success) return { availability: 'unavailable', treatments: [], counts: { all: 0, active: 0, inactive: 0, online: 0 }, options: emptyOptions };
  const data = response.data;
  return {
    availability: 'loaded',
    treatments: data.services || [],
    counts: { all: data.all || 0, active: data.active || 0, inactive: data.inactive || 0, online: data.online || 0 },
    options: { categories: data.categories || [], resources: data.resources || [], providers: data.providers || [] },
  };
}

export async function getTreatment(id: string): Promise<{ status: 'loaded'; treatment: CatalogTreatment; upcoming: number; completed: number; options: CatalogOptions } | { status: 'missing' | 'unavailable' }> {
  const now = new Date().toISOString();
  const response = await keystoneClient<{ service: CatalogTreatment | null; upcoming: number; completed: number } & CatalogOptions>(`
    query PlatformTreatment($id: ID!, $now: DateTime!) {
      service(where: { id: $id }) { ${TREATMENT_FIELDS} }
      upcoming: appointmentsCount(where: { services: { some: { id: { equals: $id } } }, startTime: { gte: $now }, status: { in: [pending, confirmed] } })
      completed: appointmentsCount(where: { services: { some: { id: { equals: $id } } }, status: { equals: completed } })
      ${OPTIONS_QUERY}
    }
  `, { id, now }, { cache: 'no-store' });
  if (!response.success) return { status: 'unavailable' };
  if (!response.data.service) return { status: 'missing' };
  const data = response.data;
  return { status: 'loaded', treatment: data.service!, upcoming: data.upcoming || 0, completed: data.completed || 0, options: { categories: data.categories || [], resources: data.resources || [], providers: data.providers || [] } };
}

function cents(value: FormDataEntryValue | null) {
  const amount = Number(value?.toString().trim() || '0');
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
}

function wholeNumber(value: FormDataEntryValue | null, fallback = 0) {
  const text = value?.toString().trim();
  if (!text) return fallback;
  const number = Number(text);
  return Number.isInteger(number) ? number : NaN;
}

function firstError(response: { success: false; error: string; errors?: Array<{ message?: string }> }) {
  const message = response.errors?.find((error) => error.message)?.message;
  return message && message.length < 300 ? message.replace(/^You provided invalid data for this operation\.\s*/i, '') : 'Not saved. Reload and try again.';
}

function revalidateCatalog(id?: string | null) {
  revalidatePath('/dashboard/platform/catalog');
  if (id) revalidatePath(`/dashboard/platform/catalog/${id}`);
  revalidatePath('/services');
}

export async function saveTreatment(_state: CatalogSaveState, formData: FormData): Promise<CatalogSaveState> {
  const id = formData.get('id')?.toString() || null;
  const name = formData.get('name')?.toString().trim() || '';
  const price = cents(formData.get('price'));
  const depositRequired = formData.get('depositRequired') === 'on';
  const depositAmount = depositRequired ? cents(formData.get('depositAmount')) : 0;
  const baseDuration = wholeNumber(formData.get('baseDuration'), NaN);
  const cleanupBufferMinutes = wholeNumber(formData.get('cleanupBufferMinutes'), 0);
  const status = formData.get('status')?.toString() === 'inactive' ? 'inactive' : 'active';
  const isPublic = formData.get('isPublic') === 'on';
  const categoryId = formData.get('categoryId')?.toString() || '';
  const flags = {
    staffAuthorizationRequired: formData.get('staffAuthorizationRequired') === 'on',
    requiresConsultation: formData.get('requiresConsultation') === 'on',
    requiresIntakeReview: formData.get('requiresIntakeReview') === 'on',
    requiresLotTraceability: formData.get('requiresLotTraceability') === 'on',
  };

  if (!name || name.length > 120) return { status: 'error', message: 'Enter a name up to 120 characters' };
  if (!Number.isInteger(baseDuration) || baseDuration < 5 || baseDuration > 600) return { status: 'error', message: 'Duration must be 5 to 600 minutes' };
  if (!Number.isFinite(price)) return { status: 'error', message: 'Price must be a positive amount' };
  if (!Number.isFinite(depositAmount) || depositAmount > price) return { status: 'error', message: 'Deposit must be between zero and the price' };
  if (!Number.isInteger(cleanupBufferMinutes) || cleanupBufferMinutes < 0 || cleanupBufferMinutes > 240) return { status: 'error', message: 'Cleanup must be 0 to 240 minutes' };
  if (isPublic && status !== 'active') return { status: 'error', message: "An inactive treatment can't be online" };
  if (isPublic && Object.values(flags).some(Boolean)) return { status: 'error', message: "Treatments that need clinical authority can't be booked online" };

  const resourceIds = formData.getAll('resourceIds').map(String).filter(Boolean);
  const providerIds = formData.getAll('providerIds').map(String).filter(Boolean);
  const data: Record<string, unknown> = {
    name,
    description: formData.get('description')?.toString().trim() || '',
    baseDuration,
    price,
    basePrice: price,
    depositRequired,
    depositAmount,
    cleanupBufferMinutes,
    status,
    isPublic,
    ...flags,
    category: categoryId ? { connect: { id: categoryId } } : id ? { disconnect: true } : undefined,
    requiredResources: id ? { set: resourceIds.map((value) => ({ id: value })) } : { connect: resourceIds.map((value) => ({ id: value })) },
    specialists: id ? { set: providerIds.map((value) => ({ id: value })) } : { connect: providerIds.map((value) => ({ id: value })) },
  };

  const response = id
    ? await keystoneClient<{ updateService: { id: string } | null }>(`mutation UpdateTreatment($id: ID!, $data: ServiceUpdateInput!) { updateService(where: { id: $id }, data: $data) { id } }`, { id, data })
    : await keystoneClient<{ createService: { id: string } | null }>(`mutation CreateTreatment($data: ServiceCreateInput!) { createService(data: $data) { id } }`, { data });
  if (!response.success) return { status: 'error', message: firstError(response) };
  const savedId = id || (response.data as { createService: { id: string } | null }).createService?.id || null;
  revalidateCatalog(savedId);
  return { status: 'saved', message: id ? 'Saved' : 'Treatment added', id: savedId };
}

export async function setTreatmentStatus(input: { id: string; status: 'active' | 'inactive' }): Promise<{ success: boolean; error?: string }> {
  const data = input.status === 'inactive' ? { status: 'inactive', isPublic: false } : { status: 'active' };
  const response = await keystoneClient(`mutation SetTreatmentStatus($id: ID!, $data: ServiceUpdateInput!) { updateService(where: { id: $id }, data: $data) { id } }`, { id: input.id, data });
  if (!response.success) return { success: false, error: firstError(response) };
  revalidateCatalog(input.id);
  return { success: true };
}

export async function saveVariant(_state: CatalogSaveState, formData: FormData): Promise<CatalogSaveState> {
  const id = formData.get('id')?.toString() || null;
  const serviceId = formData.get('serviceId')?.toString() || '';
  const name = formData.get('name')?.toString().trim() || '';
  const price = cents(formData.get('price'));
  const duration = wholeNumber(formData.get('duration'), 0);
  const displayOrder = wholeNumber(formData.get('displayOrder'), 0);
  if (!name || name.length > 120) return { status: 'error', message: 'Enter a variant name' };
  if (!Number.isFinite(price)) return { status: 'error', message: 'Price must be a positive amount' };
  if (!Number.isInteger(duration) || duration < 0 || duration > 600) return { status: 'error', message: 'Duration must be 0 to 600 minutes' };
  const data: Record<string, unknown> = { name, price, duration: duration || null, staffLevel: formData.get('staffLevel')?.toString().trim() || '', displayOrder: Number.isInteger(displayOrder) ? displayOrder : 0 };
  const response = id
    ? await keystoneClient(`mutation UpdateVariant($id: ID!, $data: ServiceVariantUpdateInput!) { updateServiceVariant(where: { id: $id }, data: $data) { id } }`, { id, data })
    : await keystoneClient(`mutation CreateVariant($data: ServiceVariantCreateInput!) { createServiceVariant(data: $data) { id } }`, { data: { ...data, service: { connect: { id: serviceId } } } });
  if (!response.success) return { status: 'error', message: firstError(response) };
  revalidateCatalog(serviceId);
  return { status: 'saved', message: 'Saved' };
}

export async function deleteVariant(input: { id: string; serviceId: string }): Promise<{ success: boolean; error?: string }> {
  const response = await keystoneClient(`mutation DeleteVariant($id: ID!) { deleteServiceVariant(where: { id: $id }) { id } }`, { id: input.id });
  if (!response.success) return { success: false, error: firstError(response) };
  revalidateCatalog(input.serviceId);
  return { success: true };
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'category';
}

export async function saveCategory(_state: CatalogSaveState, formData: FormData): Promise<CatalogSaveState> {
  const id = formData.get('id')?.toString() || null;
  const name = formData.get('name')?.toString().trim() || '';
  const displayOrder = wholeNumber(formData.get('displayOrder'), 0);
  if (!name || name.length > 80) return { status: 'error', message: 'Enter a category name' };
  if (!Number.isInteger(displayOrder)) return { status: 'error', message: 'Order must be a whole number' };
  // Slugs are unique across every practice, so new ones carry a short suffix.
  const typedSlug = formData.get('slug')?.toString().trim();
  const slug = typedSlug ? slugify(typedSlug) : `${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;
  const data = { name, slug, displayOrder, sortOrder: displayOrder, isVisible: formData.get('isVisible') === 'on' };
  const response = id
    ? await keystoneClient(`mutation UpdateCategory($id: ID!, $data: ServiceCategoryUpdateInput!) { updateServiceCategory(where: { id: $id }, data: $data) { id } }`, { id, data })
    : await keystoneClient(`mutation CreateCategory($data: ServiceCategoryCreateInput!) { createServiceCategory(data: $data) { id } }`, { data });
  if (!response.success) {
    const message = firstError(response);
    return { status: 'error', message: /unique/i.test(message) ? 'That slug is taken; choose another' : message };
  }
  revalidateCatalog();
  return { status: 'saved', message: 'Saved' };
}

export async function deleteCategory(input: { id: string }): Promise<{ success: boolean; error?: string }> {
  const response = await keystoneClient(`mutation DeleteCategory($id: ID!) { deleteServiceCategory(where: { id: $id }) { id } }`, { id: input.id });
  if (!response.success) return { success: false, error: firstError(response) };
  revalidateCatalog();
  return { success: true };
}

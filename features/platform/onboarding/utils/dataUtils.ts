export function getItemsFromJsonData(jsonData: any, sectionType: string): string[] {
  if (!jsonData) return [];

  switch (sectionType) {
    case 'medspaInfo':
      return jsonData.medspaInfo ? [jsonData.medspaInfo.name || 'Practice'] : ['Practice'];
    case 'resources':
      return (jsonData.resources || []).map((resource: { name: string }) => resource.name);
    case 'categories':
      return (jsonData.categories || []).map((category: any) => category.name || 'Unknown Category');
    case 'services':
      return (jsonData.services || []).map((service: any) => service.name || 'Unknown Service');
    case 'staff':
      return (jsonData.staff || jsonData.providers || []).map((staff: any) => staff.name || 'Unknown Staff');
    case 'clients':
      return (jsonData.clients || []).map((client: any) => client.name || 'Unknown Client');
    case 'intakeForms':
      return [
        ...(jsonData.intakeForms || []).map((form: any) => form.name || 'Unknown Intake Form'),
        ...(jsonData.formTemplates || []).map((form: any) => form.name || 'Unknown Form Template'),
      ];
    case 'memberships':
      return [
        ...(jsonData.memberships || []).map((membership: any) => membership.name || 'Unknown Membership'),
        ...(jsonData.packages || []).map((pkg: any) => pkg.name || 'Unknown Package'),
      ];
    case 'retail':
      return [
        ...(jsonData.products || []).map((product: any) => product.name || 'Unknown Product'),
        ...(jsonData.messageTemplates || []).map((template: any) => template.name || 'Unknown Message Template'),
      ];
    case 'appointments':
      return (jsonData.appointments || []).map(
        (appointment: any) => appointment.displayName || appointment.key || 'Unknown Appointment'
      );
    default:
      return [];
  }
}

export function getSeedForTemplate(template: 'full' | 'minimal' | 'custom', seedData: any) {
  // Clone the complete contract, including storefront. Display labels must
  // never select/drop backend records or silently omit required seed objects.
  if (template === 'full') return structuredClone(seedData);
  const services = seedData.services.filter((service: any) => service.isPublic === true).slice(0, 1);
  const selectedServiceKeys = new Set(services.map((service: any) => service.key));
  const selectedServices = new Set(services.map((service: any) => service.name));
  const selectedCategories = new Set(services.map((service: any) => service.category));
  const providers = seedData.providers.filter((provider: any) => provider.isPublic && provider.specializations.some((key: string) => selectedServiceKeys.has(key))).slice(0, 1);
  const selectedStaff = new Set(providers.map((provider: any) => provider.name));
  const selectedClients = new Set<string>();
  const selectedIntake = new Set<string>();
  const selectedMemberships = new Set<string>();
  const selectedRetail = new Set<string>();
  const selectedAppointments = new Set<string>();

  return {
    medspaInfo: structuredClone(seedData.medspaInfo),
    storefront: structuredClone(seedData.storefront),
    categories: (seedData.categories || []).filter((category: any) => selectedCategories.has(category.name)),
    services: (seedData.services || []).filter((service: any) => selectedServices.has(service.name)),
    resources: (seedData.resources || []).filter((resource: any) => services.some((service: any) => service.requiredResources.includes(resource.key))),
    providers: (seedData.providers || seedData.staff || [])
      .filter((staff: any) => selectedStaff.has(staff.name))
      .map((staff: any) => ({
        ...staff,
        specializations: (staff.specializations || []).filter(
          (serviceRef: string) => selectedServices.has(serviceRef) || selectedServiceKeys.has(serviceRef)
        ),
      })),
    scheduleBlocks: (seedData.scheduleBlocks || []).filter((block: any) =>
      (seedData.providers || seedData.staff || [])
        .filter((staff: any) => selectedStaff.has(staff.name))
        .some((staff: any) => staff.key === block.provider)
    ),
    clients: (seedData.clients || []).filter((client: any) => selectedClients.has(client.name)),
    intakeForms: (seedData.intakeForms || []).filter((form: any) => selectedIntake.has(form.name)),
    formTemplates: (seedData.formTemplates || []).filter((form: any) => selectedIntake.has(form.name)),
    memberships: (seedData.memberships || []).filter((membership: any) => selectedMemberships.has(membership.name)),
    packages: (seedData.packages || []).filter((pkg: any) => selectedMemberships.has(pkg.name)),
    products: (seedData.products || []).filter((product: any) => selectedRetail.has(product.name)),
    messageTemplates: (seedData.messageTemplates || []).filter((template: any) => selectedRetail.has(template.name)),
    appointments: (seedData.appointments || []).filter((appointment: any) =>
      selectedAppointments.has(appointment.displayName || appointment.key)
    ),
    gallery: (seedData.gallery || []).filter(
      (image: any) => !image.service || selectedServiceKeys.has(image.service)
    ),
    paymentProviders: seedData.paymentProviders || [],
  };
}

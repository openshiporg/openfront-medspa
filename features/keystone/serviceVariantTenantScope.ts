type FindServices = (args: any) => Promise<unknown>;

type ServiceVariantScopeArgs = {
  practiceId: string | null | undefined;
  operation: "create" | "update" | string;
  resolvedData: Record<string, any> | null | undefined;
  item?: Record<string, any> | null;
  findServices: FindServices;
  addValidationError: (message: string) => unknown;
};

const hasOwn = (value: object | null | undefined, key: string) =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

export async function validateServiceVariantTenantLinks({
  practiceId,
  operation,
  resolvedData,
  item,
  findServices,
  addValidationError,
}: ServiceVariantScopeArgs): Promise<void> {
  const practiceChange = hasOwn(resolvedData, "practice") ? resolvedData?.practice : undefined;
  if (practiceChange !== undefined) {
    const relationKeys = practiceChange && typeof practiceChange === "object"
      ? Object.keys(practiceChange)
      : [];
    const connectedPracticeId = practiceChange?.connect?.id;
    if (
      typeof practiceId !== "string" ||
      !practiceId ||
      connectedPracticeId !== practiceId ||
      relationKeys.length !== 1 ||
      relationKeys[0] !== "connect"
    ) {
      addValidationError("Service variant practice must remain connected to the authenticated practice");
      return;
    }
  }

  let serviceId: unknown;
  const serviceChangeProvided = hasOwn(resolvedData, "service") && resolvedData?.service !== undefined;
  if (serviceChangeProvided) {
    const serviceChange = resolvedData?.service;
    if (serviceChange == null) {
      serviceId = null;
    } else if (typeof serviceChange === "object") {
      const relationKeys = Object.keys(serviceChange);
      if (relationKeys.length === 1 && relationKeys[0] === "disconnect" && serviceChange.disconnect === true) {
        if (operation === "create") {
          addValidationError("A new service variant cannot disconnect an existing service");
          return;
        }
        serviceId = null;
      } else if (
        relationKeys.length === 1 &&
        relationKeys[0] === "connect" &&
        typeof serviceChange.connect?.id === "string" &&
        serviceChange.connect.id
      ) {
        serviceId = serviceChange.connect.id;
      } else {
        addValidationError("Service variant must connect to one existing same-practice service");
        return;
      }
    } else {
      addValidationError("Service variant must connect to one existing same-practice service");
      return;
    }
  } else {
    serviceId = item?.serviceId ?? item?.service?.id ?? null;
  }

  if (serviceId == null) return;
  if (typeof serviceId !== "string" || !serviceId || typeof practiceId !== "string" || !practiceId) {
    addValidationError("Service variant and linked service must belong to the authenticated practice");
    return;
  }

  const rows = await findServices({
    where: {
      AND: [
        { id: { equals: serviceId } },
        { practice: { id: { equals: practiceId } } },
      ],
    },
    take: 2,
    query: "id practice { id }",
  });
  if (!Array.isArray(rows) || rows.length !== 1) {
    addValidationError("Service variant and linked service must belong to the authenticated practice");
    return;
  }

  const service = rows[0] as { id?: unknown; practice?: { id?: unknown } | null } | null;
  if (service?.id !== serviceId || service.practice?.id !== practiceId) {
    addValidationError("Service variant and linked service must belong to the authenticated practice");
  }
}

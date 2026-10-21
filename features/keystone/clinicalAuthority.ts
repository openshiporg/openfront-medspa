import type { Context } from ".keystone/types";
import { evidenceHash } from "./workflowAuth";

type AuthorityInput = {
  providerId: string;
  serviceId: string;
  locationId: string;
  at: Date;
  stage: "scheduling" | "order" | "consent" | "treatment_start" | "administration" | "completion";
  supervisorId?: string | null;
};

export async function evaluateProviderAuthority(sudo: ReturnType<Context["sudo"]>, input: AuthorityInput) {
  if (Number.isNaN(input.at.getTime())) throw new Error("Authority evaluation time is invalid");
  const [provider, location, service] = await Promise.all([
    sudo.query.Provider.findOne({ where: { id: input.providerId }, query: "id status isActive practice { id } locations { id }" }),
    sudo.query.Location.findOne({ where: { id: input.locationId }, query: "id state isActive practice { id }" }),
    sudo.query.Service.findOne({ where: { id: input.serviceId }, query: "id status staffAuthorizationRequired practice { id }" }),
  ]);
  if (!provider || provider.status !== "active" || provider.isActive !== true || !location || location.isActive !== true || !service || service.status !== "active") throw new Error("Configured provider authority is unavailable");
  const practiceId = provider.practice?.id;
  if (!practiceId || location.practice?.id !== practiceId || service.practice?.id !== practiceId || !provider.locations?.some((item: any) => item.id === location.id)) throw new Error("Configured provider authority is unavailable");

  const authorizations = await sudo.query.ProviderAuthorization.findMany({
    where: { provider: { id: { equals: provider.id } }, service: { id: { equals: service.id } }, location: { id: { equals: location.id } }, status: { equals: "active" }, effectiveFrom: { lte: input.at.toISOString() } },
    take: 20,
    query: "id effectiveFrom effectiveTo supervisionRequired supervisionMode policyVersion authorityEvidenceHash requiredSupervisor { id status } credential { id status effectiveFrom expiresAt primarySourceVerified scopeEvidenceHash jurisdiction }",
  });
  if (authorizations.some((item: any) => !Number.isFinite(Date.parse(item.effectiveFrom)) || new Date(item.effectiveFrom) > input.at || (item.effectiveTo && !Number.isFinite(Date.parse(item.effectiveTo))))) throw new Error('Provider authority validity interval is invalid');
  const effectiveAuthorizations = authorizations.filter((item: any) => !item.effectiveTo || new Date(item.effectiveTo) > input.at);
  if (effectiveAuthorizations.length !== 1) throw new Error(effectiveAuthorizations.length ? "Provider authority configuration is ambiguous" : "No effective provider authorization is configured");
  const authorization = effectiveAuthorizations[0];
  if (!authorization?.credential) throw new Error("No effective provider authorization is configured");
  const credential = authorization.credential;
  const jurisdictionMatches = credential.jurisdiction === "*" || credential.jurisdiction?.toLowerCase() === location.state?.toLowerCase();
  if (credential.status !== "verified" || credential.primarySourceVerified !== true || !jurisdictionMatches
    || !Number.isFinite(Date.parse(credential.effectiveFrom)) || !Number.isFinite(Date.parse(credential.expiresAt))
    || new Date(credential.effectiveFrom) > input.at || new Date(credential.expiresAt) <= input.at) throw new Error("Provider credential is not effective for this service, location, and time");

  const requiredSupervisorId = authorization.requiredSupervisor?.id || null;
  const evaluatedSupervisorId = input.supervisorId || (input.stage === "scheduling" ? requiredSupervisorId : null);
  if (authorization.supervisionRequired) {
    if (!requiredSupervisorId || evaluatedSupervisorId !== requiredSupervisorId || authorization.requiredSupervisor.status !== "active") throw new Error("Required clinical supervision is unavailable");
    const supervisorCredentials = await sudo.query.ProviderCredential.findMany({
      where: { provider: { id: { equals: requiredSupervisorId } }, status: { equals: "verified" }, effectiveFrom: { lte: input.at.toISOString() }, expiresAt: { gt: input.at.toISOString() }, primarySourceVerified: { equals: true } },
      take: 5, query: "id jurisdiction scopeEvidenceHash",
    });
    if (!supervisorCredentials.some((item: any) => item.jurisdiction === "*" || item.jurisdiction?.toLowerCase() === location.state?.toLowerCase())) throw new Error("Required supervisor credential is unavailable");
  }

  const evidence = {
    stage: input.stage, practiceId, providerId: provider.id, serviceId: service.id, locationId: location.id,
    authorizationId: authorization.id, credentialId: credential.id, supervisorId: requiredSupervisorId,
    policyVersion: authorization.policyVersion, authorityEvidenceHash: authorization.authorityEvidenceHash,
    credentialEvidenceHash: credential.scopeEvidenceHash, decidedAt: input.at.toISOString(),
  };
  return { ...evidence, evidenceHash: evidenceHash(evidence) };
}

export async function recordAuthorityDecision(
  context: Context,
  decision: Awaited<ReturnType<typeof evaluateProviderAuthority>>,
  links: { clientId?: string; appointmentId?: string; treatmentSessionId?: string },
  idempotencyKey: string,
) {
  return context.sudo().query.ClinicalAuthorityEvent.createOne({
    data: {
      practice: { connect: { id: decision.practiceId } }, location: { connect: { id: decision.locationId } }, provider: { connect: { id: decision.providerId } },
      supervisor: decision.supervisorId ? { connect: { id: decision.supervisorId } } : undefined,
      credential: { connect: { id: decision.credentialId } }, authorization: { connect: { id: decision.authorizationId } }, service: { connect: { id: decision.serviceId } },
      client: links.clientId ? { connect: { id: links.clientId } } : undefined, appointment: links.appointmentId ? { connect: { id: links.appointmentId } } : undefined,
      treatmentSession: links.treatmentSessionId ? { connect: { id: links.treatmentSessionId } } : undefined,
      stage: decision.stage, decision: "allowed", reason: "Configured authority predicates satisfied", policyVersion: decision.policyVersion,
      evidence: decision, evidenceHash: decision.evidenceHash, decidedAt: decision.decidedAt, idempotencyKey,
    }, query: "id evidenceHash",
  });
}

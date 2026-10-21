import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { assertActiveActor, requireActorPractice } from "../workflowAuth";

const sections = ["clients","catalog","benefits","inventory","engagement","administration","reports","integrations"] as const;
type Section = typeof sections[number];
type Metric = { label: string; value: number; format: string };
type RecordItem = { id: string; title: string; subtitle: string | null; status: string | null; detail: string | null; amount: number | null; metric: number | null; occurredAt: string | null; href: string | null; action: string | null };
type Result = { section: string; title: string; description: string; attentionCount: number; metrics: Metric[]; records: RecordItem[] };
const definitions: Record<Section, Pick<Result,"title"|"description">> = {
  clients: { title: "Client care", description: "Owned client relationships and due follow-up; no intake, notes, photos, or payment detail." },
  catalog: { title: "Services & catalog", description: "Practice-scoped bookability, resources, and configured clinical prerequisites." },
  benefits: { title: "Memberships, packages & gift cards", description: "Practice-scoped commercial liabilities and current program state." },
  inventory: { title: "Inventory & custody", description: "Practice-scoped lot custody, quarantine, expiry, and immutable movements." },
  engagement: { title: "Waitlist & communications", description: "Practice-scoped scheduling and delivery exceptions." },
  administration: { title: "Authority & resources", description: "Practice-scoped locations, credential exceptions, and device readiness." },
  reports: { title: "Bounded operations", description: "Settled commercial records and workload counts; no treatment-outcome claims." },
  integrations: { title: "Integrations & delivery", description: "Practice-scoped provider readiness and event exceptions without secrets or payloads." },
};
const metricType = graphql.object<Metric>()({ name: "MedSpaWorkspaceMetric", fields: { label: graphql.field({ type: graphql.nonNull(graphql.String) }), value: graphql.field({ type: graphql.nonNull(graphql.Int) }), format: graphql.field({ type: graphql.nonNull(graphql.String) }) } });
const recordType = graphql.object<RecordItem>()({ name: "MedSpaWorkspaceRecord", fields: { id: graphql.field({ type: graphql.nonNull(graphql.ID) }), title: graphql.field({ type: graphql.nonNull(graphql.String) }), subtitle: graphql.field({ type: graphql.String }), status: graphql.field({ type: graphql.String }), detail: graphql.field({ type: graphql.String }), amount: graphql.field({ type: graphql.Int }), metric: graphql.field({ type: graphql.Int }), occurredAt: graphql.field({ type: graphql.String }), href: graphql.field({ type: graphql.String }), action: graphql.field({ type: graphql.String }) } });
const resultType = graphql.object<Result>()({ name: "MedSpaOperationsWorkspace", fields: { section: graphql.field({ type: graphql.nonNull(graphql.String) }), title: graphql.field({ type: graphql.nonNull(graphql.String) }), description: graphql.field({ type: graphql.nonNull(graphql.String) }), attentionCount: graphql.field({ type: graphql.nonNull(graphql.Int) }), metrics: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(metricType))) }), records: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(recordType))) }) } });
const count = (label: string, value: number): Metric => ({ label, value, format: "count" });
const money = (label: string, value: number): Metric => ({ label, value: Math.round(value), format: "money" });
const occurred = (value: unknown) => value ? new Date(value as string).toISOString() : null;
const scoped = (practiceId: string, extra?: Record<string,unknown>) => extra ? { AND: [{ practice: { id: { equals: practiceId } } }, extra] } : { practice: { id: { equals: practiceId } } };
const row = (item: Partial<RecordItem> & Pick<RecordItem,"id"|"title">): RecordItem => ({ subtitle: null, status: null, detail: null, amount: null, metric: null, occurredAt: null, href: null, action: null, ...item });

async function load(section: Section, sudo: ReturnType<Context["sudo"]>, practiceId: string) {
  if (section === "clients") {
    const now = new Date().toISOString();
    const [items,total,followups] = await Promise.all([
      sudo.query.Client.findMany({ where: scoped(practiceId), take: 50, orderBy: { updatedAt: "desc" }, query: "id totalVisits lifetimeValue updatedAt user { name } preferredProvider { user { name } }" }),
      sudo.query.Client.count({ where: scoped(practiceId) }), sudo.query.FollowUpTask.count({ where: scoped(practiceId, { status: { in: ["open","in_progress"] }, dueAt: { lte: now } }) }),
    ]);
    return { metrics: [count("Clients in practice", total), count("Follow-ups due now", followups), money("Lifetime value — sample of latest 50 clients", items.reduce((sum,item)=>sum+Number(item.lifetimeValue||0),0))], records: items.map((item)=>row({ id:item.id,title:item.user?.name||"Unnamed client",subtitle:item.preferredProvider?.user?.name||"No preferred provider",status:"Care relationship",metric:item.totalVisits||0,amount:item.lifetimeValue||0,occurredAt:occurred(item.updatedAt) })), attentionCount: followups };
  }
  if (section === "catalog") {
    const items = await sudo.query.Service.findMany({ where: scoped(practiceId), take: 50, orderBy: { name: "asc" }, query: "id name status baseDuration price staffAuthorizationRequired requiresConsultation requiresIntakeReview requiredResources { id }" });
    return { metrics: [count("Services shown (max 50)",items.length),count("Restricted in sample",items.filter((x)=>x.staffAuthorizationRequired).length),count("Missing resources in sample",items.filter((x)=>!x.requiredResources?.length).length)], records: items.map((item)=>row({ id:item.id,title:item.name,status:item.status,detail:`${item.baseDuration||0} min · ${item.requiredResources?.length||0} required resources`,amount:item.price||0,metric:item.requiredResources?.length||0 })), attentionCount: items.filter((x)=>x.status!=="active"||!x.requiredResources?.length).length };
  }
  if (section === "benefits") {
    const [memberships,packages,cards] = await Promise.all([
      sudo.query.ClientMembership.findMany({ where: scoped(practiceId), take: 50, orderBy: { updatedAt:"desc" }, query:"id status nextBillingDate client { name } membership { name } agreementsCount ledgerEntriesCount" }),
      sudo.query.ClientPackage.findMany({ where: scoped(practiceId), take: 50, query:"id status totalValue usedValue client { name } package { name }" }),
      sudo.query.GiftCard.findMany({ where: scoped(practiceId), take: 50, query:"id isActive currentBalance createdAt" }),
    ]);
    const records = [...memberships.map((item)=>row({id:`membership:${item.id}`,title:item.membership?.name||"Membership",subtitle:item.client?.name||null,status:item.status,detail:`${item.agreementsCount||0} agreements · ${item.ledgerEntriesCount||0} ledger entries`,occurredAt:occurred(item.nextBillingDate)})),...packages.map((item)=>row({id:`package:${item.id}`,title:item.package?.name||"Package",subtitle:item.client?.name||null,status:item.status,amount:Math.max(0,(item.totalValue||0)-(item.usedValue||0))})),...cards.map((item)=>row({id:`gift:${item.id}`,title:"Gift card",status:item.isActive?"active":"inactive",amount:item.currentBalance||0,occurredAt:occurred(item.createdAt)}))];
    return { metrics:[count("Memberships shown (max 50)",memberships.length),count("Packages shown (max 50)",packages.length),money("Gift liability — first 50 cards",cards.reduce((sum,item)=>sum+Number(item.currentBalance||0),0))],records,attentionCount:memberships.filter((x)=>!x.agreementsCount).length };
  }
  if (section === "inventory") {
    const [lots, products, locations] = await Promise.all([
      sudo.query.InventoryLot.findMany({ where: scoped(practiceId), take: 50, orderBy: { expiresAt: "asc" }, query: "id lotNumber status remainingQuantity expiresAt product { name } location { name }" }),
      sudo.query.Product.findMany({ where: scoped(practiceId, { isActive: { equals: true } }), take: 50, orderBy: { name: "asc" }, query: "id name sku quantity" }),
      sudo.query.Location.findMany({ where: scoped(practiceId, { isActive: { equals: true } }), take: 50, orderBy: { name: "asc" }, query: "id name" }),
    ]);
    const lotRows = lots.map((item) => row({ id: `lot:${item.id}`, title: item.product?.name || "Inventory lot", subtitle: `${item.lotNumber} · ${item.location?.name || "Unscoped"}`, status: item.status, detail: item.expiresAt ? `Expires ${new Date(item.expiresAt).toISOString().slice(0, 10)}` : "No expiry configured", metric: item.remainingQuantity || 0 }));
    const productRows = products.map((item) => row({ id: `product:${item.id}`, title: item.name || "Retail product", subtitle: item.sku || "No SKU", status: "active", detail: "Aggregate on-hand across locations · location availability is checked on write", metric: item.quantity || 0, action: "adjust_inventory" }));
    const locationRows = locations.map((item) => row({ id: `location:${item.id}`, title: item.name || "Stock location", status: "active" }));
    return {
      metrics: [count("Lots shown (max 50)", lots.length), count("Quarantined / recalled shown", lots.filter((x) => ["quarantined", "recalled"].includes(x.status)).length), count("Expiring within 30 days shown", lots.filter((x) => x.expiresAt && new Date(x.expiresAt) <= new Date(Date.now() + 30 * 86400000)).length)],
      records: [...locationRows, ...productRows, ...lotRows],
      attentionCount: lots.filter((x) => ["quarantined", "recalled", "expired"].includes(x.status)).length,
    };
  }
  if (section === "engagement") {
    const [waitlist,failed] = await Promise.all([sudo.query.WaitlistEntry.findMany({ where: scoped(practiceId,{ status:{ in:["active","notified"] } }),take:50,orderBy:{createdAt:"asc"},query:"id guestName status createdAt service { name } client { name }"}),sudo.query.MessageLog.count({where:scoped(practiceId,{status:{equals:"failed"}})})]);
    return {metrics:[count("Open waitlist",waitlist.length),count("Delivery failures",failed)],records:waitlist.map((item)=>row({id:item.id,title:item.client?.name||item.guestName||"Waitlist client",subtitle:item.service?.name||null,status:item.status,occurredAt:occurred(item.createdAt),action:item.status==="active"?"notify_waitlist":null})),attentionCount:waitlist.length+failed};
  }
  if (section === "administration") {
    const [credentials,resources,locations] = await Promise.all([sudo.query.ProviderCredential.findMany({where:scoped(practiceId),take:50,orderBy:{expiresAt:"asc"},query:"id licenseType status expiresAt provider { user { name } }"}),sudo.query.Resource.findMany({where:scoped(practiceId),take:50,query:"id name type readinessStatus maintenanceDueAt location { name }"}),sudo.query.Location.count({where:scoped(practiceId,{isActive:{equals:true}})})]);
    const records=[...credentials.map((item)=>row({id:`credential:${item.id}`,title:item.provider?.user?.name||"Provider credential",subtitle:item.licenseType,status:item.status,detail:item.expiresAt?`Expires ${new Date(item.expiresAt).toISOString().slice(0,10)}`:null,occurredAt:occurred(item.expiresAt)})),...resources.map((item)=>row({id:`resource:${item.id}`,title:item.name,subtitle:`${item.type} · ${item.location?.name||"Unscoped"}`,status:item.readinessStatus,occurredAt:occurred(item.maintenanceDueAt)}))];
    return {metrics:[count("Active locations",locations),count("Credentials",credentials.length),count("Resources",resources.length)],records,attentionCount:credentials.filter((x)=>x.status!=="verified"||new Date(x.expiresAt)<=new Date(Date.now()+30*86400000)).length+resources.filter((x)=>x.readinessStatus!=="available").length};
  }
  if (section === "reports") {
    const [payments,incidents,rights,commissions,payoutCount] = await Promise.all([
      sudo.query.Payment.findMany({where:scoped(practiceId,{status:{in:["completed","partially_refunded","refunded"]}}),take:500,query:"id totalAmount refundedAmount processedAt status"}),
      sudo.query.Incident.count({where:scoped(practiceId,{status:{in:["open","under_review"]}})}),
      sudo.query.PatientRightsRequest.count({where:scoped(practiceId,{status:{notIn:["closed","fulfilled"]}})}),
      sudo.query.Commission.findMany({where:scoped(practiceId,{isPaid:{equals:false}}),take:500,query:"id commissionAmount isPaid"}),
      sudo.query.Commission.count({where:scoped(practiceId,{isPaid:{equals:true}})}),
    ]);
    const net=payments.reduce((sum,item)=>sum+Number(item.totalAmount||0)-Number(item.refundedAmount||0),0);
    const commissionLiability=commissions.reduce((sum,item)=>sum+Number(item.commissionAmount||0),0);
    return {metrics:[money("Net settled revenue — max 500 payments",net),money("Unpaid commission liability — max 500",commissionLiability),count("Paid commission records",payoutCount),count("Open incidents",incidents),count("Rights requests open",rights)],records:payments.slice(0,50).map((item)=>row({id:item.id,title:"Settled payment",status:item.status,amount:Number(item.totalAmount||0)-Number(item.refundedAmount||0),occurredAt:occurred(item.processedAt)})),attentionCount:incidents+rights};
  }
  const [providers,pending,failed,webhooks] = await Promise.all([
    sudo.query.PaymentProvider.findMany({where:scoped(practiceId),take:20,query:"id name code adapter isInstalled isDefault"}),
    sudo.query.DomainEvent.count({where:scoped(practiceId,{status:{equals:"pending"}})}),
    sudo.query.DomainEvent.count({where:scoped(practiceId,{status:{equals:"dead_letter"}})}),
    sudo.query.PaymentWebhookEvent.findMany({where:scoped(practiceId),take:100,orderBy:{processedAt:"desc"},query:"id status"}),
  ]);
  const webhookAttention=webhooks.filter((item)=>item.status!=="processed").length;
  return {metrics:[count("Providers installed (max 20)",providers.filter((x)=>x.isInstalled).length),count("Events pending",pending),count("Events failed",failed),count("Webhook attention (max 100)",webhookAttention)],records:providers.map((item)=>row({id:item.id,title:item.name,subtitle:`${item.adapter} · ${item.code}`,status:item.isInstalled?(item.isDefault?"installed_default":"installed"):"not_installed",detail:"Secrets and payloads omitted"})),attentionCount:providers.filter((x)=>!x.isInstalled).length+pending+failed+webhookAttention};
}

const sectionCapability: Record<Section,typeof permissions.canReadClients> = {
  clients: permissions.canReadClients, catalog: permissions.canManagePractice, benefits: permissions.canManageFinance,
  inventory: permissions.canManageInventory, engagement: ({session})=>permissions.canSchedule({session})||permissions.canManageCommunications({session}),
  administration: permissions.canManagePractice, reports: permissions.canViewReports, integrations: permissions.canManageIntegrations,
};

export const medspaOperationsWorkspace = graphql.field({
  type: resultType, args: { section: graphql.arg({ type: graphql.nonNull(graphql.String) }) },
  async resolve(_source,{section},context:Context):Promise<Result>{
    if(!sections.includes(section as Section)) throw new Error("Unsupported medspa operations workspace");
    const key=section as Section; const actor=requireActorPractice(context,sectionCapability[key],"This workspace section is not authorized");
    await assertActiveActor(context);
    const data=await load(key,context.sudo(),actor.practiceId); return {section:key,...definitions[key],...data};
  },
});

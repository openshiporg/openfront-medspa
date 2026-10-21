#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(directory, "seed.json"), "utf8"));
const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const endpointIndex = argv.indexOf("--endpoint");
const endpoint = endpointIndex >= 0 && argv[endpointIndex + 1]
  ? argv[endpointIndex + 1]
  : process.env.MEDSPA_GRAPHQL_ENDPOINT || "https://medspa.local/api/graphql";
const sessionToken = process.env.MEDSPA_SEED_SESSION_TOKEN || process.env.KEYSTONEJS_SESSION || "";

async function request(query, variables = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { cookie: `keystonejs-session=${sessionToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.map((error) => error.message).join("; ") || response.statusText);
  }
  return payload.data;
}

const requiredArrays = [
  "resources", "categories", "services", "providers", "scheduleBlocks", "clients",
  "intakeForms", "formTemplates", "memberships", "packages", "products",
  "messageTemplates", "appointments", "gallery", "paymentProviders",
];
if (!seed.medspaInfo || requiredArrays.some((key) => !Array.isArray(seed[key]))) {
  throw new Error("MedSpa seed is incomplete; run validate-seed.mjs");
}

const statusQuery = `query SeedRuntimeStatus {
  redirectToInit locationsCount servicesCount serviceCategoriesCount providersCount
  providerSchedulesCount appointmentsCount membershipsCount
}`;
const before = await request(statusQuery);
console.log(`applySeedMode=${apply ? "apply" : "dry-run"}`);
console.log(`endpoint=${endpoint}`);
console.log(`plannedCounts=medspaInfo:1,${requiredArrays.map((key) => `${key}:${seed[key].length}`).join(",")}`);
console.log(`runtimeStatus=${JSON.stringify(before)}`);

if (!apply) {
  console.log("applyStatus=dry-run only; no runtime writes attempted");
  if (!sessionToken) console.log("applyBlocker=missing MEDSPA_SEED_SESSION_TOKEN");
  process.exit(0);
}
if (!sessionToken) throw new Error("Set MEDSPA_SEED_SESSION_TOKEN before --apply");
if (before.redirectToInit) throw new Error("Initialize the runtime before --apply");

const result = await request(
  `mutation ApplyMedSpaSeed($seed: JSON) {
    runMedSpaOnboarding(seed: $seed) {
      success completed created reused locationId error
    }
  }`,
  { seed },
);
if (!result.runMedSpaOnboarding?.success || !result.runMedSpaOnboarding?.completed) {
  throw new Error(result.runMedSpaOnboarding?.error || "Authoritative medspa onboarding failed");
}

const after = await request(statusQuery);
console.log(`authoritativeResult=${JSON.stringify(result.runMedSpaOnboarding)}`);
console.log(`runtimeStatusAfter=${JSON.stringify(after)}`);

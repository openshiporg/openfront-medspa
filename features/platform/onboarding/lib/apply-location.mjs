#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(__dirname, "seed.json"), "utf8"));
const endpoint = process.env.MEDSPA_GRAPHQL_ENDPOINT || "https://medspa.local/api/graphql";
const sessionToken = process.env.MEDSPA_SEED_SESSION_TOKEN || process.env.KEYSTONEJS_SESSION || "";

if (!sessionToken) {
  console.error("apply-location blocked: set MEDSPA_SEED_SESSION_TOKEN to an authenticated local admin session");
  process.exit(1);
}
if (!seed.medspaInfo || typeof seed.medspaInfo !== "object") {
  console.error("apply-location blocked: seed.medspaInfo is required");
  process.exit(1);
}

async function request(query, variables = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `keystonejs-session=${sessionToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) {
    throw new Error(body.errors?.map((error) => error.message).join("; ") || response.statusText);
  }
  return body.data;
}

const medspaInfo = seed.medspaInfo;
const locationData = {
  name: medspaInfo.name,
  address: medspaInfo.address,
  city: medspaInfo.city,
  state: medspaInfo.state,
  zipCode: medspaInfo.zipCode,
  phone: medspaInfo.phone,
  email: medspaInfo.email,
  timezone: medspaInfo.timezone,
  hours: medspaInfo.hours,
  isActive: true,
};

const before = await request(
  `query LocationBefore($name: String!) { locations(where: { name: { equals: $name } }) { id } locationsCount }`,
  { name: medspaInfo.name }
);

let locationId = before.locations[0]?.id;
let action = "updated";
if (locationId) {
  const result = await request(
    `mutation UpdateLocation($id: ID!, $data: LocationUpdateInput!) { updateLocation(where: { id: $id }, data: $data) { id } }`,
    { id: locationId, data: locationData }
  );
  locationId = result.updateLocation.id;
} else {
  const result = await request(
    `mutation CreateLocation($data: LocationCreateInput!) { createLocation(data: $data) { id } }`,
    { data: locationData }
  );
  locationId = result.createLocation.id;
  action = "created";
}

let resourcesConnected = 0;
for (const resource of seed.resources) {
  const data = await request(
    `query ResourceForLocation($name: String!) { resources(where: { name: { equals: $name } }, take: 1) { id } }`,
    { name: resource.name }
  );
  const resourceId = data.resources[0]?.id;
  if (!resourceId) continue;
  await request(
    `mutation ConnectResourceLocation($id: ID!, $locationId: ID!) { updateResource(where: { id: $id }, data: { location: { connect: { id: $locationId } } }) { id } }`,
    { id: resourceId, locationId }
  );
  resourcesConnected += 1;
}

const proof = await request(
  `query LocationProof($id: ID!, $name: String!) {
    locationsCount
    locations(where: { name: { equals: $name } }) { id }
    location(where: { id: $id }) {
      id name address city state zipCode phone email timezone hours isActive
      resources { id name }
    }
  }`,
  { id: locationId, name: medspaInfo.name }
);

console.log(`locationParity=action:${action},matchingRows:${proof.locations.length},resourcesConnected:${resourcesConnected}`);
console.log(`runtimeCounts=locations:${proof.locationsCount}`);
console.log(`location=${JSON.stringify(proof.location)}`);

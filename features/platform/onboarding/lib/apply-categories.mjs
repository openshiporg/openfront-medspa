#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(__dirname, "seed.json"), "utf8"));
const endpoint = process.env.MEDSPA_GRAPHQL_ENDPOINT || "https://medspa.local/api/graphql";
const sessionToken = process.env.MEDSPA_SEED_SESSION_TOKEN || process.env.KEYSTONEJS_SESSION || "";

if (!sessionToken) {
  console.error("apply-categories blocked: set MEDSPA_SEED_SESSION_TOKEN to an authenticated local admin session");
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

let created = 0;
let reused = 0;
let connectedServices = 0;
const categoryIds = {};

for (const category of seed.categories) {
  const existing = await request(
    `query CategoryBySlug($slug: String!) { serviceCategories(where: { slug: { equals: $slug } }, take: 1) { id name slug } }`,
    { slug: category.slug }
  );

  let categoryId = existing.serviceCategories[0]?.id;
  if (categoryId) {
    reused += 1;
  } else {
    const result = await request(
      `mutation CreateCategory($data: ServiceCategoryCreateInput!) { createServiceCategory(data: $data) { id } }`,
      {
        data: {
          name: category.name,
          description: category.description,
          slug: category.slug,
          displayOrder: category.displayOrder || 0,
          sortOrder: category.displayOrder || 0,
          isVisible: true,
          icon: category.icon || "",
        },
      }
    );
    categoryId = result.createServiceCategory.id;
    created += 1;
  }

  categoryIds[category.key] = categoryId;
  categoryIds[category.name] = categoryId;
}

for (const service of seed.services) {
  const serviceData = await request(
    `query ServiceForCategory($name: String!) { services(where: { name: { equals: $name } }, take: 1) { id category { id } } }`,
    { name: service.name }
  );
  const serviceRecord = serviceData.services[0];
  const categoryId = categoryIds[service.category];
  if (!serviceRecord || !categoryId) continue;

  if (serviceRecord.category?.id !== categoryId) {
    await request(
      `mutation ConnectServiceCategory($id: ID!, $categoryId: ID!) { updateService(where: { id: $id }, data: { category: { connect: { id: $categoryId } } }) { id } }`,
      { id: serviceRecord.id, categoryId }
    );
  }
  connectedServices += 1;
}

const proof = await request(`
  query CategoryParityProof {
    serviceCategoriesCount
    servicesCount
    serviceCategories(orderBy: { displayOrder: asc }) {
      name
      slug
      displayOrder
      servicesCount
      services(orderBy: { name: asc }) { name }
    }
    services(where: { category: null }) { id }
  }
`);

console.log(`categoryParity=created:${created},reused:${reused},servicesConnected:${connectedServices}`);
console.log(`runtimeCounts=categories:${proof.serviceCategoriesCount},services:${proof.servicesCount},uncategorizedServices:${proof.services.length}`);
console.log(
  `categories=${proof.serviceCategories
    .map((category) => `${category.name}:${category.slug}:${category.servicesCount}`)
    .join(";")}`
);

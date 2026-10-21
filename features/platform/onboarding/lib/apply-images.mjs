#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(__dirname, "seed.json"), "utf8"));
const endpoint = process.env.MEDSPA_GRAPHQL_ENDPOINT || "https://medspa.local/api/graphql";
const sessionToken = process.env.MEDSPA_SEED_SESSION_TOKEN || process.env.KEYSTONEJS_SESSION || "";

if (!sessionToken) {
  console.error("apply-images blocked: set MEDSPA_SEED_SESSION_TOKEN to an authenticated local admin session");
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
let connectedProviders = 0;

async function findOrCreateImage(imagePath, altText, metadata) {
  const allImages = await request(`query ImagesForSeedKey { medSpaImages(take: 500) { id imagePath metadata } }`);
  const seededImage = allImages.medSpaImages.find((image) => image.metadata?.seedKey === metadata.seedKey);
  if (seededImage) {
    await request(
      `mutation UpdateImage($id: ID!, $data: MedSpaImageUpdateInput!) { updateMedSpaImage(where: { id: $id }, data: $data) { id } }`,
      { id: seededImage.id, data: { imagePath, altText, metadata: { ...metadata, source: "image-parity" } } }
    );
    reused += 1;
    return seededImage.id;
  }

  const existing = allImages.medSpaImages.find((image) => image.imagePath === imagePath);
  if (existing) {
    reused += 1;
    return existing.id;
  }

  const result = await request(
    `mutation CreateImage($data: MedSpaImageCreateInput!) { createMedSpaImage(data: $data) { id } }`,
    { data: { imagePath, altText, metadata: { ...metadata, source: "image-parity" } } }
  );
  created += 1;
  return result.createMedSpaImage.id;
}

for (const service of seed.services) {
  const serviceData = await request(
    `query ServiceForImage($name: String!) { services(where: { name: { equals: $name } }, take: 1) { id } }`,
    { name: service.name }
  );
  const serviceRecord = serviceData.services[0];
  if (!serviceRecord) continue;

  const imageId = await findOrCreateImage(service.imagePath, service.name, {
    seedKey: `service-image:${service.key}`,
    placement: "service",
  });
  await request(
    `mutation ConnectServiceImage($id: ID!, $imageId: ID!) { updateService(where: { id: $id }, data: { image: { connect: { id: $imageId } } }) { id } }`,
    { id: serviceRecord.id, imageId }
  );
  connectedServices += 1;
}

for (const provider of seed.providers) {
  const providerData = await request(
    `query ProviderForImage($email: String!) { providers(where: { user: { email: { equals: $email } } }, take: 1) { id } }`,
    { email: provider.email }
  );
  const providerRecord = providerData.providers[0];
  if (!providerRecord) continue;

  const imageId = await findOrCreateImage(provider.imagePath, provider.name, {
    seedKey: `provider-image:${provider.key}`,
    placement: "provider",
  });
  await request(
    `mutation ConnectProviderImage($id: ID!, $imageId: ID!, $photoUrl: String!) { updateProvider(where: { id: $id }, data: { photo: { connect: { id: $imageId } }, photoUrl: $photoUrl }) { id } }`,
    { id: providerRecord.id, imageId, photoUrl: provider.imagePath }
  );
  connectedProviders += 1;
}

for (const galleryImage of seed.gallery) {
  await findOrCreateImage(galleryImage.imagePath, galleryImage.title, {
    seedKey: `gallery:${galleryImage.key}`,
    placement: "gallery",
    title: galleryImage.title,
    caption: galleryImage.caption,
    serviceKey: galleryImage.service || null,
  });
}

const proof = await request(`
  query ImageParityProof {
    servicesCount
    providersCount
    medSpaImagesCount
    services(orderBy: { name: asc }) { name image { imagePath altText } }
    providers(orderBy: { tier: desc }) { photoUrl photo { imagePath altText } }
  }
`);

console.log(`imageParity=created:${created},reused:${reused},servicesConnected:${connectedServices},providersConnected:${connectedProviders}`);
console.log(`runtimeCounts=services:${proof.servicesCount},providers:${proof.providersCount},medSpaImages:${proof.medSpaImagesCount}`);
console.log(`serviceImages=${proof.services.map((service) => `${service.name}:${service.image?.imagePath || "missing"}`).join(";")}`);
console.log(`providerImages=${proof.providers.map((provider) => provider.photo?.imagePath || provider.photoUrl || "missing").join(";")}`);

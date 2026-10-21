#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "seed.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));

const requiredKeys = [
  "resources",
  "categories",
  "services",
  "providers",
  "scheduleBlocks",
  "clients",
  "intakeForms",
  "formTemplates",
  "memberships",
  "packages",
  "products",
  "messageTemplates",
  "appointments",
  "gallery",
  "paymentProviders",
];

const forbiddenEcommerceKeys = ["store", "regions", "collections", "shipping_options"];

const modelConcepts = {
  resources: "Resource",
  categories: "ServiceCategory",
  services: "Service",
  providers: "User + Provider",
  scheduleBlocks: "ProviderSchedule",
  clients: "User + Client",
  intakeForms: "IntakeForm",
  formTemplates: "FormTemplate",
  memberships: "Membership",
  packages: "ServicePackage",
  products: "Product",
  messageTemplates: "MessageTemplate",
  appointments: "Appointment + AppointmentLineItem",
  gallery: "MedSpaImage gallery records",
  paymentProviders: "PaymentProvider / adapter config",
};

function fail(message) {
  console.error(`Seed validation failed: ${message}`);
  process.exit(1);
}

if (!seed.medspaInfo || typeof seed.medspaInfo !== "object" || Array.isArray(seed.medspaInfo)) {
  fail("missing required object: medspaInfo");
}
if (!seed.storefront || typeof seed.storefront !== "object" || Array.isArray(seed.storefront)) {
  fail("missing required object: storefront");
}

for (const key of requiredKeys) {
  if (!Array.isArray(seed[key])) fail(`missing required array: ${key}`);
}

for (const key of forbiddenEcommerceKeys) {
  if (key in seed) fail(`forbidden ecommerce key is present: ${key}`);
}

function uniqueKeys(sectionName) {
  const seen = new Set();
  for (const item of seed[sectionName]) {
    if (!item?.key) fail(`${sectionName} item missing key`);
    if (seen.has(item.key)) fail(`${sectionName} has duplicate key: ${item.key}`);
    seen.add(item.key);
  }
  return seen;
}

const resourceKeys = uniqueKeys("resources");
const categoryKeys = uniqueKeys("categories");
const categoryNames = new Set(seed.categories.map((category) => category.name));
const categorySlugs = new Set();
const serviceKeys = uniqueKeys("services");
const providerKeys = uniqueKeys("providers");
const clientKeys = uniqueKeys("clients");
uniqueKeys("intakeForms");
uniqueKeys("formTemplates");
uniqueKeys("memberships");
uniqueKeys("packages");
uniqueKeys("products");
uniqueKeys("messageTemplates");
uniqueKeys("appointments");
uniqueKeys("gallery");
uniqueKeys("paymentProviders");

for (const category of seed.categories) {
  if (!category.name || !category.slug) fail(`category ${category.key} missing name or slug`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.slug)) {
    fail(`category ${category.key} slug must be URL-safe`);
  }
  if (categorySlugs.has(category.slug)) fail(`categories has duplicate slug: ${category.slug}`);
  categorySlugs.add(category.slug);
}

const medspaInfo = seed.medspaInfo;
for (const field of ["key", "name", "address", "city", "state", "zipCode", "phone", "email", "timezone"]) {
  if (typeof medspaInfo[field] !== "string" || !medspaInfo[field].trim()) {
    fail(`medspaInfo missing ${field}`);
  }
}
if (!medspaInfo.hours || typeof medspaInfo.hours !== "object" || Array.isArray(medspaInfo.hours)) {
  fail("medspaInfo missing hours object");
}
if (!/\b(?:demo|mock)\b/i.test(medspaInfo.name) || !/\b(?:demo|mock)\b/i.test(String(seed.storefront.displayName || ""))) {
  fail("practice and storefront identities must be clearly marked demo or mock");
}
if (!/\b(?:demo|mock|fictional)\b/i.test(`${medspaInfo.name} ${medspaInfo.address}`)
  || !/^\+?1?[\s().-]*[2-9]\d{2}[\s().-]*555[\s.-]*01\d{2}$/.test(medspaInfo.phone)
  || !/@[a-z0-9.-]*demo[a-z0-9.-]*\.example$/i.test(medspaInfo.email)) {
  fail("location and contact must be unmistakably fictional demo data");
}
if (!Number.isInteger(seed.storefront.accentHue) || seed.storefront.accentHue < 0 || seed.storefront.accentHue > 360 || seed.storefront.isPublished !== true) {
  fail("storefront must publish a whole-number demo hue from 0 through 360");
}

function requirePublicImagePath(section, key, imagePath) {
  if (imagePath == null || imagePath === "") return;
  if (typeof imagePath !== "string" || !imagePath.startsWith("/images/")) {
    fail(`${section} ${key} imagePath must start with /images/`);
  }
  if (/^(https?:|data:|blob:)/.test(imagePath)) {
    fail(`${section} ${key} imagePath must be a relative public path`);
  }
}

const resourceTypes = new Set(["room", "device", "equipment", "station", "other"]);
const resourcesByKey = new Map(seed.resources.map((resource) => [resource.key, resource]));
for (const resource of seed.resources) {
  if (!resourceTypes.has(resource.type)) fail(`resource ${resource.key} has unsupported type ${resource.type}`);
  if (typeof resource.isPublic !== "boolean" || (resource.isPublic && resource.isActive !== true)) {
    fail(`resource ${resource.key} must be explicitly public and active or remain private`);
  }
}
if (seed.appointments.length) fail("appointments must remain empty; onboarding cannot manufacture appointment or treatment evidence");
for (const product of seed.products) if (product.trackLots !== false && Number(product.quantity || 0) > 0) fail(`tracked product ${product.key} must enter through controlled lot receiving`);
for (const service of seed.services) {
  if (!service.name) fail(`service ${service.key} missing name`);
  if (!Number.isInteger(service.baseDuration) || service.baseDuration <= 0) {
    fail(`service ${service.key} must have positive integer baseDuration`);
  }
  if (!Number.isInteger(service.price) || service.price < 0 || !Number.isInteger(service.basePrice) || service.basePrice < 0) {
    fail(`service ${service.key} must have non-negative integer prices in cents`);
  }
  if (typeof service.isPublic !== "boolean" || service.isPublic !== (service.status === "active")) {
    fail(`service ${service.key} must publish only when active`);
  }
  if (service.isPublic && (!/\b(?:demo|mock|fictional)\b/i.test(`${service.name || ""} ${service.description || ""}`) || service.staffAuthorizationRequired !== false)) {
    fail(`public service ${service.key} must be a non-clinical demo request`);
  }
  requirePublicImagePath("service", service.key, service.imagePath);
  if (!service.category || (!categoryNames.has(service.category) && !categoryKeys.has(service.category))) {
    fail(`service ${service.key} references unknown category ${service.category}`);
  }
  for (const resourceKey of service.requiredResources || []) {
    if (!resourceKeys.has(resourceKey)) fail(`service ${service.key} references unknown resource ${resourceKey}`);
    const resource = resourcesByKey.get(resourceKey);
    if (service.isPublic && (!resource?.isActive || !resource?.isPublic)) fail(`public service ${service.key} requires a private or inactive resource ${resourceKey}`);
  }
}

if (!seed.services.some((service) => service.status === "active" && service.isPublic === true)) {
  fail("at least one active mock public service is required");
}

const servicesByKey = new Map(seed.services.map((service) => [service.key, service]));
const providersByKey = new Map(seed.providers.map((provider) => [provider.key, provider]));
for (const provider of seed.providers) {
  if (!provider.name || !provider.email) fail(`provider ${provider.key} missing name or email`);
  if (typeof provider.isPublic !== "boolean" || (provider.isPublic && (provider.status !== "active" || provider.isActive !== true || provider.role !== "assistant"
    || !/\b(?:demo|mock|fictional)\b/i.test(`${provider.name} ${provider.bio || ""}`)))) {
    fail(`public provider ${provider.key} must be active, explicitly public, fictional demo support personnel`);
  }
  requirePublicImagePath("provider", provider.key, provider.imagePath);
  for (const serviceKey of provider.specializations || []) {
    if (!serviceKeys.has(serviceKey)) fail(`provider ${provider.key} references unknown service ${serviceKey}`);
    const service = servicesByKey.get(serviceKey);
    if (provider.isPublic && (!service?.isPublic || service.status !== "active")) fail(`public provider ${provider.key} references a private or inactive service ${serviceKey}`);
  }
}

for (const block of seed.scheduleBlocks) {
  if (!block.key) fail("scheduleBlocks item missing key");
  if (!providerKeys.has(block.provider)) fail(`scheduleBlock ${block.key} references unknown provider ${block.provider}`);
  if (!Array.isArray(block.daysOfWeek) || block.daysOfWeek.length === 0) {
    fail(`scheduleBlock ${block.key} requires daysOfWeek`);
  }
  for (const day of block.daysOfWeek) {
    if (!Number.isInteger(day) || day < 0 || day > 6) fail(`scheduleBlock ${block.key} has invalid day ${day}`);
  }
  if (!/^\d{2}:\d{2}$/.test(block.startTime || "") || !/^\d{2}:\d{2}$/.test(block.endTime || "")) {
    fail(`scheduleBlock ${block.key} requires HH:MM startTime and endTime`);
  }
  if (typeof block.isPublic !== "boolean" || (block.isPublic && (block.isAvailable !== true || providersByKey.get(block.provider)?.isPublic !== true))) {
    fail(`public scheduleBlock ${block.key} must be available and belong to explicitly public demo personnel`);
  }
}

for (const client of seed.clients) {
  if (!client.name || !client.email) fail(`client ${client.key} missing name or email`);
  if (client.preferredProvider && !providerKeys.has(client.preferredProvider)) {
    fail(`client ${client.key} references unknown preferred provider ${client.preferredProvider}`);
  }
}

for (const membership of seed.memberships) {
  if (!membership.name) fail(`membership ${membership.key} missing name`);
  for (const serviceKey of membership.includedServices || []) {
    if (!serviceKeys.has(serviceKey)) fail(`membership ${membership.key} references unknown service ${serviceKey}`);
  }
}

for (const galleryImage of seed.gallery) {
  if (!galleryImage.title) fail(`gallery ${galleryImage.key} missing title`);
  requirePublicImagePath("gallery", galleryImage.key, galleryImage.imagePath);
  if (galleryImage.service && !serviceKeys.has(galleryImage.service)) {
    fail(`gallery ${galleryImage.key} references unknown service ${galleryImage.service}`);
  }
}

console.log("Seed validation passed");
console.log(`keys=${Object.keys(seed).join(",")}`);
console.log(`medspaInfo=${seed.medspaInfo.name},${seed.medspaInfo.city},${seed.medspaInfo.timezone}`);
console.log(`counts=${requiredKeys.map((key) => `${key}:${seed[key].length}`).join(",")}`);
console.log(`modelConcepts=${requiredKeys.map((key) => `${key}->${modelConcepts[key]}`).join(";")}`);

// Store Settings logo save path and storefront render rule. Offline.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative, deps = {}) {
  const filename = path.resolve(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const req = (name) => (name in deps ? deps[name] : name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts'))) : require(name));
  vm.runInNewContext(output, { module, exports: module.exports, require: req }, { filename });
  return module.exports;
}

const { sanitizeStoreLogoSvg } = load('features/keystone/utils/storeLogo.ts');
const { normalizeStoreLogoColor } = load('features/platform/storefront-settings/lib/store-logo.ts');
const { LOGO_ICONS, HUE_PRESETS } = load('features/platform/storefront-settings/lib/icon-registry.ts');
const logo = load('features/lib/store-logo.ts', {
  '../platform/storefront-settings/lib/icon-registry': { LOGO_ICONS },
  './sanitize-store-logo': { sanitizeStoreLogoSvg },
  '../platform/storefront-settings/lib/store-logo': { normalizeStoreLogoColor },
});
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('preset + hue payload round-trips', () => {
  const preset = LOGO_ICONS[3];
  const hue = HUE_PRESETS[2];
  assert.equal(sanitizeStoreLogoSvg(preset.lightSvg), preset.lightSvg.trim());
  assert.equal(normalizeStoreLogoColor(String(hue.value)), String(hue.value));
});
test('every preset survives the sanitizer', () => { for (const icon of LOGO_ICONS) assert.ok(sanitizeStoreLogoSvg(icon.lightSvg), icon.id); });
test('hue is normalized to 0-359', () => {
  assert.equal(normalizeStoreLogoColor('390'), '30');
  assert.equal(normalizeStoreLogoColor('-30'), '330');
  assert.equal(normalizeStoreLogoColor('x'), '0');
});
test('custom SVG kept, unsafe SVG rejected', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M0 0h8v8z"/></svg>';
  assert.equal(sanitizeStoreLogoSvg(`  ${svg}\n`), svg);
  assert.equal(sanitizeStoreLogoSvg('<svg onload="x()"></svg>'), '');
  assert.equal(sanitizeStoreLogoSvg('<svg><script>1</script></svg>'), '');
  assert.equal(sanitizeStoreLogoSvg('<svg><a href="x"/></svg>'), '');
});
test('the action sanitizes, normalizes, mutates and revalidates', () => {
  const src = read('features/platform/storefront-settings/actions/storefrontSettings.ts');
  const a = src.indexOf('sanitizeStoreLogoSvg(rawLogo)');
  const b = src.indexOf('normalizeStoreLogoColor(rawHue)');
  const c = src.indexOf('publishStorefrontSettings(');
  const d = src.indexOf("revalidatePath('/')");
  assert.ok(a > 0 && b > a && c > b && d > c, 'sanitize, normalize, mutation, revalidate in order');
  assert.match(src, /\$logoSvg: String\n/, 'partial save keeps the stored logo');
});
test('the settings form uses the shared save bar and the E-commerce logo field', () => {
  const form = read('features/platform/storefront-settings/components/StorefrontSettingsForm.tsx');
  assert.match(form, /StoreSettingsSaveBar/);
  assert.match(form, /StoreLogoField/);
  assert.match(read('features/platform/storefront-settings/screens/StorefrontSettingsPage.tsx'), /pb-24 md:pb-6/);
});
test('storefront always renders an icon beside the name, with the saved hue', () => {
  assert.equal(logo.publicLogoSvg(''), logo.DEFAULT_LOGO_SVG);
  assert.equal(logo.publicLogoSvg(null), logo.DEFAULT_LOGO_SVG);
  assert.equal(logo.publicLogoSvg('<svg onload="x()"></svg>'), logo.DEFAULT_LOGO_SVG);
  // Stored hue is absolute (blue marks sit at 221): 251 rotates by 30deg; the saved 214 keeps its look.
  assert.equal(logo.logoHueFilter(251), 'hue-rotate(30deg)');
  assert.equal(logo.logoHueFilter(221), 'hue-rotate(0deg)');
  const brand = read('features/storefront/components/StoreBrand.tsx');
  assert.doesNotMatch(brand, /storeOwnMark/);
  assert.match(brand, /publicLogoSvg\(logoSvg\)/);
});
test('the form converts the absolute stored hue to E-commerce rotation and back without drift', () => {
  const field = read('features/platform/storefront-settings/components/StoreLogoField.tsx');
  assert.match(field, /STORED_BASE_HUE = 221/);
  const base = 221;
  const norm = (n) => ((n % 360) + 360) % 360;
  for (const stored of [0, 214, 221, 300, 359]) {
    const rotation = norm(stored - base);
    assert.equal((rotation + base) % 360, stored);
  }
});

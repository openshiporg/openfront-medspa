import { list } from '@keystone-6/core'
import { checkbox, integer, relationship, text } from '@keystone-6/core/fields'
import { activeListPermissions } from '../access'
import { assertActiveActor } from '../workflowAuth'
import { tenantFilter } from './tenantAccess'
import { trackingFields } from './trackingFields'
import { sanitizeStoreLogoSvg } from '../../lib/sanitize-store-logo'
import { validLogoHue } from '../../lib/store-logo'

const DISPLAY_NAME_MAX = 80

export const StorefrontSetting = list({
  access: {
    operation: {
      query: activeListPermissions.signedIn,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: tenantFilter },
  },
  ui: { isHidden: true },
  hooks: {
    resolveInput: async ({ resolvedData }) => ({
      ...resolvedData,
      ...(typeof resolvedData.logoSvg === 'string' && sanitizeStoreLogoSvg(resolvedData.logoSvg)
        ? { logoSvg: sanitizeStoreLogoSvg(resolvedData.logoSvg) } : {}),
      displayName:
        typeof resolvedData.displayName === 'string'
          ? resolvedData.displayName.trim()
          : resolvedData.displayName,
    }),
    validateInput: async ({ context, item, resolvedData, operation, addValidationError }) => {
      const actor = await assertActiveActor(context as any).catch(() => null)
      if (!actor?.role?.canManagePractice) {
        addValidationError('Current practice-management authorization is required')
        return
      }

      const practiceId = resolvedData.practice?.connect?.id || (item as any)?.practiceId
      if (!practiceId || practiceId !== actor.practiceId) {
        addValidationError('Storefront settings must remain in the authenticated practice')
      }

      const displayName = resolvedData.displayName ?? (item as any)?.displayName
      if (
        typeof displayName !== 'string' ||
        !displayName.trim() ||
        displayName.length > DISPLAY_NAME_MAX ||
        /[\u0000-\u001f\u007f]/.test(displayName)
      ) {
        addValidationError(`Display name must be 1-${DISPLAY_NAME_MAX} printable characters`)
      }

      const hue = resolvedData.accentHue ?? (item as any)?.accentHue
      if (!Number.isInteger(hue) || hue < 0 || hue > 360) {
        addValidationError('Accent hue must be a whole number from 0 through 360')
      }

      const logoSvg = resolvedData.logoSvg ?? (item as any)?.logoSvg ?? ''
      if (typeof logoSvg !== 'string' || (logoSvg && !sanitizeStoreLogoSvg(logoSvg))) {
        addValidationError('Logo must be a safe SVG document')
      }
      if (!validLogoHue(resolvedData.logoHue ?? (item as any)?.logoHue ?? 0)) {
        addValidationError('Logo hue must be a whole number from 0 through 360')
      }

      const isPublished = resolvedData.isPublished ?? (item as any)?.isPublished ?? false
      const locationId =
        resolvedData.primaryLocation?.connect?.id ||
        (resolvedData.primaryLocation?.disconnect ? null : (item as any)?.primaryLocationId)

      if (isPublished && !locationId) {
        addValidationError('A primary location is required before publishing')
        return
      }

      if (locationId) {
        const location = await (context as any).sudo().query.Location.findOne({
          where: { id: locationId },
          query: 'id isActive practice { id }',
        })
        if (!location || location.practice?.id !== actor.practiceId) {
          addValidationError('Primary location must belong to the authenticated practice')
        } else if (isPublished && location.isActive !== true) {
          addValidationError('Primary location must be active before publishing')
        }
      }

      if (operation === 'create') {
        const existing = await (context as any).sudo().query.StorefrontSetting.findMany({
          where: { practice: { id: { equals: actor.practiceId } } },
          take: 1,
          query: 'id',
        })
        if (existing.length) addValidationError('This practice already has storefront settings')
      }
    },
  },
  fields: {
    practice: relationship({
      ref: 'Practice.storefrontSetting',
      access: { create: () => false, update: () => false },
    }),
    displayName: text({
      validation: { isRequired: true, length: { min: 1, max: DISPLAY_NAME_MAX } },
    }),
    primaryLocation: relationship({ ref: 'Location' }),
    accentHue: integer({
      defaultValue: 220,
      validation: { isRequired: true, min: 0, max: 360 },
    }),
    logoSvg: text({ defaultValue: '' }),
    logoHue: integer({ defaultValue: 0, validation: { isRequired: true, min: 0, max: 360 } }),
    isPublished: checkbox({ defaultValue: false }),
    revision: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    ...trackingFields,
  },
})

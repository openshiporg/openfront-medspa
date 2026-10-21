import { graphql } from '@keystone-6/core'
import type { Context } from '.keystone/types'
import { assertActiveActor } from '../workflowAuth'
import { serializableWorkflow } from './serializableWorkflow'
import { sanitizeStoreLogoSvg } from '../../lib/sanitize-store-logo'
import { DEFAULT_LOGO_SVG, validLogoHue } from '../../lib/store-logo'

const StorefrontSettingsResult = graphql.object<{ success: boolean; error: string | null }>()({
  name: 'StorefrontSettingsResult',
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    error: graphql.field({ type: graphql.String }),
  },
})

export const publishStorefrontSettings = graphql.field({
  type: graphql.nonNull(StorefrontSettingsResult),
  args: {
    displayName: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    primaryLocationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    accentHue: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    logoSvg: graphql.arg({ type: graphql.String }),
    logoHue: graphql.arg({ type: graphql.Int }),
    isPublished: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    expectedRevision: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
  },
  async resolve(_source, args, context: Context) {
    try {
      const actor = await assertActiveActor(context)
      if (actor.role?.canManagePractice !== true) throw new Error('Current practice-management authorization is required')
      const displayName = args.displayName.trim()
      if (!displayName || displayName.length > 80 || /[\u0000-\u001f\u007f]/.test(displayName)) throw new Error('Display name must be 1-80 printable characters')
      if (!validLogoHue(args.accentHue)) throw new Error('Accent hue must be a whole number from 0 through 360')
      if (args.logoHue != null && !validLogoHue(args.logoHue)) throw new Error('Logo hue must be a whole number from 0 through 360')
      const sanitized = args.logoSvg == null ? undefined : args.logoSvg.trim() ? sanitizeStoreLogoSvg(args.logoSvg) : ''
      if (args.logoSvg?.trim() && !sanitized) throw new Error('Logo must be a safe SVG document')
      if (!Number.isInteger(args.expectedRevision) || args.expectedRevision < 0) throw new Error('Settings revision is invalid')

      // All settings writers share the practice lock; revalidate current authority
      // inside the commit transaction, not just in the page or stale session.
      return await serializableWorkflow(context, 'medspa-storefront-settings', [actor.practiceId], async tx => {
        const current = await assertActiveActor(tx)
        if (current.practiceId !== actor.practiceId || !current.role.canManagePractice) throw new Error('Current practice-management authorization is required')
        const sudo = tx.sudo()
        const location = await sudo.query.Location.findOne({ where: { id: args.primaryLocationId }, query: 'id isActive practice { id }' })
        if (!location || location.practice?.id !== actor.practiceId) throw new Error('Primary location was not found')
        if (args.isPublished && !location.isActive) throw new Error('Primary location must be active before publishing')
        const rows = await sudo.query.StorefrontSetting.findMany({ where: { practice: { id: { equals: actor.practiceId } } }, take: 2, query: 'id revision logoSvg logoHue' })
        if (rows.length > 1) throw new Error('Storefront settings identity is ambiguous')
        const existing = rows[0]
        if ((existing?.revision ?? 0) !== args.expectedRevision) throw new Error('Storefront settings changed; reload before saving again')
        const data = {
          practice: { connect: { id: actor.practiceId } }, displayName,
          primaryLocation: { connect: { id: location.id } }, accentHue: args.accentHue,
          logoSvg: sanitized ?? existing?.logoSvg ?? DEFAULT_LOGO_SVG,
          logoHue: args.logoHue ?? existing?.logoHue ?? 0,
          isPublished: args.isPublished, revision: (existing?.revision ?? 0) + 1,
        }
        if (existing) await sudo.query.StorefrontSetting.updateOne({ where: { id: existing.id }, data, query: 'id' })
        else await sudo.query.StorefrontSetting.createOne({ data, query: 'id' })
        return { success: true, error: null }
      })
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Storefront settings could not be saved' }
    }
  },
})

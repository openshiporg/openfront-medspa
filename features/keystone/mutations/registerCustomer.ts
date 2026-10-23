import { graphql } from '@keystone-6/core'
import type { Context } from '.keystone/types'
import { serializableWorkflow } from './serializableWorkflow'
import { withinCustomerCreation } from '../customerCreation'
import { assertOwnedLocalDatabase } from '../localRuntime'
import { storefrontPracticeSlug } from '../lib/storefrontPractice'

const result = graphql.object<{ success: boolean; error: string | null }>()({
  name: 'CustomerRegistrationResult',
  fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), error: graphql.field({ type: graphql.String }) },
})

export const registerCustomer = graphql.field({
  type: graphql.nonNull(result),
  args: { name: graphql.arg({ type: graphql.nonNull(graphql.String) }), email: graphql.arg({ type: graphql.nonNull(graphql.String) }), password: graphql.arg({ type: graphql.nonNull(graphql.String) }) },
  async resolve(_source, args, context: Context) {
    const name = args.name.trim(), email = args.email.trim().toLowerCase()
    if (context.session?.itemId || !name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || args.password.length < 12 || args.password.length > 200) return { success: false, error: 'Enter a name, email and password of 12–200 characters.' }
    try {
      const slug = await storefrontPracticeSlug(context)
      if (!slug) throw new Error('Storefront is unavailable')
      await serializableWorkflow(context, 'medspa-customer-registration', [`identity:${email}`], async tx => {
        const sudo = tx.sudo()
        const practices = await sudo.query.Practice.findMany({ where: { slug: { equals: slug }, isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } }, take: 2, query: 'id isDemo storefrontSetting { primaryLocation { id practice { id } } }' })
        const practice = practices[0]
        if (practices.length !== 1 || !practice || practice.storefrontSetting?.primaryLocation?.practice?.id !== practice.id) throw new Error('Storefront is unavailable')
        if (practice.isDemo && !await assertOwnedLocalDatabase(tx.prisma)) throw new Error('Fictional runtime is unavailable')
        if (await sudo.query.User.count({ where: { email: { equals: email } } })) throw new Error('Account cannot be created')
        // Never attach an existing User/Client/guest booking based on email.
        await withinCustomerCreation(tx, { practiceId: practice.id, email, name }, async () => {
          const user = await sudo.query.User.createOne({ data: { name, email, password: args.password, practice: { connect: { id: practice.id } }, status: 'active', onboardingStatus: 'dismissed' }, query: 'id' })
          await sudo.query.Client.createOne({ data: { practice: { connect: { id: practice.id } }, user: { connect: { id: user.id } }, homeLocation: { connect: { id: practice.storefrontSetting.primaryLocation.id } } }, query: 'id' })
        })
      })
      return { success: true, error: null }
    } catch {
      return { success: false, error: 'Account could not be created. Sign in if you already have an account.' }
    }
  },
})

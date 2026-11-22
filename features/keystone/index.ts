import { s3ForcePathStyle } from "./lib/s3-storage";
import { createAuth } from '@keystone-6/auth'
import { config } from '@keystone-6/core'
import { statelessSessions } from '@keystone-6/core/session'
import 'dotenv/config'
import { models } from './models'
import { extendGraphqlSchema } from './mutations'
import { sendPasswordResetEmail } from './lib/mail'
import { permissions } from './access'
import { assertOwnedLocalDatabase, localRuntimeDescriptor } from './localRuntime'
import { pooledDatabaseUrl } from './database-url';
import { throwKeystonePrismaErrors } from './lib/keystonePrismaErrors';

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const databaseURL = required('DATABASE_URL')
const localRuntime = localRuntimeDescriptor()
const sessionSecret = required('SESSION_SECRET')
if (sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')

const { withAuth } = createAuth({
  listKey: 'User',
  identityField: 'email',
  secretField: 'password',
  initFirstItem: {
    fields: ['name', 'email', 'password'],
    itemData: {
      role: {
        create: {
          name: 'Practice Owner',
          canManagePeople: true,
          canManageRoles: true,
          canAccessDashboard: true,
          canManageOnboarding: true,
          canManagePractice: true,
          canSchedule: true,
          canReadClients: true,
          canManageClinical: true,
          canManageSensitiveRecords: true,
          canManageInventory: true,
          canManageFinance: true,
          canManageCommunications: true,
          canViewReports: true,
          canManageIntegrations: true,
        },
      },
    },
  },
  passwordResetLink: {
    // A client may open the email later from their phone; an hour matches what the copy promises.
    tokensValidForMins: 60,
    async sendToken(args) {
      // Clients have no staff role: their link opens the storefront reset page, not the staff one.
      const user = await args.context.sudo().query.User.findOne({ where: { id: String(args.itemId) }, query: 'role { id }' })
      try {
        await sendPasswordResetEmail(args.token, args.identity, undefined, user?.role?.id ? '/dashboard/reset' : '/account/reset')
      } catch (error) {
        // A permanent recipient refusal (5xx, e.g. a domain that cannot receive mail) is about the address, not the
        // service. Answer like any other address so the page neither blames the practice nor reveals the account.
        const message = error instanceof Error ? error.message : String(error)
        if (!/\b5\d\d\b/.test(message)) throw error
        console.warn('Password reset email refused by the mail service', { message })
      }
    },
  },
  sessionData: `
    name
    email
    status
    practice { id }
    locations { id }
    role {
      id name
      canManagePeople canManageRoles canAccessDashboard canManageOnboarding
      canManagePractice canSchedule canReadClients canManageClinical
      canManageSensitiveRecords canManageInventory canManageFinance
      canManageCommunications canViewReports canManageIntegrations
    }
  `,
})

export default withAuth(config({
  db: { provider: 'postgresql', url: pooledDatabaseUrl(databaseURL), extendPrismaClient: throwKeystonePrismaErrors, onConnect: async context => { await assertOwnedLocalDatabase(context.prisma) } },
  lists: models,
  storage: {
    my_images: localRuntime ? {
      kind: 'local',
      type: 'image',
      storagePath: '.runtime/medspa-goal/public-images',
      generateUrl: path => `/images/local/${path.replace(/^\/+/, '')}`,
      serverRoute: { path: '/images/local' },
    } : {
      kind: 's3',
      type: 'image',
      bucketName: required('S3_BUCKET_NAME'),
      region: required('S3_REGION'),
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
      endpoint: required('S3_ENDPOINT'),
      signed: { expiry: 300 },
      forcePathStyle: s3ForcePathStyle(required('S3_ENDPOINT')),
    },
  },
  ui: { isAccessAllowed: ({ session }) => permissions.canAccessDashboard({ session }) },
  session: statelessSessions({
    maxAge: 60 * 60 * 24 * 7,
    secret: sessionSecret,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  }),
  graphql: { extendGraphqlSchema },
}))

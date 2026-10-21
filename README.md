# Openfront Med Spa

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopenshiporg%2Fopenfront-medspa&env=DATABASE_URL%2CSESSION_SECRET%2CS3_BUCKET_NAME%2CS3_REGION%2CS3_ACCESS_KEY_ID%2CS3_SECRET_ACCESS_KEY)

Openfront Med Spa is a self-hostable medical-aesthetics booking and practice-operations application. Clients can discover services and providers, book appointments, and manage visits. Practice teams coordinate scheduling, intake, treatment plans, consent, clinical records, checkout, inventory, memberships, packages, and commissions.

## Demo

![Service illustration included with the Med Spa storefront](public/images/services/custom-clinical-facial.svg)

Explore the application locally using the setup instructions below.

| | |
|---|---|
| **Public application** | `/` on your development URL |
| **Dashboard** | `/dashboard` on your development URL |

[Learn more →](https://openship.org/products/openfront-medspa)

[Documentation →](features/keystone/models)

## The Openfront Ecosystem

Openfront is part of an ecosystem of open-source commerce tools:

- **[Openfront E-commerce](https://github.com/openshiporg/openfront)**: Headless e-commerce for retail.
- **[Openfront Restaurant](https://github.com/openshiporg/openfront-restaurant)**: Restaurant ordering, point of sale, and kitchen operations.
- **[Openship](https://github.com/openshiporg/openship)**: Order routing for multi-channel fulfillment.
- **Openfront Med Spa**: (This repository) a self-hostable medical-aesthetics booking and practice-operations application.

## Core Features

### Admin Dashboard
Manage commissions, clients, storefront, appointments, catalog, resources, schedules, checkout, engagement, integrations, inventory, benefits through dedicated dashboard workspaces and permission-controlled data screens.

### Storefront
Public routes include `/services`, `/providers`, `/book`, `/appointments`, `/account`, gift cards, gallery, and reviews. Appointment and treatment-plan journeys connect client booking to practice workflows.

### Scheduling & Practice Operations
Coordinate provider availability, resources, appointment reservations, waitlists, clients, checkout, retail sales, and reports.

### Treatment & Clinical Authority
Manage consultations, treatment plans, clinical orders, provider credentials and authorization, consent versions, treatment sessions, administrations, and signed records. Clinical execution remains subject to recorded authority and readiness checks.

### Inventory & Client Retention
Track inventory custody, lots, receiving, recalls, packages, memberships, loyalty, follow-up, incidents, and commissions. Medical use requires jurisdiction-specific clinical policy, approved infrastructure, and professional review.

## Architecture

### Technology Stack
- **Frontend**: Next.js 16 with App Router and React 19.
- **Backend**: KeystoneJS 6 with a GraphQL API.
- **Database**: PostgreSQL with Prisma ORM.
- **Styling**: Tailwind CSS 4 and shared shadcn/ui components.
- **Authentication**: Password-based user accounts and session-based access with role capabilities.

### Application Structure
```text
openfront-medspa/
├── app/                    # Public pages, dashboard routes, and HTTP endpoints
├── features/
│   ├── keystone/           # Backend models, access rules, and GraphQL workflows
│   ├── platform/           # Operator workspaces and onboarding
│   ├── storefront/         # Public application components and screens
│   └── dashboard/          # Authentication and shared dashboard shell
└── components/             # Shared UI components
```

### Data Models
The [model registry](features/keystone/models/index.ts) and [Prisma schema](schema.prisma) cover:

- Practices, locations, memberships, providers, credentials, schedules, and resources.
- Clients, appointments, consultations, treatment plans, clinical orders, consent, and sessions.
- Products, vendors, purchasing, receiving, inventory lots, movements, and recalls.
- Transactions, payments, refunds, memberships, packages, gift cards, commissions, follow-up, and governance records.

## Getting Started

### Prerequisites
- Node.js 22, compatible with the [package requirements](package.json) and Next.js 16.
- A PostgreSQL database you can migrate.
- npm.
- Working S3-compatible storage, including its endpoint and credentials.

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/openshiporg/openfront-medspa.git
   cd openfront-medspa
   npm install
   ```

2. **Configure environment variables:**
   Create a local `.env` file using the [runtime configuration](features/keystone/index.ts) as the authority.

   ```env
   DATABASE_URL=postgresql://user:password@host/database
   SESSION_SECRET=replace-with-a-new-private-random-secret
   S3_BUCKET_NAME=your-bucket
   S3_REGION=your-region
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   ```

   Generate the session secret with `openssl rand -hex 32`; use the generated value, not the placeholder. Never commit `.env`.

   This app also requires working S3-compatible storage at configuration load time. Supply the bucket, region, credentials, and endpoint according to [runtime configuration](features/keystone/index.ts); the endpoint is configured separately from the four storage values above.

3. **Start development server:**
   ```bash
   npx keystone build --no-ui
   npm run migrate
   npm run dev
   ```

   Apply migrations explicitly: the development script prepares the backend schema and starts Next.js, but does not apply database migrations.

4. **Access the application:**
   Open the URL `npm run dev` prints, then use these paths:

   - **Public application**: `/`
   - **Admin dashboard**: `/dashboard`
   - **GraphQL API**: `/api/graphql`

5. **Create your first admin user:**
   Visit `/dashboard/init` on an empty database to create the initial administrator, then sign in to the dashboard.

6. **Run application onboarding:**
   Run practice onboarding, then review practice membership, locations, provider credentials, service eligibility, schedules, resources, clinical policies, and checkout configuration.

## Development Commands

- `npm run dev` - Prepare the backend schema, and start Next.js development.
- `npm run build` - Build the backend and Next.js for production; does not apply migrations.
- `npm start` - Start the production Next.js server.
- `npm run migrate:gen` - Prepare the schema and generate/apply development migrations.
- `npm run migrate` - Apply checked-in Prisma migrations.
- `npm run lint` - Run the repository's ESLint script.
- `npm run test` - Run the repository's configured test suite.

Use a disposable development database for migration generation. Review the script before running it against any existing data.

### Payment & Clinical Workflows
The [payment loader](features/integrations/payment/index.ts) includes manual and Stripe adapters. The [registered clinical commands](features/keystone/mutations/index.ts) cover treatment authority, plan approval, consent, safety, and clinical record actions; a payment does not confer treatment authorization.

## Documentation

The [backend models](features/keystone/models), [registered business workflows](features/keystone/mutations/index.ts), [access rules](features/keystone/access.ts), and [application routes](app) document the implementation in this repository.

## Security & Permissions

### Role-Based Access Control
- `canAccessDashboard` - Access dashboard.
- `canSchedule` - Schedule.
- `canReadClients` - Read clients.
- `canManageClinical` - Manage clinical.
- `canManageSensitiveRecords` - Manage sensitive records.
- `canManageInventory` - Manage inventory.
- `canManageFinance` - Manage finance.

### Security Features
- Session-based authentication for signed-in users.
- Backend list access and workflow authorization, rather than dashboard visibility alone.
- Current-actor checks bind active users and roles to a practice. Scheduling, client reads, clinical operations, sensitive records, inventory, and finance are separate capabilities; practice ownership alone is not a claim of clinical licensure.

Review the [access implementation](features/keystone/access.ts) and individual workflow checks before extending permissions.

## Platform Components

### Admin Platform (`/dashboard`)
- **Commissions**: `/dashboard/platform/commissions`.
- **Clients**: `/dashboard/platform/clients`.
- **Storefront**: `/dashboard/platform/storefront`.
- **Appointments**: `/dashboard/platform/appointments`.
- **Catalog**: `/dashboard/platform/catalog`.
- **Resources**: `/dashboard/platform/resources`.
- **Schedules**: `/dashboard/platform/schedules`.
- **Checkout**: `/dashboard/platform/checkout`.
- **Engagement**: `/dashboard/platform/engagement`.
- **Integrations**: `/dashboard/platform/integrations`.
- **Inventory**: `/dashboard/platform/inventory`.
- **Benefits**: `/dashboard/platform/benefits`.

### Storefront Experience
Public routes include `/services`, `/providers`, `/book`, `/appointments`, `/account`, gift cards, gallery, and reviews. Appointment and treatment-plan journeys connect client booking to practice workflows.

Coordinate provider availability, resources, appointment reservations, waitlists, clients, checkout, retail sales, and reports.

## Deployment

### Production Deployment
The Vercel button imports this application's own repository. Provision PostgreSQL and configure the application's complete runtime requirements, storage, mail, and enabled providers before building. Importing the source does not configure these services or grant regulatory approval.

Build the application and apply checked-in migrations as a release step before starting the server. Back up existing data before migration.

```bash
npm run build
npm run migrate
npm start
```

The included [Railway configuration](railway.toml) defines this app's build and startup lifecycle. Provision services and secrets separately.

### Scaling Considerations
Keep the shared PostgreSQL database, session secrets, and configured object storage consistent across application processes. Review background delivery and integration requirements before choosing a serverless runtime; a source import does not supply persistent workers.

## Contributing

Use the development commands above when preparing changes. Keep model changes and their migrations together, and describe workflow and permission changes in pull requests.

## License

No top-level license file or package license declaration is included in this repository.

## Support

- **Documentation**: [Source models and workflows](features/keystone/models).
- **Issues**: [Report bugs and feature requests](https://github.com/openshiporg/openfront-medspa/issues).
- **Product**: [Learn more about Openfront Med Spa](https://openship.org/products/openfront-medspa).

---

Built with [Next.js](https://nextjs.org) and [KeystoneJS](https://keystonejs.com).

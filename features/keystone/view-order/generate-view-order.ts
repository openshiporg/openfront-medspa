import { getContext } from '@keystone-6/core/context'
import * as PrismaModule from '@prisma/client'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../index'

// Use the pinned native initialised graph, not a copied partial Keystone engine.
// Traversal/omission order matches Core 6.5.3 create-admin-meta getViewId.
export async function main() {
  const context = getContext(config, PrismaModule)
  try {
    const lists = context.__internal.lists
    const omitted = new Set(Object.entries(lists).filter(([, list]) => !list.graphql.isEnabled.query).map(([key]) => key))
    const views: string[] = []
    const add = (view: string) => { if (!views.includes(view)) views.push(view) }
    for (const [key, list] of Object.entries(lists)) {
      if (omitted.has(key)) continue
      for (const field of Object.values(list.fields)) {
        if (field.dbField.kind === 'relation' && omitted.has(field.dbField.list)) continue
        if (Object.values(field.graphql.isEnabled).every(value => value === false)) continue
        add(field.views)
        if (field.ui.views !== null) add(field.ui.views)
      }
    }
    const names = views.map(view => {
      if (view === '@keystone-6/core/___internal-do-not-use-will-break-in-patch/admin-ui/id-field-view') return 'id'
      if (view === '@keystone-6/fields-document/views') return 'document'
      const match = /^@keystone-6\/core\/fields\/types\/([^/]+)\/views$/.exec(view)
      if (!match) throw new Error(`Unregistered dashboard field view: ${view}`)
      return match[1]
    })
      // The dashboard resolver prepends the id view itself (['id', ...VIEW_ORDER]),
      // so emitting it here would shift every field type by one.
      .filter(name => name !== 'id')
    writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), `/** Generated from the pinned native Keystone model graph. Do not edit. */\nexport const VIEW_ORDER = ${JSON.stringify(names, null, 2)};\n`)
    console.log(`Generated native view order (${names.length}): ${names.join(', ')}`)
  } finally {
    await context.prisma.$disconnect()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => { console.error(error); process.exitCode = 1 })
}

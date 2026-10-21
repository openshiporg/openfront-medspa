import { constants } from 'node:fs'
import { open } from 'node:fs/promises'
import { resolve } from 'node:path'
import { keystoneContext } from './context'
import { assertOwnedLocalDatabase, localRuntimeDescriptor } from './localRuntime'

/** Public catalog images only; private clinical assets never use this storage. */
export async function serveOwnedCatalogImage(filename: string): Promise<Response> {
  const match = /^([A-Za-z0-9_-]{10,64})\.(jpg|png|webp|gif)$/.exec(filename)
  if (!match || !localRuntimeDescriptor()) return new Response(null, { status: 404 })
  await assertOwnedLocalDatabase(keystoneContext.prisma)
  const image = await keystoneContext.prisma.medSpaImage.findFirst({
    where: { image_id: match[1], image_extension: match[2], practice: { isDemo: true, isActive: true, storefrontSetting: { isPublished: true, primaryLocation: { isActive: true } } } },
    select: { id: true },
  })
  if (!image) return new Response(null, { status: 404 })
  const directory = resolve(process.cwd(), '.runtime/medspa-goal/public-images')
  try {
    const file = await open(resolve(directory, filename), constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const bytes = await file.readFile()
      const mime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[match[2]]!
      return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=60' } })
    } finally { await file.close() }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ELOOP') return new Response(null, { status: 404 })
    throw error
  }
}

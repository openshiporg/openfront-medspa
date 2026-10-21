import { serveOwnedCatalogImage } from '@/features/keystone/localImages'

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  return serveOwnedCatalogImage((await params).filename)
}

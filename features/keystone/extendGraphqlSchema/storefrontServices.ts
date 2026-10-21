import { graphql } from '@keystone-6/core';
import type { Context } from '.keystone/types';

/** Backend-owned public presentation, not permission to traverse raw relationships. */
export async function readStorefrontServices(context: Context, ids: readonly string[]) {
  if (ids.length > 100 || ids.some(id => typeof id !== 'string' || !id || id.length > 200)) throw new Error('Invalid service selection');
  const slug = process.env.MEDSPA_PRACTICE_SLUG?.trim();
  if (!slug) throw new Error('Storefront practice is not configured');
  const practices = await context.sudo().query.Practice.findMany({
    where: { slug: { equals: slug }, isActive: { equals: true } }, take: 2,
    query: 'id storefrontSetting { isPublished primaryLocation { isActive practice { id } } }',
  });
  const practice = practices.length === 1 ? practices[0] : null;
  if (!practice?.storefrontSetting?.isPublished || practice.storefrontSetting.primaryLocation?.isActive !== true
    || practice.storefrontSetting.primaryLocation.practice?.id !== practice.id) return [];
  if (!ids.length) return [];
  const services = await context.sudo().query.Service.findMany({
    where: { id: { in: [...ids] }, practice: { id: { equals: practice.id } }, status: { equals: 'active' }, isPublic: { equals: true } },
    take: 100, orderBy: { id: 'asc' },
    query: 'id name baseDuration price category { id name isVisible practice { id } } image { image { url } imagePath altText practice { id } }',
  });
  return services.map(service => ({
    id: service.id, name: service.name, baseDuration: service.baseDuration, basePrice: service.price,
    category: service.category?.practice?.id === practice.id && service.category.isVisible === true
      ? { id: service.category.id, name: service.category.name } : null,
    image: service.image?.practice?.id === practice.id
      ? { image: service.image.image ? { url: service.image.image.url } : null, imagePath: service.image.imagePath || null, altText: service.image.altText || null } : null,
  }));
}

export const storefrontServices = graphql.field({
  type: graphql.JSON,
  args: { ids: graphql.arg({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }) },
  resolve(_source, args, context: Context) { return readStorefrontServices(context, args.ids); },
});

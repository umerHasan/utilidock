import type { MetadataRoute } from 'next';
import { categories, getPublishedUtilities } from '@/lib/registry';
import { SITE_URL } from '@/lib/limits';
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: SITE_URL, changeFrequency: 'weekly', priority: 1 }, { url: `${SITE_URL}/tools`, changeFrequency: 'weekly', priority: .8 }, { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: .2 }, { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: .2 }, ...categories.map((category) => ({ url: `${SITE_URL}/tools/${category.slug}`, changeFrequency: 'monthly' as const, priority: .7 })), ...getPublishedUtilities().map((tool) => ({ url: `${SITE_URL}/tools/${tool.category}/${tool.slug}`, changeFrequency: 'monthly' as const, priority: .8 }))]; }

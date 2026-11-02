export const FILE_LIMITS = { count: 20, bytesPerFile: 50 * 1024 * 1024, label: 'Up to 20 files, 50 MB each' } as const;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utilidock.example';

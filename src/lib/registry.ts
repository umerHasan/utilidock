import { Calculator, Clock3, FileImage, Files, FileText, Globe2, Users, type LucideIcon } from 'lucide-react';

export type Category = { id: string; name: string; description: string; icon: LucideIcon; slug: string };
export type Utility = {
  id: string; name: string; slug: string; category: string; description: string;
  icon: LucideIcon; keywords: string[]; status: 'active' | 'draft'; featured: boolean;
  seoTitle: string; seoDescription: string; component: 'image-to-pdf' | 'merge-pdf' | 'bill-splitter' | 'attendance-tracker' | 'world-map';
};

export const categories: Category[] = [
  { id: 'pdf', name: 'PDF tools', description: 'Simple tools to create and organize PDFs.', icon: FileText, slug: 'pdf' },
  { id: 'money', name: 'Money tools', description: 'Simple tools to split shared expenses.', icon: Calculator, slug: 'money' },
  { id: 'time', name: 'Time tools', description: 'Track attendance and compare your worked hours with your schedule.', icon: Clock3, slug: 'time' },
  { id: 'geography', name: 'Geography tools', description: 'Explore and annotate the world together.', icon: Globe2, slug: 'geography' },
];

export const utilities: Utility[] = [
  { id: 'pdf-image-to-pdf', name: 'Image to PDF', slug: 'image-to-pdf', category: 'pdf', description: 'Turn JPG, PNG, and WebP images into a neatly ordered PDF.', icon: FileImage, keywords: ['jpg', 'jpeg', 'png', 'webp', 'convert', 'photos'], status: 'active', featured: true, seoTitle: 'Image to PDF converter', seoDescription: 'Convert and arrange JPG, PNG, and WebP images into a PDF in your browser.', component: 'image-to-pdf' },
  { id: 'pdf-merge-pdf', name: 'Merge PDF', slug: 'merge-pdf', category: 'pdf', description: 'Combine PDF documents in the order you choose.', icon: Files, keywords: ['combine', 'join', 'documents', 'pages'], status: 'active', featured: true, seoTitle: 'Merge PDF files', seoDescription: 'Combine multiple PDF files in your chosen order, right in your browser.', component: 'merge-pdf' },
  { id: 'money-bill-splitter', name: 'Bill Splitter', slug: 'bill-splitter', category: 'money', description: 'Split a shared bill by person, item, tax, and extra charges.', icon: Users, keywords: ['bill', 'split', 'expense', 'tax', 'delivery', 'tip', 'people'], status: 'active', featured: true, seoTitle: 'Bill splitter', seoDescription: 'Split a shared bill by person and item, with proportional tax and flexible extra charges.', component: 'bill-splitter' },
  { id: 'time-attendance-tracker', name: 'Attendance Hours Tracker', slug: 'attendance-tracker', category: 'time', description: 'Compare monthly attendance with scheduled hours and see overtime or shortfall.', icon: Clock3, keywords: ['attendance', 'work', 'hours', 'shift', 'overtime', 'shortfall', 'timesheet'], status: 'active', featured: true, seoTitle: 'Attendance hours tracker', seoDescription: 'Track monthly attendance against your scheduled shifts or hours and check overtime or shortfall as you go.', component: 'attendance-tracker' },
  { id: 'geography-world-map', name: 'World Map', slug: 'world-map', category: 'geography', description: 'Color countries, draw, and bring your ideas to the map.', icon: Globe2, keywords: ['geography', 'countries', 'atlas', 'history', 'politics', 'classroom'], status: 'active', featured: true, seoTitle: 'Interactive world map', seoDescription: 'Color and annotate an interactive world map for learning, teaching, and discussion.', component: 'world-map' },
];

export const getPublishedUtilities = () => utilities.filter((tool) => tool.status === 'active');
export const getCategory = (slug: string) => categories.find((category) => category.slug === slug);
export const getUtility = (category: string, slug: string) => utilities.find((tool) => tool.category === category && tool.slug === slug && tool.status === 'active');
export const getCategoryUtilities = (slug: string) => getPublishedUtilities().filter((tool) => tool.category === slug);
export const searchUtilities = (query: string) => {
  const term = query.trim().toLowerCase();
  if (!term) return getPublishedUtilities();
  return getPublishedUtilities().filter((tool) => [tool.name, tool.description, ...tool.keywords].join(' ').toLowerCase().includes(term));
};

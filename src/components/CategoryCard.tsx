import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Category } from '@/lib/registry';
export function CategoryCard({ category, count }: { category: Category; count: number }) { const Icon = category.icon; return <Link href={`/tools/${category.slug}`} className="category-card"><span className="category-icon"><Icon size={23}/></span><span><strong>{category.name}</strong><small>{count} useful tools</small></span><ArrowUpRight className="tool-arrow" size={18}/></Link> }

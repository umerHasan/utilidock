import type { Metadata } from 'next';
import { categories, getCategoryUtilities, getPublishedUtilities } from '@/lib/registry';
import { ToolCard } from '@/components/ToolCard';
import { CategoryCard } from '@/components/CategoryCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ToolSearch } from '@/components/ToolSearch';
export const metadata: Metadata = { title: 'All tools', description: 'Browse every free utility available on UtiliDock.', alternates: { canonical: '/tools' }, openGraph: { title: 'All tools | UtiliDock', description: 'Browse every free utility available on UtiliDock.' } };
export default function ToolsPage() { return <div className="page-shell container"><Breadcrumbs items={[{ label: 'All tools' }]}/><section className="page-intro"><span className="eyebrow">THE TOOLBOX</span><h1>Find the right tool.</h1><p>Focused utilities for the digital tasks you do every day.</p><ToolSearch/></section><section className="listing-section" id="categories"><h2>Categories</h2><div className="category-grid">{categories.map((category) => <CategoryCard key={category.id} category={category} count={getCategoryUtilities(category.slug).length}/>)}</div></section><section className="listing-section"><h2>All tools <small>{getPublishedUtilities().length}</small></h2><div className="tool-grid">{getPublishedUtilities().map((tool) => <ToolCard key={tool.id} tool={tool}/>)}</div></section></div> }

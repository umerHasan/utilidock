'use client';
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchUtilities } from '@/lib/registry';
import { ToolCard } from './ToolCard';
export function ToolSearch() { const [query, setQuery] = useState(''); const results = useMemo(() => searchUtilities(query), [query]); return <div className="search-wrap"><label className="search-field"><Search size={20}/><input aria-label="Search tools" placeholder="Try “merge PDF” or “convert images”" value={query} onChange={(e) => setQuery(e.target.value)}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={17}/></button>}</label>{query && <div className="search-results" aria-live="polite">{results.length ? results.map((tool) => <ToolCard key={tool.id} tool={tool}/>) : <p>No tools match “{query}”. Try another search.</p>}</div>}</div> }

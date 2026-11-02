import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Utility } from '@/lib/registry';
export function ToolCard({ tool }: { tool: Utility }) { const Icon = tool.icon; return <Link href={`/tools/${tool.category}/${tool.slug}`} className="tool-card"><span className="tool-icon"><Icon size={22}/></span><span className="tool-copy"><strong>{tool.name}</strong><small>{tool.description}</small></span><ArrowUpRight size={18} className="tool-arrow"/></Link> }

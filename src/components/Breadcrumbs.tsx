import Link from 'next/link';
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) { return <nav aria-label="Breadcrumb" className="breadcrumbs"><Link href="/">Home</Link>{items.map((item, i) => <span key={i}><b>/</b>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}</nav> }

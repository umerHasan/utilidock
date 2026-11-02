import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.scss';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SITE_URL } from '@/lib/limits';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), title: { default: 'UtiliDock — Everyday tools, one place', template: '%s | UtiliDock' },
  description: 'Simple, useful tools for everyday digital tasks. Convert images and organize PDFs right in your browser.',
  openGraph: { type: 'website', siteName: 'UtiliDock', title: 'UtiliDock — Everyday tools, one place', description: 'Simple, useful tools for everyday digital tasks.' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-scroll-behavior="smooth"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>; }

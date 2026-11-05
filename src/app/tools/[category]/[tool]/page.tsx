import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BillSplit } from '@/components/BillSplit';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ImageToPdf } from '@/components/ImageToPdf';
import { MergePdf } from '@/components/MergePdf';
import { getCategory, getUtility, utilities, type Utility } from '@/lib/registry';

const instructions: Record<Utility['component'], string[]> = {
  'image-to-pdf': [
    'Add JPG, PNG, or WebP images from your device.',
    'Arrange the images and choose page settings.',
    'Create and download your PDF.',
  ],
  'merge-pdf': [
    'Add at least two PDF documents.',
    'Arrange them in the order you want.',
    'Merge and download the finished PDF.',
  ],
  'bill-splitter': [
    'Enter the final receipt total, then add people and each person’s items.',
    'Enter tax as a percentage or fixed amount; tax is split by item subtotals.',
    'Add any extra charges, choose how each charge is split, and check the totals.',
  ],
};

const faqs: Record<Utility['component'], Array<{ question: string; answer: string }>> = {
  'image-to-pdf': [
    { question: 'Which image formats can I convert?', answer: 'JPG, JPEG, PNG, and WebP images that your browser can decode are supported.' },
    { question: 'Will my images be stretched?', answer: 'No. Images keep their proportions and are fitted within each page.' },
    { question: 'Are my files uploaded?', answer: 'No. Conversion takes place locally in your browser.' },
  ],
  'merge-pdf': [
    { question: 'Are PDF pages rasterized?', answer: 'No. Pages are copied into a new PDF, preserving their original dimensions and contents.' },
    { question: 'Can I merge password-protected PDFs?', answer: 'Password-protected files cannot be processed. Remove the password before adding the file.' },
    { question: 'Are files uploaded?', answer: 'No. Merging takes place locally in your browser.' },
  ],
  'bill-splitter': [
    { question: 'How is tax split?', answer: 'Tax is allocated in proportion to each person’s item subtotal. You can enter a tax percentage or the total tax amount.' },
    { question: 'Can delivery or other charges be split equally?', answer: 'Yes. For each extra charge, choose an equal split or a split proportional to item subtotals.' },
    { question: 'Does the receipt total change anyone’s share?', answer: 'No. The receipt total is used to show whether your entered items, tax, and charges reconcile. The difference is not silently assigned.' },
    { question: 'Are my bill details saved or uploaded?', answer: 'No. All bill calculations stay in this page and are not saved or uploaded.' },
  ],
};

export function generateStaticParams() {
  return utilities.filter((tool) => tool.status === 'active').map((tool) => ({ category: tool.category, tool: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; tool: string }> }): Promise<Metadata> {
  const { category, tool: slug } = await params;
  const tool = getUtility(category, slug);
  if (!tool) return {};
  return {
    title: tool.seoTitle,
    description: tool.seoDescription,
    alternates: { canonical: `/tools/${category}/${slug}` },
    openGraph: { title: tool.seoTitle, description: tool.seoDescription, type: 'website' },
  };
}

export default async function UtilityPage({ params }: { params: Promise<{ category: string; tool: string }> }) {
  const { category: slug, tool: toolSlug } = await params;
  const tool = getUtility(slug, toolSlug);
  const category = getCategory(slug);
  if (!tool || !category) notFound();

  const Icon = tool.icon;
  const component = tool.component === 'image-to-pdf'
    ? <ImageToPdf />
    : tool.component === 'merge-pdf'
      ? <MergePdf />
      : <BillSplit />;

  return (
    <div className="page-shell container utility-page">
      <Breadcrumbs items={[
        { label: 'All tools', href: '/tools' },
        { label: category.name, href: `/tools/${category.slug}` },
        { label: tool.name },
      ]} />
      <section className="utility-intro">
        <span className="eyebrow"><Icon size={15} /> {category.name}</span>
        <h1>{tool.name}</h1>
        <p>{tool.description}</p>
      </section>
      {component}
      <section className="instructions">
        <div>
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>{tool.name}, in a few steps.</h2>
        </div>
        <ol>
          {instructions[tool.component].map((step, index) => (
            <li key={step}><span>0{index + 1}</span><p>{step}</p></li>
          ))}
        </ol>
      </section>
      <section className="faq-section tool-faq">
        <span className="eyebrow">FAQ</span>
        <h2>Questions, answered.</h2>
        <div className="faq-list">
          {faqs[tool.component].map(({ question, answer }) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/use-language';

export default function NotFound() {
  const [language] = useLanguage();
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-bg px-4 text-ink">
      <section className="card w-full max-w-xl p-8 sm:p-10">
        <p className="eyebrow">{t(language, 'Route not found', 'पता नहीं मिला')}</p>
        <h1 className="h1 mt-2">{t(language, 'There is no case at this address.', 'इस पते पर कोई केस नहीं है।')}</h1>
        <p className="lede mt-3">{t(language, 'Challan Jaanch keeps cases in the current browser session and does not create public case URLs.', 'चालान जाँच केस को सिर्फ़ मौजूदा ब्राउज़र सत्र में रखता है और सार्वजनिक केस लिंक नहीं बनाता।')}</p>
        <Link href="/" className="btn btn-primary mt-6">{t(language, 'Return to Challan Jaanch', 'चालान जाँच पर लौटें')}</Link>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/use-language';

export default function NotFound() {
  const [language] = useLanguage();
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[#f3f1ec] px-5 text-[#172a33]">
      <section className="professional-card w-full max-w-xl rounded-[18px] p-8 sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'Route not found', 'पता नहीं मिला')}</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">{t(language, 'There is no case at this address.', 'इस पते पर कोई केस नहीं है।')}</h1>
        <p className="mt-4 text-sm leading-7 text-[#61706c]">{t(language, 'Challan Jaanch keeps cases in the current browser session and does not create public case URLs.', 'चालान जाँच केस को सिर्फ़ मौजूदा ब्राउज़र सत्र में रखता है और सार्वजनिक केस लिंक नहीं बनाता।')}</p>
        <Link href="/" className="mt-7 inline-block rounded-lg bg-[#172a33] px-5 py-3 text-sm font-black text-white">{t(language, 'Return to Challan Jaanch', 'चालान जाँच पर लौटें')}</Link>
      </section>
    </main>
  );
}

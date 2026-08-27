'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/use-language';

export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [language] = useLanguage();
  useEffect(() => {
    console.error('Challan Jaanch recovered from an application error.', error);
  }, [error]);

  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[#f3f1ec] px-5 text-[#172a33]">
      <section className="professional-card w-full max-w-xl rounded-[18px] p-8 sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a13d2a]">{t(language, 'Safe recovery', 'सुरक्षित वापसी')}</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">{t(language, 'This screen could not finish loading.', 'यह स्क्रीन पूरी तरह लोड नहीं हो सकी।')}</h1>
        <p className="mt-4 text-sm leading-7 text-[#61706c]">{t(language, 'No official action was taken. Retry this screen, or return home to clear the in-browser case and start again.', 'कोई आधिकारिक कार्रवाई नहीं हुई। दोबारा कोशिश करें, या ब्राउज़र वाला केस मिटाकर फिर शुरू करने के लिए होम पर लौटें।')}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button onClick={reset} className="rounded-lg bg-[#172a33] px-5 py-3 text-sm font-black text-white">{t(language, 'Retry safely', 'सुरक्षित रूप से फिर कोशिश करें')}</button>
          <Link href="/" className="rounded-lg border border-[#bdb7ac] bg-white px-5 py-3 text-center text-sm font-black">{t(language, 'Clear and return home', 'मिटाकर होम पर लौटें')}</Link>
        </div>
      </section>
    </main>
  );
}

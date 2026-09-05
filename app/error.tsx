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
    <main id="main-content" className="grid min-h-screen place-items-center bg-bg px-4 text-ink">
      <section className="card w-full max-w-xl p-8 sm:p-10">
        <p className="eyebrow text-bad">{t(language, 'Safe recovery', 'सुरक्षित वापसी')}</p>
        <h1 className="h1 mt-2">{t(language, 'This screen could not finish loading.', 'यह स्क्रीन पूरी तरह लोड नहीं हो सकी।')}</h1>
        <p className="lede mt-3">{t(language, 'No official action was taken. Retry this screen, or return home to clear the in-browser case and start again.', 'कोई आधिकारिक कार्रवाई नहीं हुई। दोबारा कोशिश करें, या ब्राउज़र वाला केस मिटाकर फिर शुरू करने के लिए होम पर लौटें।')}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button onClick={reset} className="btn btn-primary">{t(language, 'Retry safely', 'सुरक्षित रूप से फिर कोशिश करें')}</button>
          <Link href="/" className="btn btn-secondary">{t(language, 'Clear and return home', 'मिटाकर होम पर लौटें')}</Link>
        </div>
      </section>
    </main>
  );
}

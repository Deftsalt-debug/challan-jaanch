'use client';

import type { ReactNode } from 'react';
import { Language, t } from '../lib/i18n';
import { AudioGuideButton } from './ProductGuide';
import { cx } from './ui';

export type Stage = 'home' | 'scam' | 'upload' | 'processing' | 'review' | 'result' | 'packet';

const stepOrder: Stage[] = ['upload', 'review', 'result', 'packet'];
const stageLabels: Record<string, [string, string]> = {
  upload: ['Details', 'विवरण'],
  review: ['Verify', 'जाँचें'],
  result: ['Result', 'नतीजा'],
  packet: ['Packet', 'पैकेट'],
};

function Progress({ stage, language }: { stage: Stage; language: Language }) {
  const current = Math.max(0, stepOrder.indexOf(stage === 'processing' ? 'upload' : stage));
  return (
    <nav aria-label={t(language, 'Case progress', 'केस की प्रगति')} className="container-x pb-3">
      <ol className="grid grid-cols-4 gap-2">
        {stepOrder.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo';
          return (
            <li key={step} aria-current={state === 'current' ? 'step' : undefined} className="min-w-0">
              <div className={cx('h-1.5 rounded-full', state === 'todo' ? 'bg-line' : 'bg-accent')} />
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <span className={cx('font-semibold', state === 'todo' ? 'text-ink-3' : 'text-ink')}>{index + 1}</span>
                <span className={cx('hidden truncate sm:inline', state === 'todo' ? 'text-ink-3' : 'text-ink-2')}>{stageLabels[step][language === 'en' ? 0 : 1]}</span>
                {state === 'done' && <span className="text-good" aria-hidden>✓</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Brand({ language, onHome }: { language: Language; onHome: () => void }) {
  return (
    <button onClick={onHome} className="flex min-w-0 items-center gap-2.5 text-left" aria-label={t(language, 'Challan Jaanch home', 'चालान जाँच होम')}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-sm font-bold text-white">CJ</span>
      <span className="min-w-0">
        <strong className="block truncate text-[15px] leading-tight">{t(language, 'Challan Jaanch', 'चालान जाँच')}</strong>
        <span className="hidden text-xs text-ink-3 sm:block">{t(language, 'Independent eChallan preflight', 'स्वतंत्र ई-चालान जाँच')}</span>
      </span>
    </button>
  );
}

export function Shell({ children, stage, language, onLanguage, onHome, onScam, onDelete, onHelp, guideText }: { children: ReactNode; stage: Stage; language: Language; onLanguage: () => void; onHome: () => void; onScam: () => void; onDelete: () => void; onHelp: () => void; guideText: string }) {
  const inCase = stage !== 'home' && stage !== 'scam';
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="container-x flex h-16 items-center justify-between gap-3">
          <Brand language={language} onHome={onHome} />
          <div className="flex items-center gap-2">
            <AudioGuideButton text={guideText} language={language} />
            {stage !== 'scam' && (
              <button onClick={onScam} className="btn btn-secondary btn-sm text-bad">
                <span aria-hidden>⚠</span>
                <span className="hidden sm:inline">{t(language, 'Scam check', 'ठगी जाँच')}</span>
                <span className="sm:hidden">{t(language, 'Scam', 'ठगी')}</span>
              </button>
            )}
            <button onClick={onHelp} className="btn btn-ghost btn-sm" aria-label={t(language, 'How it works', 'यह कैसे काम करता है')}>
              <span className="sm:hidden" aria-hidden>?</span>
              <span className="hidden sm:inline">{t(language, 'How it works', 'कैसे काम करता है')}</span>
            </button>
            <button onClick={onLanguage} className="btn btn-secondary btn-sm" aria-label={language === 'en' ? 'Switch to Hindi' : 'Switch to English'} lang={language === 'en' ? 'hi' : 'en'}>{language === 'en' ? 'हिंदी' : 'English'}</button>
          </div>
        </div>
        {inCase && <Progress stage={stage} language={language} />}
      </header>

      <div key={stage} className="stage-transition">{children}</div>

      <footer className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-8 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          {stage === 'home' ? (
            <>
              <p>{t(language, 'Independent civic-tech prototype · not affiliated with any government authority.', 'स्वतंत्र नागरिक-तकनीक प्रोटोटाइप · किसी सरकारी विभाग से संबद्ध नहीं।')}</p>
              <p className="text-ink-3">{t(language, 'Rule pack rechecked 28 Aug 2026 · synthetic demo data only', 'नियम-पैक 28 अगस्त 2026 को दोबारा जाँचा गया · केवल नकली डेमो डेटा')}</p>
            </>
          ) : (
            <>
              <p>{stage === 'scam' ? t(language, 'Safety triage only. It cannot authenticate a sender or declare a message safe.', 'सिर्फ़ सुरक्षा छँटाई। यह भेजने वाले की पहचान नहीं कर सकता और न संदेश को सुरक्षित घोषित कर सकता है।') : t(language, 'Not a government service or legal adviser. No official submission happens here.', 'यह सरकारी सेवा या क़ानूनी सलाहकार नहीं है। यहाँ कोई आधिकारिक आवेदन नहीं होता।')}</p>
              <button onClick={onDelete} className="touch-target w-fit font-semibold text-bad underline decoration-bad/30 underline-offset-4">{stage === 'scam' ? t(language, 'Clear and leave Scam Shield', 'साफ़ करके ठगी ढाल से बाहर जाएँ') : t(language, 'Delete this case from this browser', 'इस ब्राउज़र से यह केस मिटाएँ')}</button>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}

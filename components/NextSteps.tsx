'use client';

import { Outcome } from '../lib/cases';
import { Language, pick, t } from '../lib/i18n';
import { ClockStatus, RouteStatus, nextRoutes } from '../lib/routes';
import { Chip, Tone } from './ui';

function statusChip(status: RouteStatus, language: Language): { label: string; tone: Tone } {
  if (status === 'act-now') return { label: t(language, 'Start here · soon', 'यहाँ से शुरू करें · जल्द'), tone: 'bad' };
  if (status === 'closing') return { label: t(language, 'Start here', 'यहाँ से शुरू करें'), tone: 'good' };
  if (status === 'later') return { label: t(language, 'If it has moved', 'अगर आगे बढ़ चुका हो'), tone: 'info' };
  return { label: t(language, 'Alternative', 'विकल्प'), tone: 'warn' };
}

/**
 * The routes a citizen can actually take after a finding. Every destination is
 * a hard-coded government service opened by the citizen in a new tab; Challan
 * Jaanch never submits anything on their behalf, and this section says so.
 */
export function NextSteps({ language, outcome, deadline }: { language: Language; outcome: Outcome; deadline: { status: ClockStatus; daysLeft: number } | null }) {
  const plan = nextRoutes(outcome, deadline);
  return (
    <section>
      <h2 className="h2">{t(language, 'Where this can go next', 'आगे यह कहाँ जा सकता है')}</h2>
      <p className="help mt-1 max-w-3xl">{pick(language, plan.lead)}</p>
      <ol className="mt-5 space-y-3">
        {plan.routes.map((route, index) => {
          const chip = statusChip(route.status, language);
          return (
            <li key={route.id} className="card-flat p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="step-number">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-ink-3">{pick(language, route.authority)}</p>
                    <h3 className="h3 mt-0.5">{pick(language, route.title)}</h3>
                  </div>
                </div>
                <Chip tone={chip.tone}>{chip.label}</Chip>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{pick(language, route.what)}</p>
              <p className="help mt-2 border-l-2 border-line pl-3">{pick(language, route.when)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={route.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">{t(language, 'Open', 'खोलें')} {new URL(route.url).hostname} ↗</a>
                {route.secondary && <a href={route.secondary.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">{pick(language, route.secondary.label)} ↗</a>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="callout callout-warn mt-4 text-sm"><strong>{t(language, 'What this tool does not know:', 'यह टूल क्या नहीं जानता:')}</strong> {pick(language, plan.caution)}</p>
      <p className="help mt-3 text-ink-3">{t(language, 'Each authority named above runs the destination it is listed against. Challan Jaanch is an independent prototype: it is not affiliated with, endorsed by, or acting for any of them, and it files nothing on your behalf.', 'ऊपर बताया गया हर विभाग सिर्फ़ अपने साथ लिखे गए पते को चलाता है। चालान जाँच एक स्वतंत्र प्रोटोटाइप है: यह इनमें से किसी से संबद्ध नहीं है, न इनका अनुमोदन प्राप्त है, न इनकी ओर से काम करता है, और यह आपकी ओर से कुछ भी दाख़िल नहीं करता।')}</p>
    </section>
  );
}

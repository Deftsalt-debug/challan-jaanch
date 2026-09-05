'use client';

import { Outcome } from '../lib/cases';
import { Language, pick, t } from '../lib/i18n';
import { ClockStatus, RouteStatus, nextRoutes } from '../lib/routes';

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function statusChip(status: RouteStatus, language: Language) {
  if (status === 'act-now') return { label: t(language, 'Start here', 'यहाँ से शुरू करें'), tone: 'border-[#c08a7c] bg-[#fbefec] text-[#8f3827]' };
  if (status === 'closing') return { label: t(language, 'Start here', 'यहाँ से शुरू करें'), tone: 'border-[#b8d1c4] bg-[#edf5f0] text-[#246344]' };
  if (status === 'later') return { label: t(language, 'If it has moved', 'अगर आगे बढ़ चुका हो'), tone: 'border-[#b9ced8] bg-[#eef4f7] text-[#315f78]' };
  return { label: t(language, 'Alternative', 'विकल्प'), tone: 'border-[#d6c28d] bg-[#faf5e7] text-[#735814]' };
}

/**
 * The routes a citizen can actually take after a finding.
 *
 * Every destination here is a hard-coded government service, opened by the
 * citizen in a new tab. Challan Jaanch never submits anything on their behalf,
 * and this section says so rather than implying a handoff has occurred.
 */
export function NextSteps({ language, outcome, deadline }: { language: Language; outcome: Outcome; deadline: { status: ClockStatus; daysLeft: number } | null }) {
  const plan = nextRoutes(outcome, deadline);

  return (
    <section className="rounded-[18px] border border-[#d5cfc4] bg-[#fbfaf7] p-5 sm:p-7">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#315f78]">{t(language, 'Where this can go next', 'आगे यह कहाँ जा सकता है')}</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{t(language, 'Three official routes. You open each one yourself.', 'तीन आधिकारिक रास्ते। हर एक आप ख़ुद खोलते हैं।')}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f6d6a]">{pick(language, plan.lead)}</p>

      <ol className="mt-6 space-y-3">
        {plan.routes.map((route, index) => {
          const chip = statusChip(route.status, language);
          return (
            <li key={route.id} className="rounded-xl border border-[#ddd7cc] bg-white/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#172a33] text-xs font-black text-white">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7b8582]">{t(language, 'Run by', 'संचालक')} · {pick(language, route.authority)}</p>
                    <h3 className="mt-1 text-base font-black leading-5">{pick(language, route.title)}</h3>
                  </div>
                </div>
                <span className={classes('shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]', chip.tone)}>{chip.label}</span>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#586662]">{pick(language, route.what)}</p>
              <p className="mt-2 border-l-2 border-[#cfc8bc] pl-3 text-xs leading-5 text-[#6c7875]">{pick(language, route.when)}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a href={route.url} target="_blank" rel="noreferrer" className="rounded-md border border-[#172a33] bg-white px-4 py-2.5 text-xs font-black transition hover:bg-[#172a33] hover:text-white">
                  {t(language, 'Open', 'खोलें')} {new URL(route.url).hostname} ↗
                </a>
                {route.secondary && (
                  <a href={route.secondary.url} target="_blank" rel="noreferrer" className="rounded-md border border-[#cfc8bc] bg-[#f3f1ec] px-4 py-2.5 text-xs font-black text-[#52615f] transition hover:border-[#315f78]">
                    {pick(language, route.secondary.label)} ↗
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 rounded-lg border border-[#d6c28d] bg-[#faf5e7] p-4 text-xs leading-5 text-[#665321]">
        <strong>{t(language, 'What this tool does not know:', 'यह टूल क्या नहीं जानता:')}</strong> {pick(language, plan.caution)}
      </p>

      <p className="mt-3 text-[10px] leading-4 text-[#77827f]">
        {t(
          language,
          'Each authority named above runs the destination it is listed against. Challan Jaanch is an independent prototype: it is not affiliated with, endorsed by, or acting for any of them, and it files nothing on your behalf.',
          'ऊपर बताया गया हर विभाग सिर्फ़ अपने साथ लिखे गए पते को चलाता है। चालान जाँच एक स्वतंत्र प्रोटोटाइप है: यह इनमें से किसी से संबद्ध नहीं है, न इनका अनुमोदन प्राप्त है, न इनकी ओर से काम करता है, और यह आपकी ओर से कुछ भी दाख़िल नहीं करता।',
        )}
      </p>
    </section>
  );
}

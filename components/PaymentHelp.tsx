'use client';

import { useId, useState } from 'react';
import { type Language, pick, t } from '../lib/i18n';
import { paymentChecklist, paymentIssues, paymentPlan, paymentPortals, paymentSources, type PaymentIssue, type PaymentPortal } from '../lib/payment-help';

export function PaymentHelp({ language }: { language: Language }) {
  const id = useId();
  const [portal, setPortal] = useState<PaymentPortal>('other');
  const [issue, setIssue] = useState<PaymentIssue>('debited');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const plan = paymentPlan(portal, issue);
  const checklist = paymentChecklist(portal, issue, language);

  const copied = copiedText === checklist;
  const clearFeedback = () => { setCopiedText(null); setCopyError(false); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(checklist); setCopiedText(checklist); setCopyError(false); }
    catch { setCopyError(true); }
  };

  return (
    <details className="card payment-help mt-5 p-5 sm:p-6">
      <summary className="cursor-pointer text-base font-semibold text-accent">
        {t(language, 'Already paid? Missing receipt or still showing pending?', 'भुगतान कर चुके हैं? रसीद नहीं मिली या अब भी बाकी दिखता है?')}
      </summary>
      <p className="help mt-3">{t(language, 'Choose what happened for a payment follow-up checklist. No account, documents, transaction numbers or bank access needed here.', 'भुगतान पूछताछ सूची पाने के लिए चुनें कि क्या हुआ। यहाँ खाते, दस्तावेज़, लेन-देन नंबर या बैंक तक पहुँच की ज़रूरत नहीं।')}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor={`${id}-portal`} className="block text-sm font-semibold">{t(language, 'Where did you pay?', 'कहाँ भुगतान किया?')}</label>
          <select id={`${id}-portal`} className="field mt-2 w-full" value={portal} onChange={(e) => { setPortal(e.target.value as PaymentPortal); clearFeedback(); }}>{paymentPortals.map((item) => <option key={item.id} value={item.id}>{pick(language, item.label)}</option>)}</select></div>
        <div><label htmlFor={`${id}-issue`} className="block text-sm font-semibold">{t(language, 'What do you see now?', 'अभी क्या दिख रहा है?')}</label>
          <select id={`${id}-issue`} className="field mt-2 w-full" value={issue} onChange={(e) => { setIssue(e.target.value as PaymentIssue); clearFeedback(); }}>{paymentIssues.map((item) => <option key={item.id} value={item.id}>{pick(language, item.label)}</option>)}</select></div>
      </div>
      <section aria-live="polite" aria-atomic="true" className="mt-5">
        <h3 className="h3">{pick(language, plan.title)}</h3>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-ink-2">{plan.steps.map((step, i) => <li key={i}>{pick(language, step)}</li>)}</ol>
      </section>
      <a href={plan.destination.url} target="_blank" rel="noreferrer" className="btn btn-secondary mt-5">{pick(language, plan.destination.label)} ↗</a>
      <div className="mt-5 border-t border-line pt-4">
        <h3 className="h3">{t(language, 'Keep ready for official support', 'आधिकारिक सहायता के लिए तैयार रखें')}</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink-2">{plan.records.map((record) => <li key={record.en}>{pick(language, record)}</li>)}</ul>
        <p className="help mt-3">{t(language, 'Keep OTPs, passwords, full account numbers and unrelated transactions out of a support message. If you paid through a suspicious message or personal payment request, use Scam check above.', 'सहायता संदेश में OTP, पासवर्ड, पूरा खाता नंबर और असंबंधित लेन-देन न रखें। संदिग्ध संदेश या निजी भुगतान माँग के जरिए पैसा दिया हो तो ऊपर ठगी जाँच खोलें।')}</p>
        <button onClick={copy} type="button" className="btn btn-ghost mt-3">{copied ? t(language, 'Checklist copied', 'सूची कॉपी हुई') : t(language, 'Copy follow-up checklist', 'पूछताछ सूची कॉपी करें')}</button>
        <span role="status" className="sr-only">{copied ? t(language, 'Checklist copied', 'सूची कॉपी हुई') : ''}</span>
        {copyError && <div role="status" className="mt-3"><p className="help">{t(language, 'Copy was unavailable. Select and copy the checklist below.', 'कॉपी उपलब्ध नहीं थी। नीचे सूची चुनकर कॉपी करें।')}</p><textarea aria-label={t(language, 'Payment follow-up checklist', 'भुगतान पूछताछ सूची')} readOnly value={checklist} rows={10} className="field mt-2 w-full" onFocus={(e) => e.target.select()} /></div>}
      </div>
      <p className="help mt-4">{t(language, 'Official sources checked 5 September 2026:', 'आधिकारिक स्रोत 5 सितंबर 2026 को जाँचे गए:')} {paymentSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mr-3 underline underline-offset-4">{pick(language, source.label)} ↗</a>)}</p>
    </details>
  );
}

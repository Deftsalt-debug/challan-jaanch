'use client';

import { CaseFact, DemoCase, RULE_167_EFFECTIVE_FROM, deadlineFor, formatDate, ruleClockApplies, vehicleFamilyLabel } from '../../lib/cases';
import { Language, pick, t } from '../../lib/i18n';
import { EvidenceWorkbench } from '../EvidenceWorkbench';
import { Callout, Chip, cx } from '../ui';
import type { UploadedFiles } from './Upload';

const vehicleFamilyOptions = ['Two-wheeler', 'Passenger car', 'Goods vehicle', 'Bus', 'Three-wheeler', 'Other', 'Unknown'] as const;

function clarityLabel(clarity: CaseFact['clarity'], language: Language) {
  if (clarity === 'clear') return t(language, 'Clear source', 'स्पष्ट स्रोत');
  if (clarity === 'unreviewed') return t(language, 'Clarity not reviewed', 'स्पष्टता नहीं जाँची');
  return t(language, 'Unclear source', 'अस्पष्ट स्रोत');
}

function FactRow({ fact, language, confirmed, selected, manual, onSelect, onChange, onClarity, onConfirm }: { fact: CaseFact; language: Language; confirmed: boolean; selected: boolean; manual: boolean; onSelect: () => void; onChange: (value: string) => void; onClarity: (clear: boolean) => void; onConfirm: () => void }) {
  const isFamily = fact.key === 'photoFamily' || fact.key === 'rcFamily';
  const sourceClear = fact.clarity === 'clear';
  const canConfirm = Boolean(fact.value.trim()) && fact.clarity !== 'unreviewed';
  return (
    <div onClick={onSelect} className={cx('rounded-[var(--radius)] border bg-surface p-4 transition sm:p-5', selected ? 'border-accent shadow-[0_0_0_3px_var(--accent-soft)]' : confirmed ? 'border-good-line' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`fact-${fact.key}`} className="label">{pick(language, fact.label)}</label>
        {fact.decisive && <Chip tone="accent">{t(language, 'Decisive', 'निर्णायक')}</Chip>}
        <Chip tone={sourceClear ? 'good' : fact.clarity === 'unreviewed' ? 'neutral' : 'bad'}>{clarityLabel(fact.clarity, language)}</Chip>
      </div>
      <p className="help mt-0.5 text-ink-3">{pick(language, fact.sourceLabel)}</p>
      {isFamily ? (
        <select id={`fact-${fact.key}`} value={fact.value} onChange={(event) => onChange(event.target.value)} onFocus={onSelect} className="field mt-3" aria-describedby={`help-${fact.key}`}>
          {vehicleFamilyOptions.map((option) => <option key={option} value={option}>{vehicleFamilyLabel(option, language)}</option>)}
        </select>
      ) : (
        <input id={`fact-${fact.key}`} value={fact.value} onChange={(event) => onChange(event.target.value)} onFocus={onSelect} className="field field-mono mt-3" aria-describedby={`help-${fact.key}`} autoComplete="off" spellCheck={false} />
      )}
      <p id={`help-${fact.key}`} className="help mt-2">{pick(language, fact.help)}</p>
      {fact.alternatives?.[0] && <p className="mt-2 text-sm font-semibold text-warn">{t(language, 'Alternative reading', 'दूसरा संभावित पाठ')}: <span className="mono">{fact.alternatives[0].value}</span></p>}

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        {manual && fact.decisive ? (
          <fieldset className="min-w-0" onClick={(event) => event.stopPropagation()}>
            <legend className="help mb-1.5">{t(language, 'Is this clear in the original?', 'क्या यह मूल में साफ़ है?')}</legend>
            <div className="segmented">
              <button type="button" aria-pressed={sourceClear} onClick={() => onClarity(true)}>{t(language, 'Yes, clear', 'हाँ, साफ़')}</button>
              <button type="button" aria-pressed={fact.clarity === 'unclear'} onClick={() => onClarity(false)}>{t(language, 'No, unclear', 'नहीं, अस्पष्ट')}</button>
            </div>
          </fieldset>
        ) : <span />}
        <button type="button" disabled={!canConfirm} aria-pressed={confirmed} onClick={(event) => { event.stopPropagation(); onConfirm(); }} className={cx('btn shrink-0', confirmed ? 'btn-primary' : 'btn-secondary')}>{confirmed ? `✓ ${t(language, 'Confirmed', 'पुष्ट')}` : t(language, 'Confirm this value', 'यह मान पुष्ट करें')}</button>
      </div>
    </div>
  );
}

function CaseDetailsCard({ caseFile, language, onDetail }: { caseFile: DemoCase; language: Language; onDetail: (field: 'challanNumber' | 'issueDate', value: string) => void }) {
  const duplicate = caseFile.kind === 'duplicate-event';
  const clock = ruleClockApplies(caseFile.issueDate) ? deadlineFor(caseFile) : null;
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="h3">{t(language, 'Case details', 'केस विवरण')}</h2>
        <Chip tone="neutral">{t(language, 'not decisive · for the clock and packet', 'निर्णायक नहीं · घड़ी और पैकेट के लिए')}</Chip>
      </div>
      <div className={cx('mt-4 grid gap-4', !duplicate && 'sm:grid-cols-2')}>
        {!duplicate && (
          <div>
            <label htmlFor="case-challan-number" className="label">{t(language, 'Challan number', 'चालान नंबर')}</label>
            <input id="case-challan-number" value={caseFile.challanNumber} onChange={(event) => onDetail('challanNumber', event.target.value)} className="field field-mono mt-1.5" placeholder={t(language, 'As printed on the challan', 'जैसा चालान पर छपा है')} autoComplete="off" spellCheck={false} />
          </div>
        )}
        <div>
          <label htmlFor="case-issue-date" className="label">{duplicate ? t(language, 'Issue date of the first challan', 'पहले चालान की जारी तारीख़') : t(language, 'Issue date', 'जारी तारीख़')}</label>
          <input id="case-issue-date" type="date" value={caseFile.issueDate} onChange={(event) => onDetail('issueDate', event.target.value)} className="field mt-1.5" aria-describedby="case-issue-date-help" />
        </div>
      </div>
      <p id="case-issue-date-help" className={cx('help mt-3', clock && 'font-semibold text-ink')}>
        {clock
          ? t(language, `Rule 167 safety date: ${formatDate(clock.date, language)} · ${clock.status === 'open' ? `${clock.daysLeft} days left` : clock.status === 'today' ? 'due today' : 'date passed'}.`, `नियम 167 सुरक्षित तारीख़: ${formatDate(clock.date, language)} · ${clock.status === 'open' ? `${clock.daysLeft} दिन बाकी` : clock.status === 'today' ? 'आज अंतिम दिन' : 'तारीख़ बीत चुकी'}।`)
          : caseFile.issueDate
            ? t(language, `The 45-day clock is calculated only for challans issued on or after ${formatDate(RULE_167_EFFECTIVE_FROM, language)}. Check the official portal for the applicable window.`, `45 दिन की घड़ी सिर्फ़ ${formatDate(RULE_167_EFFECTIVE_FROM, language)} या उसके बाद जारी चालानों के लिए बनती है। लागू अवधि आधिकारिक पोर्टल पर देखें।`)
            : t(language, 'Add the issue date printed on the challan to see the 45-day pay-or-contest safety date.', '45 दिन की भुगतान-या-आपत्ति सुरक्षित तारीख़ देखने के लिए चालान पर छपी जारी तारीख़ भरें।')}
      </p>
    </div>
  );
}

function DuplicateEvidencePreview({ caseFile, language }: { caseFile: DemoCase; language: Language }) {
  const fact = (key: string) => caseFile.facts.find((item) => item.key === key)?.value;
  const cards: Array<[string, string | undefined, string | undefined]> = [
    [t(language, 'First challan', 'पहला चालान'), fact('challanA'), fact('eventA')],
    [t(language, 'Shared capture', 'साझा कैप्चर'), fact('captureA'), t(language, 'Identical event fingerprint', 'एक जैसी घटना पहचान')],
    [t(language, 'Second challan', 'दूसरा चालान'), fact('challanB'), fact('eventB')],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map(([title, value, note], index) => (
        <div key={title} className={cx('rounded-[var(--radius)] border p-5', index === 1 ? 'border-accent-line bg-accent-soft' : 'card-flat')}>
          <p className="help">{title}</p>
          <p className="mono mt-2 break-all text-lg font-bold">{value || '—'}</p>
          <p className="help mt-3">{note || '—'}</p>
        </div>
      ))}
    </div>
  );
}

interface ReviewScreenProps {
  caseFile: DemoCase;
  language: Language;
  confirmed: Set<string>;
  selectedKey?: string;
  notice: string;
  files: UploadedFiles;
  onSelect: (key: string) => void;
  onChange: (key: string, value: string) => void;
  onClarity: (key: string, clear: boolean) => void;
  onConfirm: (key: string) => void;
  onDetail: (field: 'challanNumber' | 'issueDate', value: string) => void;
  onCompare: () => void;
}

export function ReviewScreen({ caseFile, language, confirmed, selectedKey, notice, files, onSelect, onChange, onClarity, onConfirm, onDetail, onCompare }: ReviewScreenProps) {
  const decisive = caseFile.facts.filter((fact) => fact.decisive);
  const confirmedCount = decisive.filter((fact) => confirmed.has(fact.key)).length;
  const ready = confirmedCount === decisive.length;
  const cannotDecide = [
    t(language, 'Whether the challan is legally valid', 'चालान क़ानूनी रूप से वैध है या नहीं'),
    t(language, 'Why a mismatch occurred', 'बेमेल क्यों हुआ'),
    t(language, 'Whether a grievance will succeed', 'शिकायत सफल होगी या नहीं'),
  ];

  return (
    <div className="container-x py-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{t(language, 'Step 2 of 4', 'चरण 2 / 4')}</p>
            {caseFile.synthetic && <Chip tone="warn">{t(language, 'Synthetic fixture · no real citizen data', 'नकली नमूना · कोई असली नागरिक डेटा नहीं')}</Chip>}
          </div>
          <h1 className="h1 mt-1">{t(language, 'Verify each decisive field.', 'हर निर्णायक फ़ील्ड जाँचें।')}</h1>
          <p className="lede mt-3 max-w-2xl">{t(language, 'Select a field to see its source. Correcting a value removes its confirmation, so a finding can never rest on something you have not checked.', 'स्रोत देखने के लिए कोई फ़ील्ड चुनें। मान सुधारते ही उसकी पुष्टि हट जाती है, ताकि कोई निष्कर्ष उस चीज़ पर न टिके जो आपने जाँची नहीं।')}</p>
        </div>
        <div className="card-flat shrink-0 px-4 py-3 text-[15px]"><span className="text-xl font-bold">{confirmedCount}/{decisive.length}</span> {t(language, 'decisive fields confirmed', 'निर्णायक फ़ील्ड पुष्ट')}</div>
      </div>

      {notice && <Callout tone="info" role="status" className="mt-6">{notice}</Callout>}

      <div className="mt-7">{caseFile.kind === 'duplicate-event' ? <DuplicateEvidencePreview caseFile={caseFile} language={language} /> : <EvidenceWorkbench caseFile={caseFile} language={language} selectedKey={selectedKey} files={files} onSelect={onSelect} />}</div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section className="space-y-3">
          {!caseFile.synthetic && <CaseDetailsCard caseFile={caseFile} language={language} onDetail={onDetail} />}
          {caseFile.facts.map((fact) => <FactRow key={fact.key} fact={fact} language={language} confirmed={confirmed.has(fact.key)} selected={selectedKey === fact.key} manual={!caseFile.synthetic} onSelect={() => onSelect(fact.key)} onChange={(value) => onChange(fact.key, value)} onClarity={(clear) => onClarity(fact.key, clear)} onConfirm={() => onConfirm(fact.key)} />)}
        </section>
        <aside className="hidden lg:block lg:sticky lg:top-[132px] lg:self-start">
          <div className={cx('rounded-[var(--radius)] p-5', ready ? 'card-dark' : 'card-soft')}>
            <p className={cx('text-sm font-semibold', ready ? 'text-white/70' : 'text-ink-2')}>{t(language, 'Human confirmation gate', 'मानव पुष्टि द्वार')}</p>
            <h2 className="h2 mt-1">{ready ? t(language, 'Ready to compare', 'तुलना के लिए तैयार') : t(language, 'Comparison locked', 'तुलना बंद है')}</h2>
            <p className={cx('help mt-2', ready && 'text-white/70')}>{t(language, 'A finding cannot be generated from unconfirmed decisive fields. This is what stops a guess from becoming an allegation.', 'बिना पुष्ट निर्णायक फ़ील्ड से कोई निष्कर्ष नहीं बन सकता। यही वह चीज़ है जो अनुमान को आरोप बनने से रोकती है।')}</p>
            <button onClick={onCompare} disabled={!ready} className={cx('btn btn-block btn-lg mt-4', ready ? 'btn-inverse' : 'btn-primary')}>{t(language, 'Run the comparison →', 'तुलना चलाएँ →')}</button>
          </div>
          <div className="card-flat mt-3 p-5">
            <h3 className="h3">{t(language, 'What this cannot decide', 'यह क्या तय नहीं कर सकता')}</h3>
            <ul className="mt-2 space-y-1.5 text-[15px] text-ink-2">{cannotDecide.map((item) => <li key={item}>· {item}</li>)}</ul>
          </div>
        </aside>
      </div>

      <div className="sticky-bar -mx-4 mt-8 px-4 py-3 sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[15px]"><span className="font-bold">{confirmedCount}/{decisive.length}</span> {t(language, 'confirmed', 'पुष्ट')}</p>
          <button onClick={onCompare} disabled={!ready} className="btn btn-primary">{t(language, 'Run the comparison →', 'तुलना चलाएँ →')}</button>
        </div>
      </div>
    </div>
  );
}

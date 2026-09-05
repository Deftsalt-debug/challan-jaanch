'use client';

import { useEffect, useMemo, useState } from 'react';
import { DemoCase, colourLabel, deadlineFor, formatDate, normaliseRegistration, ruleClockApplies, vehicleFamilyLabel } from '../lib/cases';
import { Language, pick, t } from '../lib/i18n';
import { Chip, Segmented, cx } from './ui';

type SourceKey = 'challan' | 'photo' | 'vehicle';
type WorkbenchTab = 'sources' | 'diff' | 'timeline';

interface UploadedFiles {
  challan?: File;
  vehicle?: File;
  supporting?: File;
}

interface EvidenceWorkbenchProps {
  caseFile: DemoCase;
  language: Language;
  selectedKey?: string;
  files?: UploadedFiles;
  onSelect: (key: string) => void;
}

function sourceMeta(language: Language): Record<SourceKey, { title: string; eyebrow: string }> {
  return {
    challan: { title: t(language, 'Challan record', 'चालान रिकॉर्ड'), eyebrow: t(language, 'Source 1', 'स्रोत 1') },
    photo: { title: t(language, 'Enforcement photo', 'कार्रवाई-फोटो'), eyebrow: t(language, 'Source 2', 'स्रोत 2') },
    vehicle: { title: t(language, 'Vehicle record', 'वाहन रिकॉर्ड'), eyebrow: t(language, 'Source 3', 'स्रोत 3') },
  };
}

function useObjectUrl(file?: File) {
  const url = useMemo(() => file?.type.startsWith('image/') ? URL.createObjectURL(file) : undefined, [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

function field(caseFile: DemoCase, key: string) {
  return caseFile.facts.find((item) => item.key === key);
}

function DocumentArtwork({ caseFile, source, language, imageUrl, selectedKey }: { caseFile: DemoCase; source: SourceKey; language: Language; imageUrl?: string; selectedKey?: string }) {
  const sourceFact = source === 'challan' ? field(caseFile, 'recordPlate') : source === 'photo' ? field(caseFile, 'photoPlate') : field(caseFile, 'rcPlate');
  if (imageUrl) {
    return (
      <div className="relative min-h-[240px] overflow-hidden rounded-[var(--radius-sm)] bg-ink">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
        <div className="absolute inset-x-3 bottom-3 rounded-[var(--radius-sm)] bg-ink/85 p-3 text-white backdrop-blur">
          <p className="text-xs text-white/65">{t(language, 'Selected evidence field', 'चुना गया साक्ष्य फ़ील्ड')}</p>
          <p className="mono mt-0.5 font-semibold">{sourceFact?.value || t(language, 'Select and verify a field', 'कोई फ़ील्ड चुनकर जाँचें')}</p>
        </div>
      </div>
    );
  }

  if (source === 'photo') {
    const plate = field(caseFile, 'photoPlate');
    const family = field(caseFile, 'photoFamily')?.value || 'Unknown';
    return (
      <div className="relative grid min-h-[240px] place-items-center overflow-hidden rounded-[var(--radius-sm)] bg-[radial-gradient(circle_at_50%_30%,#3a4652_0,#1f272e_45%,#12181d_100%)] p-6 text-white">
        <div className="w-full max-w-xs rounded-[var(--radius-sm)] border border-white/15 bg-white/5 p-4 text-center">
          <p className="text-xs text-white/55">{t(language, 'Camera crop · plate region', 'कैमरा हिस्सा · नंबर क्षेत्र')}</p>
          <p className={cx('mono mt-3 rounded-lg border px-3 py-3 text-xl font-bold tracking-[0.12em]', selectedKey === 'photoPlate' ? 'border-accent-line bg-accent/30' : 'border-white/15 bg-black/20')}>{plate?.value || t(language, 'NOT CLEAR', 'साफ़ नहीं')}</p>
          {plate?.alternatives?.[0] && <p className="mt-3 text-xs text-warn-line">{t(language, 'Alternate read', 'दूसरा संभावित पाठ')}: <span className="mono">{plate.alternatives[0].value}</span></p>}
        </div>
        <p className="absolute bottom-4 left-5 text-xs text-white/50">{t(language, 'Broad family', 'मोटा प्रकार')}: {vehicleFamilyLabel(family, language)}</p>
      </div>
    );
  }

  const isChallan = source === 'challan';
  return (
    <div className="min-h-[240px] rounded-[var(--radius-sm)] border border-line bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-3">{isChallan ? t(language, 'Electronic challan', 'इलेक्ट्रॉनिक चालान') : t(language, 'Vehicle record extract', 'वाहन रिकॉर्ड अंश')}</p>
          <p className="mono mt-0.5 truncate text-sm font-semibold">{isChallan ? caseFile.challanNumber || t(language, 'Number not entered', 'नंबर नहीं भरा') : caseFile.id}</p>
        </div>
        <Chip tone={caseFile.synthetic ? 'warn' : 'neutral'}>{caseFile.synthetic ? t(language, 'Synthetic', 'नकली') : t(language, 'Citizen-entered', 'नागरिक द्वारा भरा')}</Chip>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div className={cx('rounded-lg border p-3', selectedKey === sourceFact?.key ? 'border-accent bg-accent-soft' : 'border-line bg-surface')}>
          <dt className="text-xs text-ink-3">{t(language, 'Registration mark', 'पंजीकरण चिह्न')}</dt>
          <dd className="mono mt-0.5 text-base font-bold tracking-[0.1em]">{sourceFact?.value || t(language, 'Not entered', 'नहीं भरा')}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">{isChallan ? t(language, 'Offence record', 'अपराध विवरण') : t(language, 'Broad vehicle family', 'वाहन का मोटा प्रकार')}</dt>
          <dd className="mt-0.5 font-semibold">{isChallan ? pick(language, caseFile.offence) : vehicleFamilyLabel(field(caseFile, 'rcFamily')?.value || '', language) || t(language, 'Not entered', 'नहीं भरा')}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">{isChallan ? t(language, 'Issued on', 'जारी तारीख़') : t(language, 'Colour', 'रंग')}</dt>
          <dd className="mt-0.5 font-semibold">{isChallan ? (caseFile.issueDate ? formatDate(caseFile.issueDate, language) : t(language, 'Not entered', 'नहीं भरा')) : colourLabel(field(caseFile, 'rcColour')?.value || '', language) || t(language, 'Not supplied', 'नहीं दिया गया')}</dd>
        </div>
      </dl>
    </div>
  );
}

function SourceInspector({ caseFile, source, language, imageUrl, selectedKey, onClose }: { caseFile: DemoCase; source: SourceKey; language: Language; imageUrl?: string; selectedKey?: string; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const meta = sourceMeta(language)[source];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="source-inspector-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[var(--radius)] bg-surface p-5 shadow-2xl sm:rounded-[var(--radius)] sm:p-7">
        <header className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="eyebrow">{meta.eyebrow}</p>
            <h2 id="source-inspector-title" className="h2 mt-1">{meta.title}</h2>
            <p className="help mt-1">{t(language, 'The original is never changed. Highlights are a separate visual layer.', 'मूल दस्तावेज़ कभी नहीं बदलता। चिह्न सिर्फ़ एक अलग दृश्य परत हैं।')}</p>
          </div>
          <button autoFocus onClick={onClose} className="btn btn-secondary btn-sm h-10 w-10 shrink-0 rounded-full p-0 text-lg" aria-label={t(language, 'Close source inspector', 'स्रोत निरीक्षक बंद करें')}>×</button>
        </header>
        <div className="mt-5"><DocumentArtwork caseFile={caseFile} source={source} language={language} imageUrl={imageUrl} selectedKey={selectedKey} /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="card-soft p-4">
            <p className="text-xs text-ink-3">{t(language, 'Provenance', 'स्रोत की पहचान')}</p>
            <p className="mt-1 font-semibold">{source === 'photo' ? t(language, 'Enforcement evidence crop', 'कार्रवाई साक्ष्य का हिस्सा') : source === 'vehicle' ? t(language, 'Citizen-supplied vehicle record', 'नागरिक द्वारा दिया वाहन रिकॉर्ड') : t(language, 'Downloaded challan record', 'डाउनलोड किया गया चालान रिकॉर्ड')}</p>
            <p className="help mt-1">{t(language, 'Linked to the exact confirmed field used by the comparison rule.', 'तुलना नियम में इस्तेमाल हुए ठीक उसी पुष्ट फ़ील्ड से जुड़ा।')}</p>
          </div>
          <div className="card-soft p-4">
            <p className="text-xs text-ink-3">{t(language, 'Integrity rule', 'अखंडता नियम')}</p>
            <p className="mt-1 font-semibold">{t(language, 'Annotations never overwrite originals', 'चिह्न कभी मूल को नहीं बदलते')}</p>
            <p className="help mt-1">{t(language, 'Your edits invalidate the prior finding and packet immediately.', 'आपके बदलाव पिछले निष्कर्ष और पैकेट को तुरंत रद्द कर देते हैं।')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlateDiff({ caseFile, language, onSelect }: { caseFile: DemoCase; language: Language; onSelect: (key: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const record = normaliseRegistration(field(caseFile, 'recordPlate')?.value || '');
  const photo = normaliseRegistration(field(caseFile, 'photoPlate')?.value || '');
  const vehicle = normaliseRegistration(field(caseFile, 'rcPlate')?.value || '');
  const length = Math.max(10, record.length, photo.length, vehicle.length);
  const columns = Array.from({ length }, (_, index) => ({
    index,
    record: record[index] || '·',
    photo: photo[index] || '·',
    vehicle: vehicle[index] || '·',
    conflict: Boolean(record[index] && photo[index] && vehicle[index] && (record[index] !== photo[index] || photo[index] !== vehicle[index])),
  }));
  const active = columns[activeIndex];
  const rows: Array<[string, string, string]> = [
    [t(language, 'Challan', 'चालान'), record, 'recordPlate'],
    [t(language, 'Photo', 'फोटो'), photo, 'photoPlate'],
    [t(language, 'Vehicle record', 'वाहन रिकॉर्ड'), vehicle, 'rcPlate'],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line bg-surface p-4">
        <div className="min-w-[560px]">
          {rows.map(([label, value, key]) => (
            <div key={key} className="grid items-center gap-1 border-b border-line py-2.5 last:border-0" style={{ gridTemplateColumns: `120px repeat(${length}, minmax(32px, 1fr))` }}>
              <button onClick={() => onSelect(key)} className="text-left text-sm font-semibold text-ink-2 hover:text-accent">{label}</button>
              {columns.map((column) => {
                const character = value[column.index] || '·';
                return <button key={column.index} onClick={() => setActiveIndex(column.index)} aria-label={`${label} · ${t(language, 'position', 'स्थान')} ${column.index + 1}`} className={cx('mono grid h-10 place-items-center rounded-md border text-base font-bold transition', activeIndex === column.index ? 'border-ink bg-ink text-white' : column.conflict ? 'border-bad-line bg-bad-soft text-bad' : 'border-line bg-surface-2')}>{character}</button>;
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className={cx('rounded-[var(--radius-sm)] border p-4', active?.conflict ? 'border-bad-line bg-bad-soft' : 'border-good-line bg-good-soft')}>
        <p className="text-xs text-ink-2">{t(language, 'Character position', 'अक्षर स्थान')} {activeIndex + 1}</p>
        <p className="mono mt-2 text-5xl font-bold">{active?.photo || '—'}</p>
        <h3 className="h3 mt-3">{active?.conflict ? t(language, 'This position conflicts.', 'इस स्थान पर अंतर है।') : t(language, 'This position agrees.', 'इस स्थान पर मेल है।')}</h3>
        <p className="help mt-1">
          {active?.conflict
            ? t(language, `The photograph shows “${active.photo}”; the challan and vehicle record show “${active.record}”. Confirmation is required before this becomes a finding.`, `फोटो में “${active.photo}” है; चालान और वाहन रिकॉर्ड में “${active.record}” है। निष्कर्ष बनने से पहले पुष्टि ज़रूरी है।`)
            : t(language, 'All supplied values at this character position are consistent.', 'इस अक्षर स्थान पर सभी दिए गए मान एक जैसे हैं।')}
        </p>
      </aside>
    </div>
  );
}

function Timeline({ caseFile, language }: { caseFile: DemoCase; language: Language }) {
  const validIssue = ruleClockApplies(caseFile.issueDate);
  const deadline = validIssue ? deadlineFor(caseFile) : null;
  const events = [
    { label: t(language, 'Incident recorded', 'घटना दर्ज हुई'), value: caseFile.occurredAt || t(language, 'Not entered', 'नहीं भरा') },
    { label: t(language, 'Challan issued', 'चालान जारी हुआ'), value: validIssue ? formatDate(caseFile.issueDate, language) : t(language, 'Issue date not confirmed', 'जारी तारीख़ पुष्ट नहीं') },
    { label: t(language, 'Rule-based safety date', 'नियम आधारित सुरक्षित तारीख़'), value: deadline ? formatDate(deadline.date, language) : t(language, 'Cannot calculate safely', 'सुरक्षित गणना संभव नहीं') },
  ];
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-5">
      <ol className="grid gap-5 md:grid-cols-3">
        {events.map((event, index) => (
          <li key={event.label} className="flex gap-3">
            <span className={cx('step-number', index < 2 && 'step-number-soft')}>{index + 1}</span>
            <div><p className="text-xs text-ink-3">{event.label}</p><p className="mt-0.5 font-semibold">{event.value}</p></div>
          </li>
        ))}
      </ol>
      <p className="callout callout-warn mt-5 text-sm">
        <strong>{t(language, 'Clock source:', 'समय-सीमा का स्रोत:')}</strong>{' '}
        {t(language, '45 calendar days from issuance under CMVR Rule 167, G.S.R. 48(E). This is a rule-based safety date; state procedure and the official portal remain authoritative.', 'CMVR नियम 167, G.S.R. 48(E) के तहत जारी होने से 45 कैलेंडर दिन। यह नियम आधारित सुरक्षित तारीख़ है; राज्य की प्रक्रिया और आधिकारिक पोर्टल ही अंतिम हैं।')}
      </p>
    </div>
  );
}

export function EvidenceWorkbench({ caseFile, language, selectedKey, files, onSelect }: EvidenceWorkbenchProps) {
  const [tab, setTab] = useState<WorkbenchTab>('sources');
  const [inspecting, setInspecting] = useState<SourceKey>();
  const challanUrl = useObjectUrl(files?.challan);
  const vehicleUrl = useObjectUrl(files?.vehicle);
  const supportingUrl = useObjectUrl(files?.supporting);
  // When a citizen supplies the enforcement photograph separately, the photo
  // source must show that file rather than silently reusing the challan preview.
  const imageFor = (source: SourceKey) => source === 'vehicle' ? vehicleUrl : source === 'photo' ? supportingUrl ?? challanUrl : challanUrl;
  const meta = sourceMeta(language);
  const selectedSource = useMemo<SourceKey>(() => {
    const factSource = caseFile.facts.find((fact) => fact.key === selectedKey)?.source;
    if (factSource === 'photo') return 'photo';
    if (factSource === 'vehicle') return 'vehicle';
    return 'challan';
  }, [caseFile.facts, selectedKey]);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h3">{t(language, 'Evidence workbench', 'साक्ष्य कार्यक्षेत्र')}</h2>
          <p className="help">{t(language, 'Three sources, unchanged. Only the facts beneath them are editable.', 'तीन स्रोत, अछूते। सिर्फ़ उनके नीचे के तथ्य बदले जा सकते हैं।')}</p>
        </div>
        <Segmented value={tab} onChange={setTab} label={t(language, 'Evidence workbench views', 'साक्ष्य कार्यक्षेत्र दृश्य')} options={[
          { id: 'sources', label: t(language, 'Sources', 'स्रोत') },
          { id: 'diff', label: t(language, 'Character diff', 'अक्षर तुलना') },
          { id: 'timeline', label: t(language, 'Rule clock', 'नियम घड़ी') },
        ]} />
      </div>

      <div className="mt-4">
        {tab === 'sources' && (
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(meta) as SourceKey[]).map((source) => {
              const factKey = source === 'challan' ? 'recordPlate' : source === 'photo' ? 'photoPlate' : 'rcPlate';
              const active = selectedSource === source;
              return (
                <button key={source} onClick={() => { onSelect(factKey); setInspecting(source); }} className={cx('group rounded-[var(--radius)] border p-2.5 text-left transition hover:border-accent', active ? 'border-accent bg-accent-soft/40' : 'border-line bg-surface')}>
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <div><p className="text-xs text-ink-3">{meta[source].eyebrow}</p><p className="text-sm font-semibold">{meta[source].title}</p></div>
                    <span className="text-sm font-semibold text-accent opacity-0 transition group-hover:opacity-100">{t(language, 'Inspect', 'देखें')} ↗</span>
                  </div>
                  <DocumentArtwork caseFile={caseFile} source={source} language={language} imageUrl={imageFor(source)} selectedKey={selectedKey} />
                </button>
              );
            })}
          </div>
        )}
        {tab === 'diff' && <PlateDiff caseFile={caseFile} language={language} onSelect={onSelect} />}
        {tab === 'timeline' && <Timeline caseFile={caseFile} language={language} />}
      </div>

      {inspecting && <SourceInspector caseFile={caseFile} source={inspecting} language={language} imageUrl={imageFor(inspecting)} selectedKey={selectedKey} onClose={() => setInspecting(undefined)} />}
    </section>
  );
}

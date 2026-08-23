'use client';

import { useEffect, useMemo, useState } from 'react';
import { DemoCase, deadlineFor, formatDate, normaliseRegistration } from '../lib/cases';

type SourceKey = 'challan' | 'photo' | 'vehicle';
type WorkbenchTab = 'sources' | 'diff' | 'timeline';

interface UploadedFiles {
  challan?: File;
  vehicle?: File;
  supporting?: File;
}

interface EvidenceWorkbenchProps {
  caseFile: DemoCase;
  selectedKey?: string;
  files?: UploadedFiles;
  onSelect: (key: string) => void;
}

const sourceMeta: Record<SourceKey, { title: string; eyebrow: string; tone: string }> = {
  challan: { title: 'Challan record', eyebrow: 'Source 01', tone: 'paper' },
  photo: { title: 'Enforcement photo', eyebrow: 'Source 02', tone: 'dark' },
  vehicle: { title: 'Vehicle record', eyebrow: 'Source 03', tone: 'green' },
};

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function useObjectUrl(file?: File) {
  const url = useMemo(() => file?.type.startsWith('image/') ? URL.createObjectURL(file) : undefined, [file]);
  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [url]);
  return url;
}

function field(caseFile: DemoCase, key: string) {
  return caseFile.facts.find((item) => item.key === key);
}

function DocumentArtwork({ caseFile, source, imageUrl, selectedKey }: { caseFile: DemoCase; source: SourceKey; imageUrl?: string; selectedKey?: string }) {
  const sourceFact = source === 'challan' ? field(caseFile, 'recordPlate') : source === 'photo' ? field(caseFile, 'photoPlate') : field(caseFile, 'rcPlate');
  if (imageUrl) {
    return (
      <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl bg-[#1c2a2c]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#112629]/85 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/20 bg-[#112629]/80 p-3 text-white backdrop-blur-md">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#b8d4e1]">Selected evidence field</p>
          <p className="mt-1 font-mono text-sm font-black">{sourceFact?.value || 'Select and verify a field'}</p>
        </div>
      </div>
    );
  }

  if (source === 'photo') {
    const plate = field(caseFile, 'photoPlate');
    return (
      <div className="relative grid min-h-[280px] place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_30%,#526265_0,#273638_40%,#152326_100%)] p-7 text-white">
        <div className="absolute left-[12%] top-[18%] h-20 w-[76%] rounded-[45%_45%_18%_18%] border border-white/10 bg-white/[0.04]" />
        <div className="relative w-full max-w-sm rounded-lg border border-white/20 bg-white/[0.07] p-5 text-center shadow-xl backdrop-blur-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">Camera crop · plate region</p>
          <p className={classes('mt-3 rounded-md border px-3 py-3 font-mono text-xl font-black tracking-[0.14em]', selectedKey === 'photoPlate' ? 'border-[#8fb2c4] bg-[#315f78]/15 shadow-[0_0_0_4px_rgba(143,178,196,.08)]' : 'border-white/15 bg-black/10')}>{plate?.value || 'NOT CLEAR'}</p>
          {plate?.alternatives?.[0] && <p className="mt-3 text-[10px] font-bold text-[#b8d4e1]">Alternate read: {plate.alternatives[0].value}</p>}
        </div>
        <p className="absolute bottom-5 left-6 text-[10px] font-bold text-white/40">Broad family: {field(caseFile, 'photoFamily')?.value || 'Unknown'}</p>
      </div>
    );
  }

  const isChallan = source === 'challan';
  return (
    <div className={classes('relative min-h-[280px] overflow-hidden rounded-lg border p-5', isChallan ? 'border-[#d4cdc0] bg-[#fbfaf7]' : 'border-[#bdd5c5] bg-[#edf4ef]')}>
      <div className="flex items-start justify-between border-b border-[#d8d2c7] pb-4">
        <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#74807d]">{isChallan ? 'Electronic challan' : 'Vehicle record extract'}</p><p className="mt-1 text-xs font-black">{isChallan ? caseFile.challanNumber : caseFile.id}</p></div>
        <span className="rounded-md border border-[#bac6ca] bg-white/70 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-[#52646b]">Synthetic</span>
      </div>
      <dl className="mt-5 grid gap-4 text-xs">
        <div className={classes('rounded-md border p-3 transition', selectedKey === sourceFact?.key ? 'border-[#315f78] bg-[#eef4f7] shadow-[0_0_0_3px_rgba(49,95,120,.07)]' : 'border-[#d8d2c7] bg-white/50')}>
          <dt className="text-[8px] font-black uppercase tracking-[0.13em] text-[#778481]">Registration mark</dt>
          <dd className="mt-1 font-mono text-base font-black tracking-[0.12em]">{sourceFact?.value || 'Not extracted'}</dd>
        </div>
        <div><dt className="text-[8px] font-black uppercase tracking-[0.13em] text-[#778481]">{isChallan ? 'Offence record' : 'Broad vehicle family'}</dt><dd className="mt-1 font-black">{isChallan ? caseFile.offence : field(caseFile, 'rcFamily')?.value || 'Not extracted'}</dd></div>
        <div><dt className="text-[8px] font-black uppercase tracking-[0.13em] text-[#778481]">{isChallan ? 'Issued on' : 'Colour'}</dt><dd className="mt-1 font-black">{isChallan ? caseFile.issueDate || 'Not extracted' : field(caseFile, 'rcColour')?.value || 'Not supplied'}</dd></div>
      </dl>
    </div>
  );
}

function SourceInspector({ caseFile, source, imageUrl, selectedKey, onClose }: { caseFile: DemoCase; source: SourceKey; imageUrl?: string; selectedKey?: string; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const meta = sourceMeta[source];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-end bg-[#112629]/60 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="source-inspector-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[18px] bg-[#f3f1ec] p-5 shadow-2xl sm:h-[calc(100vh-32px)] sm:rounded-lg sm:p-7">
        <header className="flex items-start justify-between gap-5 border-b border-[#d6d0c5] pb-5">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#315f78]">Source inspector · {meta.eyebrow}</p><h2 id="source-inspector-title" className="mt-1 text-3xl font-black tracking-[-0.045em]">{meta.title}</h2><p className="mt-2 text-xs text-[#677470]">The original is never changed. Highlights are a separate visual layer.</p></div>
          <button autoFocus onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#bdb7ac] bg-white text-lg font-black" aria-label="Close source inspector">×</button>
        </header>
        <div className="mt-6"><DocumentArtwork caseFile={caseFile} source={source} imageUrl={imageUrl} selectedKey={selectedKey} /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#d5cfc4] bg-[#fffdf8] p-4"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#75817e]">Provenance</p><p className="mt-2 text-sm font-black">{source === 'photo' ? 'Enforcement evidence crop' : source === 'vehicle' ? 'Citizen-supplied vehicle record' : 'Downloaded challan record'}</p><p className="mt-2 text-xs leading-5 text-[#6b7774]">Linked to the exact confirmed field used by the comparison rule.</p></div>
          <div className="rounded-2xl border border-[#d5cfc4] bg-[#fffdf8] p-4"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#75817e]">Integrity rule</p><p className="mt-2 text-sm font-black">Annotations never overwrite originals</p><p className="mt-2 text-xs leading-5 text-[#6b7774]">User edits invalidate the prior finding and packet immediately.</p></div>
        </div>
      </section>
    </div>
  );
}

function PlateDiff({ caseFile, onSelect }: { caseFile: DemoCase; onSelect: (key: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const record = normaliseRegistration(field(caseFile, 'recordPlate')?.value || '');
  const photo = normaliseRegistration(field(caseFile, 'photoPlate')?.value || '');
  const vehicle = normaliseRegistration(field(caseFile, 'rcPlate')?.value || '');
  const length = Math.max(record.length, photo.length, vehicle.length);
  const columns = Array.from({ length }, (_, index) => ({
    index,
    record: record[index] || '·',
    photo: photo[index] || '·',
    vehicle: vehicle[index] || '·',
    conflict: Boolean(record[index] && photo[index] && vehicle[index] && (record[index] !== photo[index] || photo[index] !== vehicle[index])),
  }));
  const active = columns[activeIndex];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="overflow-x-auto rounded-xl border border-[#d5cfc4] bg-[#fbfaf7] p-5">
        <div className="min-w-[620px]">
          {[['Challan record', record, 'recordPlate'], ['Evidence photo', photo, 'photoPlate'], ['Vehicle record', vehicle, 'rcPlate']].map(([label, value, key]) => (
            <div key={key} className="grid grid-cols-[150px_repeat(10,minmax(34px,1fr))] items-center gap-1 border-b border-[#e3ded5] py-3 last:border-0">
              <button onClick={() => onSelect(key)} className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#66736f]">{label} ↗</button>
              {Array.from({ length: 10 }, (_, index) => {
                const character = value[index] || '·';
                const conflict = columns[index]?.conflict;
                return <button key={index} onClick={() => setActiveIndex(index)} className={classes('grid h-10 place-items-center rounded-md border font-mono text-sm font-black transition', activeIndex === index ? 'border-[#172a33] bg-[#172a33] text-white' : conflict ? 'border-[#769eb2] bg-[#eef4f7] text-[#315f78]' : 'border-[#ddd7cc] bg-[#f6f2eb]')}>{character}</button>;
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className={classes('rounded-xl border p-5', active?.conflict ? 'border-[#9dbbc9] bg-[#eef4f7]' : 'border-[#bfd7c7] bg-[#edf6ef]')}>
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6e7976]">Character position {activeIndex + 1}</p>
        <p className="mt-3 text-5xl font-black tracking-[-0.06em]">{active?.photo || '—'}</p>
        <h3 className="mt-4 text-lg font-black">{active?.conflict ? 'This position conflicts.' : 'This position agrees.'}</h3>
        <p className="mt-2 text-xs leading-5 text-[#65716e]">{active?.conflict ? `The photograph shows “${active.photo}”; the challan and vehicle record show “${active.record}”. Confirmation is required before this becomes a finding.` : 'All supplied values at this character position are consistent.'}</p>
      </aside>
    </div>
  );
}

function Timeline({ caseFile }: { caseFile: DemoCase }) {
  const validIssue = /^\d{4}-\d{2}-\d{2}$/.test(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
  const deadline = validIssue ? deadlineFor(caseFile) : null;
  return (
    <div className="rounded-xl border border-[#d5cfc4] bg-[#fbfaf7] p-5 sm:p-7">
      <div className="relative grid gap-7 md:grid-cols-3 md:gap-3">
        <div className="absolute left-[15px] top-6 h-[calc(100%-48px)] w-px bg-[#cfc8bc] md:left-[16.67%] md:top-[15px] md:h-px md:w-[66.66%]" />
        {[
          { number: '1', label: 'Incident recorded', value: caseFile.occurredAt },
          { number: '2', label: 'Challan issued', value: validIssue ? formatDate(caseFile.issueDate) : 'Issue date not confirmed' },
          { number: '3', label: 'Rule-based safety date', value: deadline ? formatDate(deadline.date) : 'Cannot calculate safely' },
        ].map((event, index) => <div key={event.number} className="relative flex gap-4 md:flex-col md:items-center md:text-center"><span className={classes('relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-black', index === 2 ? 'bg-[#315f78] text-white' : 'bg-[#172a33] text-white')}>{event.number}</span><div><p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#77827f]">{event.label}</p><p className="mt-1 text-sm font-black">{event.value}</p></div></div>)}
      </div>
      <div className="mt-8 rounded-2xl bg-[#fff8df] p-4 text-xs leading-5 text-[#6c5c33]"><strong>Clock source:</strong> 45 calendar days from issuance under CMVR Rule 167, G.S.R. 48(E). This is a rule-based safety date; state procedure and the official portal remain authoritative.</div>
    </div>
  );
}

export function EvidenceWorkbench({ caseFile, selectedKey, files, onSelect }: EvidenceWorkbenchProps) {
  const [tab, setTab] = useState<WorkbenchTab>('sources');
  const [inspecting, setInspecting] = useState<SourceKey>();
  const challanUrl = useObjectUrl(files?.challan);
  const vehicleUrl = useObjectUrl(files?.vehicle);
  const imageFor = (source: SourceKey) => source === 'vehicle' ? vehicleUrl : challanUrl;
  const selectedSource = useMemo<SourceKey>(() => {
    const factSource = caseFile.facts.find((fact) => fact.key === selectedKey)?.source;
    if (factSource === 'photo') return 'photo';
    if (factSource === 'vehicle') return 'vehicle';
    return 'challan';
  }, [caseFile.facts, selectedKey]);

  const tabs: Array<{ id: WorkbenchTab; label: string; note: string }> = [
    { id: 'sources', label: 'Source lens', note: 'Inspect originals' },
    { id: 'diff', label: 'Character diff', note: 'Compare plate reads' },
    { id: 'timeline', label: 'Rule clock', note: 'See the deadline' },
  ];

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#cfc9be] bg-[#ece9e2] shadow-[0_12px_34px_rgba(23,42,51,0.07)]">
      <header className="flex flex-col gap-4 border-b border-[#cbc4b8] bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#315f78]">Evidence workbench</p><p className="mt-1 text-sm font-black">Three source views · immutable originals · editable facts</p></div>
        <div className="flex gap-1 rounded-2xl border border-[#d5cfc4] bg-[#f4f0e8] p-1" role="tablist" aria-label="Evidence workbench views">
          {tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={classes('rounded-md px-3 py-2 text-left transition sm:px-4', tab === item.id ? 'bg-[#172a33] text-white' : 'text-[#66736f] hover:bg-white')}><span className="block text-[10px] font-black">{item.label}</span><span className={classes('hidden text-[8px] sm:block', tab === item.id ? 'text-white/55' : 'text-[#8a9491]')}>{item.note}</span></button>)}
        </div>
      </header>

      <div className="p-4 sm:p-5">
        {tab === 'sources' && (
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(sourceMeta) as SourceKey[]).map((source) => {
              const meta = sourceMeta[source];
              const factKey = source === 'challan' ? 'recordPlate' : source === 'photo' ? 'photoPlate' : 'rcPlate';
              const active = selectedSource === source;
              return (
                <button key={source} onClick={() => { onSelect(factKey); setInspecting(source); }} className={classes('group rounded-xl border p-3 text-left transition hover:border-[#315f78] hover:shadow-[0_8px_20px_rgba(23,42,51,.06)]', active ? 'border-[#315f78] bg-[#f3f7f8] shadow-[0_0_0_3px_rgba(49,95,120,.06)]' : 'border-[#d1cabf] bg-[#f3f1ec]')}>
                  <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#788481]">{meta.eyebrow}</p><p className="mt-1 text-xs font-black">{meta.title}</p></div><span className="grid h-8 w-8 place-items-center rounded-md border border-[#c9c2b6] bg-white text-xs font-black transition group-hover:bg-[#172a33] group-hover:text-white">↗</span></div>
                  <DocumentArtwork caseFile={caseFile} source={source} imageUrl={imageFor(source)} selectedKey={selectedKey} />
                </button>
              );
            })}
          </div>
        )}
        {tab === 'diff' && <PlateDiff caseFile={caseFile} onSelect={onSelect} />}
        {tab === 'timeline' && <Timeline caseFile={caseFile} />}
      </div>

      {inspecting && <SourceInspector caseFile={caseFile} source={inspecting} imageUrl={imageFor(inspecting)} selectedKey={selectedKey} onClose={() => setInspecting(undefined)} />}
    </section>
  );
}

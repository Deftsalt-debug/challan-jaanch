'use client';

import { ChangeEvent, ReactNode, useMemo, useRef, useState } from 'react';
import {
  Assessment,
  CaseFact,
  DemoCase,
  assessCase,
  cases,
  cloneCase,
  deadlineFor,
  formatDate,
} from '../lib/cases';

type Stage = 'home' | 'upload' | 'processing' | 'review' | 'result' | 'packet';
type Language = 'en' | 'hi';
type PacketMode = 'official' | 'redacted';
type UploadKey = 'challan' | 'vehicle' | 'supporting';

interface UploadedFiles {
  challan?: File;
  vehicle?: File;
  supporting?: File;
}

interface LiveExtraction {
  challanNumber?: string | null;
  issueDate?: string | null;
  recordPlate?: string | null;
  photoPlate?: string | null;
  rcPlate?: string | null;
  photoFamily?: string | null;
  rcFamily?: string | null;
  occurredAt?: string | null;
  location?: string | null;
  offence?: string | null;
  amount?: string | null;
  notes?: string[];
}

const stepOrder: Stage[] = ['upload', 'review', 'result', 'packet'];
const stageLabels: Record<string, [string, string]> = {
  upload: ['Documents', 'दस्तावेज़'],
  review: ['Verify', 'जाँचें'],
  result: ['Preflight', 'नतीजा'],
  packet: ['Packet', 'पैकेट'],
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const translate = (language: Language, english: string, hindi: string) => language === 'hi' ? hindi : english;

function joinClasses(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function reliabilityLabel(value: number) {
  if (value >= 0.92) return 'Clear source';
  if (value >= 0.7) return 'Needs review';
  return 'Unclear source';
}

function maskIdentifier(value: string) {
  if (value.length < 6) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-4)}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('File could not be read'));
    reader.readAsDataURL(file);
  });
}

async function fileHash(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function manualCase(extraction: LiveExtraction, files: UploadedFiles): DemoCase {
  const value = (entry: string | null | undefined) => entry?.trim() ?? '';
  const extracted = (entry: string | null | undefined) => entry ? 0.94 : 0.5;
  return {
    id: `CJ-LOCAL-${Date.now().toString().slice(-6)}`,
    kind: 'manual',
    title: 'Citizen-supplied document comparison',
    shortTitle: 'Your local case',
    story: 'Observable fields extracted from the supplied documents. Every decisive value must be checked against the original before comparison.',
    issueDate: value(extraction.issueDate),
    jurisdiction: 'State procedure must be confirmed',
    challanNumber: value(extraction.challanNumber) || 'Not extracted',
    amount: value(extraction.amount) || 'Not extracted',
    offence: value(extraction.offence) || 'Not extracted',
    occurredAt: value(extraction.occurredAt) || 'Not extracted',
    location: value(extraction.location) || 'Not extracted',
    documentNames: [files.challan?.name, files.vehicle?.name, files.supporting?.name].filter(Boolean) as string[],
    synthetic: false,
    facts: [
      { key: 'recordPlate', label: 'Registration on challan', value: value(extraction.recordPlate), source: 'challan', sourceLabel: 'Uploaded challan · printed field', reliability: extracted(extraction.recordPlate), decisive: true, help: 'Check every character against the original document.' },
      { key: 'photoPlate', label: 'Plate visible in photograph', value: value(extraction.photoPlate), source: 'photo', sourceLabel: 'Uploaded evidence image', reliability: extracted(extraction.photoPlate), decisive: true, help: 'Leave blank when the plate is not fully visible.' },
      { key: 'rcPlate', label: 'Registration on vehicle record', value: value(extraction.rcPlate), source: 'vehicle', sourceLabel: 'Uploaded vehicle record', reliability: extracted(extraction.rcPlate), decisive: true, help: 'Check every character against the supplied record.' },
      { key: 'photoFamily', label: 'Vehicle family in photograph', value: value(extraction.photoFamily) || 'Unknown', source: 'photo', sourceLabel: 'Uploaded evidence image · full frame', reliability: extracted(extraction.photoFamily), decisive: true, help: 'Use a broad family only: two-wheeler, passenger car, goods vehicle, bus or unknown.' },
      { key: 'rcFamily', label: 'Vehicle family on record', value: value(extraction.rcFamily) || 'Unknown', source: 'vehicle', sourceLabel: 'Uploaded vehicle record · class field', reliability: extracted(extraction.rcFamily), decisive: true, help: 'Use a broad family rather than a specific model.' },
    ],
  };
}

function Brand({ language, onLanguage, onHome }: { language: Language; onLanguage: () => void; onHome: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button onClick={onHome} className="flex items-center gap-3 text-left" aria-label="Challan Jaanch home">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#112629] text-sm font-black text-[#f7c64a] shadow-[0_5px_0_#d6d0c4]">CJ</span>
        <span>
          <strong className="block text-[15px] leading-none tracking-[-0.02em]">Challan Jaanch</strong>
          <small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7775]">Evidence, not advice</small>
        </span>
      </button>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden rounded-full border border-[#d3cec3] bg-white/50 px-3 py-1.5 text-xs font-semibold text-[#52615f] sm:inline">{translate(language, 'Private by design', 'गोपनीयता पहले')}</span>
        <button onClick={onLanguage} className="rounded-full border border-[#112629] px-4 py-2 text-sm font-bold transition hover:bg-[#112629] hover:text-white" aria-label={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}>{language === 'en' ? 'हिंदी' : 'English'}</button>
      </div>
    </div>
  );
}

function Progress({ stage, language }: { stage: Stage; language: Language }) {
  const current = Math.max(0, stepOrder.indexOf(stage === 'processing' ? 'upload' : stage));
  return (
    <nav aria-label="Case progress" className="mt-5 grid grid-cols-4 overflow-hidden rounded-2xl border border-[#d8d2c7] bg-white/60">
      {stepOrder.map((step, index) => (
        <div key={step} className={joinClasses('relative flex items-center gap-2 px-2 py-3 sm:px-4', index <= current ? 'text-[#112629]' : 'text-[#89928f]', index < stepOrder.length - 1 && 'border-r border-[#ddd7cc]')}>
          <span className={joinClasses('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black', index < current ? 'bg-[#1e5e49] text-white' : index === current ? 'bg-[#f7c64a] text-[#112629]' : 'bg-[#e6e1d8]')}>{index < current ? '✓' : index + 1}</span>
          <span className="hidden text-xs font-extrabold sm:inline">{stageLabels[step][language === 'en' ? 0 : 1]}</span>
        </div>
      ))}
    </nav>
  );
}

function Shell({ children, stage, language, onLanguage, onHome, onDelete }: { children: ReactNode; stage: Stage; language: Language; onLanguage: () => void; onHome: () => void; onDelete: () => void }) {
  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#112629]">
      <header className="sticky top-0 z-40 border-b border-[#ddd7cc] bg-[#f4f0e8]/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-4 sm:px-8">
          <Brand language={language} onLanguage={onLanguage} onHome={onHome} />
          {stage !== 'home' && <Progress stage={stage} language={language} />}
        </div>
      </header>
      {children}
      {stage !== 'home' && (
        <footer className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 border-t border-[#d8d2c7] px-5 py-7 text-xs text-[#65726f] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Not a government service or legal adviser. No official submission occurs here.</p>
          <button onClick={onDelete} className="w-fit font-extrabold text-[#a13d2a] underline decoration-[#a13d2a]/30 underline-offset-4">Delete this case from this browser</button>
        </footer>
      )}
    </main>
  );
}

function SourceMiniCard({ title, kicker, children, tone = 'plain' }: { title: string; kicker: string; children: ReactNode; tone?: 'plain' | 'dark' | 'green' }) {
  return (
    <article className={joinClasses('relative min-h-[215px] overflow-hidden rounded-[24px] border p-4 sm:p-5', tone === 'dark' ? 'border-[#253e42] bg-[#1f3033] text-white' : tone === 'green' ? 'border-[#bdd5c5] bg-[#edf6ef]' : 'border-[#d7d1c6] bg-[#fffdf8]')}>
      <p className={joinClasses('text-[9px] font-black uppercase tracking-[0.16em]', tone === 'dark' ? 'text-white/55' : 'text-[#75817e]')}>{kicker}</p>
      <h3 className="mt-1 text-sm font-black">{title}</h3>
      {children}
    </article>
  );
}

function EvidenceHeroCard() {
  return (
    <div className="relative min-h-[535px] lg:min-h-[580px]">
      <div className="absolute inset-x-0 top-4 mx-auto max-w-[650px] rotate-[-1deg] rounded-[32px] border border-[#c9c3b8] bg-[#fffdf8] p-5 shadow-[0_28px_70px_rgba(30,45,44,0.13)] sm:p-7">
        <div className="mb-5 flex items-center justify-between border-b border-[#ddd7cd] pb-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#74807d]">Evidence preflight · synthetic</p><p className="mt-1 text-sm font-extrabold">Three sources. One visible conflict.</p></div>
          <span className="rounded-full bg-[#ffe0d6] px-3 py-1.5 text-[11px] font-black text-[#a53b24]">2 supported findings</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <SourceMiniCard title="ZZ00CJ0001" kicker="Challan record"><div className="mt-6 h-1.5 rounded bg-[#d7d1c6]" /><div className="mt-2 h-1.5 w-3/4 rounded bg-[#e4dfd5]" /><p className="mt-7 text-[9px] font-bold text-[#78827f]">Printed field</p></SourceMiniCard>
          <SourceMiniCard title="ZZ00CJ0007" kicker="Evidence photo" tone="dark"><div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-3 text-center font-mono text-sm font-black tracking-wider sm:text-base">ZZ00CJ000<span className="rounded bg-[#f7c64a] px-1 text-[#112629]">7</span></div><p className="mt-4 text-[9px] font-bold text-white/55">Black two-wheeler</p></SourceMiniCard>
          <SourceMiniCard title="ZZ00CJ0001" kicker="Vehicle record" tone="green"><dl className="mt-5 space-y-3 text-[10px]"><div><dt className="text-[#74817d]">Family</dt><dd className="font-black">Passenger car</dd></div><div><dt className="text-[#74817d]">Colour</dt><dd className="font-black">Blue</dd></div></dl></SourceMiniCard>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#112629] p-4 text-white">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f7c64a] font-black text-[#112629]">!</span>
          <div><p className="text-xs font-black uppercase tracking-[0.1em] text-[#f7c64a]">Objective ground found</p><p className="mt-1 text-xs leading-5 text-white/75">The visible plate and vehicle family conflict with both supplied records.</p></div>
        </div>
      </div>
      <div className="absolute bottom-0 right-1 rounded-2xl border border-[#c8c2b6] bg-[#f7c64a] px-4 py-3 text-xs font-black shadow-[0_8px_25px_rgba(30,45,44,0.16)] sm:right-3">Every claim points to evidence ↗</div>
    </div>
  );
}

function Home({ language, onLanguage, onStartCase, onUpload }: { language: Language; onLanguage: () => void; onStartCase: (id: string) => void; onUpload: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f0e8] text-[#112629]">
      <header className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-8"><Brand language={language} onLanguage={onLanguage} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} /></header>
      <section className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-24 lg:pt-12">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c7c2b8] bg-[#fffaf1] px-3 py-2 text-xs font-bold text-[#43514f]"><span className="h-2 w-2 rounded-full bg-[#db5f43]" />{translate(language, 'For objectively incorrect eChallans', 'स्पष्ट रूप से गलत ई-चालान के लिए')}</div>
          <h1 className="max-w-[650px] text-[clamp(3.25rem,7vw,6.8rem)] font-black leading-[0.86] tracking-[-0.075em]">{translate(language, 'See the mismatch.', 'गलती देखें।')}<span className="mt-2 block text-[#db5f43]">{translate(language, 'Show the proof.', 'सबूत दिखाएँ।')}</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#52615f]">{translate(language, 'The official portal accepts a grievance. Challan Jaanch helps you check whether the supplied evidence supports one—and prepares a transparent citizen-made packet.', 'सरकारी पोर्टल शिकायत लेता है। चालान जाँच आपको पहले सबूत समझने और साफ़ नागरिक-पैकेट बनाने में मदद करता है।')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => onStartCase('wrong-vehicle')} className="group rounded-2xl bg-[#112629] px-6 py-4 text-left text-base font-extrabold text-white shadow-[0_6px_0_#d5a431] transition hover:-translate-y-0.5 hover:shadow-[0_8px_0_#d5a431]">{translate(language, 'Run the 90-second demo', '90 सेकंड का डेमो चलाएँ')} <span className="ml-2 inline-block transition group-hover:translate-x-1">→</span></button>
            <button onClick={onUpload} className="rounded-2xl border border-[#b9b4aa] bg-white/60 px-6 py-4 text-base font-extrabold transition hover:border-[#112629] hover:bg-white">{translate(language, 'Use my documents', 'अपने दस्तावेज़ लें')}</button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#6d7876]"><span>◇</span> {translate(language, 'The guided demo uses visibly synthetic records. Nothing is submitted.', 'डेमो में केवल नकली रिकॉर्ड हैं। कुछ भी जमा नहीं होता।')}</p>
        </div>
        <EvidenceHeroCard />
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-5 pb-16 sm:px-8 lg:pb-24">
        <div className="grid overflow-hidden rounded-[28px] border border-[#d2ccc1] bg-[#fffdf8] sm:grid-cols-3">
          <div className="p-6 sm:border-r sm:border-[#ddd7cc]"><p className="text-3xl font-black tracking-[-0.05em]">3.93 crore</p><p className="mt-1 text-xs leading-5 text-[#64716e]">camera and manual challans reported for 2025</p></div>
          <div className="border-y border-[#ddd7cc] p-6 sm:border-y-0 sm:border-r"><p className="text-3xl font-black tracking-[-0.05em]">3.07 lakh</p><p className="mt-1 text-xs leading-5 text-[#64716e]">eChallan complaints recorded in 2025—not an error rate</p></div>
          <div className="p-6"><p className="text-3xl font-black tracking-[-0.05em]">45 days</p><p className="mt-1 text-xs leading-5 text-[#64716e]">from issuance to pay or contest under the 2026 rule</p></div>
        </div>
        <a href="https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars" target="_blank" rel="noreferrer" className="mt-3 inline-block text-[10px] font-bold text-[#71807c] underline decoration-[#71807c]/30 underline-offset-4">Source: Rajya Sabha answer, 25 March 2026 ↗</a>
      </section>

      <section className="border-y border-[#d7d1c5] bg-[#112629] text-white">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:py-16">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#f7c64a]">The product boundary</p><h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">A debugger,<br />not a robot lawyer.</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[['1', 'Extract', 'AI reads observable fields and links them back to their source.'], ['2', 'Verify', 'You correct and confirm every fact that could change the result.'], ['3', 'Compare', 'Narrow deterministic rules report conflicts—or refuse to conclude.']].map(([number, title, body]) => <article key={number} className="rounded-2xl border border-white/15 bg-white/[0.06] p-5"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f7c64a] text-xs font-black text-[#112629]">{number}</span><h3 className="mt-5 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-5 py-16 sm:px-8 lg:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#db5f43]">Trust is a product feature</p><h2 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Watch it say “I can’t tell.”</h2></div><p className="max-w-md text-sm leading-6 text-[#61706d]">A strong system should find clear contradictions and decline weak ones. Both paths are part of the demo.</p></div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {Object.values(cases).map((fixture) => <button key={fixture.id} onClick={() => onStartCase(fixture.kind)} className="group rounded-[26px] border border-[#d2ccc1] bg-[#fffdf8] p-6 text-left transition hover:-translate-y-1 hover:border-[#112629] hover:shadow-[0_16px_40px_rgba(27,45,44,0.1)]"><span className={joinClasses('inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]', fixture.kind === 'ambiguous-photo' ? 'bg-[#e8e4dc] text-[#586562]' : fixture.kind === 'duplicate-event' ? 'bg-[#e3edf8] text-[#24527a]' : 'bg-[#dff1e3] text-[#246344]')}>{fixture.kind === 'ambiguous-photo' ? 'Refusal path' : 'Supported path'}</span><h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{fixture.shortTitle}</h3><p className="mt-3 text-sm leading-6 text-[#64716f]">{fixture.story}</p><span className="mt-6 inline-block text-sm font-black text-[#db5f43]">Open case <span className="inline-block transition group-hover:translate-x-1">→</span></span></button>)}
        </div>
      </section>

      <footer className="border-t border-[#d7d1c5]"><div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-5 py-8 text-xs text-[#65726f] sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>Independent civic-tech prototype · Not affiliated with any government authority</p><p>Current-rule pack checked 22 Aug 2026 · Synthetic demo data only</p></div></footer>
    </main>
  );
}

function Dropzone({ label, description, file, onFile, optional = false }: { label: string; description: string; file?: File; onFile: (file?: File) => void; optional?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = (event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0]);
  return (
    <div className={joinClasses('rounded-[24px] border-2 border-dashed p-5 transition', file ? 'border-[#4d8b6b] bg-[#eef7f0]' : 'border-[#c9c3b8] bg-[#fffdf8] hover:border-[#112629]')}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={handle} />
      <div className="flex items-start gap-4"><span className={joinClasses('grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black', file ? 'bg-[#1e5e49] text-white' : 'bg-[#ece7de] text-[#112629]')}>{file ? '✓' : '+'}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-black">{label}</h3>{optional && <span className="rounded-full bg-[#ece7de] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#66726f]">Optional</span>}</div><p className="mt-1 text-xs leading-5 text-[#6a7774]">{description}</p>{file && <p className="mt-3 truncate rounded-lg bg-white/65 px-3 py-2 text-xs font-extrabold text-[#315d48]">{file.name} · {(file.size / 1_048_576).toFixed(1)} MB</p>}<div className="mt-4 flex gap-3"><button onClick={() => inputRef.current?.click()} className="rounded-xl bg-[#112629] px-4 py-2 text-xs font-extrabold text-white">{file ? 'Replace file' : 'Choose file'}</button>{file && <button onClick={() => onFile(undefined)} className="text-xs font-extrabold text-[#a13d2a]">Remove</button>}</div></div></div>
    </div>
  );
}

function UploadScreen({ language, files, setFile, error, onAnalyse, onStartCase }: { language: Language; files: UploadedFiles; setFile: (key: UploadKey, file?: File) => void; error: string; onAnalyse: () => void; onStartCase: (id: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:px-8 sm:py-14">
      <div className="grid gap-9 lg:grid-cols-[0.72fr_1.28fr]">
        <aside><p className="text-xs font-black uppercase tracking-[0.16em] text-[#db5f43]">Step 1 · documents</p><h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl">{translate(language, 'Bring the records together.', 'रिकॉर्ड एक साथ लाएँ।')}</h1><p className="mt-5 text-sm leading-7 text-[#5f6d6a]">Use a downloaded challan with its evidence image and the corresponding vehicle record. Clear originals produce safer comparisons.</p><div className="mt-7 rounded-2xl border border-[#d8b55b] bg-[#fff7dc] p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b5a08]">Before you continue</p><ul className="mt-3 space-y-2 text-xs leading-5 text-[#705f30]"><li>• Public hackathon demo: use synthetic records only.</li><li>• Configured live extraction sends files to OpenAI with storage disabled.</li><li>• The app does not ask for portal credentials or submit anything.</li></ul></div><button onClick={() => onStartCase('wrong-vehicle')} className="mt-5 text-sm font-black text-[#1e5e49] underline decoration-[#1e5e49]/30 underline-offset-4">Skip uploads and run the synthetic demo →</button></aside>
        <section className="space-y-4"><Dropzone label="Challan and evidence" description="JPG, PNG or PDF · up to 10 MB" file={files.challan} onFile={(file) => setFile('challan', file)} /><Dropzone label="Vehicle record" description="A redacted record is enough for plate and broad vehicle class" file={files.vehicle} onFile={(file) => setFile('vehicle', file)} /><Dropzone optional label="Supporting record" description="A second challan or other relevant record for duplicate checks" file={files.supporting} onFile={(file) => setFile('supporting', file)} />{error && <div role="alert" className="rounded-2xl border border-[#e1a897] bg-[#fff0ea] px-4 py-3 text-sm font-bold text-[#8d3b27]">{error}</div>}<button onClick={onAnalyse} className="w-full rounded-2xl bg-[#112629] px-6 py-4 font-extrabold text-white shadow-[0_5px_0_#d5a431] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45" disabled={!files.challan || !files.vehicle}>Extract observable fields →</button><p className="text-center text-[11px] leading-5 text-[#7a8582]">Originals remain unchanged. Findings cannot run until you confirm the extracted values.</p></section>
      </div>
    </div>
  );
}

function ProcessingScreen({ progress, live }: { progress: number; live: boolean }) {
  const steps = live ? ['Validate files and remove hidden metadata', 'Extract observable fields', 'Build editable evidence map'] : ['Open synthetic evidence bundle', 'Map each fact to its source', 'Prepare deterministic comparison'];
  return (
    <div className="mx-auto grid min-h-[62vh] w-full max-w-[840px] place-items-center px-5 py-14 sm:px-8">
      <div className="w-full rounded-[32px] border border-[#d4cec2] bg-[#fffdf8] p-7 shadow-[0_22px_60px_rgba(30,45,44,0.1)] sm:p-10">
        <div className="flex items-center gap-5"><div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#112629] text-xl font-black text-[#f7c64a]"><span className="absolute inset-[-5px] animate-spin rounded-full border-2 border-transparent border-t-[#db5f43]" />CJ</div><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#db5f43]">Evidence map in progress</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">Reading facts, not deciding the case.</h1></div></div>
        <div className="mt-9 space-y-3">{steps.map((step, index) => <div key={step} className={joinClasses('flex items-center gap-4 rounded-2xl border px-4 py-3 transition', index < progress ? 'border-[#bdd6c5] bg-[#edf6ef]' : index === progress ? 'border-[#e7c66d] bg-[#fff8df]' : 'border-[#e1ddd5] bg-[#f8f5ef] text-[#8b9492]')}><span className={joinClasses('grid h-7 w-7 place-items-center rounded-full text-xs font-black', index < progress ? 'bg-[#1e5e49] text-white' : index === progress ? 'bg-[#f7c64a]' : 'bg-[#e7e2da]')}>{index < progress ? '✓' : index + 1}</span><span className="text-sm font-extrabold">{step}</span></div>)}</div>
        <p className="mt-7 text-center text-xs font-semibold text-[#707c79]">AI may extract. You verify. Deterministic rules compare.</p>
      </div>
    </div>
  );
}

function EvidencePreview({ caseFile, selectedKey }: { caseFile: DemoCase; selectedKey?: string }) {
  const fact = (key: string) => caseFile.facts.find((item) => item.key === key);
  if (caseFile.kind === 'duplicate-event') {
    return (
      <div className="grid gap-3 md:grid-cols-3"><SourceMiniCard title={fact('challanA')?.value ?? '—'} kicker="First challan"><p className="mt-6 text-xs font-bold text-[#66736f]">{fact('eventA')?.value}</p></SourceMiniCard><SourceMiniCard title={fact('captureA')?.value ?? '—'} kicker="Shared capture" tone="dark"><p className="mt-6 rounded-xl border border-white/20 bg-white/10 p-3 text-xs font-bold">Identical event fingerprint</p></SourceMiniCard><SourceMiniCard title={fact('challanB')?.value ?? '—'} kicker="Second challan" tone="green"><p className="mt-6 text-xs font-bold text-[#51625c]">{fact('eventB')?.value}</p></SourceMiniCard></div>
    );
  }
  const visible = fact('photoPlate');
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <SourceMiniCard title={fact('recordPlate')?.value || 'Not extracted'} kicker="1 · Challan record"><div className={joinClasses('mt-7 rounded-xl border p-3 font-mono text-sm font-black tracking-wider', selectedKey === 'recordPlate' ? 'border-[#db5f43] bg-[#fff0ea]' : 'border-[#ded8cd] bg-[#f5f1e9]')}>Printed field</div><p className="mt-4 text-[10px] font-bold text-[#75817e]">{caseFile.challanNumber}</p></SourceMiniCard>
      <SourceMiniCard title={visible?.value || 'Not clear'} kicker="2 · Enforcement photograph" tone="dark"><div className={joinClasses('mt-6 rounded-xl border bg-white/10 p-3 text-center font-mono text-sm font-black tracking-wider', selectedKey === 'photoPlate' ? 'border-[#f7c64a] ring-2 ring-[#f7c64a]/30' : 'border-white/20')}>{visible?.value || '— — —'}</div>{visible?.alternatives?.[0] && <p className="mt-3 text-[10px] font-bold text-[#f7c64a]">Also plausible: {visible.alternatives[0].value}</p>}<p className="mt-3 text-[10px] text-white/55">{fact('photoFamily')?.value || 'Vehicle family not extracted'}</p></SourceMiniCard>
      <SourceMiniCard title={fact('rcPlate')?.value || 'Not extracted'} kicker="3 · Vehicle record" tone="green"><dl className="mt-6 space-y-3 text-xs"><div><dt className="text-[#75817e]">Broad family</dt><dd className="font-black">{fact('rcFamily')?.value || 'Not extracted'}</dd></div>{fact('rcColour') && <div><dt className="text-[#75817e]">Colour</dt><dd className="font-black">{fact('rcColour')?.value}</dd></div>}</dl></SourceMiniCard>
    </div>
  );
}

function FactRow({ fact, confirmed, selected, onSelect, onChange, onConfirm }: { fact: CaseFact; confirmed: boolean; selected: boolean; onSelect: () => void; onChange: (value: string) => void; onConfirm: () => void }) {
  return (
    <div onClick={onSelect} className={joinClasses('rounded-2xl border p-4 transition', selected ? 'border-[#db5f43] bg-[#fff8f4] shadow-[0_0_0_3px_rgba(219,95,67,0.08)]' : 'border-[#ddd7cc] bg-white/65')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><label htmlFor={`fact-${fact.key}`} className="text-xs font-black">{fact.label}</label>{fact.decisive && <span className="rounded-full bg-[#fff0c7] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#735814]">Decisive</span>}<span className={joinClasses('rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', fact.reliability >= 0.92 ? 'bg-[#dff1e3] text-[#246344]' : fact.reliability >= 0.7 ? 'bg-[#fff0c7] text-[#735814]' : 'bg-[#ffe5dd] text-[#93402c]')}>{reliabilityLabel(fact.reliability)}</span></div><p className="mt-1 text-[10px] font-semibold text-[#74807d]">{fact.sourceLabel}</p><input id={`fact-${fact.key}`} value={fact.value} onChange={(event) => onChange(event.target.value)} onFocus={onSelect} className="mt-3 w-full rounded-xl border border-[#cbc5ba] bg-[#fffdf8] px-3 py-2.5 font-mono text-sm font-black tracking-wide outline-none transition focus:border-[#112629] focus:ring-2 focus:ring-[#112629]/10" aria-describedby={`help-${fact.key}`} /><p id={`help-${fact.key}`} className="mt-2 text-[10px] leading-4 text-[#77827f]">{fact.help}</p>{fact.alternatives?.[0] && <p className="mt-2 text-[10px] font-bold text-[#a44a32]">Alternative reading: {fact.alternatives[0].value}</p>}</div>
        <button onClick={(event) => { event.stopPropagation(); onConfirm(); }} className={joinClasses('shrink-0 rounded-xl px-3 py-2 text-xs font-black transition', confirmed ? 'bg-[#1e5e49] text-white' : 'border border-[#bdb7ac] bg-white text-[#43514f] hover:border-[#112629]')}>{confirmed ? '✓ Confirmed' : 'Confirm value'}</button>
      </div>
    </div>
  );
}

function ReviewScreen({ caseFile, confirmed, selectedKey, notice, onSelect, onChange, onConfirm, onConfirmAll, onCompare }: { caseFile: DemoCase; confirmed: Set<string>; selectedKey?: string; notice: string; onSelect: (key: string) => void; onChange: (key: string, value: string) => void; onConfirm: (key: string) => void; onConfirmAll: () => void; onCompare: () => void }) {
  const decisive = caseFile.facts.filter((fact) => fact.decisive);
  const confirmedCount = decisive.filter((fact) => confirmed.has(fact.key)).length;
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#db5f43]">Evidence map</p>{caseFile.synthetic && <span className="rounded-full bg-[#fff0c7] px-3 py-1 text-[9px] font-black uppercase tracking-[0.11em] text-[#6e540f]">Synthetic · not a real challan</span>}</div><h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Verify what the system read.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#60706c]">Select any field to see its source. Correcting a value automatically removes its confirmation and invalidates the previous result.</p></div><div className="rounded-2xl border border-[#d2ccc1] bg-[#fffdf8] px-5 py-3 text-sm"><span className="font-black">{confirmedCount}/{decisive.length}</span> decisive fields confirmed</div></div>
      {notice && <div role="status" className="mt-6 rounded-2xl border border-[#e1bd62] bg-[#fff7dc] px-5 py-4 text-sm font-semibold leading-6 text-[#725d24]">{notice}</div>}
      <div className="mt-7"><EvidencePreview caseFile={caseFile} selectedKey={selectedKey} /></div>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">{caseFile.facts.map((fact) => <FactRow key={fact.key} fact={fact} confirmed={confirmed.has(fact.key)} selected={selectedKey === fact.key} onSelect={() => onSelect(fact.key)} onChange={(value) => onChange(fact.key, value)} onConfirm={() => onConfirm(fact.key)} />)}</section>
        <aside className="lg:sticky lg:top-[175px] lg:self-start"><div className="rounded-[26px] bg-[#112629] p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f7c64a]">Human confirmation gate</p><h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">The comparison is locked.</h2><p className="mt-3 text-sm leading-6 text-white/65">A finding cannot be generated from unconfirmed decisive fields. This prevents an OCR guess from becoming an allegation.</p><button onClick={onConfirmAll} className="mt-6 w-full rounded-2xl bg-[#f7c64a] px-4 py-3 text-sm font-black text-[#112629]">Confirm all visible values</button><button onClick={onCompare} disabled={confirmedCount < decisive.length} className="mt-3 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Run objective comparison →</button></div><div className="mt-4 rounded-2xl border border-[#d5cfc4] bg-[#fffdf8] p-5"><p className="text-xs font-black">What the model cannot decide</p><ul className="mt-3 space-y-2 text-xs leading-5 text-[#687571]"><li>• Whether the challan is legally valid</li><li>• Why a mismatch occurred</li><li>• Whether a grievance will succeed</li></ul></div></aside>
      </div>
    </div>
  );
}

function OutcomeMark({ outcome }: { outcome: Assessment['outcome'] }) {
  const value = outcome === 'supported' ? '✓' : outcome === 'unable' ? '?' : outcome === 'none' ? '—' : '…';
  return <span className={joinClasses('grid h-16 w-16 place-items-center rounded-full text-2xl font-black', outcome === 'supported' ? 'bg-[#dff1e3] text-[#1e5e49]' : outcome === 'unable' ? 'bg-[#fff0c7] text-[#7b5c0e]' : 'bg-[#e9e5dd] text-[#596663]')}>{value}</span>;
}

function DeadlineCard({ caseFile }: { caseFile: DemoCase }) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
  if (!valid) return <div className="rounded-[24px] border border-[#dfb8a9] bg-[#fff4ef] p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#99442e]">Deadline not calculated</p><p className="mt-2 text-sm leading-6 text-[#735c55]">The issue date or applicable rule version is not confirmed. Check the official portal immediately.</p></div>;
  const deadline = deadlineFor(caseFile);
  return (
    <div className="rounded-[24px] border border-[#d9bc68] bg-[#fff8df] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#765b13]">Rule-based safety date</p><p className="mt-2 text-2xl font-black tracking-[-0.04em]">{formatDate(deadline.date)}</p></div><span className={joinClasses('rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide', deadline.status === 'passed' ? 'bg-[#ffe0d6] text-[#93402c]' : 'bg-[#f7c64a] text-[#5f470a]')}>{deadline.status === 'open' ? `${deadline.daysLeft} days left` : deadline.status === 'today' ? 'Due today' : 'Date passed'}</span></div><p className="mt-3 text-xs leading-5 text-[#6e603b]">45 calendar days from issuance under CMVR Rule 167, G.S.R. 48(E), effective 20 Jan 2026. State procedure and the official portal must still be checked.</p><a href="https://egazette.gov.in/WriteReadData/2026/269493.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-black text-[#765b13] underline decoration-[#765b13]/30 underline-offset-4">Open controlling Gazette ↗</a></div>
  );
}

function ResultScreen({ caseFile, assessment, onPacket, onReview, onStartCase }: { caseFile: DemoCase; assessment: Assessment; onPacket: () => void; onReview: () => void; onStartCase: (id: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-9 sm:px-8 sm:py-12">
      <section className={joinClasses('rounded-[30px] border p-6 sm:p-9', assessment.outcome === 'supported' ? 'border-[#bdd6c5] bg-[#eff7f1]' : assessment.outcome === 'unable' ? 'border-[#dfc36f] bg-[#fff8df]' : 'border-[#d4cec2] bg-[#fffdf8]')}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start"><OutcomeMark outcome={assessment.outcome} /><div className="flex-1"><p className={joinClasses('text-xs font-black uppercase tracking-[0.15em]', assessment.outcome === 'supported' ? 'text-[#1e6849]' : assessment.outcome === 'unable' ? 'text-[#765b13]' : 'text-[#62706d]')}>{assessment.eyebrow}</p><h1 className="mt-2 max-w-3xl text-4xl font-black tracking-[-0.055em] sm:text-5xl">{assessment.headline}</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[#596864]">{assessment.explanation}</p></div></div>
      </section>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {assessment.findings.length > 0 && <section><div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-[-0.04em]">Supported findings</h2><span className="rounded-full bg-[#112629] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">{assessment.findings.length} packet-ready</span></div><div className="mt-4 space-y-3">{assessment.findings.map((finding, index) => <article key={finding.id} className="rounded-[24px] border border-[#d5cfc4] bg-[#fffdf8] p-5"><div className="flex items-start gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#db5f43] text-xs font-black text-white">{index + 1}</span><div><p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#7b8582]">{finding.rule.replaceAll('_', ' ')}</p><h3 className="mt-1 text-lg font-black">{finding.title}</h3><p className="mt-2 text-sm leading-6 text-[#586662]">{finding.neutralClaim}</p><div className="mt-4 flex flex-wrap gap-2">{finding.anchors.map((anchor) => <span key={anchor} className="rounded-full border border-[#d1cbc0] bg-[#f4f0e8] px-3 py-1 text-[10px] font-bold">↗ {anchor}</span>)}</div></div></div></article>)}</div></section>}
          {assessment.nextBestEvidence && <section className="rounded-[24px] border border-[#ddb757] bg-[#f7c64a] p-6"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6c520e]">One best next step</p><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{assessment.nextBestEvidence}</h2><p className="mt-3 text-xs leading-5 text-[#665521]">Do not draft an allegation from the current image. Preserve the original and request a clearer official evidence file.</p></section>}
          <section><h2 className="text-2xl font-black tracking-[-0.04em]">What could make this wrong?</h2><p className="mt-2 text-sm text-[#697572]">Concrete counter-checks downgrade or block findings when unresolved.</p><div className="mt-4 space-y-3">{assessment.counterChecks.map((check) => <div key={check.label} className="flex items-start gap-3 rounded-2xl border border-[#d7d1c6] bg-white/60 p-4"><span className={joinClasses('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black', check.result === 'resolved' ? 'bg-[#dff1e3] text-[#246344]' : check.result === 'unresolved' ? 'bg-[#fff0c7] text-[#735814]' : 'bg-[#e9e5dd] text-[#65716e]')}>{check.result === 'resolved' ? '✓' : check.result === 'unresolved' ? '?' : '—'}</span><div><p className="text-sm font-black">{check.label}</p><p className="mt-1 text-xs leading-5 text-[#6b7774]">{check.explanation}</p></div></div>)}</div></section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-[175px] lg:self-start"><DeadlineCard caseFile={caseFile} /><div className="rounded-[24px] bg-[#112629] p-5 text-white"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f7c64a]">Next action</p>{assessment.outcome === 'supported' ? <><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Prepare the evidence packet.</h2><p className="mt-3 text-xs leading-5 text-white/60">Only supported, user-confirmed claims will be included.</p><button onClick={onPacket} className="mt-5 w-full rounded-2xl bg-[#f7c64a] px-4 py-3 text-sm font-black text-[#112629]">Build citizen packet →</button></> : <><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Do not overclaim.</h2><p className="mt-3 text-xs leading-5 text-white/60">Improve the evidence or use the official process for a different ground.</p><button onClick={onReview} className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#112629]">Return to evidence</button></>}<button onClick={onReview} className="mt-3 w-full rounded-2xl border border-white/20 px-4 py-3 text-xs font-black text-white">Edit confirmed facts</button></div>{assessment.outcome !== 'unable' ? <button onClick={() => onStartCase('ambiguous-photo')} className="w-full rounded-2xl border border-[#cfc9be] bg-[#fffdf8] px-4 py-3 text-xs font-black">Try the refusal case</button> : <button onClick={() => onStartCase('wrong-vehicle')} className="w-full rounded-2xl border border-[#cfc9be] bg-[#fffdf8] px-4 py-3 text-xs font-black">Return to the clear case</button>}</aside>
      </div>
    </div>
  );
}

function PacketScreen({ caseFile, assessment, packetMode, setPacketMode, attested, setAttested, exporting, onDownload, onManifest, onReview }: { caseFile: DemoCase; assessment: Assessment; packetMode: PacketMode; setPacketMode: (mode: PacketMode) => void; attested: boolean; setAttested: (value: boolean) => void; exporting: boolean; onDownload: () => void; onManifest: () => void; onReview: () => void }) {
  const plate = caseFile.facts.find((fact) => fact.key === 'rcPlate')?.value ?? '';
  const shownPlate = packetMode === 'redacted' ? maskIdentifier(plate) : plate;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
  const deadline = validDate ? deadlineFor(caseFile) : null;
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#db5f43]">Citizen-prepared evidence summary</p><h1 className="mt-2 text-4xl font-black tracking-[-0.055em] sm:text-5xl">A packet that shows its work.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#62706d]">This document is independently prepared, visibly non-official, and limited to claims supported by confirmed evidence.</p></div><div className="flex rounded-2xl border border-[#d2ccc1] bg-[#fffdf8] p-1"><button onClick={() => setPacketMode('redacted')} className={joinClasses('rounded-xl px-4 py-2 text-xs font-black', packetMode === 'redacted' ? 'bg-[#112629] text-white' : 'text-[#60706c]')}>Redacted share</button><button onClick={() => setPacketMode('official')} className={joinClasses('rounded-xl px-4 py-2 text-xs font-black', packetMode === 'official' ? 'bg-[#112629] text-white' : 'text-[#60706c]')}>Official handoff</button></div></div>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_330px]">
        <article className="relative overflow-hidden rounded-[28px] border border-[#cbc5ba] bg-white p-6 shadow-[0_24px_65px_rgba(30,45,44,0.1)] sm:p-9"><div className="pointer-events-none absolute right-[-55px] top-[95px] rotate-[35deg] border-y-2 border-[#db5f43]/15 px-16 py-2 text-2xl font-black uppercase tracking-[0.18em] text-[#db5f43]/15">{caseFile.synthetic ? 'Synthetic demo' : 'Citizen prepared'}</div><header className="border-b-2 border-[#112629] pb-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#db5f43]">Not government-issued</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em]">Citizen-prepared evidence summary</h2></div><div className="text-left text-[10px] leading-5 text-[#64716e] sm:text-right"><p>Packet {caseFile.id}</p><p>Schema CJ-1.0</p><p>{caseFile.synthetic ? 'Synthetic case' : 'Citizen-supplied case'}</p></div></div></header><section className="grid gap-4 border-b border-[#d8d2c7] py-6 sm:grid-cols-3"><div><p className="text-[9px] font-black uppercase tracking-wide text-[#7d8885]">Challan</p><p className="mt-1 text-sm font-black">{caseFile.challanNumber}</p></div><div><p className="text-[9px] font-black uppercase tracking-wide text-[#7d8885]">Vehicle identifier</p><p className="mt-1 font-mono text-sm font-black">{shownPlate || 'Not confirmed'}</p></div><div><p className="text-[9px] font-black uppercase tracking-wide text-[#7d8885]">Issue date</p><p className="mt-1 text-sm font-black">{caseFile.issueDate ? formatDate(caseFile.issueDate) : 'Not confirmed'}</p></div></section><section className="py-6"><h3 className="text-xs font-black uppercase tracking-[0.14em]">Supported claim map</h3><div className="mt-4 space-y-4">{assessment.findings.map((finding, index) => <div key={finding.id} className="grid gap-3 rounded-2xl bg-[#f5f2eb] p-4 sm:grid-cols-[32px_1fr]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#112629] text-xs font-black text-white">{index + 1}</span><div><p className="font-black">{finding.title}</p><p className="mt-1 text-xs leading-5 text-[#5f6d69]">{packetMode === 'redacted' ? finding.neutralClaim.replaceAll(plate, maskIdentifier(plate)) : finding.neutralClaim}</p><p className="mt-3 text-[9px] font-bold uppercase tracking-wide text-[#788481]">Evidence anchors · {finding.anchors.join(' · ')}</p></div></div>)}</div></section><section className="grid gap-4 border-t border-[#d8d2c7] py-6 sm:grid-cols-2"><div><h3 className="text-xs font-black uppercase tracking-[0.14em]">Rule clock</h3><p className="mt-2 text-sm font-black">{deadline ? `Safety date: ${formatDate(deadline.date)}` : 'Not safely calculated'}</p><p className="mt-1 text-[10px] leading-4 text-[#697572]">CMVR Rule 167 · G.S.R. 48(E) · state procedure must be verified.</p></div><div><h3 className="text-xs font-black uppercase tracking-[0.14em]">Processing record</h3><p className="mt-2 text-[10px] leading-5 text-[#697572]">Original uploads excluded from this packet. No official submission performed. Findings generated from user-confirmed facts and deterministic comparison rules.</p></div></section><footer className="border-t border-[#d8d2c7] pt-5 text-[9px] leading-4 text-[#77827f]">This summary reports observable conflicts in supplied records. It does not determine legality, guilt, fraud, cloning, or the likely outcome of any grievance.</footer></article>
        <aside className="space-y-4 lg:sticky lg:top-[175px] lg:self-start"><div className="rounded-[24px] bg-[#112629] p-5 text-white"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f7c64a]">Final human gate</p><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-4"><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1 h-4 w-4 accent-[#f7c64a]" /><span className="text-xs leading-5 text-white/75">I checked the displayed facts against the source records and understand this is not an official or legal conclusion.</span></label><button onClick={onDownload} disabled={!attested || exporting} className="mt-4 w-full rounded-2xl bg-[#f7c64a] px-4 py-3 text-sm font-black text-[#112629] disabled:cursor-not-allowed disabled:opacity-40">{exporting ? 'Building PDF…' : 'Download evidence PDF ↓'}</button><button onClick={onManifest} disabled={!attested} className="mt-3 w-full rounded-2xl border border-white/20 px-4 py-3 text-xs font-black text-white disabled:opacity-40">Download manifest.json</button></div><div className="rounded-[24px] border border-[#d0cabf] bg-[#fffdf8] p-5"><p className="text-xs font-black">Continue on the official service</p><p className="mt-2 text-xs leading-5 text-[#6a7774]">Challan Jaanch does not transfer files or credentials. Open the official portal separately and review its current instructions.</p><a href="https://echallan.parivahan.gov.in/challan/" target="_blank" rel="noreferrer" className="mt-4 block rounded-2xl border border-[#112629] px-4 py-3 text-center text-xs font-black">Open official eChallan portal ↗</a></div><button onClick={onReview} className="w-full rounded-2xl border border-[#d0cabf] bg-white/60 px-4 py-3 text-xs font-black">Back to evidence review</button></aside>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [caseFile, setCaseFile] = useState<DemoCase>(() => cloneCase(cases['wrong-vehicle']));
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string>();
  const [files, setFiles] = useState<UploadedFiles>({});
  const [fileHashes, setFileHashes] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState('');
  const [notice, setNotice] = useState('');
  const [processingStep, setProcessingStep] = useState(0);
  const [liveProcessing, setLiveProcessing] = useState(false);
  const [packetMode, setPacketMode] = useState<PacketMode>('redacted');
  const [attested, setAttested] = useState(false);
  const [exporting, setExporting] = useState(false);

  const assessment = useMemo(() => assessCase(caseFile, confirmed), [caseFile, confirmed]);

  const startCase = async (id: string) => {
    const selected = cases[id] ?? cases['wrong-vehicle'];
    setCaseFile(cloneCase(selected));
    setConfirmed(new Set());
    setSelectedKey(undefined);
    setNotice('');
    setAttested(false);
    setLiveProcessing(false);
    setProcessingStep(0);
    setStage('processing');
    for (let index = 0; index < 3; index += 1) {
      setProcessingStep(index);
      await sleep(380);
    }
    setProcessingStep(3);
    await sleep(260);
    setStage('review');
  };

  const setFile = (key: UploadKey, file?: File) => {
    if (file && file.size > 10 * 1024 * 1024) {
      setUploadError(`${file.name} is larger than 10 MB.`);
      return;
    }
    setUploadError('');
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const analyseUploads = async () => {
    if (!files.challan || !files.vehicle) {
      setUploadError('Add both the challan and vehicle record.');
      return;
    }
    setUploadError('');
    setLiveProcessing(true);
    setProcessingStep(0);
    setStage('processing');
    try {
      const selected = [files.challan, files.vehicle, files.supporting].filter(Boolean) as File[];
      const [documents, hashes] = await Promise.all([
        Promise.all(selected.map(async (file) => ({ name: file.name, type: file.type || 'application/octet-stream', data: await fileToDataUrl(file) }))),
        Promise.all(selected.map(async (file) => [file.name, await fileHash(file)] as const)),
      ]);
      setProcessingStep(1);
      setFileHashes(Object.fromEntries(hashes));
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents }) });
      const result = await response.json() as { extraction?: LiveExtraction; message?: string };
      setProcessingStep(2);
      if (response.ok && result.extraction) {
        setCaseFile(manualCase(result.extraction, files));
        setNotice('Live multimodal extraction completed with storage disabled. Verify every value against the original documents.');
      } else {
        setCaseFile(manualCase({}, files));
        setNotice(result.message || 'Live extraction is unavailable. Enter the observable fields manually; no finding will be generated from blank values.');
      }
    } catch {
      setCaseFile(manualCase({}, files));
      setNotice('The extraction service could not be reached. Your files remain selected locally; enter the comparison fields manually.');
    }
    setConfirmed(new Set());
    setSelectedKey(undefined);
    setProcessingStep(3);
    await sleep(320);
    setStage('review');
  };

  const updateFact = (key: string, value: string) => {
    setCaseFile((current) => ({ ...current, facts: current.facts.map((fact) => fact.key === key ? { ...fact, value } : fact) }));
    setConfirmed((current) => { const next = new Set(current); next.delete(key); return next; });
    setAttested(false);
  };

  const toggleConfirmation = (key: string) => setConfirmed((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const confirmAll = () => setConfirmed(new Set(caseFile.facts.filter((fact) => fact.decisive && fact.value.trim()).map((fact) => fact.key)));

  const reset = () => {
    setStage('home');
    setFiles({});
    setFileHashes({});
    setConfirmed(new Set());
    setNotice('');
    setUploadError('');
    setAttested(false);
    setPacketMode('redacted');
    setCaseFile(cloneCase(cases['wrong-vehicle']));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const manifest = () => ({
    schemaVersion: '1.0',
    packetId: `${caseFile.id}-${Date.now()}`,
    caseId: caseFile.id,
    mode: packetMode === 'redacted' ? 'redacted_share' : 'official_submission',
    synthetic: caseFile.synthetic,
    generatedAt: new Date().toISOString(),
    processing: caseFile.synthetic ? 'deterministic_fixture_in_browser' : 'user_confirmed_browser_workflow',
    claims: assessment.findings.map((finding) => ({ id: finding.id, findingRule: finding.rule, neutralStatement: finding.neutralClaim, evidenceAnchorIds: finding.anchors, limitations: finding.limitations })),
    files: caseFile.documentNames.map((name) => ({ path: name, sha256: fileHashes[name] || `SYNTHETIC-${caseFile.id}-${name}`, included: false, purpose: 'Source reference only' })),
    privacy: { originalUploadsIncluded: false, omittedFields: ['owner name', 'address', 'phone', 'email', 'engine number', 'chassis number', 'QR payload', 'EXIF'], retention: 'memory_until_reset', telemetry: false },
    legal: { legalConclusionMade: false, officialSubmissionPerformed: false, disclaimer: 'Reports observable conflicts only; not legal advice or a government record.' },
  });

  const downloadManifest = () => {
    const blob = new Blob([JSON.stringify(manifest(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `challan-jaanch-${caseFile.id.toLowerCase()}-manifest.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const plate = caseFile.facts.find((fact) => fact.key === 'rcPlate')?.value ?? '';
      const shownPlate = packetMode === 'redacted' ? maskIdentifier(plate) : plate;
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
      pdf.setProperties({ title: `Citizen-prepared evidence summary — ${caseFile.id}`, subject: 'Observable eChallan evidence comparison', author: 'Challan Jaanch' });
      pdf.setFillColor(17, 38, 41); pdf.rect(0, 0, 210, 34, 'F');
      pdf.setTextColor(247, 198, 74); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text('CHALLAN JAANCH', 16, 13);
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(18); pdf.text('Citizen-prepared evidence summary', 16, 24);
      pdf.setTextColor(80, 92, 89); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text('NOT GOVERNMENT-ISSUED  |  NOT LEGAL ADVICE  |  NO SUBMISSION PERFORMED', 16, 43);
      pdf.setDrawColor(210, 204, 193); pdf.line(16, 48, 194, 48);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 38, 41); pdf.setFontSize(10); pdf.text('CASE', 16, 58);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.text(`Packet: ${caseFile.id}`, 16, 66); pdf.text(`Challan: ${caseFile.challanNumber}`, 16, 73); pdf.text(`Vehicle identifier: ${shownPlate || 'Not confirmed'}`, 16, 80); pdf.text(`Issue date: ${caseFile.issueDate ? formatDate(caseFile.issueDate) : 'Not confirmed'}`, 16, 87);
      let y = 101;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text('SUPPORTED CLAIM MAP', 16, y); y += 8;
      assessment.findings.forEach((finding, index) => {
        pdf.setFillColor(245, 242, 235); pdf.roundedRect(16, y - 5, 178, 31, 3, 3, 'F');
        pdf.setTextColor(17, 38, 41); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(`${index + 1}. ${finding.title}`, 21, y + 2);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
        const neutral = packetMode === 'redacted' ? finding.neutralClaim.replaceAll(plate, maskIdentifier(plate)) : finding.neutralClaim;
        pdf.text(pdf.splitTextToSize(neutral, 165), 21, y + 8);
        pdf.setFontSize(7); pdf.setTextColor(104, 116, 113); pdf.text(`Evidence anchors: ${finding.anchors.join(' · ')}`, 21, y + 22);
        y += 37;
      });
      pdf.setTextColor(17, 38, 41); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text('RULE CLOCK', 16, y); y += 7;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
      pdf.text(validDate ? `Rule-based safety date: ${formatDate(deadlineFor(caseFile).date)} — 45 calendar days from issuance.` : 'A safety date could not be calculated from the confirmed fields.', 16, y); y += 5;
      pdf.text('Source: CMVR Rule 167, G.S.R. 48(E), effective 20 January 2026. Verify state procedure and the official portal.', 16, y); y += 12;
      pdf.setDrawColor(210, 204, 193); pdf.line(16, y, 194, y); y += 8;
      pdf.setFont('helvetica', 'bold'); pdf.text('PROCESSING & PRIVACY', 16, y); y += 7;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
      const privacyText = 'Original uploads are not embedded in this PDF. Findings are limited to user-confirmed facts and deterministic comparison rules. The packet does not infer cloning, fraud, guilt, legality, or grievance success.';
      pdf.text(pdf.splitTextToSize(privacyText, 178), 16, y);
      pdf.setFontSize(7); pdf.setTextColor(112, 123, 120); pdf.text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · Schema CJ-1.0 · ${caseFile.synthetic ? 'SYNTHETIC DEMO' : 'CITIZEN-SUPPLIED RECORDS'}`, 16, 286);
      pdf.save(`challan-jaanch-${caseFile.id.toLowerCase()}-evidence-summary.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (stage === 'home') return <Home language={language} onLanguage={() => setLanguage((value) => value === 'en' ? 'hi' : 'en')} onStartCase={startCase} onUpload={() => setStage('upload')} />;

  return (
    <Shell stage={stage} language={language} onLanguage={() => setLanguage((value) => value === 'en' ? 'hi' : 'en')} onHome={reset} onDelete={reset}>
      {stage === 'upload' && <UploadScreen language={language} files={files} setFile={setFile} error={uploadError} onAnalyse={analyseUploads} onStartCase={startCase} />}
      {stage === 'processing' && <ProcessingScreen progress={processingStep} live={liveProcessing} />}
      {stage === 'review' && <ReviewScreen caseFile={caseFile} confirmed={confirmed} selectedKey={selectedKey} notice={notice} onSelect={setSelectedKey} onChange={updateFact} onConfirm={toggleConfirmation} onConfirmAll={confirmAll} onCompare={() => { setStage('result'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
      {stage === 'result' && <ResultScreen caseFile={caseFile} assessment={assessment} onPacket={() => { setStage('packet'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onReview={() => setStage('review')} onStartCase={startCase} />}
      {stage === 'packet' && <PacketScreen caseFile={caseFile} assessment={assessment} packetMode={packetMode} setPacketMode={setPacketMode} attested={attested} setAttested={setAttested} exporting={exporting} onDownload={downloadPdf} onManifest={downloadManifest} onReview={() => setStage('review')} />}
    </Shell>
  );
}

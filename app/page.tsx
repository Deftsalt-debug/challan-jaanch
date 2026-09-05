'use client';

import { ChangeEvent, DragEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { EvidenceWorkbench } from '../components/EvidenceWorkbench';
import { AudioGuideButton, HowItWorksDrawer } from '../components/ProductGuide';
import { NextSteps } from '../components/NextSteps';
import { ScamShield } from '../components/ScamShield';
import {
  Assessment,
  CaseFact,
  DemoCase,
  assessCase,
  cases,
  cloneCase,
  deadlineFor,
  formatDate,
  isValidIsoDate,
  maskIdentifier,
  redactCaseText,
  vehicleFamilyLabel,
} from '../lib/cases';
import { OFFICIAL_ECHALLAN_URL } from '../lib/scam-shield';
import { Language, bi, localeTag, pick, t } from '../lib/i18n';
import { useLanguage } from '../lib/use-language';

type Stage = 'home' | 'scam' | 'upload' | 'processing' | 'review' | 'result' | 'packet';
type PacketMode = 'official' | 'redacted';
type UploadKey = 'challan' | 'vehicle' | 'supporting';
type ProcessingMode = 'local' | 'ai';
type TransmissionState = 'none' | 'application_route_only' | 'openai_completed' | 'openai_attempted_unconfirmed';

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

const acceptedFileTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const vehicleFamilyOptions = ['Two-wheeler', 'Passenger car', 'Goods vehicle', 'Bus', 'Three-wheeler', 'Other', 'Unknown'] as const;

function joinClasses(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function clarityLabel(clarity: CaseFact['clarity'], language: Language) {
  if (clarity === 'clear') return t(language, 'Clear source', 'स्पष्ट स्रोत');
  if (clarity === 'unreviewed') return t(language, 'Check source clarity', 'स्रोत की स्पष्टता जाँचें');
  return t(language, 'Unclear source', 'अस्पष्ट स्रोत');
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

function manualCase(extraction: LiveExtraction, files: UploadedFiles, source: 'manual' | 'ai' = 'manual'): DemoCase {
  const value = (entry: string | null | undefined) => entry?.trim() ?? '';
  const notExtracted = bi('Not extracted', 'नहीं निकला');
  return {
    id: `CJ-LOCAL-${Date.now().toString().slice(-6)}`,
    kind: 'manual',
    title: bi('Citizen-supplied document comparison', 'नागरिक द्वारा दिए दस्तावेज़ों की तुलना'),
    shortTitle: bi('Your local case', 'आपका स्थानीय केस'),
    story: source === 'ai'
      ? bi(
        'Observable fields extracted from the supplied documents. Every decisive value must be checked against the original before comparison.',
        'दिए गए दस्तावेज़ों से निकाले गए दिखने वाले फ़ील्ड। तुलना से पहले हर निर्णायक मान मूल दस्तावेज़ से मिलाना ज़रूरी है।',
      )
      : bi(
        'A local workspace for entering only the observable comparison fields. Selected file bytes were not transmitted for extraction.',
        'सिर्फ़ दिखने वाले तुलना फ़ील्ड भरने के लिए स्थानीय कार्यक्षेत्र। चुनी गई फ़ाइलों के बाइट निष्कर्षण के लिए भेजे नहीं गए।',
      ),
    issueDate: isValidIsoDate(value(extraction.issueDate)) ? value(extraction.issueDate) : '',
    jurisdiction: bi('State procedure must be confirmed', 'राज्य की प्रक्रिया पुष्ट करना ज़रूरी'),
    challanNumber: value(extraction.challanNumber) || 'Not extracted',
    amount: value(extraction.amount) || 'Not extracted',
    offence: value(extraction.offence) ? bi(value(extraction.offence), value(extraction.offence)) : notExtracted,
    occurredAt: value(extraction.occurredAt) || 'Not extracted',
    location: value(extraction.location) ? bi(value(extraction.location), value(extraction.location)) : notExtracted,
    documentNames: [files.challan?.name, files.vehicle?.name, files.supporting?.name].filter(Boolean) as string[],
    synthetic: false,
    facts: [
      { key: 'recordPlate', label: bi('Registration on challan', 'चालान पर पंजीकरण नंबर'), value: value(extraction.recordPlate), source: 'challan', sourceLabel: bi('Uploaded challan · printed field', 'अपलोड किया चालान · छपा फ़ील्ड'), clarity: 'unreviewed', decisive: true, help: bi('Check every character against the original document.', 'हर अक्षर मूल दस्तावेज़ से मिलाएँ।') },
      { key: 'photoPlate', label: bi('Plate visible in photograph', 'फोटो में दिख रहा नंबर'), value: value(extraction.photoPlate), source: 'photo', sourceLabel: bi('Uploaded evidence image', 'अपलोड की गई साक्ष्य छवि'), clarity: 'unreviewed', decisive: true, help: bi('Leave blank when the plate is not fully visible.', 'अगर नंबर पूरा नहीं दिख रहा तो ख़ाली छोड़ें।') },
      { key: 'rcPlate', label: bi('Registration on vehicle record', 'वाहन रिकॉर्ड पर पंजीकरण नंबर'), value: value(extraction.rcPlate), source: 'vehicle', sourceLabel: bi('Uploaded vehicle record', 'अपलोड किया वाहन रिकॉर्ड'), clarity: 'unreviewed', decisive: true, help: bi('Check every character against the supplied record.', 'हर अक्षर दिए गए रिकॉर्ड से मिलाएँ।') },
      { key: 'photoFamily', label: bi('Vehicle family in photograph', 'फोटो में वाहन का प्रकार'), value: value(extraction.photoFamily) || 'Unknown', source: 'photo', sourceLabel: bi('Uploaded evidence image · full frame', 'अपलोड की गई साक्ष्य छवि · पूरा फ़्रेम'), clarity: 'unreviewed', decisive: true, help: bi('Use a broad family only: Two-wheeler, Passenger car, Goods vehicle, Bus or Unknown.', 'सिर्फ़ मोटा प्रकार लिखें, अंग्रेज़ी में: Two-wheeler (दोपहिया), Passenger car (कार), Goods vehicle (माल वाहन), Bus (बस) या Unknown (अज्ञात)।') },
      { key: 'rcFamily', label: bi('Vehicle family on record', 'रिकॉर्ड पर वाहन का प्रकार'), value: value(extraction.rcFamily) || 'Unknown', source: 'vehicle', sourceLabel: bi('Uploaded vehicle record · class field', 'अपलोड किया वाहन रिकॉर्ड · श्रेणी फ़ील्ड'), clarity: 'unreviewed', decisive: true, help: bi('Use a broad family rather than a specific model.', 'किसी ख़ास मॉडल के बजाय मोटा प्रकार अंग्रेज़ी में लिखें, जैसे Passenger car या Two-wheeler।') },
    ],
  };
}

function redactedFileName(file: File, sourceRole: UploadKey): string {
  const extension = /\.([a-z0-9]{1,8})$/iu.exec(file.name)?.[1]?.toLowerCase();
  return extension ? `${sourceRole}.${extension}` : sourceRole;
}

function selectedUploads(files: UploadedFiles): Array<readonly [UploadKey, File]> {
  return ([
    ['challan', files.challan],
    ['vehicle', files.vehicle],
    ['supporting', files.supporting],
  ] as const).filter((entry): entry is readonly [UploadKey, File] => Boolean(entry[1]));
}

function Brand({ language, onLanguage, onHome, onScam, onHelp, guideText }: { language: Language; onLanguage: () => void; onHome: () => void; onScam: () => void; onHelp: () => void; guideText: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap">
      <button onClick={onHome} className="flex items-center gap-3 text-left" aria-label={t(language, 'Challan Jaanch home', 'चालान जाँच होम')}>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#172a33] text-sm font-black text-white">CJ</span>
        <span>
          <strong className="block text-[15px] leading-none tracking-[-0.02em]">{t(language, 'Challan Jaanch', 'चालान जाँच')}</strong>
          <small className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[#6b7775]">{t(language, 'Independent evidence preflight', 'स्वतंत्र साक्ष्य जाँच')}</small>
        </span>
      </button>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-3">
        <span className="hidden rounded-full border border-[#d3cec3] bg-white/50 px-3 py-1.5 text-xs font-semibold text-[#52615f] sm:inline">{t(language, 'Private by design', 'गोपनीयता पहले')}</span>
        <AudioGuideButton text={guideText} language={language} />
        <button onClick={onScam} className="rounded-lg border border-[#b8877b] bg-[#fbefec] px-3 py-2 text-[10px] font-black text-[#8f3827] transition hover:border-[#a13d2a] hover:bg-white sm:text-xs">{t(language, 'Scam check', 'ठगी जाँच')}</button>
        <button onClick={onHelp} className="grid h-10 w-10 place-items-center rounded-lg border border-[#c7c1b6] bg-white/60 text-xs font-black text-[#52615f] transition hover:border-[#315f78] hover:bg-white md:h-auto md:w-auto md:px-3 md:py-2" aria-label={t(language, 'How it works', 'यह कैसे काम करता है')}><span className="md:hidden">?</span><span className="hidden md:inline">{t(language, 'How it works', 'कैसे काम करता है')}</span></button>
        <button onClick={onLanguage} className="rounded-lg border border-[#172a33] px-4 py-2 text-sm font-bold transition hover:bg-[#172a33] hover:text-white" aria-label={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}>{language === 'en' ? 'हिंदी' : 'English'}</button>
      </div>
    </div>
  );
}

function Progress({ stage, language }: { stage: Stage; language: Language }) {
  const current = Math.max(0, stepOrder.indexOf(stage === 'processing' ? 'upload' : stage));
  return (
    <nav aria-label={t(language, 'Case progress', 'केस की प्रगति')} className="mt-4 grid grid-cols-4 overflow-hidden rounded-xl border border-[#d8d2c7] bg-white/60">
      {stepOrder.map((step, index) => (
        <div key={step} className={joinClasses('relative flex items-center gap-2 px-2 py-3 sm:px-4', index <= current ? 'text-[#112629]' : 'text-[#89928f]', index < stepOrder.length - 1 && 'border-r border-[#ddd7cc]')}>
          <span className={joinClasses('grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-black', index < current ? 'bg-[#315f78] text-white' : index === current ? 'bg-[#dce9ef] text-[#24495d] ring-1 ring-[#8fb2c4]' : 'bg-[#e6e1d8]')}>{index < current ? '✓' : index + 1}</span>
          <span className="hidden text-xs font-extrabold sm:inline">{stageLabels[step][language === 'en' ? 0 : 1]}</span>
        </div>
      ))}
    </nav>
  );
}

function Shell({ children, stage, language, onLanguage, onHome, onScam, onDelete, onHelp, guideText }: { children: ReactNode; stage: Stage; language: Language; onLanguage: () => void; onHome: () => void; onScam: () => void; onDelete: () => void; onHelp: () => void; guideText: string }) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#f3f1ec] text-[#172a33]">
      <header className="sticky top-0 z-40 border-b border-[#d7d3cb] bg-[#f3f1ec]/94 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-4 sm:px-8">
          <Brand language={language} onLanguage={onLanguage} onHome={onHome} onScam={onScam} onHelp={onHelp} guideText={guideText} />
          {stage !== 'home' && stage !== 'scam' && <Progress stage={stage} language={language} />}
        </div>
      </header>
      <div key={stage} className="stage-transition">{children}</div>
      {stage !== 'home' && (
        <footer className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 border-t border-[#d8d2c7] px-5 py-7 text-xs text-[#65726f] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>{stage === 'scam' ? t(language, 'Safety triage only. It cannot authenticate a sender or declare a message safe.', 'सिर्फ़ सुरक्षा छँटाई। यह भेजने वाले की पहचान नहीं कर सकता और न संदेश को सुरक्षित घोषित कर सकता है।') : t(language, 'Not a government service or legal adviser. No official submission occurs here.', 'यह सरकारी सेवा या क़ानूनी सलाहकार नहीं है। यहाँ कोई आधिकारिक आवेदन नहीं होता।')}</p>
          <button onClick={onDelete} className="touch-target w-fit font-extrabold text-[#a13d2a] underline decoration-[#a13d2a]/30 underline-offset-4">{stage === 'scam' ? t(language, 'Clear and leave Scam Shield', 'साफ़ करके ठगी ढाल से बाहर जाएँ') : t(language, 'Delete this case from this browser', 'इस ब्राउज़र से यह केस मिटाएँ')}</button>
        </footer>
      )}
    </main>
  );
}

function SourceMiniCard({ title, kicker, children, tone = 'plain' }: { title: string; kicker: string; children: ReactNode; tone?: 'plain' | 'dark' | 'green' }) {
  return (
    <article className={joinClasses('relative min-h-[205px] min-w-0 overflow-hidden rounded-xl border p-4 sm:p-5', tone === 'dark' ? 'border-[#29414c] bg-[#1d3039] text-white' : tone === 'green' ? 'border-[#c6d6cd] bg-[#f0f5f1]' : 'border-[#d7d1c6] bg-[#fbfaf7]')}>
      <p className={joinClasses('text-[9px] font-black uppercase tracking-[0.16em]', tone === 'dark' ? 'text-white/55' : 'text-[#75817e]')}>{kicker}</p>
      <h3 className="mt-1 break-words text-sm font-black">{title}</h3>
      {children}
    </article>
  );
}

function EvidenceHeroCard({ language }: { language: Language }) {
  const [scenario, setScenario] = useState<'clear' | 'refusal' | 'duplicate'>('clear');
  const heroCases = {
    clear: { label: t(language, 'Clear mismatch', 'साफ़ बेमेल'), strap: t(language, 'Three sources. Two visible conflicts.', 'तीन स्रोत। दो दिखने वाले अंतर।'), badge: t(language, '2 supported findings', '2 प्रमाणित निष्कर्ष'), status: t(language, 'Objective ground found', 'वस्तुनिष्ठ आधार मिला'), summary: t(language, 'The visible plate and vehicle family conflict with both supplied records.', 'दिख रहा नंबर और वाहन प्रकार दोनों दिए गए रिकॉर्ड से मेल नहीं खाते।'), record: 'ZZ00CJ0001', photo: 'ZZ00CJ0007', vehicle: t(language, 'Passenger car', 'कार'), photoNote: t(language, 'Black two-wheeler', 'काला दोपहिया'), tone: 'supported' },
    refusal: { label: t(language, 'Honest refusal', 'ईमानदार इनकार'), strap: t(language, 'The decisive character is uncertain.', 'निर्णायक अक्षर अनिश्चित है।'), badge: t(language, 'Unable to assess', 'आकलन संभव नहीं'), status: t(language, 'Uncertainty stops the claim', 'अनिश्चितता दावा रोक देती है'), summary: t(language, 'Both Z and 2 remain plausible, so the system refuses to manufacture a mismatch.', 'Z और 2 दोनों संभव हैं, इसलिए सिस्टम झूठा बेमेल बनाने से इनकार करता है।'), record: 'ZZ00CJ0002', photo: 'ZZ00CJ000Z', vehicle: t(language, 'Passenger car', 'कार'), photoNote: t(language, 'Z or 2? · blurred', 'Z या 2? · धुंधला'), tone: 'unable' },
    duplicate: { label: t(language, 'Duplicate event', 'दोहरी घटना'), strap: t(language, 'Two records. One exact capture.', 'दो रिकॉर्ड। एक ही कैप्चर।'), badge: t(language, '1 supported finding', '1 प्रमाणित निष्कर्ष'), status: t(language, 'Exact duplicate found', 'हूबहू दोहराव मिला'), summary: t(language, 'Distinct challan numbers share the same capture ID, camera, time and amount.', 'अलग चालान नंबरों की कैप्चर पहचान, कैमरा, समय और राशि एक ही है।'), record: '…3001', photo: 'CAM-44-000771', vehicle: '…3002', photoNote: '18:07:04 · ₹500', tone: 'supported' },
  } as const;
  const active = heroCases[scenario];
  return (
    <div className="relative min-h-[640px] min-w-0 max-w-full sm:min-h-[590px] lg:min-h-[575px]">
      <div className="professional-card absolute inset-x-0 top-4 mx-auto max-w-[650px] rounded-[18px] p-5 sm:p-7">
        <div className="mb-5 flex gap-1 border-b border-[#d8d3ca] pb-4" role="tablist" aria-label={t(language, 'Preview outcome paths', 'संभावित नतीजों की झलक')}>
          {(Object.keys(heroCases) as Array<keyof typeof heroCases>).map((key) => <button key={key} role="tab" aria-selected={scenario === key} onClick={() => setScenario(key)} className={joinClasses('min-w-0 flex-1 rounded-md px-1.5 py-2.5 text-[9px] font-black leading-4 transition sm:px-2 sm:text-[11px]', scenario === key ? 'bg-[#172a33] text-white' : 'text-[#64716e] hover:bg-[#eeece6]')}>{heroCases[key].label}</button>)}
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd7cd] pb-4">
          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#687673]">{t(language, 'Evidence comparison · synthetic fixture', 'साक्ष्य तुलना · नकली नमूना')}</p><p className="mt-1 text-sm font-extrabold">{active.strap}</p></div>
          <span className={joinClasses('shrink-0 rounded-md border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide', active.tone === 'unable' ? 'border-[#d6c28d] bg-[#faf5e7] text-[#735c22]' : 'border-[#a9c4b6] bg-[#edf5f0] text-[#275b44]')}>{active.badge}</span>
        </div>
        <div key={scenario} className="animate-evidence-in grid grid-cols-3 gap-2.5 sm:gap-4">
          <SourceMiniCard title={active.record} kicker={scenario === 'duplicate' ? t(language, 'First challan', 'पहला चालान') : t(language, 'Challan record', 'चालान रिकॉर्ड')}><div className="mt-6 h-1.5 rounded bg-[#d7d1c6]" /><div className="mt-2 h-1.5 w-3/4 rounded bg-[#e4dfd5]" /><p className="mt-7 text-[9px] font-bold text-[#78827f]">{t(language, 'Confirmed record', 'पुष्ट रिकॉर्ड')}</p></SourceMiniCard>
          <SourceMiniCard title={active.photo} kicker={scenario === 'duplicate' ? t(language, 'Shared capture', 'साझा कैप्चर') : t(language, 'Evidence photo', 'साक्ष्य फोटो')} tone="dark"><div className={joinClasses('relative mt-6 overflow-hidden rounded-md border p-3 text-center font-mono text-xs font-black tracking-wider sm:text-sm', active.tone === 'unable' ? 'border-[#8fb2c4] bg-[#315f78]/15' : 'border-white/20 bg-white/10')}><span className="scan-line" />{active.photo}</div><p className="mt-4 text-[9px] font-bold text-white/55">{active.photoNote}</p></SourceMiniCard>
          <SourceMiniCard title={active.vehicle} kicker={scenario === 'duplicate' ? t(language, 'Second challan', 'दूसरा चालान') : t(language, 'Vehicle record', 'वाहन रिकॉर्ड')} tone="green"><dl className="mt-5 space-y-3 text-[10px]"><div><dt className="text-[#74817d]">{t(language, 'Status', 'स्थिति')}</dt><dd className="font-black">{t(language, 'Confirmed source', 'पुष्ट स्रोत')}</dd></div><div><dt className="text-[#74817d]">{t(language, 'Comparison', 'तुलना')}</dt><dd className="font-black">{t(language, 'Deterministic', 'निश्चित नियम')}</dd></div></dl></SourceMiniCard>
        </div>
        <div key={`${scenario}-finding`} className="animate-evidence-in mt-5 flex items-start gap-3 rounded-lg border border-[#29414c] bg-[#172a33] p-4 text-white">
          <span className="status-dot mt-1.5 shrink-0" />
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b8d4e1]">{active.status}</p><p className="mt-1 text-xs leading-5 text-white/70">{active.summary}</p></div>
        </div>
      </div>
      <div className="absolute bottom-0 right-1 border-l-2 border-[#315f78] bg-[#eef2f3] px-4 py-3 text-[10px] font-bold text-[#47616c] sm:right-3">{t(language, 'Interactive preview · every claim retains its evidence anchors', 'सजीव झलक · हर दावा अपने साक्ष्य से जुड़ा रहता है')}</div>
    </div>
  );
}

function Home({ language, onLanguage, onStartCase, onUpload, onScam, onHelp }: { language: Language; onLanguage: () => void; onStartCase: (id: string) => void; onUpload: () => void; onScam: () => void; onHelp: () => void }) {
  const boundarySteps: Array<[string, string, string]> = [
    ['1', t(language, 'Extract', 'निकालें'), t(language, 'AI reads observable fields and links them back to their source.', 'AI दिखने वाले फ़ील्ड पढ़ता है और उन्हें उनके स्रोत से जोड़ता है।')],
    ['2', t(language, 'Verify', 'जाँचें'), t(language, 'You correct and confirm every fact that could change the result.', 'आप हर उस तथ्य को सुधारते और पुष्ट करते हैं जो नतीजा बदल सकता है।')],
    ['3', t(language, 'Compare', 'तुलना करें'), t(language, 'Narrow deterministic rules report conflicts—or refuse to conclude.', 'सीमित निश्चित नियम अंतर बताते हैं—या निष्कर्ष देने से इनकार कर देते हैं।')],
  ];
  return (
    <main id="main-content" tabIndex={-1} className="stage-transition min-h-screen overflow-hidden bg-[#f3f1ec] text-[#172a33]">
      <header className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-8"><Brand language={language} onLanguage={onLanguage} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onScam={onScam} onHelp={onHelp} guideText={t(language, 'Challan Jaanch checks supplied challan evidence before a citizen uses the official grievance service. It can also inspect suspicious challan messages without opening their links.', 'चालान जाँच आधिकारिक शिकायत सेवा इस्तेमाल करने से पहले दिए गए चालान साक्ष्य की जाँच करता है। यह संदिग्ध चालान संदेशों को उनके लिंक खोले बिना भी परख सकता है।')} /></header>
      <section className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-24 lg:pt-12">
        <div className="min-w-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-[#c7c2b8] bg-[#fbfaf7] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#52615f]"><span className="status-dot" />{t(language, 'For objectively incorrect eChallans', 'स्पष्ट रूप से गलत ई-चालान के लिए')}</div>
          <h1 className="max-w-[650px] text-[clamp(2.9rem,5.4vw,5.3rem)] font-black leading-[0.94] tracking-[-0.058em]">{t(language, 'See the mismatch.', 'गलती देखें।')}<span className="mt-2 block text-[#315f78]">{t(language, 'Show the proof.', 'सबूत दिखाएँ।')}</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#52615f]">{t(language, 'The official portal accepts a grievance. Challan Jaanch helps you check whether the supplied evidence supports one—and prepares a transparent citizen-made packet.', 'सरकारी पोर्टल शिकायत लेता है। चालान जाँच आपको पहले सबूत समझने और साफ़ नागरिक-पैकेट बनाने में मदद करता है।')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => onStartCase('wrong-vehicle')} className="group rounded-lg bg-[#172a33] px-6 py-4 text-left text-base font-extrabold text-white shadow-[0_8px_22px_rgba(23,42,51,.14)] transition hover:bg-[#24495d]">{t(language, 'Run the 90-second demo', '90 सेकंड का डेमो चलाएँ')} <span className="ml-2 inline-block transition group-hover:translate-x-1">→</span></button>
            <button onClick={onUpload} className="rounded-lg border border-[#b9b4aa] bg-white/60 px-6 py-4 text-base font-extrabold transition hover:border-[#315f78] hover:bg-white">{t(language, 'Use my documents', 'अपने दस्तावेज़ लें')}</button>
          </div>
          <p className="mt-5 border-l-2 border-[#9eaaa7] pl-3 text-xs font-semibold leading-5 text-[#6d7876]">{t(language, 'Synthetic demonstration. No government system is contacted and nothing is submitted.', 'डेमो में केवल नकली रिकॉर्ड हैं। कोई सरकारी सिस्टम संपर्क नहीं किया जाता।')}</p>
        </div>
        <EvidenceHeroCard language={language} />
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-5 pb-16 sm:px-8 lg:pb-20">
        <div className="grid overflow-hidden rounded-xl border border-[#bfcbd0] bg-[#eaf0f2] lg:grid-cols-[1fr_auto] lg:items-stretch">
          <div className="p-6 sm:p-8"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8f3827]"><span className="block h-2 w-2 rounded-full bg-[#a13d2a]" />{t(language, 'Scam Shield', 'ठगी ढाल')}</div><h2 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{t(language, 'A fake challan needs a different response.', 'नकली चालान का जवाब अलग होता है।')}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#576965]">{t(language, 'Paste a suspicious message or URL as text. Check for APK malware, OTP requests, pressure tactics, hidden destinations, and lookalike eChallan sites—then get a response matched to what actually happened.', 'संदिग्ध संदेश या पता पाठ के रूप में चिपकाएँ। APK मालवेयर, OTP की माँग, दबाव, छिपे पते और नकली ई-चालान साइटें जाँचें—फिर जो वाक़ई हुआ उसके हिसाब से कार्रवाई पाएँ।')}</p><div className="mt-5 flex flex-wrap gap-2">{[t(language, 'APK lure', 'APK जाल'), t(language, 'Lookalike URL', 'नकली पता'), t(language, 'OTP request', 'OTP की माँग'), t(language, 'Exposure response', 'घटना के हिसाब से जवाब')].map((item) => <span key={item} className="rounded-md border border-[#c4d0d4] bg-white/60 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-[#51676f]">{item}</span>)}</div></div>
          <button onClick={onScam} className="group flex min-h-28 items-center justify-between gap-6 border-t border-[#bfcbd0] bg-[#172a33] px-6 py-6 text-left text-white transition hover:bg-[#24495d] lg:w-[265px] lg:border-l lg:border-t-0"><span><span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#b8d4e1]">{t(language, 'Local-only triage', 'सिर्फ़ स्थानीय जाँच')}</span><span className="mt-2 block text-base font-black">{t(language, 'Check a suspicious message', 'संदिग्ध संदेश जाँचें')}</span></span><span className="text-xl transition group-hover:translate-x-1">→</span></button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-5 pb-16 sm:px-8 lg:pb-24">
        <div className="grid overflow-hidden rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] sm:grid-cols-3">
          <div className="p-6 sm:border-r sm:border-[#ddd7cc]"><p className="text-3xl font-black tracking-[-0.05em]">{t(language, '3.93 crore', '3.93 करोड़')}</p><p className="mt-1 text-xs leading-5 text-[#64716e]">{t(language, 'camera and manual challans reported for 2025', '2025 में दर्ज कैमरा और मैनुअल चालान')}</p></div>
          <div className="border-y border-[#ddd7cc] p-6 sm:border-y-0 sm:border-r"><p className="text-3xl font-black tracking-[-0.05em]">{t(language, '3.07 lakh', '3.07 लाख')}</p><p className="mt-1 text-xs leading-5 text-[#64716e]">{t(language, 'eChallan complaints recorded in 2025—not an error rate', '2025 में दर्ज ई-चालान शिकायतें—यह त्रुटि दर नहीं है')}</p></div>
          <div className="p-6"><p className="text-3xl font-black tracking-[-0.05em]">{t(language, '45 days', '45 दिन')}</p><p className="mt-1 text-xs leading-5 text-[#64716e]">{t(language, 'from issuance to pay or contest under the 2026 rule', '2026 के नियम के तहत जारी होने से भुगतान या आपत्ति तक')}</p></div>
        </div>
        <a href="https://sansad.in/getFile/annex/270/AU3764_TntZ75.pdf?source=pqars" target="_blank" rel="noreferrer" className="mt-3 inline-block text-[10px] font-bold text-[#71807c] underline decoration-[#71807c]/30 underline-offset-4">{t(language, 'Source: Rajya Sabha answer, 25 March 2026 ↗', 'स्रोत: राज्यसभा उत्तर, 25 मार्च 2026 ↗')}</a>
      </section>

      <section className="border-y border-[#d7d1c5] bg-[#172a33] text-white">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:py-16">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b8d4e1]">{t(language, 'The product boundary', 'उत्पाद की सीमा')}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{t(language, 'An evidence debugger,', 'साक्ष्य जाँचने का औज़ार,')}<br />{t(language, 'not an automated judge.', 'स्वचालित न्यायाधीश नहीं।')}</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {boundarySteps.map(([number, title, body]) => <article key={number} className="rounded-lg border border-white/15 bg-white/[0.045] p-5"><span className="text-[10px] font-black tracking-[0.16em] text-[#b8d4e1]">0{number}</span><h3 className="mt-5 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-5 py-16 sm:px-8 lg:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'Calibrated outcomes', 'संतुलित नतीजे')}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{t(language, 'A credible system must be able to abstain.', 'भरोसेमंद सिस्टम को चुप रहना भी आना चाहिए।')}</h2></div><p className="max-w-md text-sm leading-6 text-[#61706d]">{t(language, 'Clear contradictions and insufficient evidence are different outcomes. Both paths are available as testable fixtures.', 'साफ़ विरोधाभास और अपर्याप्त सबूत अलग-अलग नतीजे हैं। दोनों रास्ते जाँचे जा सकने वाले नमूनों के रूप में मौजूद हैं।')}</p></div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {Object.values(cases).map((fixture) => <button key={fixture.id} onClick={() => onStartCase(fixture.kind)} className="group rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-6 text-left transition hover:border-[#315f78] hover:bg-white hover:shadow-[0_12px_28px_rgba(23,42,51,0.07)]"><span className={joinClasses('inline-flex rounded-md border px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em]', fixture.kind === 'ambiguous-photo' ? 'border-[#d5d1c9] bg-[#f0eee9] text-[#586562]' : fixture.kind === 'duplicate-event' ? 'border-[#b9cfda] bg-[#edf3f6] text-[#315f78]' : 'border-[#b8d1c4] bg-[#edf5f0] text-[#246344]')}>{fixture.kind === 'ambiguous-photo' ? t(language, 'Insufficient evidence', 'अपर्याप्त सबूत') : t(language, 'Supported fixture', 'प्रमाणित नमूना')}</span><h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{pick(language, fixture.shortTitle)}</h3><p className="mt-3 text-sm leading-6 text-[#64716f]">{pick(language, fixture.story)}</p><span className="mt-6 inline-block text-sm font-black text-[#315f78]">{t(language, 'Open case', 'केस खोलें')} <span className="inline-block transition group-hover:translate-x-1">→</span></span></button>)}
        </div>
      </section>

      <footer className="border-t border-[#d7d1c5]"><div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-5 py-8 text-xs text-[#65726f] sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>{t(language, 'Independent civic-tech prototype · Not affiliated with any government authority', 'स्वतंत्र नागरिक-तकनीक प्रोटोटाइप · किसी सरकारी विभाग से संबद्ध नहीं')}</p><p>{t(language, 'Current-rule pack rechecked 28 Aug 2026 · Synthetic demo data only', 'मौजूदा नियम-पैक 28 अगस्त 2026 को दोबारा जाँचा गया · केवल नकली डेमो डेटा')}</p></div></footer>
    </main>
  );
}

function Dropzone({ language, label, description, file, onFile, optional = false }: { language: Language; label: string; description: string; file?: File; onFile: (file?: File) => void; optional?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const previewUrl = useMemo(() => file?.type.startsWith('image/') ? URL.createObjectURL(file) : undefined, [file]);
  const handle = (event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0]);
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  const acceptDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFile(event.dataTransfer.files?.[0]);
  };
  return (
    <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={acceptDrop} className={joinClasses('group relative overflow-hidden rounded-xl border-2 border-dashed p-5 transition', dragging ? 'border-[#315f78] bg-[#eef4f7] shadow-[0_10px_24px_rgba(23,42,51,.08)]' : file ? 'border-[#669079] bg-[#eef5f0]' : 'border-[#c9c3b8] bg-[#fbfaf7] hover:border-[#315f78]')}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={handle} />
      <div className="flex items-start gap-4">
        {previewUrl ? <span role="img" aria-label={t(language, 'Selected file preview', 'चुनी गई फ़ाइल की झलक')} className="h-20 w-20 shrink-0 rounded-lg border border-[#b8d1c0] bg-cover bg-center shadow-sm" style={{ backgroundImage: `url(${previewUrl})` }} /> : <span className={joinClasses('grid h-12 w-12 shrink-0 place-items-center rounded-lg text-[10px] font-black tracking-wide', file ? 'bg-[#315f78] text-white' : dragging ? 'bg-[#315f78] text-white' : 'bg-[#ece9e2] text-[#172a33]')}>{file ? file.type === 'application/pdf' ? 'PDF' : t(language, 'READY', 'तैयार') : dragging ? t(language, 'DROP', 'छोड़ें') : t(language, 'ADD', 'जोड़ें')}</span>}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{label}</h3>{optional && <span className="rounded-md bg-[#ece7de] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#66726f]">{t(language, 'Optional', 'वैकल्पिक')}</span>}{dragging && <span className="rounded-md bg-[#dce9ef] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#315f78]">{t(language, 'Release to add', 'जोड़ने के लिए छोड़ें')}</span>}</div><p className="mt-1 text-xs leading-5 text-[#6a7774]">{description} · {t(language, 'drag and drop supported', 'खींचकर छोड़ना भी चलता है')}</p>{file && <p className="mt-3 truncate rounded-md bg-white/65 px-3 py-2 text-xs font-extrabold text-[#315d48]">{file.name} · {(file.size / 1_048_576).toFixed(1)} MB</p>}<div className="mt-4 flex gap-3"><button onClick={() => inputRef.current?.click()} className="rounded-md bg-[#172a33] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#24495d]">{file ? t(language, 'Replace file', 'फ़ाइल बदलें') : t(language, 'Choose file', 'फ़ाइल चुनें')}</button>{file && <button onClick={() => onFile(undefined)} className="touch-target text-xs font-extrabold text-[#9c3f39]">{t(language, 'Remove', 'हटाएँ')}</button>}</div></div>
      </div>
    </div>
  );
}

function UploadScreen({ language, files, setFile, error, aiConsent, setAiConsent, onAnalyse, onManual, onStartCase }: { language: Language; files: UploadedFiles; setFile: (key: UploadKey, file?: File) => void; error: string; aiConsent: boolean; setAiConsent: (value: boolean) => void; onAnalyse: () => void; onManual: () => void; onStartCase: (id: string) => void }) {
  const ready = Boolean(files.challan && files.vehicle);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:px-8 sm:py-14">
      <div className="grid gap-9 lg:grid-cols-[0.72fr_1.28fr]">
        <aside>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'Step 1 · source records', 'चरण 1 · स्रोत रिकॉर्ड')}</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">{t(language, 'Bring the records together.', 'रिकॉर्ड एक साथ लाएँ।')}</h1>
          <p className="mt-5 text-sm leading-7 text-[#5f6d6a]">{t(language, 'Use a downloaded challan with its evidence image and the corresponding vehicle record. Clear originals produce safer comparisons.', 'डाउनलोड किया चालान, उसकी साक्ष्य छवि और उससे जुड़ा वाहन रिकॉर्ड इस्तेमाल करें। साफ़ मूल दस्तावेज़ से तुलना ज़्यादा सुरक्षित होती है।')}</p>
          <div className="mt-7 rounded-lg border border-[#b9ced8] bg-[#eef4f7] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#315f78]">{t(language, 'Processing boundary', 'प्रसंस्करण की सीमा')}</p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[#4e6874]">
              <li>• {t(language, 'For a public demo, use the included synthetic records.', 'सार्वजनिक डेमो के लिए साथ दिए नकली रिकॉर्ड इस्तेमाल करें।')}</li>
              <li>• {t(language, 'Local entry keeps selected file bytes in this browser; only local SHA-256 fingerprints are computed.', 'स्थानीय भराई चुनी गई फ़ाइलों के बाइट इसी ब्राउज़र में रखती है; सिर्फ़ स्थानीय SHA-256 पहचान बनती है।')}</li>
              <li>• {t(language, 'AI extraction is optional and runs only after explicit consent to send the selected files to OpenAI.', 'AI निष्कर्षण वैकल्पिक है और चुनी गई फ़ाइलें OpenAI को भेजने की स्पष्ट सहमति के बाद ही चलता है।')}</li>
              <li>• {t(language, 'If extraction is unavailable, enter fields manually and mark only sources that are clear in the original.', 'निष्कर्षण उपलब्ध न हो तो फ़ील्ड ख़ुद भरें और सिर्फ़ उन्हीं स्रोतों को साफ़ मानें जो मूल में साफ़ दिखते हैं।')}</li>
              <li>• {t(language, 'The app never requests government credentials or performs a submission.', 'ऐप कभी सरकारी लॉगिन नहीं माँगता और न कोई आवेदन जमा करता है।')}</li>
            </ul>
          </div>
          <button onClick={() => onStartCase('wrong-vehicle')} className="touch-target mt-5 text-sm font-black text-[#315f78] underline decoration-[#315f78]/30 underline-offset-4">{t(language, 'Skip uploads and run the synthetic demo →', 'अपलोड छोड़कर नकली डेमो चलाएँ →')}</button>
        </aside>
        <section className="space-y-4">
          <Dropzone language={language} label={t(language, 'Challan and evidence', 'चालान और साक्ष्य')} description={t(language, 'JPG, PNG or PDF · up to 10 MB', 'JPG, PNG या PDF · 10 MB तक')} file={files.challan} onFile={(file) => setFile('challan', file)} />
          <Dropzone language={language} label={t(language, 'Vehicle record', 'वाहन रिकॉर्ड')} description={t(language, 'A redacted record is enough for plate and broad vehicle class', 'नंबर और मोटे प्रकार के लिए छिपाया हुआ रिकॉर्ड भी काफ़ी है')} file={files.vehicle} onFile={(file) => setFile('vehicle', file)} />
          <Dropzone language={language} optional label={t(language, 'Supporting record', 'सहायक रिकॉर्ड')} description={t(language, 'Enforcement image, second challan, or another relevant record', 'कार्रवाई-फोटो, दूसरा चालान या कोई अन्य संबंधित रिकॉर्ड')} file={files.supporting} onFile={(file) => setFile('supporting', file)} />
          {error && <div role="alert" className="rounded-lg border border-[#d4a69d] bg-[#faf0ed] px-4 py-3 text-sm font-bold text-[#8d3b27]">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={onManual} className="rounded-lg border border-[#315f78] bg-[#eef4f7] px-5 py-4 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!ready}>
              <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#315f78]">{t(language, 'Recommended · local only', 'सुझाया गया · सिर्फ़ स्थानीय')}</span>
              <span className="mt-1 block text-sm font-extrabold text-[#172a33]">{t(language, 'Enter fields without AI →', 'AI के बिना फ़ील्ड भरें →')}</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#60716d]">{t(language, 'No selected file bytes leave this browser.', 'चुनी गई फ़ाइल के बाइट इस ब्राउज़र से बाहर नहीं जाते।')}</span>
            </button>
            <button onClick={onAnalyse} aria-describedby="ai-consent-note" className="rounded-lg bg-[#172a33] px-5 py-4 text-left text-white shadow-[0_8px_22px_rgba(23,42,51,.12)] transition hover:bg-[#24495d] disabled:cursor-not-allowed disabled:opacity-45" disabled={!ready || !aiConsent}>
              <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#b8d4e1]">{t(language, 'Optional · AI assisted', 'वैकल्पिक · AI सहायता')}</span>
              <span className="mt-1 block text-sm font-extrabold">{t(language, 'Extract observable fields →', 'दिखने वाले फ़ील्ड निकालें →')}</span>
              <span className="mt-1 block text-[10px] leading-4 text-white/60">{t(language, 'Requires the transmission consent below.', 'नीचे दी भेजने की सहमति ज़रूरी है।')}</span>
            </button>
          </div>
          <label id="ai-consent-note" className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#d4cec3] bg-[#f7f4ee] p-4">
            <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} disabled={!ready} className="mt-0.5 h-4 w-4 shrink-0 accent-[#315f78] disabled:opacity-45" />
            <span className="text-[11px] leading-5 text-[#596864]">{t(language, 'I consent to send these selected files to OpenAI for one extraction request. I used redacted copies and understand that store:false disables retrievable response storage, not every form of provider retention; OpenAI API data controls may still apply.', 'मैं इन चुनी गई फ़ाइलों को एक निष्कर्षण अनुरोध के लिए OpenAI को भेजने की सहमति देता/देती हूँ। मैंने छिपाई गई प्रतियाँ ली हैं और समझता/समझती हूँ कि store:false जवाब को बाद में पाने वाला भंडारण बंद करता है, हर तरह की प्रदाता रख-रखाव नहीं; OpenAI API डेटा नियंत्रण फिर भी लागू हो सकते हैं।')}</span>
          </label>
          <p className="text-center text-[11px] leading-5 text-[#7a8582]">{t(language, 'Use redacted copies that keep only the comparison fields. Findings stay locked until you confirm every decisive value.', 'ऐसी छिपाई गई प्रतियाँ लें जिनमें सिर्फ़ तुलना के फ़ील्ड रहें। हर निर्णायक मान की पुष्टि तक निष्कर्ष बंद रहते हैं।')}</p>
        </section>
      </div>
    </div>
  );
}

function ProcessingScreen({ mode, language }: { mode: ProcessingMode; language: Language }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto grid min-h-[62vh] w-full max-w-[840px] place-items-center px-5 py-14 sm:px-8">
      <div className="professional-card w-full rounded-[18px] p-7 sm:p-10">
        <div className="flex items-start gap-4"><span className="status-dot mt-2 shrink-0" /><h1 className="text-3xl font-black tracking-[-0.04em]">{mode === 'local'
          ? t(language, 'Preparing your local workspace…', 'आपका स्थानीय कार्यक्षेत्र तैयार हो रहा है…')
          : t(language, 'Checking AI availability and reading your documents…', 'AI की उपलब्धता जाँचकर आपके दस्तावेज़ पढ़े जा रहे हैं…')}</h1></div>
        <p className="mt-5 text-sm leading-6 text-[#60706c]">{mode === 'local'
          ? t(language, 'Your files stay in this browser. Next, enter the fields you can read in the originals.', 'आपकी फ़ाइलें इसी ब्राउज़र में रहती हैं। आगे मूल दस्तावेज़ों में पढ़े जा सकने वाले फ़ील्ड भरें।')
          : t(language, 'Review every extracted field against its original before comparing. If extraction is unavailable, you can enter the fields yourself.', 'तुलना से पहले हर निकाले गए फ़ील्ड को मूल से मिलाएँ। निष्कर्षण उपलब्ध न हो तो आप फ़ील्ड ख़ुद भर सकते हैं।')}</p>
      </div>
    </div>
  );
}

function DuplicateEvidencePreview({ caseFile, language }: { caseFile: DemoCase; language: Language }) {
  const fact = (key: string) => caseFile.facts.find((item) => item.key === key);
  return (
    <div className="grid gap-3 md:grid-cols-3"><SourceMiniCard title={fact('challanA')?.value ?? '—'} kicker={t(language, 'First challan', 'पहला चालान')}><p className="mt-6 text-xs font-bold text-[#66736f]">{fact('eventA')?.value}</p></SourceMiniCard><SourceMiniCard title={fact('captureA')?.value ?? '—'} kicker={t(language, 'Shared capture', 'साझा कैप्चर')} tone="dark"><p className="mt-6 rounded-md border border-white/20 bg-white/10 p-3 text-xs font-bold">{t(language, 'Identical event fingerprint', 'एक जैसी घटना पहचान')}</p></SourceMiniCard><SourceMiniCard title={fact('challanB')?.value ?? '—'} kicker={t(language, 'Second challan', 'दूसरा चालान')} tone="green"><p className="mt-6 text-xs font-bold text-[#51625c]">{fact('eventB')?.value}</p></SourceMiniCard></div>
  );
}

function FactRow({ fact, language, confirmed, selected, manual, onSelect, onChange, onClarity, onConfirm }: { fact: CaseFact; language: Language; confirmed: boolean; selected: boolean; manual: boolean; onSelect: () => void; onChange: (value: string) => void; onClarity: (clear: boolean) => void; onConfirm: () => void }) {
  const isFamily = fact.key === 'photoFamily' || fact.key === 'rcFamily';
  const sourceClear = fact.clarity === 'clear';
  const fieldClasses = 'mt-3 w-full rounded-md border border-[#cbc5ba] bg-[#fbfaf7] px-3 py-2.5 font-mono text-sm font-black tracking-wide outline-none transition focus:border-[#315f78] focus:ring-2 focus:ring-[#315f78]/10';
  return (
    <div onClick={onSelect} className={joinClasses('rounded-lg border p-4 transition', selected ? 'border-[#315f78] bg-[#f3f7f8] shadow-[0_0_0_3px_rgba(49,95,120,0.06)]' : 'border-[#ddd7cc] bg-white/65')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><label htmlFor={`fact-${fact.key}`} className="text-xs font-black">{pick(language, fact.label)}</label>{fact.decisive && <span className="rounded-md border border-[#d6c28d] bg-[#faf5e7] px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#735814]">{t(language, 'Decisive', 'निर्णायक')}</span>}<span className={joinClasses('rounded-md border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide', sourceClear ? 'border-[#b8d1c4] bg-[#edf5f0] text-[#246344]' : fact.clarity === 'unreviewed' ? 'border-[#d6c28d] bg-[#faf5e7] text-[#735814]' : 'border-[#d8b0a6] bg-[#faf0ed] text-[#93402c]')}>{clarityLabel(fact.clarity, language)}</span></div>
          <p className="mt-1 text-[10px] font-semibold text-[#74807d]">{pick(language, fact.sourceLabel)}</p>
          {isFamily ? (
            <select id={`fact-${fact.key}`} value={fact.value} onChange={(event) => onChange(event.target.value)} onFocus={onSelect} className={fieldClasses} aria-describedby={`help-${fact.key}`}>
              {vehicleFamilyOptions.map((option) => <option key={option} value={option}>{vehicleFamilyLabel(option, language)}</option>)}
            </select>
          ) : (
            <input id={`fact-${fact.key}`} value={fact.value} onChange={(event) => onChange(event.target.value)} onFocus={onSelect} className={fieldClasses} aria-describedby={`help-${fact.key}`} />
          )}
          <p id={`help-${fact.key}`} className="mt-2 text-[10px] leading-4 text-[#77827f]">{pick(language, fact.help)}</p>
          {manual && fact.decisive && (
            <fieldset className="mt-3 flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <legend className="mr-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#74807d]">{t(language, 'Source clarity', 'स्रोत की स्पष्टता')}</legend>
              <button type="button" aria-pressed={sourceClear} onClick={() => onClarity(true)} className={joinClasses('rounded-md border px-2.5 py-1.5 text-[9px] font-black', sourceClear ? 'border-[#669079] bg-[#edf5f0] text-[#246344]' : 'border-[#d5cfc4] bg-white text-[#65726f]')}>{t(language, 'Clear in original', 'मूल में साफ़')}</button>
              <button type="button" aria-pressed={fact.clarity === 'unclear'} onClick={() => onClarity(false)} className={joinClasses('rounded-md border px-2.5 py-1.5 text-[9px] font-black', fact.clarity === 'unclear' ? 'border-[#c08a7c] bg-[#fbefec] text-[#8f3827]' : 'border-[#d5cfc4] bg-white text-[#65726f]')}>{t(language, 'Unclear / uncertain', 'अस्पष्ट / अनिश्चित')}</button>
            </fieldset>
          )}
          {fact.alternatives?.[0] && <p className="mt-2 text-[10px] font-bold text-[#8a5749]">{t(language, 'Alternative reading', 'दूसरा संभावित पाठ')}: {fact.alternatives[0].value}</p>}
        </div>
        <button disabled={!fact.value.trim() || fact.clarity === 'unreviewed'} onClick={(event) => { event.stopPropagation(); onConfirm(); }} className={joinClasses('shrink-0 rounded-md px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40', confirmed ? 'bg-[#315f78] text-white' : 'border border-[#bdb7ac] bg-white text-[#43514f] hover:border-[#315f78]')}>{confirmed ? t(language, 'Confirmed', 'पुष्ट') : t(language, 'Confirm value', 'मान पुष्ट करें')}</button>
      </div>
    </div>
  );
}

function ReviewScreen({ caseFile, language, confirmed, selectedKey, notice, files, onSelect, onChange, onClarity, onConfirm, onCompare }: { caseFile: DemoCase; language: Language; confirmed: Set<string>; selectedKey?: string; notice: string; files: UploadedFiles; onSelect: (key: string) => void; onChange: (key: string, value: string) => void; onClarity: (key: string, clear: boolean) => void; onConfirm: (key: string) => void; onCompare: () => void }) {
  const decisive = caseFile.facts.filter((fact) => fact.decisive);
  const confirmedCount = decisive.filter((fact) => confirmed.has(fact.key)).length;
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'Evidence verification', 'साक्ष्य जाँच')}</p>{caseFile.synthetic && <span className="rounded-md border border-[#d6c28d] bg-[#faf5e7] px-3 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#6e540f]">{t(language, 'Synthetic fixture · no real citizen data', 'नकली नमूना · कोई असली नागरिक डेटा नहीं')}</span>}</div><h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">{t(language, 'Verify each decisive field.', 'हर निर्णायक फ़ील्ड जाँचें।')}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#60706c]">{t(language, 'Select a field to inspect its source. Any correction removes its confirmation and invalidates the prior result.', 'स्रोत देखने के लिए कोई फ़ील्ड चुनें। कोई भी सुधार उसकी पुष्टि हटा देता है और पिछला नतीजा रद्द कर देता है।')}</p></div><div className="rounded-lg border border-[#d2ccc1] bg-[#fbfaf7] px-5 py-3 text-sm"><span className="font-black">{confirmedCount}/{decisive.length}</span> {t(language, 'decisive fields confirmed', 'निर्णायक फ़ील्ड पुष्ट')}</div></div>
      {notice && <div role="status" className="mt-6 rounded-lg border border-[#b9ced8] bg-[#eef4f7] px-5 py-4 text-sm font-semibold leading-6 text-[#4e6874]">{notice}</div>}
      <div className="mt-7">{caseFile.kind === 'duplicate-event' ? <DuplicateEvidencePreview caseFile={caseFile} language={language} /> : <EvidenceWorkbench caseFile={caseFile} language={language} selectedKey={selectedKey} files={files} onSelect={onSelect} />}</div>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">{caseFile.facts.map((fact) => <FactRow key={fact.key} fact={fact} language={language} confirmed={confirmed.has(fact.key)} selected={selectedKey === fact.key} manual={!caseFile.synthetic} onSelect={() => onSelect(fact.key)} onChange={(value) => onChange(fact.key, value)} onClarity={(clear) => onClarity(fact.key, clear)} onConfirm={() => onConfirm(fact.key)} />)}</section>
        <aside className="lg:sticky lg:top-[175px] lg:self-start"><div className="rounded-xl bg-[#172a33] p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b8d4e1]">{t(language, 'Human confirmation gate', 'मानव पुष्टि द्वार')}</p><h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">{confirmedCount < decisive.length ? t(language, 'Comparison locked', 'तुलना बंद है') : t(language, 'Ready to compare', 'तुलना के लिए तैयार')}</h2><p className="mt-3 text-sm leading-6 text-white/65">{t(language, 'A finding cannot be generated from unconfirmed decisive fields. This prevents an OCR guess from becoming an allegation.', 'बिना पुष्ट निर्णायक फ़ील्ड से कोई निष्कर्ष नहीं बन सकता। इससे कोई अनुमान आरोप नहीं बन पाता।')}</p><button onClick={onCompare} disabled={confirmedCount < decisive.length} className="mt-3 w-full rounded-md border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{t(language, 'Run objective comparison →', 'वस्तुनिष्ठ तुलना चलाएँ →')}</button></div><div className="mt-4 rounded-lg border border-[#d5cfc4] bg-[#fbfaf7] p-5"><p className="text-xs font-black">{t(language, 'What the model cannot decide', 'मॉडल क्या तय नहीं कर सकता')}</p><ul className="mt-3 space-y-2 text-xs leading-5 text-[#687571]"><li>• {t(language, 'Whether the challan is legally valid', 'चालान क़ानूनी रूप से वैध है या नहीं')}</li><li>• {t(language, 'Why a mismatch occurred', 'बेमेल क्यों हुआ')}</li><li>• {t(language, 'Whether a grievance will succeed', 'शिकायत सफल होगी या नहीं')}</li></ul></div></aside>
      </div>
    </div>
  );
}

function OutcomeMark({ outcome, language }: { outcome: Assessment['outcome']; language: Language }) {
  const value = outcome === 'supported' ? t(language, 'SUPPORTED', 'प्रमाणित') : outcome === 'unable' ? t(language, 'ABSTAIN', 'इनकार') : outcome === 'none' ? t(language, 'NO GROUND', 'कोई आधार नहीं') : t(language, 'REVIEW', 'जाँच');
  return <span className={joinClasses('inline-flex shrink-0 rounded-md border px-3 py-2 text-[8px] font-black uppercase tracking-[0.12em]', outcome === 'supported' ? 'border-[#a9c4b6] bg-[#edf5f0] text-[#1e5e49]' : outcome === 'unable' ? 'border-[#d6c28d] bg-[#faf5e7] text-[#7b5c0e]' : 'border-[#d2cec6] bg-[#efede8] text-[#596663]')}>{value}</span>;
}

function DeadlineCard({ caseFile, language }: { caseFile: DemoCase; language: Language }) {
  const valid = isValidIsoDate(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
  if (!valid) return <div className="rounded-xl border border-[#dfb8a9] bg-[#faf0ed] p-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#99442e]">{t(language, 'Deadline not calculated', 'समय-सीमा की गणना नहीं हुई')}</p><p className="mt-2 text-sm leading-6 text-[#735c55]">{t(language, 'The issue date or applicable rule version is not confirmed. Check the official portal immediately.', 'जारी तारीख़ या लागू नियम संस्करण पुष्ट नहीं है। तुरंत आधिकारिक पोर्टल पर जाँचें।')}</p></div>;
  const deadline = deadlineFor(caseFile);
  return (
    <div className="rounded-xl border border-[#c5d4db] bg-[#eef4f7] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#315f78]">{t(language, 'Rule-based safety date', 'नियम आधारित सुरक्षित तारीख़')}</p><p className="mt-2 text-2xl font-black tracking-[-0.04em]">{formatDate(deadline.date, language)}</p></div><span className={joinClasses('rounded-md border px-3 py-1 text-[9px] font-black uppercase tracking-wide', deadline.status === 'passed' ? 'border-[#d8b0a6] bg-[#faf0ed] text-[#93402c]' : 'border-[#9dbbc9] bg-white text-[#315f78]')}>{deadline.status === 'open' ? t(language, `${deadline.daysLeft} days left`, `${deadline.daysLeft} दिन बाकी`) : deadline.status === 'today' ? t(language, 'Due today', 'आज अंतिम दिन') : t(language, 'Date passed', 'तारीख़ बीत चुकी')}</span></div><p className="mt-3 text-xs leading-5 text-[#4e6874]">{t(language, '45 calendar days from issuance under CMVR Rule 167, G.S.R. 48(E), effective 20 Jan 2026. State procedure and the official portal must still be checked.', 'CMVR नियम 167, G.S.R. 48(E), प्रभावी 20 जनवरी 2026 के तहत जारी होने से 45 कैलेंडर दिन। राज्य की प्रक्रिया और आधिकारिक पोर्टल फिर भी जाँचना ज़रूरी है।')}</p><a href="https://egazette.gov.in/WriteReadData/2026/269493.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-black text-[#315f78] underline decoration-[#315f78]/30 underline-offset-4">{t(language, 'Open controlling Gazette ↗', 'संबंधित राजपत्र खोलें ↗')}</a></div>
  );
}

function ResultScreen({ caseFile, language, assessment, onPacket, onReview, onStartCase }: { caseFile: DemoCase; language: Language; assessment: Assessment; onPacket: () => void; onReview: () => void; onStartCase: (id: string) => void }) {
  const [tab, setTab] = useState<'finding' | 'sceptic' | 'deadline'>('finding');
  const [expandedCheck, setExpandedCheck] = useState<number | null>(0);
  const resultTabs = [
    { id: 'finding' as const, label: t(language, 'Finding map', 'निष्कर्ष नक़्शा'), note: t(language, `${assessment.findings.length} supported`, `${assessment.findings.length} प्रमाणित`) },
    { id: 'sceptic' as const, label: t(language, 'Sceptic mode', 'संदेह मोड'), note: t(language, `${assessment.counterChecks.length} counter-checks`, `${assessment.counterChecks.length} विपरीत जाँच`) },
    { id: 'deadline' as const, label: t(language, 'Rule clock', 'नियम घड़ी'), note: t(language, '45-day window', '45 दिन की अवधि') },
  ];
  const traceSteps: Array<[string, string, string]> = [
    ['01', t(language, 'Extracted', 'निकाला'), t(language, 'Observable fields', 'दिखने वाले फ़ील्ड')],
    ['02', t(language, 'Confirmed', 'पुष्ट'), t(language, 'Human gate', 'मानव द्वार')],
    ['03', t(language, 'Compared', 'तुलना'), t(language, 'Versioned rules', 'संस्करण-बद्ध नियम')],
    ['04', t(language, 'Reported', 'बताया'), assessment.outcome === 'supported' ? t(language, 'Narrow finding', 'सीमित निष्कर्ष') : t(language, 'Safe refusal', 'सुरक्षित इनकार')],
  ];
  const clockValid = isValidIsoDate(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
  const routeDeadline = clockValid ? deadlineFor(caseFile) : null;
  const clockSteps: Array<[string, string, string]> = [
    ['1', t(language, 'Issued', 'जारी'), isValidIsoDate(caseFile.issueDate) ? formatDate(caseFile.issueDate, language) : t(language, 'Date not confirmed', 'तारीख़ पुष्ट नहीं')],
    ['2', t(language, 'Review now', 'अभी जाँचें'), t(language, 'Preserve evidence', 'सबूत सुरक्षित रखें')],
    ['3', t(language, 'Safety date', 'सुरक्षित तारीख़'), t(language, 'Pay or contest window', 'भुगतान या आपत्ति की अवधि')],
  ];
  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-9 sm:px-8 sm:py-12">
      <section className={joinClasses('rounded-[18px] border p-6 sm:p-9', assessment.outcome === 'supported' ? 'border-[#bdd6c5] bg-[#f0f5f2]' : assessment.outcome === 'unable' ? 'border-[#d6c28d] bg-[#faf5e7]' : 'border-[#d4cec2] bg-[#fbfaf7]')}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start"><OutcomeMark outcome={assessment.outcome} language={language} /><div className="flex-1"><p className={joinClasses('text-xs font-black uppercase tracking-[0.15em]', assessment.outcome === 'supported' ? 'text-[#1e6849]' : assessment.outcome === 'unable' ? 'text-[#765b13]' : 'text-[#62706d]')}>{pick(language, assessment.eyebrow)}</p><h1 className="mt-2 max-w-3xl text-4xl font-black tracking-[-0.055em] sm:text-5xl">{pick(language, assessment.headline)}</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[#596864]">{pick(language, assessment.explanation)}</p></div></div>
      </section>
      <nav className="mt-6 grid grid-cols-3 gap-1 rounded-lg border border-[#d2ccc1] bg-[#eae7e1] p-1" aria-label={t(language, 'Result views', 'नतीजे के दृश्य')}>
        {resultTabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={joinClasses('rounded-md px-2 py-3 text-left transition sm:px-5', tab === item.id ? 'bg-[#172a33] text-white' : 'text-[#63716e] hover:bg-white')} aria-pressed={tab === item.id}><span className="block text-[10px] font-black sm:text-xs">{item.label}</span><span className={joinClasses('mt-0.5 hidden text-[9px] sm:block', tab === item.id ? 'text-white/55' : 'text-[#89928f]')}>{item.note}</span></button>)}
      </nav>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_340px]">
        <div className="min-h-[460px]">
          {tab === 'finding' && <div className="animate-evidence-in space-y-6">
            <section className="rounded-xl border border-[#d5cfc4] bg-[#fbfaf7] p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#315f78]">{t(language, 'Decision trace', 'निर्णय का रास्ता')}</p><div className="mt-5 grid gap-3 sm:grid-cols-4">{traceSteps.map(([number, title, note], index) => <div key={number} className="relative rounded-md border border-[#ded9d0] bg-[#f3f1ec] p-4"><span className="text-[9px] font-black text-[#315f78]">{number}</span><p className="mt-2 text-xs font-black">{title}</p><p className="mt-1 text-[9px] text-[#788481]">{note}</p>{index < 3 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-[#9ba3a0] sm:block">→</span>}</div>)}</div></section>
            {assessment.findings.length > 0 && <section><div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-[-0.04em]">{t(language, 'Supported findings', 'प्रमाणित निष्कर्ष')}</h2><span className="rounded-md bg-[#172a33] px-3 py-1 text-[9px] font-black uppercase tracking-wide text-white">{assessment.findings.length} {t(language, 'packet-ready', 'पैकेट के लिए तैयार')}</span></div><div className="mt-4 space-y-3">{assessment.findings.map((finding, index) => <article key={finding.id} className="group rounded-xl border border-[#d5cfc4] bg-[#fbfaf7] p-5 transition hover:border-[#315f78] hover:shadow-[0_8px_20px_rgba(23,42,51,.06)]"><div className="flex items-start gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#315f78] text-xs font-black text-white">{index + 1}</span><div><p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#7b8582]">{finding.rule.replaceAll('_', ' ')}</p><h3 className="mt-1 text-lg font-black">{pick(language, finding.title)}</h3><p className="mt-2 text-sm leading-6 text-[#586662]">{pick(language, finding.neutralClaim)}</p><div className="mt-4 flex flex-wrap gap-2">{finding.anchors.map((anchor) => <button key={anchor} onClick={onReview} className="rounded-md border border-[#d1cbc0] bg-[#f3f1ec] px-3 py-1 text-[10px] font-bold transition hover:border-[#315f78]">{t(language, 'Source', 'स्रोत')} · {anchor}</button>)}</div></div></div></article>)}</div></section>}
            {assessment.nextBestEvidence && <section className="rounded-xl border border-[#d6c28d] bg-[#faf5e7] p-6"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6c520e]">{t(language, 'Best next evidence', 'अगला सबसे अच्छा सबूत')}</p><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{pick(language, assessment.nextBestEvidence)}</h2><p className="mt-3 text-xs leading-5 text-[#665521]">{t(language, 'Do not draft an allegation from the current image. Preserve the original and request a clearer official evidence file.', 'मौजूदा तस्वीर के आधार पर आरोप न लिखें। मूल सुरक्षित रखें और साफ़ आधिकारिक साक्ष्य फ़ाइल माँगें।')}</p></section>}
          </div>}
          {tab === 'sceptic' && <section className="animate-evidence-in"><h2 className="text-2xl font-black tracking-[-0.04em]">{t(language, 'What could make this wrong?', 'यह ग़लत किस वजह से हो सकता है?')}</h2><p className="mt-2 text-sm text-[#697572]">{t(language, 'Open each counter-check. Unresolved explanations remain visible in the final packet boundary.', 'हर विपरीत जाँच खोलें। अनसुलझी व्याख्याएँ अंतिम पैकेट की सीमा में दिखती रहती हैं।')}</p><div className="mt-4 space-y-3">{assessment.counterChecks.map((check, index) => <button key={check.label.en} onClick={() => setExpandedCheck(expandedCheck === index ? null : index)} className="w-full rounded-lg border border-[#d7d1c6] bg-white/60 p-4 text-left transition hover:border-[#315f78]" aria-expanded={expandedCheck === index}><div className="flex items-center gap-3"><span className={joinClasses('inline-flex shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-wide', check.result === 'resolved' ? 'border-[#b8d1c4] bg-[#edf5f0] text-[#246344]' : check.result === 'unresolved' ? 'border-[#d6c28d] bg-[#faf5e7] text-[#735814]' : 'border-[#d2cec6] bg-[#e9e5dd] text-[#65716e]')}>{check.result === 'resolved' ? t(language, 'resolved', 'सुलझा') : check.result === 'unresolved' ? t(language, 'unresolved', 'अनसुलझा') : t(language, 'not applicable', 'लागू नहीं')}</span><p className="flex-1 text-sm font-black">{pick(language, check.label)}</p><span className="text-lg font-black">{expandedCheck === index ? '−' : '+'}</span></div>{expandedCheck === index && <p className="animate-evidence-in mt-3 border-t border-[#ded8cd] pt-3 text-xs leading-5 text-[#6b7774]">{pick(language, check.explanation)}</p>}</button>)}</div>{assessment.counterChecks.length === 0 && <div className="rounded-lg border border-[#d7d1c6] bg-white/60 p-5 text-sm text-[#697572]">{t(language, 'Confirm the evidence before counter-checks can run.', 'विपरीत जाँच चलने से पहले सबूत पुष्ट करें।')}</div>}</section>}
          {tab === 'deadline' && <div className="animate-evidence-in space-y-5"><DeadlineCard caseFile={caseFile} language={language} /><section className="rounded-xl border border-[#d5cfc4] bg-[#fbfaf7] p-6"><h2 className="text-xl font-black">{t(language, 'The clock is guidance, not a portal status.', 'यह घड़ी मार्गदर्शन है, पोर्टल की स्थिति नहीं।')}</h2><div className="relative mt-7 grid gap-7 sm:grid-cols-3 sm:gap-3"><div className="absolute left-4 top-4 h-[calc(100%-32px)] w-px bg-[#d2ccc1] sm:left-[16.6%] sm:top-4 sm:h-px sm:w-[66.6%]" />{clockSteps.map(([number, title, note], index) => <div key={number} className="relative flex gap-3 sm:flex-col sm:items-center sm:text-center"><span className={joinClasses('relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-black', index === 2 ? 'bg-[#315f78] text-white' : 'bg-[#172a33] text-white')}>{number}</span><div><p className="text-xs font-black">{title}</p><p className="mt-1 text-[10px] text-[#76817e]">{note}</p></div></div>)}</div></section><NextSteps language={language} outcome={assessment.outcome} deadline={routeDeadline} /></div>}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-[175px] lg:self-start"><div className="rounded-lg border border-[#d3cdc2] bg-[#fbfaf7] p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#77827f]">{t(language, 'Case control', 'केस नियंत्रण')}</p><span className="status-dot" /></div><p className="mt-2 text-sm font-black">{caseFile.id}</p><p className="mt-1 text-[10px] leading-4 text-[#6c7875]">{caseFile.synthetic ? t(language, 'Synthetic demonstration · safe to present', 'नकली प्रदर्शन · दिखाने के लिए सुरक्षित') : t(language, 'Citizen-supplied sources · verify before use', 'नागरिक द्वारा दिए स्रोत · इस्तेमाल से पहले जाँचें')}</p></div><div className="rounded-xl bg-[#172a33] p-5 text-white"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b8d4e1]">{t(language, 'Next action', 'अगला क़दम')}</p>{assessment.outcome === 'supported' ? <><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{t(language, 'Prepare the evidence packet.', 'साक्ष्य पैकेट तैयार करें।')}</h2><p className="mt-3 text-xs leading-5 text-white/60">{t(language, 'Only supported, user-confirmed claims will be included.', 'सिर्फ़ प्रमाणित और उपयोगकर्ता द्वारा पुष्ट दावे ही शामिल होंगे।')}</p><button onClick={onPacket} className="mt-5 w-full rounded-md bg-white px-4 py-3 text-sm font-black text-[#172a33] transition hover:bg-[#eef4f7]">{t(language, 'Build citizen packet →', 'नागरिक पैकेट बनाएँ →')}</button></> : <><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{t(language, 'Do not overclaim.', 'ज़्यादा दावा न करें।')}</h2><p className="mt-3 text-xs leading-5 text-white/60">{t(language, 'Improve the evidence or use the official process for a different ground.', 'सबूत बेहतर करें या किसी दूसरे आधार पर आधिकारिक प्रक्रिया अपनाएँ।')}</p><button onClick={onReview} className="mt-5 w-full rounded-md bg-white px-4 py-3 text-sm font-black text-[#172a33]">{t(language, 'Return to evidence', 'सबूत पर लौटें')}</button></>}<button onClick={onReview} className="mt-3 w-full rounded-md border border-white/20 px-4 py-3 text-xs font-black text-white">{t(language, 'Edit confirmed facts', 'पुष्ट तथ्य बदलें')}</button></div>{assessment.outcome !== 'unable' ? <button onClick={() => onStartCase('ambiguous-photo')} className="w-full rounded-md border border-[#cfc9be] bg-[#fbfaf7] px-4 py-3 text-xs font-black">{t(language, 'Test the insufficient-evidence path', 'अपर्याप्त-सबूत वाला रास्ता आज़माएँ')}</button> : <button onClick={() => onStartCase('wrong-vehicle')} className="w-full rounded-md border border-[#cfc9be] bg-[#fbfaf7] px-4 py-3 text-xs font-black">{t(language, 'Return to the clear case', 'साफ़ केस पर लौटें')}</button>}</aside>
      </div>
    </div>
  );
}

function PacketScreen({ caseFile, language, assessment, packetMode, setPacketMode, attested, setAttested, exporting, exportError, onDownload, onManifest, onReview }: { caseFile: DemoCase; language: Language; assessment: Assessment; packetMode: PacketMode; setPacketMode: (mode: PacketMode) => void; attested: boolean; setAttested: (value: boolean) => void; exporting: boolean; exportError: string; onDownload: () => void; onManifest: () => void; onReview: () => void }) {
  const [copiedBrief, setCopiedBrief] = useState(false);
  const plate = caseFile.facts.find((fact) => fact.key === 'rcPlate')?.value ?? '';
  const shownPlate = packetMode === 'redacted' ? maskIdentifier(plate) : plate;
  const shownChallan = packetMode === 'redacted' ? maskIdentifier(caseFile.challanNumber) : caseFile.challanNumber;
  const validDate = isValidIsoDate(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
  const deadline = validDate ? deadlineFor(caseFile) : null;
  const readiness = [
    t(language, 'Claim-to-source map complete', 'दावे से स्रोत तक का नक़्शा पूरा'),
    t(language, 'Sensitive fields excluded', 'संवेदनशील फ़ील्ड बाहर रखे गए'),
    t(language, 'Official boundary visible', 'आधिकारिक सीमा साफ़ दिख रही है'),
  ];
  const copyBrief = async () => {
    const safeClaim = (claim: string) => packetMode === 'redacted' ? redactCaseText(claim, caseFile) : claim;
    const brief = [
      t(language, 'CHALLAN JAANCH — CITIZEN-PREPARED CASE BRIEF', 'चालान जाँच — नागरिक द्वारा बनाया केस सार'),
      t(language, 'Not government-issued · Not legal advice · No official submission performed', 'सरकार द्वारा जारी नहीं · क़ानूनी सलाह नहीं · कोई आधिकारिक आवेदन नहीं'),
      `${t(language, 'Packet', 'पैकेट')}: ${caseFile.id}`,
      `${t(language, 'Challan', 'चालान')}: ${shownChallan}`,
      `${t(language, 'Vehicle identifier', 'वाहन पहचान')}: ${shownPlate || t(language, 'Not confirmed', 'पुष्ट नहीं')}`,
      `${t(language, 'Issue date', 'जारी तारीख़')}: ${isValidIsoDate(caseFile.issueDate) ? formatDate(caseFile.issueDate, language) : t(language, 'Not confirmed', 'पुष्ट नहीं')}`,
      '',
      t(language, 'SUPPORTED OBSERVATIONS', 'प्रमाणित अवलोकन'),
      ...assessment.findings.map((finding, index) => `${index + 1}. ${safeClaim(pick(language, finding.neutralClaim))} [${t(language, 'Sources', 'स्रोत')}: ${finding.anchors.join(', ')}]`),
      '',
      `${t(language, 'Rule-based safety date', 'नियम-आधारित सुरक्षित तारीख़')}: ${deadline ? formatDate(deadline.date, language) : t(language, 'Not safely calculated', 'सुरक्षित गणना नहीं हुई')}`,
      t(language, 'Verify the current state procedure and continue separately on the official eChallan service.', 'मौजूदा राज्य प्रक्रिया जाँचें और आधिकारिक ई-चालान सेवा पर अलग से आगे बढ़ें।'),
      OFFICIAL_ECHALLAN_URL,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(brief);
      setCopiedBrief(true);
      window.setTimeout(() => setCopiedBrief(false), 2200);
    } catch {
      setCopiedBrief(false);
    }
  };
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'Citizen-prepared evidence summary', 'नागरिक द्वारा बनाया साक्ष्य सारांश')}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">{t(language, 'A packet with a complete audit trail.', 'पूरा हिसाब रखने वाला पैकेट।')}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#62706d]">{t(language, 'This document is independently prepared, visibly non-official, and limited to claims supported by confirmed evidence.', 'यह दस्तावेज़ स्वतंत्र रूप से बना है, स्पष्ट रूप से ग़ैर-सरकारी है, और सिर्फ़ पुष्ट सबूत वाले दावों तक सीमित है।')}</p></div><div className="flex rounded-lg border border-[#d2ccc1] bg-[#fbfaf7] p-1"><button onClick={() => setPacketMode('redacted')} className={joinClasses('rounded-md px-4 py-2 text-xs font-black', packetMode === 'redacted' ? 'bg-[#172a33] text-white' : 'text-[#60706c]')}>{t(language, 'Redacted share', 'छिपाकर साझा')}</button><button onClick={() => setPacketMode('official')} className={joinClasses('rounded-md px-4 py-2 text-xs font-black', packetMode === 'official' ? 'bg-[#172a33] text-white' : 'text-[#60706c]')}>{t(language, 'Official handoff', 'आधिकारिक सौंपना')}</button></div></div>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_330px]">
        <article className="relative overflow-hidden rounded-xl border border-[#cbc5ba] bg-white p-6 shadow-[0_14px_34px_rgba(23,42,51,0.07)] sm:p-9"><header className="border-b-2 border-[#172a33] pb-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'Not government-issued', 'सरकार द्वारा जारी नहीं')} · {caseFile.synthetic ? t(language, 'synthetic fixture', 'नकली नमूना') : t(language, 'citizen prepared', 'नागरिक द्वारा बनाया')}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.045em]">{t(language, 'Citizen-prepared evidence summary', 'नागरिक द्वारा बनाया साक्ष्य सारांश')}</h2></div><div className="text-left text-[10px] leading-5 text-[#64716e] sm:text-right"><p>{t(language, 'Packet', 'पैकेट')} {caseFile.id}</p><p>{t(language, 'Schema CJ-1.0', 'स्कीमा CJ-1.0')}</p><p>{caseFile.synthetic ? t(language, 'Synthetic case', 'नकली केस') : t(language, 'Citizen-supplied case', 'नागरिक द्वारा दिया केस')}</p></div></div></header><section className="grid gap-4 border-b border-[#d8d2c7] py-6 sm:grid-cols-3"><div><p className="text-[9px] font-black uppercase tracking-wide text-[#7d8885]">{t(language, 'Challan', 'चालान')}</p><p className="mt-1 text-sm font-black">{shownChallan}</p></div><div><p className="text-[9px] font-black uppercase tracking-wide text-[#7d8885]">{t(language, 'Vehicle identifier', 'वाहन पहचान')}</p><p className="mt-1 font-mono text-sm font-black">{shownPlate || t(language, 'Not confirmed', 'पुष्ट नहीं')}</p></div><div><p className="text-[9px] font-black uppercase tracking-wide text-[#7d8885]">{t(language, 'Issue date', 'जारी तारीख़')}</p><p className="mt-1 text-sm font-black">{isValidIsoDate(caseFile.issueDate) ? formatDate(caseFile.issueDate, language) : t(language, 'Not confirmed', 'पुष्ट नहीं')}</p></div></section><section className="py-6"><h3 className="text-xs font-black uppercase tracking-[0.14em]">{t(language, 'Supported claim map', 'प्रमाणित दावा नक़्शा')}</h3><div className="mt-4 space-y-4">{assessment.findings.map((finding, index) => <div key={finding.id} className="grid gap-3 rounded-lg border border-[#e0ddd6] bg-[#f5f3ee] p-4 sm:grid-cols-[32px_1fr]"><span className="grid h-8 w-8 place-items-center rounded-md bg-[#315f78] text-xs font-black text-white">{index + 1}</span><div><p className="font-black">{pick(language, finding.title)}</p><p className="mt-1 text-xs leading-5 text-[#5f6d69]">{packetMode === 'redacted' ? redactCaseText(pick(language, finding.neutralClaim), caseFile) : pick(language, finding.neutralClaim)}</p><p className="mt-3 text-[9px] font-bold uppercase tracking-wide text-[#788481]">{t(language, 'Evidence anchors', 'साक्ष्य लंगर')} · {finding.anchors.join(' · ')}</p></div></div>)}</div></section><section className="grid gap-4 border-t border-[#d8d2c7] py-6 sm:grid-cols-2"><div><h3 className="text-xs font-black uppercase tracking-[0.14em]">{t(language, 'Rule clock', 'नियम घड़ी')}</h3><p className="mt-2 text-sm font-black">{deadline ? `${t(language, 'Safety date', 'सुरक्षित तारीख़')}: ${formatDate(deadline.date, language)}` : t(language, 'Not safely calculated', 'सुरक्षित गणना नहीं हुई')}</p><p className="mt-1 text-[10px] leading-4 text-[#697572]">{t(language, 'CMVR Rule 167 · G.S.R. 48(E) · state procedure must be verified.', 'CMVR नियम 167 · G.S.R. 48(E) · राज्य की प्रक्रिया जाँचना ज़रूरी।')}</p></div><div><h3 className="text-xs font-black uppercase tracking-[0.14em]">{t(language, 'Processing record', 'प्रसंस्करण विवरण')}</h3><p className="mt-2 text-[10px] leading-5 text-[#697572]">{t(language, 'Original uploads excluded from this packet. No official submission performed. Findings generated from user-confirmed facts and deterministic comparison rules.', 'मूल अपलोड इस पैकेट में शामिल नहीं। कोई आधिकारिक आवेदन नहीं किया गया। निष्कर्ष उपयोगकर्ता द्वारा पुष्ट तथ्यों और निश्चित तुलना नियमों से बने हैं।')}</p></div></section><footer className="border-t border-[#d8d2c7] pt-5 text-[9px] leading-4 text-[#77827f]">{t(language, 'This summary reports observable conflicts in supplied records. It does not determine legality, guilt, fraud, cloning, or the likely outcome of any grievance.', 'यह सारांश दिए गए रिकॉर्ड में दिखने वाले अंतर बताता है। यह वैधता, दोष, धोखाधड़ी, क्लोनिंग या किसी शिकायत के संभावित नतीजे का निर्धारण नहीं करता।')}</footer></article>
        <aside className="space-y-4 lg:sticky lg:top-[175px] lg:self-start"><div className="rounded-lg border border-[#c9d9cd] bg-[#eef5f0] p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#246344]">{t(language, 'Packet readiness', 'पैकेट की तैयारी')}</p><span className="rounded-md bg-[#315f78] px-2.5 py-1 text-[9px] font-black text-white">3/3</span></div><div className="mt-4 divide-y divide-[#d5e1d9]">{readiness.map((item) => <div key={item} className="flex items-center gap-2 py-2 text-[10px] font-black text-[#426052]"><span className="status-dot" />{item}</div>)}</div></div><div className="rounded-xl bg-[#172a33] p-5 text-white"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b8d4e1]">{t(language, 'Final human gate', 'अंतिम मानव द्वार')}</p><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-white/15 bg-white/[0.05] p-4"><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1 h-4 w-4 accent-[#315f78]" /><span className="text-xs leading-5 text-white/75">{t(language, 'I checked the displayed facts against the source records and understand this is not an official or legal conclusion.', 'मैंने दिखाए गए तथ्य स्रोत रिकॉर्ड से मिला लिए हैं और समझता/समझती हूँ कि यह कोई आधिकारिक या क़ानूनी निष्कर्ष नहीं है।')}</span></label><button onClick={onDownload} disabled={!attested || exporting} className="mt-4 w-full rounded-md bg-white px-4 py-3 text-sm font-black text-[#172a33] disabled:cursor-not-allowed disabled:opacity-40">{exporting ? t(language, 'Building PDF…', 'PDF बन रही है…') : t(language, 'Download evidence PDF ↓', 'साक्ष्य PDF डाउनलोड करें ↓')}</button><p className="mt-2 text-[9px] leading-4 text-white/50">{t(language, 'The authority-handoff PDF uses English; the JSON manifest and copied brief preserve both languages.', 'विभाग को देने वाली PDF अंग्रेज़ी में बनती है; JSON manifest और कॉपी किया सार दोनों भाषाएँ रखते हैं।')}</p>{exportError && <p role="alert" className="mt-3 rounded-md border border-[#d8a99d] bg-[#47261f] px-3 py-2 text-[10px] leading-4 text-[#ffe7df]">{exportError}</p>}<button onClick={onManifest} disabled={!attested} className="mt-3 w-full rounded-md border border-white/20 px-4 py-3 text-xs font-black text-white disabled:opacity-40">{t(language, 'Download manifest.json', 'manifest.json डाउनलोड करें')}</button><button onClick={copyBrief} disabled={!attested} aria-live="polite" className="mt-3 w-full rounded-md border border-white/20 px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{copiedBrief ? t(language, 'Share-safe brief copied', 'साझा करने योग्य सार कॉपी हुआ') : t(language, 'Copy share-safe brief', 'साझा करने योग्य सार कॉपी करें')}</button></div><div className="rounded-lg border border-[#d0cabf] bg-[#fbfaf7] p-5"><p className="text-xs font-black">{t(language, 'Continue on the official service', 'आधिकारिक सेवा पर आगे बढ़ें')}</p><p className="mt-2 text-xs leading-5 text-[#6a7774]">{t(language, 'Challan Jaanch does not transfer files or credentials. Open the official portal separately and review its current instructions.', 'चालान जाँच कोई फ़ाइल या गोपनीय जानकारी नहीं भेजता। आधिकारिक पोर्टल अलग से खोलें और उसके मौजूदा निर्देश पढ़ें।')}</p><a href={OFFICIAL_ECHALLAN_URL} target="_blank" rel="noreferrer" className="mt-4 block rounded-md border border-[#172a33] px-4 py-3 text-center text-xs font-black">{t(language, 'Open official eChallan portal ↗', 'आधिकारिक ई-चालान पोर्टल खोलें ↗')}</a></div><button onClick={onReview} className="w-full rounded-md border border-[#d0cabf] bg-white/60 px-4 py-3 text-xs font-black">{t(language, 'Back to evidence review', 'साक्ष्य जाँच पर लौटें')}</button></aside>
      </div>
      <div className="mt-7">
        <NextSteps language={language} outcome={assessment.outcome} deadline={deadline} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('home');
  const [language, toggleLanguage] = useLanguage();
  const [caseFile, setCaseFile] = useState<DemoCase>(() => cloneCase(cases['wrong-vehicle']));
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string>();
  const [files, setFiles] = useState<UploadedFiles>({});
  const [fileHashes, setFileHashes] = useState<Partial<Record<UploadKey, string>>>({});
  const [uploadError, setUploadError] = useState('');
  const [notice, setNotice] = useState('');
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('local');
  const [packetMode, setPacketMode] = useState<PacketMode>('redacted');
  const [attested, setAttested] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [transmissionState, setTransmissionState] = useState<TransmissionState>('none');
  const processingRequest = useRef<AbortController | null>(null);

  useEffect(() => () => processingRequest.current?.abort(), []);

  const cancelProcessing = () => processingRequest.current?.abort();
  const openScamCheck = () => {
    cancelProcessing();
    setStage('scam');
  };

  // Keep the document language in step with the interface so screen readers and
  // the speech guide use the right pronunciation.
  useEffect(() => {
    document.documentElement.lang = localeTag[language];
  }, [language]);

  const assessment = useMemo(() => assessCase(caseFile, confirmed), [caseFile, confirmed]);
  const guideText = useMemo(() => ({
    upload: t(language, 'Add a challan evidence file and a corresponding vehicle record. Images and PDFs up to ten megabytes are accepted. The guided synthetic case needs no uploads or API key.', 'चालान साक्ष्य फ़ाइल और उससे जुड़ा वाहन रिकॉर्ड जोड़ें। दस मेगाबाइट तक की छवियाँ और PDF स्वीकार हैं। निर्देशित नकली केस के लिए न अपलोड चाहिए, न कोई कुंजी।'),
    processing: t(language, 'The application maps observable facts to their sources. Artificial intelligence may extract a field, but it cannot decide the case. You will verify every decisive value next.', 'ऐप दिखने वाले तथ्यों को उनके स्रोत से जोड़ता है। कृत्रिम बुद्धिमत्ता कोई फ़ील्ड निकाल सकती है, पर केस तय नहीं कर सकती। आगे आप हर निर्णायक मान जाँचेंगे।'),
    review: t(language, 'Use the source lens to inspect each record, the character diff to compare every plate position, and the rule clock to see the calculated safety date. Confirm every decisive value before comparing.', 'हर रिकॉर्ड देखने के लिए स्रोत दृश्य, नंबर का हर अक्षर मिलाने के लिए अक्षर तुलना, और गणना की गई सुरक्षित तारीख़ देखने के लिए नियम घड़ी इस्तेमाल करें। तुलना से पहले हर निर्णायक मान पुष्ट करें।'),
    result: assessment.outcome === 'supported'
      ? t(language, 'The confirmed records support a narrow objective contradiction. Inspect the finding map, sceptic mode, and rule clock before preparing a citizen packet.', 'पुष्ट रिकॉर्ड एक सीमित वस्तुनिष्ठ विरोधाभास दिखाते हैं। नागरिक पैकेट बनाने से पहले निष्कर्ष नक़्शा, संदेह मोड और नियम घड़ी देखें।')
      : t(language, 'The evidence does not safely support an objective claim. Review the unresolved counter-checks and improve the source material before proceeding.', 'सबूत किसी वस्तुनिष्ठ दावे को सुरक्षित रूप से नहीं टिकाते। आगे बढ़ने से पहले अनसुलझी विपरीत जाँचें देखें और स्रोत सामग्री बेहतर करें।'),
    packet: t(language, 'Choose a redacted share or official handoff view, inspect the claim-to-source map, complete the human attestation, then download the PDF/JSON or copy a share-safe brief.', 'छिपाकर साझा या आधिकारिक सौंपना चुनें, दावे से स्रोत तक का नक़्शा देखें, मानव पुष्टि पूरी करें, फिर PDF/JSON डाउनलोड करें या सुरक्षित सार कॉपी करें।'),
    scam: t(language, 'Paste a suspicious challan message as plain text. The local checker never opens its links. Mark exactly what happened; if money was sent, an app was installed, or dangerous permissions were granted, use a clean device and call 1930 immediately.', 'संदिग्ध चालान संदेश सादे पाठ में चिपकाएँ। स्थानीय जाँचकर्ता उसके लिंक कभी नहीं खोलता। जो हुआ उसे ठीक-ठीक चुनें; अगर पैसा भेजा गया, ऐप इंस्टॉल हुआ या ख़तरनाक अनुमति दी गई, तो सुरक्षित फ़ोन से तुरंत 1930 पर कॉल करें।'),
    home: t(language, 'Challan Jaanch is an evidence preflight for incorrect or potentially fraudulent electronic challans.', 'चालान जाँच ग़लत या संभावित रूप से फ़र्ज़ी इलेक्ट्रॉनिक चालानों के लिए एक साक्ष्य जाँच है।'),
  } as Record<Stage, string>)[stage], [assessment.outcome, stage, language]);

  const startCase = (id: string) => {
    cancelProcessing();
    const selected = cases[id] ?? cases['wrong-vehicle'];
    setCaseFile(cloneCase(selected));
    setConfirmed(new Set());
    setSelectedKey(undefined);
    setNotice('');
    setAttested(false);
    setAiConsent(false);
    setTransmissionState('none');
    setFiles({});
    setFileHashes({});
    setStage('review');
  };

  const setFile = (key: UploadKey, file?: File) => {
    if (file && !acceptedFileTypes.has(file.type)) {
      setUploadError(t(language, `${file.name} is not a supported JPG, PNG or PDF file.`, `${file.name} समर्थित JPG, PNG या PDF फ़ाइल नहीं है।`));
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setUploadError(t(language, `${file.name} is larger than 10 MB.`, `${file.name} 10 MB से बड़ी है।`));
      return;
    }
    setUploadError('');
    setAiConsent(false);
    setFiles((current) => ({ ...current, [key]: file }));
    setFileHashes((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const analyseUploads = async () => {
    if (!files.challan || !files.vehicle) {
      setUploadError(t(language, 'Add both the challan and vehicle record.', 'चालान और वाहन रिकॉर्ड दोनों जोड़ें।'));
      return;
    }
    if (!aiConsent) {
      setUploadError(t(language, 'Consent is required before selected files can be sent for AI extraction. Use local entry to keep file bytes on-device.', 'AI निष्कर्षण के लिए चुनी गई फ़ाइलें भेजने से पहले सहमति ज़रूरी है। फ़ाइल के बाइट डिवाइस पर रखने के लिए स्थानीय भराई चुनें।'));
      return;
    }
    setUploadError('');
    cancelProcessing();
    const request = new AbortController();
    processingRequest.current = request;
    setProcessingMode('ai');
    setTransmissionState('none');
    setStage('processing');
    let fileTransmissionAttempted = false;
    try {
      const selected = selectedUploads(files);
      const capabilityResponse = await fetch('/api/analyze', { headers: { Accept: 'application/json' }, cache: 'no-store', signal: request.signal });
      const capability = await capabilityResponse.json() as { configured?: boolean };
      if (request.signal.aborted) return;
      if (!capabilityResponse.ok || !capability.configured) {
        const hashes = await Promise.all(selected.map(async ([key, file]) => [key, await fileHash(file)] as const));
        if (request.signal.aborted) return;
        setFileHashes(Object.fromEntries(hashes));
        setCaseFile(manualCase({}, files, 'manual'));
        setNotice(t(language, 'AI extraction is not configured, so no selected file bytes were sent to the server or OpenAI. Continue locally: enter the observable fields, mark source clarity, and confirm every decisive value.', 'AI निष्कर्षण कॉन्फ़िगर नहीं है, इसलिए चुनी गई फ़ाइलों के बाइट सर्वर या OpenAI को नहीं भेजे गए। स्थानीय रूप से आगे बढ़ें: दिखने वाले फ़ील्ड भरें, स्रोत की स्पष्टता बताएँ और हर निर्णायक मान पुष्ट करें।'));
        setConfirmed(new Set());
        setSelectedKey(undefined);
        setStage('review');
        return;
      }
      setTransmissionState('application_route_only');
      fileTransmissionAttempted = true;
      const [documents, hashes] = await Promise.all([
        Promise.all(selected.map(async ([key, file]) => ({ name: redactedFileName(file, key), type: file.type || 'application/octet-stream', data: await fileToDataUrl(file) }))),
        Promise.all(selected.map(async ([key, file]) => [key, await fileHash(file)] as const)),
      ]);
      if (request.signal.aborted) return;
      setFileHashes(Object.fromEntries(hashes));
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents }), signal: request.signal });
      const result = await response.json() as { extraction?: LiveExtraction; message?: string; code?: string };
      if (request.signal.aborted) return;
      if (response.ok && result.extraction) {
        setTransmissionState('openai_completed');
        setCaseFile(manualCase(result.extraction, files, 'ai'));
        setNotice(t(language, 'AI extraction completed with store:false, so the response is not saved for later retrieval. OpenAI API data controls, including possible abuse-monitoring retention, still apply. Verify every value against the originals.', 'AI निष्कर्षण store:false के साथ पूरा हुआ, इसलिए जवाब बाद में पाने के लिए सुरक्षित नहीं रहता। संभावित दुरुपयोग-निगरानी रख-रखाव सहित OpenAI API डेटा नियंत्रण फिर भी लागू होते हैं। हर मान मूल से मिलाएँ।'));
      } else {
        if (result.code !== 'LIVE_EXTRACTION_NOT_CONFIGURED') setTransmissionState('openai_attempted_unconfirmed');
        setCaseFile(manualCase({}, files));
        setNotice(result.code === 'LIVE_EXTRACTION_NOT_CONFIGURED'
          ? t(language, 'AI extraction is not configured, so OpenAI was not contacted. Continue locally: enter the observable fields, mark source clarity, and confirm every decisive value.', 'AI निष्कर्षण कॉन्फ़िगर नहीं है, इसलिए OpenAI से संपर्क नहीं हुआ। स्थानीय रूप से आगे बढ़ें: दिखने वाले फ़ील्ड भरें, स्रोत की स्पष्टता बताएँ और हर निर्णायक मान पुष्ट करें।')
          : result.message || t(language, 'Live extraction is unavailable. Enter the observable fields manually; no finding will be generated from blank values.', 'लाइव निष्कर्षण उपलब्ध नहीं है। दिखने वाले फ़ील्ड ख़ुद भरें; ख़ाली मानों से कोई निष्कर्ष नहीं बनेगा।'));
      }
    } catch {
      if (request.signal.aborted) return;
      setTransmissionState(fileTransmissionAttempted ? 'openai_attempted_unconfirmed' : 'none');
      setCaseFile(manualCase({}, files));
      setNotice(fileTransmissionAttempted
        ? t(language, 'The extraction service could not be reached after transmission began. Continue manually and treat upstream completion as unconfirmed.', 'फ़ाइल भेजना शुरू होने के बाद निष्कर्षण सेवा तक नहीं पहुँचा जा सका। हाथ से आगे बढ़ें और अपस्ट्रीम पूर्णता को अपुष्ट मानें।')
        : t(language, 'AI availability could not be confirmed, so no selected file bytes were transmitted. Continue locally and enter the comparison fields manually.', 'AI उपलब्धता पुष्ट नहीं हो सकी, इसलिए चुनी गई फ़ाइलों के बाइट भेजे नहीं गए। स्थानीय रूप से आगे बढ़ें और तुलना के फ़ील्ड ख़ुद भरें।'));
    }
    setConfirmed(new Set());
    setSelectedKey(undefined);
    setStage('review');
  };

  const prepareManualUploads = async () => {
    if (!files.challan || !files.vehicle) {
      setUploadError(t(language, 'Add both the challan and vehicle record.', 'चालान और वाहन रिकॉर्ड दोनों जोड़ें।'));
      return;
    }
    setUploadError('');
    cancelProcessing();
    const request = new AbortController();
    processingRequest.current = request;
    setProcessingMode('local');
    setTransmissionState('none');
    setStage('processing');
    const selected = selectedUploads(files);
    try {
      const hashes = await Promise.all(selected.map(async ([key, file]) => [key, await fileHash(file)] as const));
      if (request.signal.aborted) return;
      setFileHashes(Object.fromEntries(hashes));
    } catch {
      if (request.signal.aborted) return;
      setFileHashes({});
    }
    setCaseFile(manualCase({}, files, 'manual'));
    setNotice(t(language, 'Local-only mode: no selected file bytes were sent to the server or OpenAI. Enter only the observable comparison fields, mark whether each source is clear, and confirm every decisive value.', 'सिर्फ़ स्थानीय मोड: चुनी गई फ़ाइलों के बाइट सर्वर या OpenAI को नहीं भेजे गए। सिर्फ़ दिखने वाले तुलना फ़ील्ड भरें, हर स्रोत साफ़ है या नहीं बताएँ, और हर निर्णायक मान पुष्ट करें।'));
    setConfirmed(new Set());
    setSelectedKey(undefined);
    setStage('review');
  };

  const updateFact = (key: string, value: string) => {
    setCaseFile((current) => ({ ...current, facts: current.facts.map((fact) => fact.key === key ? { ...fact, value, clarity: current.synthetic ? fact.clarity : 'unreviewed' } : fact) }));
    setConfirmed((current) => { const next = new Set(current); next.delete(key); return next; });
    setAttested(false);
  };

  const updateClarity = (key: string, clear: boolean) => {
    setCaseFile((current) => ({
      ...current,
      facts: current.facts.map((fact) => fact.key === key ? { ...fact, clarity: clear ? 'clear' : 'unclear' } : fact),
    }));
    setConfirmed((current) => { const next = new Set(current); next.delete(key); return next; });
    setAttested(false);
  };

  const toggleConfirmation = (key: string) => setConfirmed((current) => {
    const fact = caseFile.facts.find((entry) => entry.key === key);
    if (!fact?.value.trim() || fact.clarity === 'unreviewed') return current;
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });


  const reset = () => {
    cancelProcessing();
    setStage('home');
    setFiles({});
    setFileHashes({});
    setConfirmed(new Set());
    setNotice('');
    setUploadError('');
    setProcessingMode('local');
    setAiConsent(false);
    setTransmissionState('none');
    setAttested(false);
    setExportError('');
    setPacketMode('redacted');
    setCaseFile(cloneCase(cases['wrong-vehicle']));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const manifest = () => {
    const citizenFiles = ([
      ['challan', files.challan],
      ['vehicle', files.vehicle],
      ['supporting', files.supporting],
    ] as const).filter((entry): entry is readonly [UploadKey, File] => Boolean(entry[1]));
    return {
      schemaVersion: '1.0',
      packetId: `${caseFile.id}-${Date.now()}`,
      caseId: caseFile.id,
      mode: packetMode === 'redacted' ? 'redacted_share' : 'official_handoff',
      synthetic: caseFile.synthetic,
      generatedAt: new Date().toISOString(),
      language,
      processing: caseFile.synthetic ? 'deterministic_fixture_in_browser' : transmissionState === 'none' ? 'local_manual_user_confirmed_browser_workflow' : transmissionState === 'application_route_only' ? 'consented_application_route_attempt_then_manual_user_confirmed_browser_workflow' : transmissionState === 'openai_completed' ? 'consented_openai_extraction_then_user_confirmed_browser_workflow' : 'consented_openai_attempt_then_manual_user_confirmed_browser_workflow',
      claims: assessment.findings.map((finding) => ({
        id: finding.id,
        findingRule: finding.rule,
        neutralStatement: packetMode === 'redacted' ? redactCaseText(finding.neutralClaim.en, caseFile) : finding.neutralClaim.en,
        neutralStatementHindi: packetMode === 'redacted' ? redactCaseText(finding.neutralClaim.hi, caseFile) : finding.neutralClaim.hi,
        evidenceAnchorIds: finding.anchors,
        limitations: finding.limitations.map((limitation) => limitation.en),
      })),
      files: caseFile.synthetic
        ? caseFile.documentNames.map((name) => ({ path: name, sourceRole: 'synthetic_fixture', sha256: null, integrity: 'not_computed_no_source_bytes', included: false, purpose: 'Synthetic source reference only' }))
        : citizenFiles.map(([sourceRole, file]) => ({ path: packetMode === 'redacted' ? redactedFileName(file, sourceRole) : file.name, sourceRole, sha256: fileHashes[sourceRole] ?? null, integrity: fileHashes[sourceRole] ? 'locally_computed_sha256' : 'not_computed', included: false, purpose: 'Citizen-supplied source reference only' })),
      privacy: { originalUploadsIncluded: false, omittedFields: ['owner name', 'address', 'phone', 'email', 'engine number', 'chassis number', 'QR payload', 'EXIF'], applicationRetention: 'browser_memory_until_reset', upstreamTransmission: transmissionState === 'none' ? 'none' : transmissionState === 'application_route_only' ? 'selected_files_sent_to_stateless_application_route_after_consent; OpenAI_not_contacted' : transmissionState === 'openai_completed' ? 'selected_files_sent_to_OpenAI_after_explicit_consent_with_store_false; OpenAI_API_data_controls_apply' : 'OpenAI_transmission_attempted_after_explicit_consent_but_completion_unconfirmed', telemetry: false },
      legal: { legalConclusionMade: false, officialSubmissionPerformed: false, disclaimer: 'Reports observable conflicts only; not legal advice or a government record.' },
    };
  };

  const downloadManifest = () => {
    const blob = new Blob([JSON.stringify(manifest(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `challan-jaanch-${caseFile.id.toLowerCase()}-manifest.json`;
    // The anchor has to be in the document for a programmatic click to start a
    // download in Firefox, and the object URL has to outlive the click for
    // Safari to read it. Revoking synchronously drops the file on some phones,
    // which matters because this packet is the point of the whole journey.
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const downloadPdf = async () => {
    setExporting(true);
    setExportError('');
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const plate = caseFile.facts.find((fact) => fact.key === 'rcPlate')?.value ?? '';
      const shownPlate = packetMode === 'redacted' ? maskIdentifier(plate) : plate;
      const shownChallan = packetMode === 'redacted' ? maskIdentifier(caseFile.challanNumber) : caseFile.challanNumber;
      const validDate = isValidIsoDate(caseFile.issueDate) && caseFile.issueDate >= '2026-01-20';
      pdf.setProperties({ title: `Citizen-prepared evidence summary — ${caseFile.id}`, subject: 'Observable eChallan evidence comparison', author: 'Challan Jaanch' });
      pdf.setFillColor(23, 42, 51); pdf.rect(0, 0, 210, 34, 'F');
      pdf.setTextColor(184, 212, 225); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text('CHALLAN JAANCH', 16, 13);
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(18); pdf.text('Citizen-prepared evidence summary', 16, 24);
      pdf.setTextColor(82, 97, 95); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text('NOT GOVERNMENT-ISSUED  |  NOT LEGAL ADVICE  |  NO SUBMISSION PERFORMED', 16, 43);
      pdf.setDrawColor(210, 204, 193); pdf.line(16, 48, 194, 48);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(23, 42, 51); pdf.setFontSize(10); pdf.text('CASE', 16, 58);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.text(`Packet: ${caseFile.id}`, 16, 66); pdf.text(`Challan: ${shownChallan}`, 16, 73); pdf.text(`Vehicle identifier: ${shownPlate || 'Not confirmed'}`, 16, 80); pdf.text(`Issue date: ${caseFile.issueDate ? formatDate(caseFile.issueDate) : 'Not confirmed'}`, 16, 87);
      let y = 101;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text('SUPPORTED CLAIM MAP', 16, y); y += 8;
      assessment.findings.forEach((finding, index) => {
        pdf.setFillColor(243, 241, 236); pdf.roundedRect(16, y - 5, 178, 31, 3, 3, 'F');
        pdf.setTextColor(23, 42, 51); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(`${index + 1}. ${finding.title.en}`, 21, y + 2);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
        const neutral = packetMode === 'redacted' ? redactCaseText(finding.neutralClaim.en, caseFile) : finding.neutralClaim.en;
        pdf.text(pdf.splitTextToSize(neutral, 165), 21, y + 8);
        pdf.setFontSize(7); pdf.setTextColor(104, 116, 113); pdf.text(`Evidence anchors: ${finding.anchors.join(' · ')}`, 21, y + 22);
        y += 37;
      });
      pdf.setTextColor(23, 42, 51); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text('RULE CLOCK', 16, y); y += 7;
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
    } catch {
      setExportError(t(language, 'The PDF could not be created in this browser. Download the JSON manifest or copy the share-safe brief instead.', 'इस ब्राउज़र में PDF नहीं बन सकी। इसके बजाय JSON manifest डाउनलोड करें या साझा करने योग्य सार कॉपी करें।'));
    } finally {
      setExporting(false);
    }
  };

  if (stage === 'home') return <><Home language={language} onLanguage={toggleLanguage} onStartCase={startCase} onUpload={() => setStage('upload')} onScam={openScamCheck} onHelp={() => setGuideOpen(true)} /><HowItWorksDrawer open={guideOpen} language={language} onClose={() => setGuideOpen(false)} /></>;

  return (
    <>
      <Shell stage={stage} language={language} onLanguage={toggleLanguage} onHome={reset} onScam={openScamCheck} onDelete={reset} onHelp={() => setGuideOpen(true)} guideText={guideText}>
        {stage === 'scam' && <ScamShield language={language} onBack={reset} />}
        {stage === 'upload' && <UploadScreen language={language} files={files} setFile={setFile} error={uploadError} aiConsent={aiConsent} setAiConsent={setAiConsent} onAnalyse={analyseUploads} onManual={prepareManualUploads} onStartCase={startCase} />}
        {stage === 'processing' && <ProcessingScreen mode={processingMode} language={language} />}
        {stage === 'review' && <ReviewScreen caseFile={caseFile} language={language} confirmed={confirmed} selectedKey={selectedKey} notice={notice} files={files} onSelect={setSelectedKey} onChange={updateFact} onClarity={updateClarity} onConfirm={toggleConfirmation} onCompare={() => { setStage('result'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        {stage === 'result' && <ResultScreen caseFile={caseFile} language={language} assessment={assessment} onPacket={() => { setStage('packet'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onReview={() => setStage('review')} onStartCase={startCase} />}
        {stage === 'packet' && <PacketScreen caseFile={caseFile} language={language} assessment={assessment} packetMode={packetMode} setPacketMode={setPacketMode} attested={attested} setAttested={setAttested} exporting={exporting} exportError={exportError} onDownload={downloadPdf} onManifest={downloadManifest} onReview={() => setStage('review')} />}
      </Shell>
      <HowItWorksDrawer open={guideOpen} language={language} onClose={() => setGuideOpen(false)} />
    </>
  );
}

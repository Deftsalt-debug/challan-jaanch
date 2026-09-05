'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ManualCaseKind } from '../../lib/cases';
import { Language, t } from '../../lib/i18n';
import { Callout, Chip, cx } from '../ui';

export type UploadKey = 'challan' | 'vehicle' | 'supporting';
export type ProcessingMode = 'local' | 'ai';

export interface UploadedFiles {
  challan?: File;
  vehicle?: File;
  supporting?: File;
}

export function selectedUploads(files: UploadedFiles): Array<readonly [UploadKey, File]> {
  return ([
    ['challan', files.challan],
    ['vehicle', files.vehicle],
    ['supporting', files.supporting],
  ] as const).filter((entry): entry is readonly [UploadKey, File] => Boolean(entry[1]));
}

function FileRow({ language, label, description, file, onFile }: { language: Language; label: string; description: string; file?: File; onFile: (file?: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const previewUrl = useMemo(() => file?.type.startsWith('image/') ? URL.createObjectURL(file) : undefined, [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const handle = (event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0]);
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); onFile(event.dataTransfer.files?.[0]); };
  return (
    <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={drop} className={cx('flex items-center gap-4 rounded-[10px] border p-3 transition sm:p-4', dragging ? 'border-accent bg-accent-soft' : file ? 'border-good-line bg-good-soft/50' : 'border-dashed border-line-strong bg-surface')}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={handle} />
      {previewUrl
        ? <span role="img" aria-label={t(language, 'Selected file preview', 'चुनी गई फ़ाइल की झलक')} className="h-14 w-14 shrink-0 rounded-lg border border-line bg-cover bg-center" style={{ backgroundImage: `url(${previewUrl})` }} />
        : <span className={cx('grid h-14 w-14 shrink-0 place-items-center rounded-lg text-xs font-bold', file ? 'bg-good text-white' : 'bg-surface-3 text-ink-2')}>{file ? 'PDF' : dragging ? t(language, 'Drop', 'छोड़ें') : '+'}</span>}
      <div className="min-w-0 flex-1">
        <p className="label">{label}</p>
        {file
          ? <p className="help mt-0.5 truncate">{file.name} · {(file.size / 1_048_576).toFixed(1)} MB</p>
          : <p className="help mt-0.5">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
        <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-secondary btn-sm">{file ? t(language, 'Replace', 'बदलें') : t(language, 'Choose', 'चुनें')}</button>
        {file && <button type="button" onClick={() => onFile(undefined)} className="btn btn-ghost btn-sm text-bad">{t(language, 'Remove', 'हटाएँ')}</button>}
      </div>
    </div>
  );
}

function ComparisonTypePicker({ language, value, onChange }: { language: Language; value: ManualCaseKind; onChange: (kind: ManualCaseKind) => void }) {
  const options: Array<{ kind: ManualCaseKind; title: string; body: string }> = [
    { kind: 'wrong-vehicle', title: t(language, 'The photo shows a different vehicle', 'फोटो में दूसरा वाहन है'), body: t(language, 'Compare the plate and vehicle type across the challan, its photo and your registration record.', 'चालान, उसकी फोटो और आपके पंजीकरण रिकॉर्ड में नंबर और वाहन प्रकार मिलाएँ।') },
    { kind: 'duplicate-event', title: t(language, 'Two challans for the same event', 'एक ही घटना के दो चालान'), body: t(language, 'Compare two challan numbers that share one capture ID, time, camera and amount.', 'दो चालान नंबर मिलाएँ जिनकी कैप्चर पहचान, समय, कैमरा और राशि एक ही है।') },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t(language, 'What are you comparing?', 'आप क्या मिला रहे हैं?')}>
      {options.map((option) => (
        <button key={option.kind} type="button" role="radio" aria-checked={value === option.kind} onClick={() => onChange(option.kind)} className="option">
          <span className="flex items-start gap-3">
            <span className={cx('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border', value === option.kind ? 'border-accent bg-accent' : 'border-line-strong bg-surface')} aria-hidden>{value === option.kind && <span className="h-2 w-2 rounded-full bg-white" />}</span>
            <span>
              <span className="label">{option.title}</span>
              <span className="help mt-1 block">{option.body}</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

interface UploadScreenProps {
  language: Language;
  files: UploadedFiles;
  setFile: (key: UploadKey, file?: File) => void;
  error: string;
  aiConsent: boolean;
  setAiConsent: (value: boolean) => void;
  manualKind: ManualCaseKind;
  setManualKind: (kind: ManualCaseKind) => void;
  onAnalyse: () => void;
  onManual: () => void;
  onStartCase: (id: string) => void;
}

export function UploadScreen({ language, files, setFile, error, aiConsent, setAiConsent, manualKind, setManualKind, onAnalyse, onManual, onStartCase }: UploadScreenProps) {
  // AI extraction reads plate and vehicle-family fields only, so it is offered
  // for the vehicle comparison and needs both primary files plus consent.
  const duplicate = manualKind === 'duplicate-event';
  const ready = !duplicate && Boolean(files.challan && files.vehicle);
  const fileCount = selectedUploads(files).length;

  return (
    <div className="container-x max-w-[760px] py-8 sm:py-12">
      <p className="eyebrow">{t(language, 'Step 1 of 4', 'चरण 1 / 4')}</p>
      <h1 className="h1 mt-1">{t(language, 'Tell us about the challan.', 'चालान के बारे में बताएँ।')}</h1>
      <p className="lede mt-3">{t(language, 'Files are optional. If the challan is in front of you, you can type the fields on the next screen. Anything you add here stays in this browser.', 'फ़ाइलें वैकल्पिक हैं। चालान सामने हो तो अगली स्क्रीन पर फ़ील्ड लिख सकते हैं। यहाँ जो भी जोड़ेंगे वह इसी ब्राउज़र में रहेगा।')}</p>

      <section className="mt-9">
        <h2 className="h3">{t(language, 'What are you comparing?', 'आप क्या मिला रहे हैं?')}</h2>
        <div className="mt-3"><ComparisonTypePicker language={language} value={manualKind} onChange={setManualKind} /></div>
      </section>

      <section className="mt-9">
        <div className="flex items-center gap-2">
          <h2 className="h3">{t(language, 'Add files', 'फ़ाइलें जोड़ें')}</h2>
          <Chip tone="neutral">{t(language, 'optional', 'वैकल्पिक')}</Chip>
        </div>
        <p className="help mt-1">{t(language, 'JPG, PNG or PDF up to 10 MB each. Redacted copies with only the comparison fields are enough.', 'JPG, PNG या PDF, हर एक 10 MB तक। सिर्फ़ तुलना वाले फ़ील्ड रखने वाली छिपाई गई प्रतियाँ काफ़ी हैं।')}</p>
        <div className="mt-4 space-y-3">
          <FileRow language={language} label={duplicate ? t(language, 'First challan', 'पहला चालान') : t(language, 'Challan and its evidence photo', 'चालान और उसकी साक्ष्य फोटो')} description={t(language, 'Downloaded challan, notice or screenshot', 'डाउनलोड किया चालान, नोटिस या स्क्रीनशॉट')} file={files.challan} onFile={(file) => setFile('challan', file)} />
          <FileRow language={language} label={duplicate ? t(language, 'Second challan', 'दूसरा चालान') : t(language, 'Vehicle record', 'वाहन रिकॉर्ड')} description={duplicate ? t(language, 'The other challan for the same capture', 'उसी कैप्चर का दूसरा चालान') : t(language, 'Registration certificate; plate and vehicle class are enough', 'पंजीकरण प्रमाणपत्र; नंबर और वाहन श्रेणी काफ़ी हैं')} file={files.vehicle} onFile={(file) => setFile('vehicle', file)} />
          <FileRow language={language} label={t(language, 'Supporting record', 'सहायक रिकॉर्ड')} description={t(language, 'Enforcement image or another relevant record', 'कार्रवाई-फोटो या कोई अन्य संबंधित रिकॉर्ड')} file={files.supporting} onFile={(file) => setFile('supporting', file)} />
        </div>
        {error && <Callout tone="bad" role="alert" className="mt-4 font-semibold">{error}</Callout>}
      </section>

      <section className="mt-9">
        <h2 className="h3">{t(language, 'Continue', 'आगे बढ़ें')}</h2>
        <div className="card mt-3 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label">{t(language, 'Enter fields without AI', 'AI के बिना फ़ील्ड भरें')} <Chip tone="good" className="ml-1 align-middle">{t(language, 'Recommended', 'सुझाया गया')}</Chip></p>
              <p className="help mt-1">{fileCount ? t(language, 'No selected file bytes leave this browser.', 'चुनी गई फ़ाइल के बाइट इस ब्राउज़र से बाहर नहीं जाते।') : t(language, 'Works with no files at all. No selected file bytes leave this browser.', 'बिना किसी फ़ाइल के भी चलता है। चुनी गई फ़ाइल के बाइट इस ब्राउज़र से बाहर नहीं जाते।')}</p>
            </div>
            <button onClick={onManual} className="btn btn-primary btn-lg shrink-0">{t(language, 'Enter fields myself →', 'फ़ील्ड ख़ुद भरें →')}</button>
          </div>
        </div>

        <details className="card-flat group mt-3 p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="label">{t(language, 'Extract observable fields with AI', 'AI से दिखने वाले फ़ील्ड निकालें')} <Chip tone="neutral" className="ml-1 align-middle">{t(language, 'optional', 'वैकल्पिक')}</Chip></p>
              <p className="help mt-1">{duplicate ? t(language, 'Reads plate and vehicle fields only; enter duplicate records by hand.', 'सिर्फ़ नंबर और वाहन फ़ील्ड पढ़ता है; दोहरे रिकॉर्ड हाथ से भरें।') : t(language, 'Sends the selected files to OpenAI once, after your consent. You still confirm every value.', 'आपकी सहमति के बाद चुनी गई फ़ाइलें एक बार OpenAI को भेजता है। हर मान की पुष्टि फिर भी आप करते हैं।')}</p>
            </div>
            <span className="text-ink-3 transition group-open:rotate-180" aria-hidden>▾</span>
          </summary>
          <div className="mt-5 border-t border-line pt-5">
            <label id="ai-consent-note" className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} disabled={!ready} className="mt-1 h-4 w-4 shrink-0 accent-accent disabled:opacity-45" />
              <span className="help">{t(language, 'I consent to send these selected files to OpenAI for one extraction request. I used redacted copies and understand that store:false disables retrievable response storage, not every form of provider retention; OpenAI API data controls may still apply.', 'मैं इन चुनी गई फ़ाइलों को एक निष्कर्षण अनुरोध के लिए OpenAI को भेजने की सहमति देता/देती हूँ। मैंने छिपाई गई प्रतियाँ ली हैं और समझता/समझती हूँ कि store:false जवाब को बाद में पाने वाला भंडारण बंद करता है, हर तरह की प्रदाता रख-रखाव नहीं; OpenAI API डेटा नियंत्रण फिर भी लागू हो सकते हैं।')}</span>
            </label>
            {!ready && !duplicate && <p className="help mt-3 text-ink-3">{t(language, 'Add both the challan and the vehicle record to enable this.', 'इसे चालू करने के लिए चालान और वाहन रिकॉर्ड दोनों जोड़ें।')}</p>}
            <button onClick={onAnalyse} aria-describedby="ai-consent-note" className="btn btn-secondary mt-4" disabled={!ready || !aiConsent}>{t(language, 'Extract observable fields →', 'दिखने वाले फ़ील्ड निकालें →')}</button>
          </div>
        </details>

        <p className="help mt-6 text-center">
          {t(language, 'Just exploring?', 'सिर्फ़ देख रहे हैं?')}{' '}
          <button onClick={() => onStartCase('wrong-vehicle')} className="font-semibold text-accent underline underline-offset-4">{t(language, 'Run the synthetic demo instead', 'इसके बजाय नकली डेमो चलाएँ')}</button>
        </p>
      </section>
    </div>
  );
}

export function ProcessingScreen({ mode, language }: { mode: ProcessingMode; language: Language }) {
  return (
    <div role="status" aria-live="polite" className="container-x grid min-h-[60vh] max-w-[640px] place-items-center py-14">
      <div className="card w-full p-8 text-center">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-accent-soft border-t-accent" aria-hidden />
        <h1 className="h2 mt-6">{mode === 'local'
          ? t(language, 'Preparing your local workspace…', 'आपका स्थानीय कार्यक्षेत्र तैयार हो रहा है…')
          : t(language, 'Checking AI availability and reading your documents…', 'AI की उपलब्धता जाँचकर आपके दस्तावेज़ पढ़े जा रहे हैं…')}</h1>
        <p className="help mt-3">{mode === 'local'
          ? t(language, 'Nothing is sent anywhere. Next, enter the fields you can read on the originals.', 'कुछ भी कहीं नहीं भेजा जाता। आगे मूल दस्तावेज़ों में पढ़े जा सकने वाले फ़ील्ड भरें।')
          : t(language, 'Review every extracted field against its original before comparing. If extraction is unavailable, you can enter the fields yourself.', 'तुलना से पहले हर निकाले गए फ़ील्ड को मूल से मिलाएँ। निष्कर्षण उपलब्ध न हो तो आप फ़ील्ड ख़ुद भर सकते हैं।')}</p>
      </div>
    </div>
  );
}

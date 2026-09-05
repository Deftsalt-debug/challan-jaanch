'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HowItWorksDrawer } from '../components/ProductGuide';
import { ScamShield } from '../components/ScamShield';
import { Shell, Stage } from '../components/Shell';
import { Home } from '../components/screens/Home';
import { PacketMode, PacketScreen, shownChallanNumber, shownPlateValue } from '../components/screens/Packet';
import { ResultScreen } from '../components/screens/Result';
import { ReviewScreen } from '../components/screens/Review';
import { ProcessingMode, ProcessingScreen, UploadKey, UploadScreen, UploadedFiles, selectedUploads } from '../components/screens/Upload';
import {
  DemoCase,
  ManualCaseKind,
  assessCase,
  buildManualCase,
  cases,
  cloneCase,
  deadlineFor,
  formatDate,
  redactCaseText,
  ruleClockApplies,
} from '../lib/cases';
import { localeTag, t } from '../lib/i18n';
import { useLanguage } from '../lib/use-language';

type TransmissionState = 'none' | 'application_route_only' | 'openai_completed' | 'openai_attempted_unconfirmed';

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

const acceptedFileTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);

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

function manualCase(kind: ManualCaseKind, extraction: LiveExtraction, files: UploadedFiles, source: 'manual' | 'ai' = 'manual'): DemoCase {
  return buildManualCase(kind, extraction, [files.challan?.name, files.vehicle?.name, files.supporting?.name].filter(Boolean) as string[], source);
}

/**
 * The manifest names each file by the role it played. For a duplicate-event
 * case the second slot holds the second challan, not a vehicle record, and the
 * packet must say so.
 */
function sourceRoleName(kind: DemoCase['kind'], key: UploadKey): string {
  if (kind !== 'duplicate-event') return key;
  return key === 'challan' ? 'first_challan' : key === 'vehicle' ? 'second_challan' : key;
}

function redactedFileName(file: File, sourceRole: string): string {
  const extension = /\.([a-z0-9]{1,8})$/iu.exec(file.name)?.[1]?.toLowerCase();
  return extension ? `${sourceRole}.${extension}` : sourceRole;
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
  const [manualKind, setManualKind] = useState<ManualCaseKind>('wrong-vehicle');
  const [transmissionState, setTransmissionState] = useState<TransmissionState>('none');
  const processingRequest = useRef<AbortController | null>(null);

  useEffect(() => () => processingRequest.current?.abort(), []);

  const cancelProcessing = () => processingRequest.current?.abort();
  const go = (next: Stage) => {
    setStage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openScamCheck = () => {
    cancelProcessing();
    go('scam');
  };

  // Keep the document language in step with the interface so screen readers and
  // the speech guide use the right pronunciation.
  useEffect(() => {
    document.documentElement.lang = localeTag[language];
  }, [language]);

  const assessment = useMemo(() => assessCase(caseFile, confirmed), [caseFile, confirmed]);
  const guideText = useMemo(() => ({
    upload: t(language, 'Choose what you are comparing. Files are optional; if you add any, they stay in this browser. The guided synthetic case needs no uploads or API key.', 'चुनें कि आप क्या मिला रहे हैं। फ़ाइलें वैकल्पिक हैं; जोड़ें तो वे इसी ब्राउज़र में रहती हैं। निर्देशित नकली केस के लिए न अपलोड चाहिए, न कोई कुंजी।'),
    processing: t(language, 'The application maps observable facts to their sources. Artificial intelligence may extract a field, but it cannot decide the case. You will verify every decisive value next.', 'ऐप दिखने वाले तथ्यों को उनके स्रोत से जोड़ता है। कृत्रिम बुद्धिमत्ता कोई फ़ील्ड निकाल सकती है, पर केस तय नहीं कर सकती। आगे आप हर निर्णायक मान जाँचेंगे।'),
    review: t(language, 'Use the sources view to inspect each record, the character diff to compare every plate position, and the rule clock to see the calculated safety date. Confirm every decisive value before comparing.', 'हर रिकॉर्ड देखने के लिए स्रोत दृश्य, नंबर का हर अक्षर मिलाने के लिए अक्षर तुलना, और गणना की गई सुरक्षित तारीख़ देखने के लिए नियम घड़ी इस्तेमाल करें। तुलना से पहले हर निर्णायक मान पुष्ट करें।'),
    result: assessment.outcome === 'supported'
      ? t(language, 'The confirmed records support a narrow objective contradiction. Read the findings, the counter-checks and the clock before preparing a citizen packet.', 'पुष्ट रिकॉर्ड एक सीमित वस्तुनिष्ठ विरोधाभास दिखाते हैं। नागरिक पैकेट बनाने से पहले निष्कर्ष, विपरीत जाँचें और समय-सीमा पढ़ें।')
      : t(language, 'The evidence does not safely support an objective claim. Review the open counter-checks and improve the source material before proceeding.', 'सबूत किसी वस्तुनिष्ठ दावे को सुरक्षित रूप से नहीं टिकाते। आगे बढ़ने से पहले खुली विपरीत जाँचें देखें और स्रोत सामग्री बेहतर करें।'),
    packet: t(language, 'Choose a redacted share or official handoff view, inspect the claim-to-source map, complete the human attestation, then download the PDF or JSON or copy a share-safe brief.', 'छिपाकर साझा या आधिकारिक सौंपना चुनें, दावे से स्रोत तक का नक़्शा देखें, मानव पुष्टि पूरी करें, फिर PDF या JSON डाउनलोड करें या सुरक्षित सार कॉपी करें।'),
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
    go('review');
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
    go('processing');
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
        setCaseFile(manualCase('wrong-vehicle', {}, files, 'manual'));
        setNotice(t(language, 'AI extraction is not configured, so no selected file bytes were sent to the server or OpenAI. Continue locally: enter the observable fields, mark source clarity, and confirm every decisive value.', 'AI निष्कर्षण कॉन्फ़िगर नहीं है, इसलिए चुनी गई फ़ाइलों के बाइट सर्वर या OpenAI को नहीं भेजे गए। स्थानीय रूप से आगे बढ़ें: दिखने वाले फ़ील्ड भरें, स्रोत की स्पष्टता बताएँ और हर निर्णायक मान पुष्ट करें।'));
        setConfirmed(new Set());
        setSelectedKey(undefined);
        go('review');
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
        setCaseFile(manualCase('wrong-vehicle', result.extraction, files, 'ai'));
        setNotice(t(language, 'AI extraction completed with store:false, so the response is not saved for later retrieval. OpenAI API data controls, including possible abuse-monitoring retention, still apply. Verify every value against the originals.', 'AI निष्कर्षण store:false के साथ पूरा हुआ, इसलिए जवाब बाद में पाने के लिए सुरक्षित नहीं रहता। संभावित दुरुपयोग-निगरानी रख-रखाव सहित OpenAI API डेटा नियंत्रण फिर भी लागू होते हैं। हर मान मूल से मिलाएँ।'));
      } else {
        if (result.code !== 'LIVE_EXTRACTION_NOT_CONFIGURED') setTransmissionState('openai_attempted_unconfirmed');
        setCaseFile(manualCase('wrong-vehicle', {}, files));
        setNotice(result.code === 'LIVE_EXTRACTION_NOT_CONFIGURED'
          ? t(language, 'AI extraction is not configured, so OpenAI was not contacted. Continue locally: enter the observable fields, mark source clarity, and confirm every decisive value.', 'AI निष्कर्षण कॉन्फ़िगर नहीं है, इसलिए OpenAI से संपर्क नहीं हुआ। स्थानीय रूप से आगे बढ़ें: दिखने वाले फ़ील्ड भरें, स्रोत की स्पष्टता बताएँ और हर निर्णायक मान पुष्ट करें।')
          : result.message || t(language, 'Live extraction is unavailable. Enter the observable fields manually; no finding will be generated from blank values.', 'लाइव निष्कर्षण उपलब्ध नहीं है। दिखने वाले फ़ील्ड ख़ुद भरें; ख़ाली मानों से कोई निष्कर्ष नहीं बनेगा।'));
      }
    } catch {
      if (request.signal.aborted) return;
      setTransmissionState(fileTransmissionAttempted ? 'openai_attempted_unconfirmed' : 'none');
      setCaseFile(manualCase('wrong-vehicle', {}, files));
      setNotice(fileTransmissionAttempted
        ? t(language, 'The extraction service could not be reached after transmission began. Continue manually and treat upstream completion as unconfirmed.', 'फ़ाइल भेजना शुरू होने के बाद निष्कर्षण सेवा तक नहीं पहुँचा जा सका। हाथ से आगे बढ़ें और अपस्ट्रीम पूर्णता को अपुष्ट मानें।')
        : t(language, 'AI availability could not be confirmed, so no selected file bytes were transmitted. Continue locally and enter the comparison fields manually.', 'AI उपलब्धता पुष्ट नहीं हो सकी, इसलिए चुनी गई फ़ाइलों के बाइट भेजे नहीं गए। स्थानीय रूप से आगे बढ़ें और तुलना के फ़ील्ड ख़ुद भरें।'));
    }
    setConfirmed(new Set());
    setSelectedKey(undefined);
    go('review');
  };

  const prepareManualUploads = async () => {
    setUploadError('');
    cancelProcessing();
    const request = new AbortController();
    processingRequest.current = request;
    setProcessingMode('local');
    setTransmissionState('none');
    go('processing');
    const selected = selectedUploads(files);
    try {
      const hashes = await Promise.all(selected.map(async ([key, file]) => [key, await fileHash(file)] as const));
      if (request.signal.aborted) return;
      setFileHashes(Object.fromEntries(hashes));
    } catch {
      if (request.signal.aborted) return;
      setFileHashes({});
    }
    setCaseFile(manualCase(manualKind, {}, files, 'manual'));
    setNotice(selected.length
      ? t(language, 'Local-only mode: no selected file bytes were sent to the server or OpenAI. Enter only the observable comparison fields, mark whether each source is clear, and confirm every decisive value.', 'सिर्फ़ स्थानीय मोड: चुनी गई फ़ाइलों के बाइट सर्वर या OpenAI को नहीं भेजे गए। सिर्फ़ दिखने वाले तुलना फ़ील्ड भरें, हर स्रोत साफ़ है या नहीं बताएँ, और हर निर्णायक मान पुष्ट करें।')
      : t(language, 'Local-only mode with no files: nothing was uploaded or sent anywhere. Type each field exactly as it appears on the original, mark whether that source is clear, and confirm every decisive value.', 'बिना फ़ाइल का स्थानीय मोड: कुछ भी अपलोड या कहीं भेजा नहीं गया। हर फ़ील्ड ठीक वैसा लिखें जैसा मूल पर है, बताएँ कि वह स्रोत साफ़ है या नहीं, और हर निर्णायक मान पुष्ट करें।'));
    setConfirmed(new Set());
    setSelectedKey(undefined);
    go('review');
  };

  const updateFact = (key: string, value: string) => {
    setCaseFile((current) => {
      const facts = current.facts.map((fact) => fact.key === key ? { ...fact, value, clarity: current.synthetic ? fact.clarity : 'unreviewed' as const } : fact);
      // A citizen-entered duplicate case has two challan numbers; the packet
      // header is derived from them rather than asked for a third time.
      const challanNumber = !current.synthetic && current.kind === 'duplicate-event'
        ? facts.filter((fact) => fact.key === 'challanA' || fact.key === 'challanB').map((fact) => fact.value.trim()).filter(Boolean).join(' / ')
        : current.challanNumber;
      return { ...current, facts, challanNumber };
    });
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

  const updateCaseDetail = (field: 'challanNumber' | 'issueDate', value: string) => {
    setCaseFile((current) => ({ ...current, [field]: value.trim() }));
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
    setManualKind('wrong-vehicle');
    setTransmissionState('none');
    setAttested(false);
    setExportError('');
    setPacketMode('redacted');
    setCaseFile(cloneCase(cases['wrong-vehicle']));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const manifest = () => {
    const citizenFiles = selectedUploads(files);
    return {
      schemaVersion: '1.0',
      packetId: `${caseFile.id}-${Date.now()}`,
      caseId: caseFile.id,
      mode: packetMode === 'redacted' ? 'redacted_share' : 'official_handoff',
      comparisonType: caseFile.kind === 'duplicate-event' ? 'exact_duplicate_event' : 'registration_and_vehicle_family',
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
        : citizenFiles.map(([key, file]) => ({ path: packetMode === 'redacted' ? redactedFileName(file, sourceRoleName(caseFile.kind, key)) : file.name, sourceRole: sourceRoleName(caseFile.kind, key), sha256: fileHashes[key] ?? null, integrity: fileHashes[key] ? 'locally_computed_sha256' : 'not_computed', included: false, purpose: 'Citizen-supplied source reference only' })),
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
    // Safari to read it. Revoking synchronously drops the file on some phones.
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
      const shownPlate = shownPlateValue(caseFile, packetMode);
      const shownChallan = shownChallanNumber(caseFile, packetMode, 'en');
      const validDate = ruleClockApplies(caseFile.issueDate);
      pdf.setProperties({ title: `Citizen-prepared evidence summary — ${caseFile.id}`, subject: 'Observable eChallan evidence comparison', author: 'Challan Jaanch' });
      pdf.setFillColor(17, 20, 24); pdf.rect(0, 0, 210, 34, 'F');
      pdf.setTextColor(185, 201, 243); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text('CHALLAN JAANCH', 16, 13);
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(18); pdf.text('Citizen-prepared evidence summary', 16, 24);
      pdf.setTextColor(75, 84, 98); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text('NOT GOVERNMENT-ISSUED  |  NOT LEGAL ADVICE  |  NO SUBMISSION PERFORMED', 16, 43);
      pdf.setDrawColor(201, 207, 216); pdf.line(16, 48, 194, 48);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 20, 24); pdf.setFontSize(10); pdf.text('CASE', 16, 58);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.text(`Packet: ${caseFile.id}`, 16, 66); pdf.text(`Challan: ${shownChallan}`, 16, 73); pdf.text(`Vehicle identifier: ${shownPlate || 'Not confirmed'}`, 16, 80); pdf.text(`Issue date: ${caseFile.issueDate ? formatDate(caseFile.issueDate) : 'Not confirmed'}`, 16, 87);
      let y = 101;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text('SUPPORTED CLAIM MAP', 16, y); y += 8;
      assessment.findings.forEach((finding, index) => {
        pdf.setFillColor(248, 249, 251); pdf.roundedRect(16, y - 5, 178, 31, 3, 3, 'F');
        pdf.setTextColor(17, 20, 24); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(`${index + 1}. ${finding.title.en}`, 21, y + 2);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
        const neutral = packetMode === 'redacted' ? redactCaseText(finding.neutralClaim.en, caseFile) : finding.neutralClaim.en;
        pdf.text(pdf.splitTextToSize(neutral, 165), 21, y + 8);
        pdf.setFontSize(7); pdf.setTextColor(122, 130, 144); pdf.text(`Evidence anchors: ${finding.anchors.join(' · ')}`, 21, y + 22);
        y += 37;
      });
      pdf.setTextColor(17, 20, 24); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text('RULE CLOCK', 16, y); y += 7;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
      pdf.text(validDate ? `Rule-based safety date: ${formatDate(deadlineFor(caseFile).date)} — 45 calendar days from issuance.` : 'A safety date could not be calculated from the confirmed fields.', 16, y); y += 5;
      pdf.text('Source: CMVR Rule 167, G.S.R. 48(E), effective 20 January 2026. Verify state procedure and the official portal.', 16, y); y += 12;
      pdf.setDrawColor(201, 207, 216); pdf.line(16, y, 194, y); y += 8;
      pdf.setFont('helvetica', 'bold'); pdf.text('PROCESSING & PRIVACY', 16, y); y += 7;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
      const privacyText = 'Original uploads are not embedded in this PDF. Findings are limited to user-confirmed facts and deterministic comparison rules. The packet does not infer cloning, fraud, guilt, legality, or grievance success.';
      pdf.text(pdf.splitTextToSize(privacyText, 178), 16, y);
      pdf.setFontSize(7); pdf.setTextColor(122, 130, 144); pdf.text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · Schema CJ-1.0 · ${caseFile.synthetic ? 'SYNTHETIC DEMO' : 'CITIZEN-SUPPLIED RECORDS'}`, 16, 286);
      pdf.save(`challan-jaanch-${caseFile.id.toLowerCase()}-evidence-summary.pdf`);
    } catch {
      setExportError(t(language, 'The PDF could not be created in this browser. Download the JSON manifest or copy the share-safe brief instead.', 'इस ब्राउज़र में PDF नहीं बन सकी। इसके बजाय JSON manifest डाउनलोड करें या साझा करने योग्य सार कॉपी करें।'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Shell stage={stage} language={language} onLanguage={toggleLanguage} onHome={reset} onScam={openScamCheck} onDelete={reset} onHelp={() => setGuideOpen(true)} guideText={guideText}>
        {stage === 'home' && <Home language={language} onStartCase={startCase} onUpload={() => go('upload')} onScam={openScamCheck} />}
        {stage === 'scam' && <ScamShield language={language} onBack={reset} />}
        {stage === 'upload' && <UploadScreen language={language} files={files} setFile={setFile} error={uploadError} aiConsent={aiConsent} setAiConsent={setAiConsent} manualKind={manualKind} setManualKind={setManualKind} onAnalyse={analyseUploads} onManual={prepareManualUploads} onStartCase={startCase} />}
        {stage === 'processing' && <ProcessingScreen mode={processingMode} language={language} />}
        {stage === 'review' && <ReviewScreen caseFile={caseFile} language={language} confirmed={confirmed} selectedKey={selectedKey} notice={notice} files={files} onSelect={setSelectedKey} onChange={updateFact} onClarity={updateClarity} onConfirm={toggleConfirmation} onDetail={updateCaseDetail} onCompare={() => go('result')} />}
        {stage === 'result' && <ResultScreen caseFile={caseFile} language={language} assessment={assessment} onPacket={() => go('packet')} onReview={() => go('review')} onStartCase={startCase} />}
        {stage === 'packet' && <PacketScreen caseFile={caseFile} language={language} assessment={assessment} packetMode={packetMode} setPacketMode={setPacketMode} attested={attested} setAttested={setAttested} exporting={exporting} exportError={exportError} onDownload={downloadPdf} onManifest={downloadManifest} onReview={() => go('review')} />}
      </Shell>
      <HowItWorksDrawer open={guideOpen} language={language} onClose={() => setGuideOpen(false)} />
    </>
  );
}

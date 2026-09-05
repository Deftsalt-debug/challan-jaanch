'use client';

import { useState } from 'react';
import { Assessment, DemoCase, deadlineFor, formatDate, isValidIsoDate, maskIdentifier, redactCaseText, ruleClockApplies } from '../../lib/cases';
import { Language, pick, t } from '../../lib/i18n';
import { OFFICIAL_ECHALLAN_URL } from '../../lib/scam-shield';
import { NextSteps } from '../NextSteps';
import { Callout, Segmented, cx } from '../ui';

export type PacketMode = 'official' | 'redacted';

/** A duplicate-event header carries two numbers joined by " / "; each is masked on its own. */
export function shownChallanNumber(caseFile: DemoCase, packetMode: PacketMode, language: Language): string {
  if (!caseFile.challanNumber.trim()) return t(language, 'Not confirmed', 'पुष्ट नहीं');
  if (packetMode !== 'redacted') return caseFile.challanNumber;
  return caseFile.challanNumber.split(' / ').map(maskIdentifier).join(' / ');
}

/** The registration mark for the header, masked in redacted mode and empty when the case has none. */
export function shownPlateValue(caseFile: DemoCase, packetMode: PacketMode): string {
  const plate = caseFile.facts.find((fact) => fact.key === 'rcPlate')?.value.trim() ?? '';
  if (!plate) return '';
  return packetMode === 'redacted' ? maskIdentifier(plate) : plate;
}

interface PacketScreenProps {
  caseFile: DemoCase;
  language: Language;
  assessment: Assessment;
  packetMode: PacketMode;
  setPacketMode: (mode: PacketMode) => void;
  attested: boolean;
  setAttested: (value: boolean) => void;
  exporting: boolean;
  exportError: string;
  onDownload: () => void;
  onManifest: () => void;
  onReview: () => void;
}

export function PacketScreen({ caseFile, language, assessment, packetMode, setPacketMode, attested, setAttested, exporting, exportError, onDownload, onManifest, onReview }: PacketScreenProps) {
  const [copiedBrief, setCopiedBrief] = useState(false);
  const shownPlate = shownPlateValue(caseFile, packetMode);
  const shownChallan = shownChallanNumber(caseFile, packetMode, language);
  const deadline = ruleClockApplies(caseFile.issueDate) ? deadlineFor(caseFile) : null;
  const issueDate = isValidIsoDate(caseFile.issueDate) ? formatDate(caseFile.issueDate, language) : t(language, 'Not confirmed', 'पुष्ट नहीं');

  const copyBrief = async () => {
    const safeClaim = (claim: string) => packetMode === 'redacted' ? redactCaseText(claim, caseFile) : claim;
    const brief = [
      t(language, 'CHALLAN JAANCH — CITIZEN-PREPARED CASE BRIEF', 'चालान जाँच — नागरिक द्वारा बनाया केस सार'),
      t(language, 'Not government-issued · Not legal advice · No official submission performed', 'सरकार द्वारा जारी नहीं · क़ानूनी सलाह नहीं · कोई आधिकारिक आवेदन नहीं'),
      `${t(language, 'Packet', 'पैकेट')}: ${caseFile.id}`,
      `${t(language, 'Challan', 'चालान')}: ${shownChallan}`,
      `${t(language, 'Vehicle identifier', 'वाहन पहचान')}: ${shownPlate || t(language, 'Not confirmed', 'पुष्ट नहीं')}`,
      `${t(language, 'Issue date', 'जारी तारीख़')}: ${issueDate}`,
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
    <div className="container-x py-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{t(language, 'Step 4 of 4', 'चरण 4 / 4')}</p>
          <h1 className="h1 mt-1">{t(language, 'Your evidence packet.', 'आपका साक्ष्य पैकेट।')}</h1>
          <p className="lede mt-3 max-w-2xl">{t(language, 'Independently prepared, visibly non-official, and limited to claims your confirmed evidence supports.', 'स्वतंत्र रूप से बना, स्पष्ट रूप से ग़ैर-सरकारी, और सिर्फ़ उन दावों तक सीमित जिन्हें आपका पुष्ट सबूत टिकाता है।')}</p>
        </div>
        <Segmented value={packetMode} onChange={setPacketMode} label={t(language, 'Packet mode', 'पैकेट मोड')} options={[{ id: 'redacted', label: t(language, 'Redacted share', 'छिपाकर साझा') }, { id: 'official', label: t(language, 'Official handoff', 'आधिकारिक सौंपना') }]} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_330px]">
        <article className="card p-6 sm:p-9">
          <header className="border-b-2 border-ink pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-bad">{t(language, 'Not government-issued', 'सरकार द्वारा जारी नहीं')} · {caseFile.synthetic ? t(language, 'synthetic fixture', 'नकली नमूना') : t(language, 'citizen prepared', 'नागरिक द्वारा बनाया')}</p>
                <h2 className="h2 mt-1">{t(language, 'Citizen-prepared evidence summary', 'नागरिक द्वारा बनाया साक्ष्य सारांश')}</h2>
              </div>
              <div className="help text-left sm:text-right">
                <p>{t(language, 'Packet', 'पैकेट')} <span className="mono">{caseFile.id}</span></p>
                <p>{t(language, 'Schema CJ-1.0', 'स्कीमा CJ-1.0')}</p>
              </div>
            </div>
          </header>
          <dl className="grid gap-4 border-b border-line py-6 sm:grid-cols-3">
            <div><dt className="help">{t(language, 'Challan', 'चालान')}</dt><dd className="mono mt-1 break-all font-semibold">{shownChallan}</dd></div>
            <div><dt className="help">{t(language, 'Vehicle identifier', 'वाहन पहचान')}</dt><dd className="mono mt-1 font-semibold">{shownPlate || t(language, 'Not confirmed', 'पुष्ट नहीं')}</dd></div>
            <div><dt className="help">{t(language, 'Issue date', 'जारी तारीख़')}</dt><dd className="mt-1 font-semibold">{issueDate}</dd></div>
          </dl>
          <section className="py-6">
            <h3 className="h3">{t(language, 'Supported claim map', 'प्रमाणित दावा नक़्शा')}</h3>
            <ol className="mt-4 space-y-3">
              {assessment.findings.map((finding, index) => (
                <li key={finding.id} className="flex gap-4 rounded-[var(--radius-sm)] bg-surface-2 p-4">
                  <span className="step-number">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold">{pick(language, finding.title)}</p>
                    <p className="help mt-1">{packetMode === 'redacted' ? redactCaseText(pick(language, finding.neutralClaim), caseFile) : pick(language, finding.neutralClaim)}</p>
                    <p className="mono mt-2 text-xs text-ink-3">{t(language, 'Sources', 'स्रोत')} · {finding.anchors.join(' · ')}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="grid gap-5 border-t border-line py-6 sm:grid-cols-2">
            <div>
              <h3 className="h3">{t(language, 'Rule clock', 'नियम घड़ी')}</h3>
              <p className="mt-1 font-semibold">{deadline ? `${t(language, 'Safety date', 'सुरक्षित तारीख़')}: ${formatDate(deadline.date, language)}` : t(language, 'Not safely calculated', 'सुरक्षित गणना नहीं हुई')}</p>
              <p className="help mt-1">{t(language, 'CMVR Rule 167 · G.S.R. 48(E) · state procedure must be verified.', 'CMVR नियम 167 · G.S.R. 48(E) · राज्य की प्रक्रिया जाँचना ज़रूरी।')}</p>
            </div>
            <div>
              <h3 className="h3">{t(language, 'Processing record', 'प्रसंस्करण विवरण')}</h3>
              <p className="help mt-1">{t(language, 'Original uploads excluded from this packet. No official submission performed. Findings generated from user-confirmed facts and deterministic comparison rules.', 'मूल अपलोड इस पैकेट में शामिल नहीं। कोई आधिकारिक आवेदन नहीं किया गया। निष्कर्ष उपयोगकर्ता द्वारा पुष्ट तथ्यों और निश्चित तुलना नियमों से बने हैं।')}</p>
            </div>
          </section>
          <footer className="help border-t border-line pt-5 text-ink-3">{t(language, 'This summary reports observable conflicts in supplied records. It does not determine legality, guilt, fraud, cloning, or the likely outcome of any grievance.', 'यह सारांश दिए गए रिकॉर्ड में दिखने वाले अंतर बताता है। यह वैधता, दोष, धोखाधड़ी, क्लोनिंग या किसी शिकायत के संभावित नतीजे का निर्धारण नहीं करता।')}</footer>
        </article>

        <aside className="space-y-3 lg:sticky lg:top-[132px] lg:self-start">
          <div className="card-dark p-5">
            <p className="text-sm font-semibold text-white/70">{t(language, 'Final human check', 'अंतिम मानव जाँच')}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-white/15 bg-white/5 p-3">
              <input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
              <span className="text-sm leading-relaxed text-white/85">{t(language, 'I checked the displayed facts against the source records and understand this is not an official or legal conclusion.', 'मैंने दिखाए गए तथ्य स्रोत रिकॉर्ड से मिला लिए हैं और समझता/समझती हूँ कि यह कोई आधिकारिक या क़ानूनी निष्कर्ष नहीं है।')}</span>
            </label>
            <button onClick={onDownload} disabled={!attested || exporting} className="btn btn-inverse btn-block btn-lg mt-4">{exporting ? t(language, 'Building PDF…', 'PDF बन रही है…') : t(language, 'Download evidence PDF', 'साक्ष्य PDF डाउनलोड करें')}</button>
            <button onClick={onManifest} disabled={!attested} className="btn btn-outline-inverse btn-block mt-2">{t(language, 'Download manifest.json', 'manifest.json डाउनलोड करें')}</button>
            <button onClick={copyBrief} disabled={!attested} aria-live="polite" className="btn btn-outline-inverse btn-block mt-2">{copiedBrief ? t(language, 'Brief copied ✓', 'सार कॉपी हुआ ✓') : t(language, 'Copy share-safe brief', 'साझा करने योग्य सार कॉपी करें')}</button>
            <p className="mt-3 text-xs leading-relaxed text-white/55">{t(language, 'The authority-handoff PDF uses English; the JSON manifest and copied brief preserve both languages.', 'विभाग को देने वाली PDF अंग्रेज़ी में बनती है; JSON manifest और कॉपी किया सार दोनों भाषाएँ रखते हैं।')}</p>
            {exportError && <Callout tone="bad" role="alert" className="mt-3 text-sm">{exportError}</Callout>}
          </div>
          <div className="card-flat p-5">
            <h3 className="h3">{t(language, 'Continue on the official service', 'आधिकारिक सेवा पर आगे बढ़ें')}</h3>
            <p className="help mt-1">{t(language, 'Challan Jaanch does not transfer files or credentials. Open the official portal separately and follow its current instructions.', 'चालान जाँच कोई फ़ाइल या गोपनीय जानकारी नहीं भेजता। आधिकारिक पोर्टल अलग से खोलें और उसके मौजूदा निर्देश पढ़ें।')}</p>
            <a href={OFFICIAL_ECHALLAN_URL} target="_blank" rel="noreferrer" className="btn btn-secondary btn-block mt-3">{t(language, 'Open the official eChallan portal ↗', 'आधिकारिक ई-चालान पोर्टल खोलें ↗')}</a>
          </div>
          <button onClick={onReview} className={cx('btn btn-ghost btn-block')}>{t(language, '← Back to evidence review', '← साक्ष्य जाँच पर लौटें')}</button>
        </aside>
      </div>

      <div className="mt-10">
        <NextSteps language={language} outcome={assessment.outcome} deadline={deadline} />
      </div>
    </div>
  );
}

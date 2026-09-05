'use client';

import { useState } from 'react';
import { Assessment, DemoCase, deadlineFor, formatDate, isValidIsoDate, ruleClockApplies } from '../../lib/cases';
import { Language, pick, t } from '../../lib/i18n';
import { NextSteps } from '../NextSteps';
import { Chip, cx, Tone } from '../ui';

function outcomeTone(outcome: Assessment['outcome']): Tone {
  return outcome === 'supported' ? 'good' : outcome === 'unable' ? 'warn' : 'neutral';
}

function outcomeLabel(outcome: Assessment['outcome'], language: Language) {
  if (outcome === 'supported') return t(language, 'Supported', 'प्रमाणित');
  if (outcome === 'unable') return t(language, 'Unable to assess', 'आकलन संभव नहीं');
  if (outcome === 'none') return t(language, 'No ground found', 'कोई आधार नहीं');
  return t(language, 'Review needed', 'जाँच ज़रूरी');
}

export function DeadlineCard({ caseFile, language }: { caseFile: DemoCase; language: Language }) {
  if (!ruleClockApplies(caseFile.issueDate)) {
    return (
      <div className="callout callout-warn">
        <p className="font-semibold">{t(language, 'Deadline not calculated', 'समय-सीमा की गणना नहीं हुई')}</p>
        <p className="mt-1">{t(language, 'The issue date or applicable rule version is not confirmed. Check the official portal for the window that applies to you.', 'जारी तारीख़ या लागू नियम संस्करण पुष्ट नहीं है। आप पर लागू अवधि आधिकारिक पोर्टल पर देखें।')}</p>
      </div>
    );
  }
  const deadline = deadlineFor(caseFile);
  const chip = deadline.status === 'open' ? t(language, `${deadline.daysLeft} days left`, `${deadline.daysLeft} दिन बाकी`) : deadline.status === 'today' ? t(language, 'Due today', 'आज अंतिम दिन') : t(language, 'Date passed', 'तारीख़ बीत चुकी');
  return (
    <div className="card-flat p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="help">{t(language, 'Rule-based safety date', 'नियम आधारित सुरक्षित तारीख़')}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{formatDate(deadline.date, language)}</p>
        </div>
        <Chip tone={deadline.status === 'passed' ? 'bad' : deadline.status === 'today' ? 'warn' : 'accent'}>{chip}</Chip>
      </div>
      <p className="help mt-3">{t(language, '45 calendar days from issuance under CMVR Rule 167, G.S.R. 48(E), effective 20 Jan 2026. State procedure and the official portal must still be checked.', 'CMVR नियम 167, G.S.R. 48(E), प्रभावी 20 जनवरी 2026 के तहत जारी होने से 45 कैलेंडर दिन। राज्य की प्रक्रिया और आधिकारिक पोर्टल फिर भी जाँचना ज़रूरी है।')}</p>
      <a href="https://egazette.gov.in/WriteReadData/2026/269493.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent underline underline-offset-4">{t(language, 'Open the controlling Gazette ↗', 'संबंधित राजपत्र खोलें ↗')}</a>
    </div>
  );
}

interface ResultScreenProps {
  caseFile: DemoCase;
  language: Language;
  assessment: Assessment;
  onPacket: () => void;
  onReview: () => void;
  onStartCase: (id: string) => void;
}

export function ResultScreen({ caseFile, language, assessment, onPacket, onReview, onStartCase }: ResultScreenProps) {
  const [expandedCheck, setExpandedCheck] = useState<number | null>(0);
  const tone = outcomeTone(assessment.outcome);
  const routeDeadline = ruleClockApplies(caseFile.issueDate) ? deadlineFor(caseFile) : null;
  const supported = assessment.outcome === 'supported';

  const actions = (
    <div className="card-dark p-5">
      <p className="text-sm font-semibold text-white/70">{t(language, 'Next action', 'अगला क़दम')}</p>
      {supported ? (
        <>
          <h2 className="h2 mt-1">{t(language, 'Prepare the evidence packet.', 'साक्ष्य पैकेट तैयार करें।')}</h2>
          <p className="help mt-2 text-white/70">{t(language, 'Only supported, confirmed claims will be included.', 'सिर्फ़ प्रमाणित और पुष्ट दावे ही शामिल होंगे।')}</p>
          <button onClick={onPacket} className="btn btn-inverse btn-block btn-lg mt-4">{t(language, 'Build the packet →', 'पैकेट बनाएँ →')}</button>
        </>
      ) : (
        <>
          <h2 className="h2 mt-1">{t(language, 'Do not overclaim.', 'ज़्यादा दावा न करें।')}</h2>
          <p className="help mt-2 text-white/70">{t(language, 'Improve the evidence, or use the official routes below for a ground this tool cannot see.', 'सबूत बेहतर करें, या ऐसे आधार के लिए नीचे दिए आधिकारिक रास्ते अपनाएँ जो यह टूल नहीं देख सकता।')}</p>
          <button onClick={onReview} className="btn btn-inverse btn-block btn-lg mt-4">{t(language, 'Return to the evidence', 'सबूत पर लौटें')}</button>
        </>
      )}
      <button onClick={onReview} className="btn btn-outline-inverse btn-block mt-2">{t(language, 'Edit confirmed facts', 'पुष्ट तथ्य बदलें')}</button>
      {caseFile.synthetic && (
        assessment.outcome !== 'unable'
          ? <button onClick={() => onStartCase('ambiguous-photo')} className="mt-4 w-full text-center text-sm font-semibold text-white/70 underline underline-offset-4">{t(language, 'Try the insufficient-evidence case', 'अपर्याप्त-सबूत वाला केस आज़माएँ')}</button>
          : <button onClick={() => onStartCase('wrong-vehicle')} className="mt-4 w-full text-center text-sm font-semibold text-white/70 underline underline-offset-4">{t(language, 'Return to the clear case', 'साफ़ केस पर लौटें')}</button>
      )}
    </div>
  );

  return (
    <div className="container-x py-8 sm:py-12">
      <p className="eyebrow">{t(language, 'Step 3 of 4', 'चरण 3 / 4')}</p>
      <section className={cx('mt-3 rounded-[var(--radius)] border p-6 sm:p-8', tone === 'good' ? 'border-good-line bg-good-soft' : tone === 'warn' ? 'border-warn-line bg-warn-soft' : 'border-line bg-surface')}>
        <Chip tone={tone}>{outcomeLabel(assessment.outcome, language)}</Chip>
        <h1 className="h1 mt-4 max-w-3xl">{pick(language, assessment.headline)}</h1>
        <p className="lede mt-3 max-w-3xl">{pick(language, assessment.explanation)}</p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <div className="lg:hidden">{actions}</div>

          {assessment.findings.length > 0 && (
            <section>
              <h2 className="h2">{t(language, 'Supported findings', 'प्रमाणित निष्कर्ष')}</h2>
              <p className="help mt-1">{t(language, 'Each finding names the confirmed fields it rests on. Nothing else is claimed.', 'हर निष्कर्ष उन पुष्ट फ़ील्ड का नाम लेता है जिन पर वह टिका है। इसके अलावा कोई दावा नहीं।')}</p>
              <ol className="mt-4 space-y-3">
                {assessment.findings.map((finding, index) => (
                  <li key={finding.id} className="card p-5">
                    <div className="flex gap-4">
                      <span className="step-number">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="h3">{pick(language, finding.title)}</h3>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{pick(language, finding.neutralClaim)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {finding.anchors.map((anchor) => <button key={anchor} onClick={onReview} className="chip chip-neutral mono hover:border-accent">{anchor}</button>)}
                        </div>
                        {finding.limitations.map((limitation) => <p key={limitation.en} className="help mt-3 border-l-2 border-line pl-3">{pick(language, limitation)}</p>)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {assessment.nextBestEvidence && (
            <section className="callout callout-warn p-5">
              <p className="font-semibold">{t(language, 'Best next evidence', 'अगला सबसे अच्छा सबूत')}</p>
              <h2 className="h2 mt-1">{pick(language, assessment.nextBestEvidence)}</h2>
              <p className="mt-2">{t(language, 'Do not draft an allegation from the current image. Preserve the original and request a clearer official evidence file.', 'मौजूदा तस्वीर के आधार पर आरोप न लिखें। मूल सुरक्षित रखें और साफ़ आधिकारिक साक्ष्य फ़ाइल माँगें।')}</p>
            </section>
          )}

          <section>
            <h2 className="h2">{t(language, 'What could make this wrong?', 'यह ग़लत किस वजह से हो सकता है?')}</h2>
            <p className="help mt-1">{t(language, 'Every counter-explanation the rules considered, and whether it was ruled out.', 'हर विपरीत व्याख्या जिस पर नियमों ने विचार किया, और क्या उसे ख़ारिज किया गया।')}</p>
            <div className="card-flat mt-4 divide-y divide-line">
              {assessment.counterChecks.length === 0 && <p className="help p-5">{t(language, 'Confirm the evidence before counter-checks can run.', 'विपरीत जाँच चलने से पहले सबूत पुष्ट करें।')}</p>}
              {assessment.counterChecks.map((check, index) => (
                <div key={check.label.en}>
                  <button onClick={() => setExpandedCheck(expandedCheck === index ? null : index)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={expandedCheck === index}>
                    <Chip tone={check.result === 'resolved' ? 'good' : check.result === 'unresolved' ? 'warn' : 'neutral'}>{check.result === 'resolved' ? t(language, 'ruled out', 'ख़ारिज') : check.result === 'unresolved' ? t(language, 'still open', 'अब भी खुला') : t(language, 'n/a', 'लागू नहीं')}</Chip>
                    <span className="flex-1 font-semibold">{pick(language, check.label)}</span>
                    <span className="text-ink-3" aria-hidden>{expandedCheck === index ? '−' : '+'}</span>
                  </button>
                  {expandedCheck === index && <p className="help animate-evidence-in px-4 pb-4">{pick(language, check.explanation)}</p>}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="h2">{t(language, 'The clock', 'समय-सीमा')}</h2>
            <p className="help mt-1">{t(language, 'Guidance from the rule, not a portal status.', 'नियम से निकला मार्गदर्शन, पोर्टल की स्थिति नहीं।')}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
              <DeadlineCard caseFile={caseFile} language={language} />
              <ol className="card-soft flex flex-col justify-center gap-3 p-5 text-[15px]">
                <li className="flex gap-3"><span className="step-number step-number-soft">1</span><div><p className="font-semibold">{t(language, 'Issued', 'जारी')}</p><p className="help">{isValidIsoDate(caseFile.issueDate) ? formatDate(caseFile.issueDate, language) : t(language, 'Date not confirmed', 'तारीख़ पुष्ट नहीं')}</p></div></li>
                <li className="flex gap-3"><span className="step-number step-number-soft">2</span><div><p className="font-semibold">{t(language, 'Review now', 'अभी जाँचें')}</p><p className="help">{t(language, 'Preserve the evidence', 'सबूत सुरक्षित रखें')}</p></div></li>
                <li className="flex gap-3"><span className="step-number">3</span><div><p className="font-semibold">{t(language, 'Safety date', 'सुरक्षित तारीख़')}</p><p className="help">{t(language, 'Pay or contest by then', 'तब तक भुगतान या आपत्ति')}</p></div></li>
              </ol>
            </div>
          </section>

          <NextSteps language={language} outcome={assessment.outcome} deadline={routeDeadline} />
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-[132px] lg:self-start">
          {actions}
          <div className="card-flat mt-3 p-4 text-sm">
            <p className="help">{t(language, 'Case', 'केस')}</p>
            <p className="mono mt-1 font-semibold">{caseFile.id}</p>
            <p className="help mt-1">{caseFile.synthetic ? t(language, 'Synthetic demonstration', 'नकली प्रदर्शन') : t(language, 'Citizen-supplied sources', 'नागरिक द्वारा दिए स्रोत')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

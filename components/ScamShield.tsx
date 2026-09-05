'use client';

import { useMemo, useState } from 'react';
import {
  CERT_IN_ECHALLAN_ADVISORY_URL,
  CHAKSHU_URL,
  CYBERCRIME_REPORT_URL,
  CYBERCRIME_SUSPECT_URL,
  OFFICIAL_ECHALLAN_URL,
  ScamChannel,
  ScamInput,
  inspectChallanMessage,
  responseSteps,
} from '../lib/scam-shield';
import { Language, localeTag, pick, t } from '../lib/i18n';
import { Callout, Chip, Tone, cx } from './ui';

type SampleKey = 'apk' | 'link' | 'upi' | 'secret' | 'official';

/**
 * Sample lures are written twice rather than translated at runtime. A Hindi
 * speaker in India is far more likely to receive a Hinglish message than a
 * literally translated English one, so the Hindi samples mirror how these
 * messages actually arrive.
 */
function samplesFor(language: Language): Record<SampleKey, { label: string; channel: ScamChannel; message: string }> {
  return {
    apk: { label: t(language, 'Fake APK lure', 'नकली APK जाल'), channel: 'whatsapp', message: t(language, 'Traffic challan pending ₹1,000. Download M-Parivahan app now: https://mparivahan-pay.example/RTO-Challan.apk Pay today to avoid licence suspension.', 'आपका ट्रैफिक चालान ₹1,000 बाकी है। अभी M-Parivahan ऐप डाउनलोड करें: https://mparivahan-pay.example/RTO-Challan.apk लाइसेंस रद्द होने से बचने के लिए आज ही भुगतान करें।') },
    link: { label: t(language, 'Lookalike payment link', 'नकली भुगतान लिंक'), channel: 'sms', message: t(language, 'FINAL WARNING: Police eChallan due today. Pay ₹2,000 at http://echallan-parivahan.example/pay within 2 hours or your vehicle will be seized.', 'अंतिम चेतावनी: पुलिस ई-चालान आज देय है। 2 घंटे के अंदर http://echallan-parivahan.example/pay पर ₹2,000 भुगतान करें वरना वाहन ज़ब्त कर लिया जाएगा।') },
    upi: { label: t(language, 'Pay to a UPI ID', 'UPI आईडी पर भुगतान'), channel: 'whatsapp', message: t(language, 'Traffic Police notice: challan ₹1,500 pending on your vehicle. Send payment to trafficfine.rto@ybl today and reply with screenshot.', 'ट्रैफिक पुलिस सूचना: आपके वाहन पर ₹1,500 का चालान बाकी है। आज ही trafficfine.rto@ybl पर भुगतान भेजें और स्क्रीनशॉट के साथ जवाब दें।') },
    secret: { label: t(language, 'Caller asks for OTP', 'कॉल पर OTP माँगा गया'), channel: 'call', message: t(language, 'Caller says they are traffic police and asks me to share the OTP and UPI PIN to cancel a challan.', 'कॉल करने वाला ख़ुद को यातायात पुलिस बता रहा है और चालान रद्द करने के लिए ओटीपी तथा यूपीआई पिन बताने को कह रहा है।') },
    official: { label: t(language, 'Known official hostname', 'जाना-पहचाना आधिकारिक पता'), channel: 'other', message: t(language, 'I independently typed https://echallan.parivahan.gov.in/index/check-challan-status to check whether a challan exists.', 'मैंने ख़ुद https://echallan.parivahan.gov.in/index/check-challan-status टाइप करके जाँचा कि कोई चालान है या नहीं।') },
  };
}

function classificationLabel(classification: 'official' | 'government' | 'lookalike' | 'unverified', language: Language): { label: string; tone: Tone } {
  if (classification === 'official') return { label: t(language, 'Exact official host', 'असली आधिकारिक पता'), tone: 'good' };
  if (classification === 'government') return { label: t(language, 'Government domain', 'सरकारी डोमेन'), tone: 'info' };
  if (classification === 'lookalike') return { label: t(language, 'Lookalike wording', 'नकली जैसी भाषा'), tone: 'bad' };
  return { label: t(language, 'Unverified', 'अपुष्ट'), tone: 'warn' };
}

export function ScamShield({ language, onBack }: { language: Language; onBack: () => void }) {
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<ScamChannel>('whatsapp');
  const [clicked, setClicked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [grantedPermissions, setGrantedPermissions] = useState(false);
  const [paid, setPaid] = useState(false);
  const [sharedCredentials, setSharedCredentials] = useState(false);
  const [copied, setCopied] = useState(false);

  const samples = useMemo(() => samplesFor(language), [language]);
  const input = useMemo<ScamInput>(() => ({ message, channel, clicked, downloaded, installed, grantedPermissions, paid, sharedCredentials }), [message, channel, clicked, downloaded, installed, grantedPermissions, paid, sharedCredentials]);
  const assessment = useMemo(() => inspectChallanMessage(input), [input]);
  const started = Boolean(message.trim() || clicked || downloaded || installed || grantedPermissions || paid || sharedCredentials);
  const steps = responseSteps(input).map((step) => pick(language, step));

  const channelLabels: Array<[ScamChannel, string]> = [
    ['whatsapp', 'WhatsApp'],
    ['sms', t(language, 'SMS', 'एसएमएस')],
    ['call', t(language, 'Call', 'कॉल')],
    ['email', t(language, 'Email', 'ईमेल')],
    ['other', t(language, 'Other', 'अन्य')],
  ];

  const loadSample = (key: SampleKey) => {
    const sample = samples[key];
    setMessage(sample.message);
    setChannel(sample.channel);
    setClicked(false); setDownloaded(false); setInstalled(false); setGrantedPermissions(false); setPaid(false); setSharedCredentials(false);
    setCopied(false);
  };

  const clear = () => {
    setMessage('');
    setClicked(false); setDownloaded(false); setInstalled(false); setGrantedPermissions(false); setPaid(false); setSharedCredentials(false);
    setCopied(false);
  };

  const copyPlan = async () => {
    const exposure = [
      clicked && t(language, 'Opened the link', 'लिंक खोला'),
      downloaded && t(language, 'Downloaded a file/APK', 'फ़ाइल/APK डाउनलोड किया'),
      installed && t(language, 'Installed an app/APK', 'ऐप/APK इंस्टॉल किया'),
      grantedPermissions && t(language, 'Granted SMS/Accessibility/VPN permission', 'SMS/Accessibility/VPN अनुमति दी'),
      paid && t(language, 'Sent money', 'पैसे भेजे'),
      sharedCredentials && t(language, 'Shared OTP/PIN/password', 'OTP/पिन/पासवर्ड बताया'),
    ].filter(Boolean) as string[];
    const selectedChannel = channelLabels.find(([value]) => value === channel)?.[1] ?? channel;
    const text = [
      t(language, 'CHALLAN JAANCH — REPORT-READY SAFETY BRIEF', 'चालान जाँच — शिकायत के लिए सुरक्षा सार'),
      `${t(language, 'Prepared locally', 'स्थानीय रूप से तैयार')}: ${new Date().toLocaleString(localeTag[language])}`,
      `${t(language, 'Channel', 'माध्यम')}: ${selectedChannel}`,
      `${t(language, 'Assessment', 'आकलन')}: ${pick(language, assessment.headline)}`,
      `${t(language, 'Exposure reported', 'बताई गई घटना')}: ${exposure.length ? exposure.join('; ') : t(language, 'None selected', 'कुछ नहीं चुना')}`,
      '',
      t(language, 'DETECTED SIGNALS', 'मिले संकेत'),
      ...(assessment.signals.length ? assessment.signals.map((signal) => `- ${pick(language, signal.title)}`) : [`- ${t(language, 'No obvious red flag found; sender still not authenticated.', 'कोई स्पष्ट संकेत नहीं मिला; भेजने वाले की पहचान फिर भी अपुष्ट है।')}`]),
      ...(assessment.destinations.length ? ['', t(language, 'DESTINATIONS SEEN (INERT TEXT ONLY)', 'दिखे पते (सिर्फ़ निष्क्रिय पाठ)'), ...assessment.destinations.map((destination) => `- ${destination.hostname} — ${destination.classification === 'official' ? t(language, 'exact official host', 'असली आधिकारिक पता') : destination.classification === 'government' ? t(language, 'government domain, not on exact list', 'सरकारी डोमेन, सटीक सूची में नहीं') : destination.classification === 'lookalike' ? t(language, 'lookalike wording', 'नकली जैसी भाषा') : t(language, 'unverified', 'अपुष्ट')}`)] : []),
      '',
      t(language, 'ORDERED RESPONSE', 'क्रमवार कार्रवाई'),
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      `${t(language, 'Verify independently', 'ख़ुद जाँचें')}: ${OFFICIAL_ECHALLAN_URL}`,
      `${t(language, 'Report a suspicious call/SMS/WhatsApp', 'संदिग्ध कॉल/SMS/WhatsApp की शिकायत')}: ${CHAKSHU_URL}`,
      `${t(language, 'Report a suspect identifier', 'संदिग्ध पहचान की शिकायत')}: ${CYBERCRIME_SUSPECT_URL}`,
      `${t(language, 'Report cybercrime', 'साइबर अपराध शिकायत')}: ${CYBERCRIME_REPORT_URL}`,
      t(language, 'Financial cyber-fraud helpline: 1930', 'साइबर वित्तीय धोखाधड़ी हेल्पलाइन: 1930'),
      t(language, 'This is safety triage, not authentication or a police finding.', 'यह सुरक्षा छँटाई है, न पहचान की पुष्टि और न पुलिस का निष्कर्ष।'),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const exposureOptions: Array<[string, string, boolean, (value: boolean) => void]> = [
    ['clicked', t(language, 'Opened the link', 'लिंक खोला'), clicked, setClicked],
    ['downloaded', t(language, 'Downloaded a file/APK', 'फ़ाइल/APK डाउनलोड किया'), downloaded, setDownloaded],
    ['installed', t(language, 'Installed an app/APK', 'ऐप/APK इंस्टॉल किया'), installed, setInstalled],
    ['grantedPermissions', t(language, 'Allowed SMS/Accessibility/VPN access', 'SMS/Accessibility/VPN अनुमति दी'), grantedPermissions, setGrantedPermissions],
    ['paid', t(language, 'Sent money', 'पैसे भेजे'), paid, setPaid],
    ['sharedCredentials', t(language, 'Shared OTP/PIN/password', 'OTP/पिन/पासवर्ड बताया'), sharedCredentials, setSharedCredentials],
  ];

  const updateExposure = (key: string, value: boolean, setter: (next: boolean) => void) => {
    setter(value);
    setCopied(false);
    if (value && key === 'installed') setDownloaded(true);
    if (value && key === 'grantedPermissions') { setDownloaded(true); setInstalled(true); }
    if (!value && key === 'downloaded') { setInstalled(false); setGrantedPermissions(false); }
    if (!value && key === 'installed') setGrantedPermissions(false);
  };

  const outcomeTone: Tone = assessment.outcome === 'danger' ? 'bad' : assessment.outcome === 'suspicious' ? 'warn' : 'info';

  return (
    <div className="container-x py-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-bad">{t(language, 'Scam Shield · runs in this browser', 'ठगी ढाल · इसी ब्राउज़र में चलता है')}</p>
          <h1 className="h1 mt-1">{t(language, 'Check the message. Never open its link.', 'संदेश जाँचें। उसका लिंक कभी न खोलें।')}</h1>
          <p className="lede mt-3 max-w-2xl">{t(language, 'Paste the wording or URL as text. Fixed rules flag APKs, OTP requests, UPI handles, pressure tactics and lookalike eChallan sites without visiting anything.', 'संदेश या पता सिर्फ़ पाठ के रूप में चिपकाएँ। तय नियम APK, OTP माँग, UPI पते, दबाव और नकली ई-चालान साइटें पहचानते हैं — कुछ भी खोले बिना।')}</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost shrink-0">{t(language, '← Back to evidence checks', '← साक्ष्य जाँच पर लौटें')}</button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="h3">1 · {t(language, 'How did it arrive?', 'यह कैसे आया?')}</h2>
              <Chip tone="good">{t(language, 'Nothing uploaded', 'कुछ अपलोड नहीं')}</Chip>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t(language, 'Message channel', 'संदेश का माध्यम')}>
              {channelLabels.map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={channel === value} onClick={() => setChannel(value)} className={cx('btn btn-sm', channel === value ? 'btn-primary' : 'btn-secondary')}>{label}</button>)}
            </div>
          </div>

          <div className="card p-5">
            <label htmlFor="scam-message" className="h3 block">2 · {t(language, 'Paste it as plain text', 'सादे पाठ में चिपकाएँ')}</label>
            <textarea id="scam-message" value={message} maxLength={3000} onChange={(event) => { setMessage(event.target.value); setCopied(false); }} placeholder={t(language, 'Paste the suspicious SMS, WhatsApp text, email wording, caller instruction, or URL here. Do not open the link first.', 'संदिग्ध एसएमएस, WhatsApp संदेश, ईमेल की भाषा, कॉल पर कही बात या पता यहाँ चिपकाएँ। लिंक पहले न खोलें।')} className="field mt-3 min-h-44 resize-y" />
            <div className="help mt-2 flex items-center justify-between gap-4"><p>{t(language, 'Analysed in this browser. The text is not sent or saved.', 'इसी ब्राउज़र में जाँच होती है। पाठ न भेजा जाता है, न सहेजा जाता है।')}</p><p>{message.length}/3000</p></div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="help">{t(language, 'Or try a synthetic example:', 'या कोई नकली उदाहरण आज़माएँ:')}</p>
              <div className="mt-2 flex flex-wrap gap-2">{(Object.keys(samples) as SampleKey[]).map((key) => <button key={key} onClick={() => loadSample(key)} className="btn btn-secondary btn-sm">{samples[key].label}</button>)}</div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="h3">3 · {t(language, 'Has anything already happened?', 'क्या पहले ही कुछ हो चुका है?')}</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {exposureOptions.map(([key, label, checked, setter]) => (
                <label key={key} className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border p-3 text-[15px] font-medium transition', checked ? 'border-bad-line bg-bad-soft text-bad' : 'border-line bg-surface hover:border-ink-3')}>
                  <input type="checkbox" checked={checked} onChange={(event) => updateExposure(key, event.target.checked, setter)} className="h-4 w-4 accent-bad" />{label}
                </label>
              ))}
            </div>
          </div>

          <Callout tone="warn"><strong>{t(language, 'Do not upload an APK here.', 'यहाँ कोई APK अपलोड न करें।')}</strong> {t(language, 'Preserve the original message and filename, but never install or forward the file to test it.', 'मूल संदेश और फ़ाइल का नाम सुरक्षित रखें, पर जाँचने के लिए फ़ाइल कभी इंस्टॉल या आगे न भेजें।')}</Callout>
        </section>

        <section aria-live="polite" className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          {!started ? (
            <div className="card-soft p-7">
              <h2 className="h2">{t(language, 'Ready for a local safety check.', 'स्थानीय सुरक्षा जाँच के लिए तैयार।')}</h2>
              <p className="help mt-2">{t(language, 'Paste the message or choose a synthetic example. Suspicious destinations are shown only as inert text; Challan Jaanch never opens them.', 'संदेश चिपकाएँ या कोई नकली उदाहरण चुनें। संदिग्ध पते सिर्फ़ निष्क्रिय पाठ के रूप में दिखते हैं; चालान जाँच उन्हें कभी नहीं खोलता।')}</p>
              <ul className="mt-5 grid gap-2 text-[15px] text-ink-2 sm:grid-cols-2">
                {[t(language, 'App-install lures', 'ऐप इंस्टॉल के जाल'), t(language, 'Lookalike domains', 'नकली पते'), t(language, 'OTP and PIN requests', 'OTP और PIN की माँग'), t(language, 'Unverified UPI addresses', 'अपुष्ट UPI पते')].map((item) => <li key={item} className="flex gap-2"><span className="text-good" aria-hidden>✓</span>{item}</li>)}
              </ul>
            </div>
          ) : (
            <>
              <div className={cx('rounded-[var(--radius)] border p-6', outcomeTone === 'bad' ? 'border-bad-line bg-bad-soft' : outcomeTone === 'warn' ? 'border-warn-line bg-warn-soft' : 'border-info-line bg-info-soft')}>
                <Chip tone={outcomeTone}>{assessment.outcome === 'danger' ? t(language, 'High risk', 'उच्च जोखिम') : assessment.outcome === 'suspicious' ? t(language, 'Verify first', 'पहले जाँचें') : t(language, 'Not authenticated', 'पहचान अपुष्ट')}</Chip>
                <h2 className="h2 mt-3">{pick(language, assessment.headline)}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{pick(language, assessment.explanation)}</p>
              </div>

              {assessment.signals.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center justify-between"><h3 className="h3">{t(language, 'Why it was flagged', 'इसे क्यों चिह्नित किया गया')}</h3><span className="help">{assessment.signals.length} {t(language, assessment.signals.length === 1 ? 'signal' : 'signals', 'संकेत')}</span></div>
                  <ul className="mt-3 divide-y divide-line">
                    {assessment.signals.map((signal) => (
                      <li key={signal.id} className="flex gap-3 py-3">
                        <Chip tone={signal.severity === 'critical' ? 'bad' : 'warn'} className="h-fit shrink-0">{signal.severity === 'critical' ? t(language, 'critical', 'गंभीर') : t(language, 'caution', 'सावधानी')}</Chip>
                        <div><p className="font-semibold">{pick(language, signal.title)}</p><p className="help mt-0.5">{pick(language, signal.detail)}</p></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {assessment.destinations.length > 0 && (
                <div className="card p-5">
                  <h3 className="h3">{t(language, 'Destinations in the message', 'संदेश में मिले पते')}</h3>
                  <p className="help mt-1">{t(language, 'Shown as inert text. No suspicious address is linked or opened.', 'निष्क्रिय पाठ के रूप में दिखाया गया। कोई संदिग्ध पता न लिंक होता है, न खुलता है।')}</p>
                  <ul className="mt-3 space-y-2">
                    {assessment.destinations.map((destination) => {
                      const label = classificationLabel(destination.classification, language);
                      return (
                        <li key={destination.raw} className="rounded-[var(--radius-sm)] border border-line bg-surface-2 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2"><code className="mono break-all text-sm font-semibold">{destination.display}</code><Chip tone={label.tone}>{label.label}</Chip></div>
                          <p className="help mt-1.5">{pick(language, destination.explanation)}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="card-dark p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/70">{t(language, 'Your safest next route', 'आपका सबसे सुरक्षित अगला रास्ता')}</p>
                    <h3 className="h2 mt-1">{assessment.track === 'emergency' ? t(language, 'Contain, call, preserve, report.', 'रोकें, कॉल करें, सबूत रखें, शिकायत करें।') : assessment.track === 'report-attempt' ? t(language, 'Verify elsewhere, then report the attempt.', 'कहीं और जाँचें, फिर कोशिश की शिकायत करें।') : t(language, 'Verify independently on the official service.', 'आधिकारिक सेवा पर ख़ुद जाँच करें।')}</h3>
                  </div>
                  {assessment.track === 'emergency' && <a href="tel:1930" className="btn btn-danger shrink-0">{t(language, 'Call 1930 now', 'अभी 1930 पर कॉल करें')}</a>}
                </div>
                {(installed || grantedPermissions) && <p role="alert" className="mt-4 rounded-[var(--radius-sm)] border border-white/20 bg-white/10 p-3 text-sm font-medium leading-relaxed">{t(language, 'Use a different, trusted device for banking, password changes, and reporting. Keep the affected phone offline while you follow the containment steps.', 'बैंकिंग, पासवर्ड बदलने और शिकायत के लिए किसी दूसरे भरोसेमंद फ़ोन का इस्तेमाल करें। नीचे के कदम पूरे करते समय प्रभावित फ़ोन को इंटरनेट से अलग रखें।')}</p>}
                <ol className="mt-5 space-y-3">{steps.map((step, index) => <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-white/85"><span className="step-number bg-white/15 text-white">{index + 1}</span><span>{step}</span></li>)}</ol>
                <button onClick={copyPlan} className="btn btn-outline-inverse mt-5">{copied ? t(language, 'Safety brief copied ✓', 'सुरक्षा सार कॉपी हो गया ✓') : t(language, 'Copy report-ready safety brief', 'शिकायत के लिए सुरक्षा सार कॉपी करें')}</button>
              </div>
            </>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              [OFFICIAL_ECHALLAN_URL, t(language, 'Verify', 'जाँचें'), t(language, 'Official eChallan portal', 'आधिकारिक ई-चालान पोर्टल')],
              [CHAKSHU_URL, t(language, 'Call · SMS · WhatsApp', 'कॉल · SMS · WhatsApp'), t(language, 'Report to Chakshu', 'Chakshu पर शिकायत')],
              [CYBERCRIME_SUSPECT_URL, t(language, 'Attempt', 'कोशिश'), t(language, 'Report a suspect to I4C', 'I4C को संदिग्ध की शिकायत')],
              [CYBERCRIME_REPORT_URL, t(language, 'Victim', 'पीड़ित'), t(language, 'Report cybercrime', 'साइबर अपराध शिकायत')],
            ].map(([href, kicker, label]) => (
              <a key={href} href={href} target="_blank" rel="noreferrer" className="card-flat p-4 transition hover:border-accent"><p className="text-xs text-ink-3">{kicker}</p><p className="mt-1 font-semibold">{label} ↗</p></a>
            ))}
          </div>

          <div className="help flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>{t(language, 'Sources rechecked 28 Aug 2026: MoRTH, CERT-In, I4C, DoT Chakshu.', 'स्रोत 28 अगस्त 2026 को दोबारा जाँचे गए: MoRTH, CERT-In, I4C, DoT Chakshu।')} <a href={CERT_IN_ECHALLAN_ADVISORY_URL} target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-4">{t(language, 'CERT-In advisory ↗', 'CERT-In सलाह ↗')}</a></p>
            <button onClick={clear} className="touch-target w-fit shrink-0 font-semibold text-accent underline underline-offset-4">{t(language, 'Clear this check', 'यह जाँच साफ़ करें')}</button>
          </div>
        </section>
      </div>
    </div>
  );
}

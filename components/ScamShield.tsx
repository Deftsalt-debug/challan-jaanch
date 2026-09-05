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

type SampleKey = 'apk' | 'link' | 'upi' | 'secret' | 'official';

/**
 * Sample lures are written twice rather than translated at runtime. A Hindi
 * speaker in India is far more likely to receive a Hinglish message than a
 * literally translated English one, so the Hindi samples mirror how these
 * messages actually arrive.
 */
function samplesFor(language: Language): Record<SampleKey, { label: string; channel: ScamChannel; message: string }> {
  return {
    apk: {
      label: t(language, 'Fake APK lure', 'नकली APK जाल'),
      channel: 'whatsapp',
      message: t(
        language,
        'Traffic challan pending ₹1,000. Download M-Parivahan app now: https://mparivahan-pay.example/RTO-Challan.apk Pay today to avoid licence suspension.',
        'आपका ट्रैफिक चालान ₹1,000 बाकी है। अभी M-Parivahan ऐप डाउनलोड करें: https://mparivahan-pay.example/RTO-Challan.apk लाइसेंस रद्द होने से बचने के लिए आज ही भुगतान करें।',
      ),
    },
    link: {
      label: t(language, 'Lookalike payment link', 'नकली भुगतान लिंक'),
      channel: 'sms',
      message: t(
        language,
        'FINAL WARNING: Police eChallan due today. Pay ₹2,000 at http://echallan-parivahan.example/pay within 2 hours or your vehicle will be seized.',
        'अंतिम चेतावनी: पुलिस ई-चालान आज देय है। 2 घंटे के अंदर http://echallan-parivahan.example/pay पर ₹2,000 भुगतान करें वरना वाहन ज़ब्त कर लिया जाएगा।',
      ),
    },
    upi: {
      label: t(language, 'Pay to a UPI ID', 'UPI आईडी पर भुगतान'),
      channel: 'whatsapp',
      message: t(
        language,
        'Traffic Police notice: challan ₹1,500 pending on your vehicle. Send payment to trafficfine.rto@ybl today and reply with screenshot.',
        'ट्रैफिक पुलिस सूचना: आपके वाहन पर ₹1,500 का चालान बाकी है। आज ही trafficfine.rto@ybl पर भुगतान भेजें और स्क्रीनशॉट के साथ जवाब दें।',
      ),
    },
    secret: {
      label: t(language, 'Caller asks for OTP', 'कॉल पर OTP माँगा गया'),
      channel: 'call',
      message: t(
        language,
        'Caller says they are traffic police and asks me to share the OTP and UPI PIN to cancel a challan.',
        'कॉल करने वाला ख़ुद को यातायात पुलिस बता रहा है और चालान रद्द करने के लिए ओटीपी तथा यूपीआई पिन बताने को कह रहा है।',
      ),
    },
    official: {
      label: t(language, 'Known official hostname', 'जाना-पहचाना आधिकारिक पता'),
      channel: 'other',
      message: t(
        language,
        'I independently typed https://echallan.parivahan.gov.in/index/check-challan-status to check whether a challan exists.',
        'मैंने ख़ुद https://echallan.parivahan.gov.in/index/check-challan-status टाइप करके जाँचा कि कोई चालान है या नहीं।',
      ),
    },
  };
}

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
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
    setClicked(false);
    setDownloaded(false);
    setInstalled(false);
    setGrantedPermissions(false);
    setPaid(false);
    setSharedCredentials(false);
    setCopied(false);
  };

  const clear = () => {
    setMessage('');
    setClicked(false);
    setDownloaded(false);
    setInstalled(false);
    setGrantedPermissions(false);
    setPaid(false);
    setSharedCredentials(false);
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
    if (value && key === 'grantedPermissions') {
      setDownloaded(true);
      setInstalled(true);
    }
    if (!value && key === 'downloaded') {
      setInstalled(false);
      setGrantedPermissions(false);
    }
    if (!value && key === 'installed') setGrantedPermissions(false);
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 border-b border-[#d5cfc4] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">{t(language, 'Scam Shield · local safety check', 'ठगी ढाल · स्थानीय सुरक्षा जाँच')}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">{t(language, 'Check the message.', 'संदेश जाँचें।')}<br /><span className="text-[#315f78]">{t(language, 'Never open its route.', 'उसका रास्ता कभी न खोलें।')}</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f6d6a]">{t(language, 'Paste the wording or URL as text. Deterministic rules flag APKs, credential requests, pressure tactics, hidden links, and lookalike eChallan destinations without visiting them.', 'संदेश या पता सिर्फ़ पाठ के रूप में चिपकाएँ। निश्चित नियम APK, गोपनीय जानकारी की माँग, दबाव, छिपे लिंक और नकली ई-चालान पते पहचानते हैं — उन्हें खोले बिना।')}</p>
        </div>
        <button onClick={onBack} className="w-fit rounded-md border border-[#beb8ad] bg-white/65 px-4 py-3 text-xs font-black transition hover:border-[#315f78] hover:bg-white">{t(language, 'Back to evidence checks', 'साक्ष्य जाँच पर लौटें')}</button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-5">
          <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6b7774]">{t(language, '1 · How it arrived', '1 · कैसे आया')}</p><p className="mt-2 text-sm font-black">{t(language, 'Choose the channel', 'माध्यम चुनें')}</p></div>
              <span className="rounded-md border border-[#b8d1c4] bg-[#edf5f0] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#246344]">{t(language, 'Nothing uploaded', 'कुछ अपलोड नहीं')}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label={t(language, 'Message channel', 'संदेश का माध्यम')}>
              {channelLabels.map(([value, label]) => <button key={value} role="radio" aria-checked={channel === value} onClick={() => setChannel(value)} className={classes('rounded-md border px-2 py-2.5 text-[10px] font-black transition', channel === value ? 'border-[#172a33] bg-[#172a33] text-white' : 'border-[#d3cdc2] bg-white text-[#62706d] hover:border-[#315f78]')}>{label}</button>)}
            </div>
          </div>

          <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6">
            <label htmlFor="scam-message" className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6b7774]">{t(language, '2 · Paste as plain text', '2 · सादे पाठ में चिपकाएँ')}</label>
            <textarea id="scam-message" value={message} maxLength={3000} onChange={(event) => { setMessage(event.target.value); setCopied(false); }} placeholder={t(language, 'Paste the suspicious SMS, WhatsApp text, email wording, caller instruction, or URL here. Do not open the link first.', 'संदिग्ध एसएमएस, WhatsApp संदेश, ईमेल की भाषा, कॉल पर कही बात या पता यहाँ चिपकाएँ। लिंक पहले न खोलें।')} className="mt-3 min-h-48 w-full resize-y rounded-lg border border-[#c9c3b8] bg-white p-4 text-sm leading-6 outline-none transition placeholder:text-[#929a97] focus:border-[#315f78] focus:ring-2 focus:ring-[#315f78]/15" />
            <div className="mt-3 flex items-center justify-between gap-4 text-[10px] text-[#71807c]"><p>{t(language, 'Analysed in this browser. The text is not sent or saved.', 'इसी ब्राउज़र में जाँच होती है। पाठ न भेजा जाता है, न सहेजा जाता है।')}</p><p>{message.length}/3000</p></div>
            <div className="mt-5 border-t border-[#e0dcd4] pt-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#798481]">{t(language, 'Try a synthetic pattern', 'नकली उदाहरण आज़माएँ')}</p><div className="mt-3 flex flex-wrap gap-2">{(Object.keys(samples) as SampleKey[]).map((key) => <button key={key} onClick={() => loadSample(key)} className="rounded-md border border-[#d2ccc1] bg-[#f4f1ea] px-3 py-2 text-[10px] font-black text-[#53635f] transition hover:border-[#315f78] hover:bg-white">{samples[key].label}</button>)}</div></div>
          </div>

          <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6b7774]">{t(language, '3 · Has anything already happened?', '3 · क्या पहले ही कुछ हो चुका है?')}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{exposureOptions.map(([key, label, checked, setter]) => <label key={key} className={classes('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-xs font-black transition', checked ? 'border-[#b65b48] bg-[#fbefec] text-[#812f21]' : 'border-[#d7d1c6] bg-white text-[#586763] hover:border-[#315f78]')}><input type="checkbox" checked={checked} onChange={(event) => updateExposure(key, event.target.checked, setter)} className="h-4 w-4 accent-[#a13d2a]" />{label}</label>)}</div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-[#d7c590] bg-[#faf5e8] p-4 text-xs leading-5 text-[#665321]"><span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-[#9b7520]" /><p><strong>{t(language, 'Do not upload an APK here.', 'यहाँ कोई APK अपलोड न करें।')}</strong> {t(language, 'Preserve the original message and filename, but never install or forward the file to test it.', 'मूल संदेश और फ़ाइल का नाम सुरक्षित रखें, पर जाँचने के लिए फ़ाइल कभी इंस्टॉल या आगे न भेजें।')}</p></div>
        </section>

        <section aria-live="polite" className="space-y-5 lg:sticky lg:top-[150px] lg:self-start">
          {!started ? (
            <div className="professional-card rounded-[18px] p-7 sm:p-9">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#172a33] text-[10px] font-black text-white">SCAN</span>
              <h2 className="mt-6 text-3xl font-black tracking-[-0.045em]">{t(language, 'Ready for a local safety check.', 'स्थानीय सुरक्षा जाँच के लिए तैयार।')}</h2>
              <p className="mt-3 text-sm leading-6 text-[#66736f]">{t(language, 'Paste the message or choose a synthetic example. Suspicious destinations are displayed only as inert text; Challan Jaanch never opens them.', 'संदेश चिपकाएँ या कोई नकली उदाहरण चुनें। संदिग्ध पते सिर्फ़ निष्क्रिय पाठ के रूप में दिखते हैं; चालान जाँच उन्हें कभी नहीं खोलता।')}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">{[['APK', t(language, 'App-install lures', 'ऐप इंस्टॉल के जाल')], ['URL', t(language, 'Lookalike domains', 'नकली पते')], ['OTP', t(language, 'Secret requests', 'गोपनीय जानकारी की माँग')]].map(([tag, body]) => <div key={tag} className="rounded-lg border border-[#ddd7ce] bg-[#f6f3ed] p-4"><p className="text-[10px] font-black text-[#315f78]">{tag}</p><p className="mt-2 text-xs font-bold text-[#61706c]">{body}</p></div>)}</div>
            </div>
          ) : (
            <>
              <div className={classes('rounded-[18px] border p-6 sm:p-8', assessment.outcome === 'danger' ? 'border-[#c87966] bg-[#fbefec]' : assessment.outcome === 'suspicious' ? 'border-[#d5bd78] bg-[#faf5e7]' : 'border-[#a9c9b7] bg-[#edf5f0]')}>
                <div className="flex items-start justify-between gap-4"><div><p className={classes('text-[10px] font-black uppercase tracking-[0.16em]', assessment.outcome === 'danger' ? 'text-[#9b3525]' : assessment.outcome === 'suspicious' ? 'text-[#795d18]' : 'text-[#286146]')}>{pick(language, assessment.eyebrow)}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">{pick(language, assessment.headline)}</h2></div><span className={classes('rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white', assessment.outcome === 'danger' ? 'bg-[#a13d2a]' : assessment.outcome === 'suspicious' ? 'bg-[#8a681c]' : 'bg-[#315f78]')}>{assessment.outcome === 'danger' ? t(language, 'High risk', 'उच्च जोखिम') : assessment.outcome === 'suspicious' ? t(language, 'Verify first', 'पहले जाँचें') : t(language, 'Not authenticated', 'पहचान अपुष्ट')}</span></div>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#5f6c68]">{pick(language, assessment.explanation)}</p>
              </div>

              {assessment.signals.length > 0 && <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6"><div className="flex items-center justify-between"><h3 className="text-sm font-black">{t(language, 'Why it was flagged', 'इसे क्यों चिह्नित किया गया')}</h3><span className="text-[10px] font-black text-[#6c7975]">{assessment.signals.length} {t(language, assessment.signals.length === 1 ? 'signal' : 'signals', 'संकेत')}</span></div><div className="mt-4 divide-y divide-[#e0dcd4]">{assessment.signals.map((signal) => <div key={signal.id} className="grid gap-3 py-4 sm:grid-cols-[78px_1fr]"><span className={classes('h-fit w-fit rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide', signal.severity === 'critical' ? 'border-[#d6a093] bg-[#fbefec] text-[#973928]' : 'border-[#d9c68f] bg-[#faf5e7] text-[#765a19]')}>{signal.severity === 'critical' ? t(language, 'critical', 'गंभीर') : t(language, 'caution', 'सावधानी')}</span><div><p className="text-xs font-black">{pick(language, signal.title)}</p><p className="mt-1 text-xs leading-5 text-[#66736f]">{pick(language, signal.detail)}</p></div></div>)}</div></div>}

              {assessment.destinations.length > 0 && <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6"><h3 className="text-sm font-black">{t(language, 'Destination inspection', 'पता जाँच')}</h3><p className="mt-2 text-xs leading-5 text-[#6b7774]">{t(language, 'Shown as inert text. No suspicious address is linked or opened.', 'निष्क्रिय पाठ के रूप में दिखाया गया। कोई संदिग्ध पता न लिंक होता है, न खुलता है।')}</p><div className="mt-4 space-y-3">{assessment.destinations.map((destination) => <div key={destination.raw} className="rounded-lg border border-[#ddd7cd] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><code className="break-all text-xs font-black text-[#172a33]">{destination.display}</code><span className={classes('rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide', destination.classification === 'official' ? 'bg-[#e7f2eb] text-[#286146]' : destination.classification === 'government' ? 'bg-[#eef4f7] text-[#315f78]' : destination.classification === 'lookalike' ? 'bg-[#fbefec] text-[#973928]' : 'bg-[#f4efe2] text-[#725c22]')}>{destination.classification === 'official' ? t(language, 'Exact official host', 'असली आधिकारिक पता') : destination.classification === 'government' ? t(language, 'Government domain', 'सरकारी डोमेन') : destination.classification === 'lookalike' ? t(language, 'Lookalike wording', 'नकली जैसी भाषा') : t(language, 'Unverified', 'अपुष्ट')}</span></div><p className="mt-2 text-[10px] leading-4 text-[#707c79]">{pick(language, destination.explanation)}</p></div>)}</div></div>}

              <div className="rounded-xl bg-[#172a33] p-6 text-white sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b8d4e1]">{t(language, 'Your safest next route', 'आपका सबसे सुरक्षित अगला रास्ता')}</p><h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">{assessment.track === 'emergency' ? t(language, 'Contain, call, preserve, report.', 'रोकें, कॉल करें, सबूत रखें, शिकायत करें।') : assessment.track === 'report-attempt' ? t(language, 'Verify elsewhere, then report the attempt.', 'कहीं और जाँचें, फिर कोशिश की शिकायत करें।') : t(language, 'Verify independently on the official service.', 'आधिकारिक सेवा पर ख़ुद जाँच करें।')}</h3></div>{assessment.track === 'emergency' && <a href="tel:1930" className="shrink-0 rounded-md bg-white px-4 py-3 text-center text-sm font-black text-[#172a33]">{t(language, 'Call 1930 now', 'अभी 1930 पर कॉल करें')}</a>}</div>
                {(installed || grantedPermissions) && <p role="alert" className="mt-5 rounded-lg border border-white/20 bg-white/10 p-4 text-xs font-bold leading-5 text-white/90">{t(language, 'Use a different, trusted device for banking, password changes, and reporting. Keep the affected phone offline while you follow the containment steps.', 'बैंकिंग, पासवर्ड बदलने और शिकायत के लिए किसी दूसरे भरोसेमंद फ़ोन का इस्तेमाल करें। नीचे के कदम पूरे करते समय प्रभावित फ़ोन को इंटरनेट से अलग रखें।')}</p>}
                <ol className="mt-6 space-y-3">{steps.map((step, index) => <li key={step} className="grid grid-cols-[28px_1fr] gap-3 text-xs leading-5 text-white/75"><span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-[10px] font-black text-white">{index + 1}</span><span>{step}</span></li>)}</ol>
                <button onClick={copyPlan} className="mt-6 rounded-md border border-white/20 px-4 py-3 text-xs font-black transition hover:bg-white/10">{copied ? t(language, 'Safety brief copied', 'सुरक्षा सार कॉपी हो गया') : t(language, 'Copy report-ready safety brief', 'शिकायत के लिए सुरक्षा सार कॉपी करें')}</button>
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <a href={OFFICIAL_ECHALLAN_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-[#b7cdd7] bg-[#eef4f7] p-4 transition hover:border-[#315f78]"><p className="text-[10px] font-black uppercase tracking-wide text-[#315f78]">{t(language, 'Verify', 'जाँचें')}</p><p className="mt-2 text-xs font-black">{t(language, 'Official eChallan portal ↗', 'आधिकारिक ई-चालान पोर्टल ↗')}</p></a>
            <a href={CHAKSHU_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-[#b8d1c4] bg-[#edf5f0] p-4 transition hover:border-[#246344]"><p className="text-[10px] font-black uppercase tracking-wide text-[#246344]">{t(language, 'Call · SMS · WhatsApp', 'कॉल · SMS · WhatsApp')}</p><p className="mt-2 text-xs font-black">{t(language, 'Report communication to Chakshu ↗', 'Chakshu पर संदेश की शिकायत ↗')}</p></a>
            <a href={CYBERCRIME_SUSPECT_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d5c998] bg-[#faf5e7] p-4 transition hover:border-[#96741f]"><p className="text-[10px] font-black uppercase tracking-wide text-[#765a19]">{t(language, 'Attempt', 'कोशिश')}</p><p className="mt-2 text-xs font-black">{t(language, 'Report suspect to I4C ↗', 'I4C को संदिग्ध की शिकायत ↗')}</p></a>
            <a href={CYBERCRIME_REPORT_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d6a69b] bg-[#fbefec] p-4 transition hover:border-[#a13d2a]"><p className="text-[10px] font-black uppercase tracking-wide text-[#973928]">{t(language, 'Victim', 'पीड़ित')}</p><p className="mt-2 text-xs font-black">{t(language, 'Report cybercrime ↗', 'साइबर अपराध शिकायत ↗')}</p></a>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#d7d1c6] bg-[#f7f4ee] p-4 text-[10px] leading-5 text-[#65726f] sm:flex-row sm:items-center sm:justify-between"><p>{t(language, 'Sources rechecked 28 Aug 2026: MoRTH eChallan warning, CERT-In’s current RTO/eChallan malware advisory, I4C, and DoT Chakshu.', 'स्रोत 28 अगस्त 2026 को दोबारा जाँचे गए: MoRTH ई-चालान चेतावनी, CERT-In की मौजूदा RTO/ई-चालान मालवेयर सलाह, I4C और DoT Chakshu।')} <a href={CERT_IN_ECHALLAN_ADVISORY_URL} target="_blank" rel="noreferrer" className="touch-target font-black text-[#315f78] underline underline-offset-2">{t(language, 'Read CERT-In advisory ↗', 'CERT-In सलाह पढ़ें ↗')}</a></p><button onClick={clear} className="touch-target w-fit shrink-0 font-black text-[#315f78] underline decoration-[#315f78]/30 underline-offset-4">{t(language, 'Clear this local check', 'यह जाँच साफ़ करें')}</button></div>
        </section>
      </div>
    </div>
  );
}

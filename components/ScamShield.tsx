'use client';

import { useMemo, useState } from 'react';
import {
  CYBERCRIME_REPORT_URL,
  CYBERCRIME_SUSPECT_URL,
  OFFICIAL_ECHALLAN_URL,
  ScamChannel,
  ScamInput,
  inspectChallanMessage,
} from '../lib/scam-shield';

const samples = {
  apk: {
    label: 'Fake APK lure',
    channel: 'whatsapp' as ScamChannel,
    message: 'Traffic challan pending ₹1,000. Download M-Parivahan app now: https://mparivahan-pay.example/RTO-Challan.apk Pay today to avoid licence suspension.',
  },
  link: {
    label: 'Lookalike payment link',
    channel: 'sms' as ScamChannel,
    message: 'FINAL WARNING: Police eChallan due today. Pay ₹2,000 at http://echallan-parivahan.example/pay within 2 hours or your vehicle will be seized.',
  },
  secret: {
    label: 'Caller asks for OTP',
    channel: 'call' as ScamChannel,
    message: 'Caller says they are traffic police and asks me to share the OTP and UPI PIN to cancel a challan.',
  },
  official: {
    label: 'Known official hostname',
    channel: 'other' as ScamChannel,
    message: 'I independently typed https://echallan.parivahan.gov.in/index/check-challan-status to check whether a challan exists.',
  },
};

const channelLabels: Array<[ScamChannel, string]> = [
  ['whatsapp', 'WhatsApp'],
  ['sms', 'SMS'],
  ['call', 'Call'],
  ['email', 'Email'],
  ['other', 'Other'],
];

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

function responseSteps(input: ScamInput) {
  if (input.installed) {
    return [
      'Disconnect the affected phone from mobile data and Wi-Fi. Do not enter another password, PIN, or OTP on it.',
      'From a different, trusted device, call 1930 and contact your bank or payment provider.',
      'Preserve screenshots, the sender number, APK name, permissions shown, transaction alerts, and timestamps.',
      'Report at cybercrime.gov.in and arrange professional device cleanup or a secure reset before using banking again.',
    ];
  }
  if (input.paid || input.sharedCredentials) {
    return [
      'Call 1930 immediately. Fast reporting can help financial institutions act on the transfer.',
      'Contact the bank, card issuer, wallet, or UPI provider using a trusted number and secure affected accounts.',
      'Preserve the transaction ID, amount, time, sender details, message screenshots, and any acknowledgement.',
      'Complete the complaint at cybercrime.gov.in. Do not negotiate with or warn the sender.',
    ];
  }
  if (input.clicked) {
    return [
      'Close the page. Do not enter credentials, approve a notification, install a file, or make a payment.',
      'Independently type the official eChallan address and search for the challan there.',
      'Preserve the original message and report the suspicious destination to I4C if it was impersonating eChallan.',
    ];
  }
  return [
    'Do not reply, call the supplied number, scan its QR code, install its attachment, or follow its payment link.',
    'Independently open the official eChallan service and check whether a matching challan exists.',
    'Preserve the original message. Report the sender or destination to I4C when it appears to impersonate a public service.',
  ];
}

export function ScamShield({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<ScamChannel>('whatsapp');
  const [clicked, setClicked] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [paid, setPaid] = useState(false);
  const [sharedCredentials, setSharedCredentials] = useState(false);
  const [copied, setCopied] = useState(false);

  const input = useMemo<ScamInput>(() => ({ message, channel, clicked, installed, paid, sharedCredentials }), [message, channel, clicked, installed, paid, sharedCredentials]);
  const assessment = useMemo(() => inspectChallanMessage(input), [input]);
  const started = Boolean(message.trim() || clicked || installed || paid || sharedCredentials);
  const steps = responseSteps(input);

  const loadSample = (key: keyof typeof samples) => {
    const sample = samples[key];
    setMessage(sample.message);
    setChannel(sample.channel);
    setClicked(false);
    setInstalled(false);
    setPaid(false);
    setSharedCredentials(false);
    setCopied(false);
  };

  const clear = () => {
    setMessage('');
    setClicked(false);
    setInstalled(false);
    setPaid(false);
    setSharedCredentials(false);
    setCopied(false);
  };

  const copyPlan = async () => {
    const text = [
      'CHALLAN JAANCH — SCAM SAFETY PLAN',
      `Assessment: ${assessment.headline}`,
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      `Verify independently: ${OFFICIAL_ECHALLAN_URL}`,
      `Report cybercrime: ${CYBERCRIME_REPORT_URL}`,
      'Financial cyber-fraud helpline: 1930',
      'This is safety triage, not authentication or a police finding.',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const exposureOptions: Array<[keyof Pick<ScamInput, 'clicked' | 'installed' | 'paid' | 'sharedCredentials'>, string, boolean, (value: boolean) => void]> = [
    ['clicked', 'Opened the link', clicked, setClicked],
    ['installed', 'Installed an app/APK', installed, setInstalled],
    ['paid', 'Sent money', paid, setPaid],
    ['sharedCredentials', 'Shared OTP/PIN/password', sharedCredentials, setSharedCredentials],
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 border-b border-[#d5cfc4] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#315f78]">Scam Shield · local safety check</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">Check the message.<br /><span className="text-[#315f78]">Never open its route.</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f6d6a]">Paste the wording or URL as text. Deterministic rules flag APKs, credential requests, pressure tactics, hidden links, and lookalike eChallan destinations without visiting them.</p>
        </div>
        <button onClick={onBack} className="w-fit rounded-md border border-[#beb8ad] bg-white/65 px-4 py-3 text-xs font-black transition hover:border-[#315f78] hover:bg-white">Back to evidence checks</button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-5">
          <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6b7774]">1 · How it arrived</p><p className="mt-2 text-sm font-black">Choose the channel</p></div>
              <span className="rounded-md border border-[#b8d1c4] bg-[#edf5f0] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#246344]">Nothing uploaded</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Message channel">
              {channelLabels.map(([value, label]) => <button key={value} role="radio" aria-checked={channel === value} onClick={() => setChannel(value)} className={classes('rounded-md border px-2 py-2.5 text-[10px] font-black transition', channel === value ? 'border-[#172a33] bg-[#172a33] text-white' : 'border-[#d3cdc2] bg-white text-[#62706d] hover:border-[#315f78]')}>{label}</button>)}
            </div>
          </div>

          <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6">
            <label htmlFor="scam-message" className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6b7774]">2 · Paste as plain text</label>
            <textarea id="scam-message" value={message} maxLength={3000} onChange={(event) => { setMessage(event.target.value); setCopied(false); }} placeholder="Paste the suspicious SMS, WhatsApp text, email wording, caller instruction, or URL here. Do not open the link first." className="mt-3 min-h-48 w-full resize-y rounded-lg border border-[#c9c3b8] bg-white p-4 text-sm leading-6 outline-none transition placeholder:text-[#929a97] focus:border-[#315f78] focus:ring-2 focus:ring-[#315f78]/15" />
            <div className="mt-3 flex items-center justify-between gap-4 text-[10px] text-[#71807c]"><p>Analysed in this browser. The text is not sent or saved.</p><p>{message.length}/3000</p></div>
            <div className="mt-5 border-t border-[#e0dcd4] pt-4"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#798481]">Try a synthetic pattern</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(samples).map(([key, sample]) => <button key={key} onClick={() => loadSample(key as keyof typeof samples)} className="rounded-md border border-[#d2ccc1] bg-[#f4f1ea] px-3 py-2 text-[10px] font-black text-[#53635f] transition hover:border-[#315f78] hover:bg-white">{sample.label}</button>)}</div></div>
          </div>

          <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6b7774]">3 · Has anything already happened?</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{exposureOptions.map(([key, label, checked, setter]) => <label key={key} className={classes('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-xs font-black transition', checked ? 'border-[#b65b48] bg-[#fbefec] text-[#812f21]' : 'border-[#d7d1c6] bg-white text-[#586763] hover:border-[#315f78]')}><input type="checkbox" checked={checked} onChange={(event) => setter(event.target.checked)} className="h-4 w-4 accent-[#a13d2a]" />{label}</label>)}</div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-[#d7c590] bg-[#faf5e8] p-4 text-xs leading-5 text-[#665321]"><span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-[#9b7520]" /><p><strong>Do not upload an APK here.</strong> Preserve the original message and filename, but never install or forward the file to test it.</p></div>
        </section>

        <section aria-live="polite" className="space-y-5 lg:sticky lg:top-[150px] lg:self-start">
          {!started ? (
            <div className="professional-card rounded-[18px] p-7 sm:p-9">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#172a33] text-[10px] font-black text-white">SCAN</span>
              <h2 className="mt-6 text-3xl font-black tracking-[-0.045em]">Ready for a local safety check.</h2>
              <p className="mt-3 text-sm leading-6 text-[#66736f]">Paste the message or choose a synthetic example. Suspicious destinations are displayed only as inert text; Challan Jaanch never opens them.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">{[['APK', 'App-install lures'], ['URL', 'Lookalike domains'], ['OTP', 'Secret requests']].map(([tag, body]) => <div key={tag} className="rounded-lg border border-[#ddd7ce] bg-[#f6f3ed] p-4"><p className="text-[10px] font-black text-[#315f78]">{tag}</p><p className="mt-2 text-xs font-bold text-[#61706c]">{body}</p></div>)}</div>
            </div>
          ) : (
            <>
              <div className={classes('rounded-[18px] border p-6 sm:p-8', assessment.outcome === 'danger' ? 'border-[#c87966] bg-[#fbefec]' : assessment.outcome === 'suspicious' ? 'border-[#d5bd78] bg-[#faf5e7]' : 'border-[#a9c9b7] bg-[#edf5f0]')}>
                <div className="flex items-start justify-between gap-4"><div><p className={classes('text-[10px] font-black uppercase tracking-[0.16em]', assessment.outcome === 'danger' ? 'text-[#9b3525]' : assessment.outcome === 'suspicious' ? 'text-[#795d18]' : 'text-[#286146]')}>{assessment.eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">{assessment.headline}</h2></div><span className={classes('rounded-md px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-white', assessment.outcome === 'danger' ? 'bg-[#a13d2a]' : assessment.outcome === 'suspicious' ? 'bg-[#8a681c]' : 'bg-[#315f78]')}>{assessment.outcome === 'danger' ? 'High risk' : assessment.outcome === 'suspicious' ? 'Verify first' : 'Not authenticated'}</span></div>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#5f6c68]">{assessment.explanation}</p>
              </div>

              {assessment.signals.length > 0 && <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6"><div className="flex items-center justify-between"><h3 className="text-sm font-black">Why it was flagged</h3><span className="text-[10px] font-black text-[#6c7975]">{assessment.signals.length} signal{assessment.signals.length === 1 ? '' : 's'}</span></div><div className="mt-4 divide-y divide-[#e0dcd4]">{assessment.signals.map((signal) => <div key={signal.id} className="grid gap-3 py-4 sm:grid-cols-[78px_1fr]"><span className={classes('h-fit w-fit rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-wide', signal.severity === 'critical' ? 'border-[#d6a093] bg-[#fbefec] text-[#973928]' : 'border-[#d9c68f] bg-[#faf5e7] text-[#765a19]')}>{signal.severity}</span><div><p className="text-xs font-black">{signal.title}</p><p className="mt-1 text-xs leading-5 text-[#66736f]">{signal.detail}</p></div></div>)}</div></div>}

              {assessment.destinations.length > 0 && <div className="rounded-xl border border-[#d2ccc1] bg-[#fbfaf7] p-5 sm:p-6"><h3 className="text-sm font-black">Destination inspection</h3><p className="mt-2 text-xs leading-5 text-[#6b7774]">Shown as inert text. No suspicious address is linked or opened.</p><div className="mt-4 space-y-3">{assessment.destinations.map((destination) => <div key={destination.raw} className="rounded-lg border border-[#ddd7cd] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><code className="break-all text-xs font-black text-[#172a33]">{destination.display}</code><span className={classes('rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-wide', destination.classification === 'official' ? 'bg-[#e7f2eb] text-[#286146]' : destination.classification === 'lookalike' ? 'bg-[#fbefec] text-[#973928]' : 'bg-[#f4efe2] text-[#725c22]')}>{destination.classification === 'official' ? 'Exact official host' : destination.classification === 'lookalike' ? 'Lookalike wording' : 'Unverified'}</span></div><p className="mt-2 text-[10px] leading-4 text-[#707c79]">{destination.explanation}</p></div>)}</div></div>}

              <div className="rounded-xl bg-[#172a33] p-6 text-white sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b8d4e1]">Your safest next route</p><h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">{assessment.track === 'emergency' ? 'Contain, call, preserve, report.' : assessment.track === 'report-attempt' ? 'Verify elsewhere, then report the attempt.' : 'Verify independently on the official service.'}</h3></div>{assessment.track === 'emergency' && <a href="tel:1930" className="shrink-0 rounded-md bg-white px-4 py-3 text-center text-sm font-black text-[#172a33]">Call 1930 now</a>}</div>
                <ol className="mt-6 space-y-3">{steps.map((step, index) => <li key={step} className="grid grid-cols-[28px_1fr] gap-3 text-xs leading-5 text-white/75"><span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-[9px] font-black text-white">{index + 1}</span><span>{step}</span></li>)}</ol>
                <button onClick={copyPlan} className="mt-6 rounded-md border border-white/20 px-4 py-3 text-xs font-black transition hover:bg-white/10">{copied ? 'Action plan copied' : 'Copy action plan'}</button>
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <a href={OFFICIAL_ECHALLAN_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-[#b7cdd7] bg-[#eef4f7] p-4 transition hover:border-[#315f78]"><p className="text-[9px] font-black uppercase tracking-wide text-[#315f78]">Verify</p><p className="mt-2 text-xs font-black">Official eChallan portal ↗</p></a>
            <a href={CYBERCRIME_SUSPECT_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d5c998] bg-[#faf5e7] p-4 transition hover:border-[#96741f]"><p className="text-[9px] font-black uppercase tracking-wide text-[#765a19]">Attempt</p><p className="mt-2 text-xs font-black">Report suspect to I4C ↗</p></a>
            <a href={CYBERCRIME_REPORT_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d6a69b] bg-[#fbefec] p-4 transition hover:border-[#a13d2a]"><p className="text-[9px] font-black uppercase tracking-wide text-[#973928]">Victim</p><p className="mt-2 text-xs font-black">Report cybercrime ↗</p></a>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#d7d1c6] bg-[#f7f4ee] p-4 text-[10px] leading-5 text-[#65726f] sm:flex-row sm:items-center sm:justify-between"><p>Sources checked 24 Aug 2026: MoRTH eChallan warning, I4C reporting portal, and CRPF Cyber Byte.</p><button onClick={clear} className="w-fit font-black text-[#315f78] underline decoration-[#315f78]/30 underline-offset-4">Clear this local check</button></div>
        </section>
      </div>
    </div>
  );
}

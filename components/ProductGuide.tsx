'use client';

import { useEffect, useState } from 'react';

type GuideTab = 'journey' | 'guardrails' | 'stack';

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function AudioGuideButton({ text, language = 'en' }: { text: string; language?: 'en' | 'hi' }) {
  const [speaking, setSpeaking] = useState(false);

  const toggle = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return <button onClick={toggle} className={classes('hidden rounded-full border px-3 py-2 text-xs font-black transition sm:inline-flex', speaking ? 'border-[#db5f43] bg-[#fff0ea] text-[#9a3f2a]' : 'border-[#c7c1b6] bg-white/55 text-[#52615f] hover:border-[#112629]')} aria-pressed={speaking}>{speaking ? '■ Stop audio' : '◖ Listen'}</button>;
}

export function HowItWorksDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<GuideTab>('journey');
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);
  if (!open) return null;

  const tabs: Array<[GuideTab, string]> = [['journey', 'Citizen journey'], ['guardrails', 'Trust model'], ['stack', 'Technology']];
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-end bg-[#112629]/65 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guide-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-t-[32px] bg-[#f4f0e8] p-5 shadow-2xl sm:h-full sm:rounded-none sm:p-8">
        <header className="flex items-start justify-between gap-5 border-b border-[#d4cec3] pb-6">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#db5f43]">Inside Challan Jaanch</p><h2 id="guide-title" className="mt-2 text-4xl font-black tracking-[-0.055em]">How the product works.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#66736f]">A transparent evidence preflight between receiving a confusing challan and using the official grievance process.</p></div>
          <button autoFocus onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#bdb7ac] bg-white text-lg font-black" aria-label="Close how it works">×</button>
        </header>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#d2ccc1] bg-[#ebe6dc] p-1" role="tablist">
          {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={classes('whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition', tab === id ? 'bg-[#112629] text-white' : 'text-[#61706d] hover:bg-white')}>{label}</button>)}
        </div>

        {tab === 'journey' && (
          <div className="mt-7 space-y-3">
            {[
              ['01', 'Bring the records together', 'Load the challan/evidence bundle and the corresponding vehicle record—or run the fully synthetic guided case.'],
              ['02', 'Extract observable facts', 'The optional multimodal model reads plate, date, broad vehicle class and other visible fields. It makes no legal finding.'],
              ['03', 'Verify every decisive value', 'The citizen edits and confirms the facts. A changed value immediately invalidates any prior result.'],
              ['04', 'Run the deterministic comparison', 'Versioned TypeScript rules compare the three sources, test counter-explanations and choose a supported, refused or no-ground state.'],
              ['05', 'Prepare a citizen packet', 'Only supported, confirmed claims enter the downloadable PDF and machine-readable manifest. The app then hands off to the separate official portal.'],
            ].map(([number, title, body]) => <article key={number} className="grid gap-4 rounded-[22px] border border-[#d4cec3] bg-[#fffdf8] p-5 sm:grid-cols-[46px_1fr]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#112629] text-xs font-black text-[#f7c64a]">{number}</span><div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p></div></article>)}
          </div>
        )}

        {tab === 'guardrails' && (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {[
              ['Model extracts; code decides', 'The model cannot call a challan invalid or predict a grievance outcome.'],
              ['Uncertainty stops the claim', 'Confusable plate characters or an unreadable vehicle class produce “Unable to assess.”'],
              ['Original files stay immutable', 'Annotations and user edits are overlays; source files are never rewritten.'],
              ['No government impersonation', 'No logos, seals, official case numbers or simulated submission success.'],
              ['No credential collection', 'The official portal opens separately. Challan Jaanch never asks for its password or OTP.'],
              ['No silent retention', 'No application database, analytics or persistent document store; reset clears the browser session.'],
            ].map(([title, body], index) => <article key={title} className="rounded-[22px] border border-[#d4cec3] bg-[#fffdf8] p-5"><span className={classes('grid h-9 w-9 place-items-center rounded-full text-sm font-black', index % 2 ? 'bg-[#fff0c7] text-[#735814]' : 'bg-[#dff1e3] text-[#246344]')}>{index % 2 ? '◇' : '✓'}</span><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p></article>)}
          </div>
        )}

        {tab === 'stack' && (
          <div className="mt-7 space-y-5">
            <div className="rounded-[26px] bg-[#112629] p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f7c64a]">Architecture principle</p><p className="mt-3 text-2xl font-black tracking-[-0.04em]">Artifact in → verified facts → deterministic finding → portable packet.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['React 19 + TypeScript', 'Client state machine, accessible interactions and strict evidence models.'],
                ['Vinext + Vite', 'Fast Next-compatible application build with Cloudflare Worker output.'],
                ['Tailwind CSS 4', 'Responsive layout, design tokens, reduced-motion support and touch-friendly components.'],
                ['OpenAI Responses API', 'Optional image/PDF field extraction using structured JSON output and storage disabled.'],
                ['Deterministic TypeScript rules', 'Plate, broad vehicle-family and exact-duplicate comparisons; calendar-date deadline logic.'],
                ['jsPDF + Web APIs', 'In-browser PDF/JSON downloads, file hashing, object URLs and speech guidance.'],
                ['OpenAI Sites', 'Private deployment, versioned releases and Cloudflare-compatible hosting.'],
                ['No database by design', 'No D1, R2, auth or application-owned document persistence in this MVP.'],
              ].map(([title, body]) => <article key={title} className="rounded-[22px] border border-[#d4cec3] bg-[#fffdf8] p-5"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#66736f]">{body}</p></article>)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

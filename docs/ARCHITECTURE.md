# Architecture

## Product contract

Challan Jaanch sits between receiving a confusing eChallan and using the official grievance process. It does not replace the official portal. Its only decision is whether user-confirmed records support a narrow, observable contradiction under a versioned rule.

```text
Synthetic fixture or citizen files
                 │
                 ▼
Optional observable-field extraction ── failure ──► Manual entry
                 │                                  │
                 └──────────────┬───────────────────┘
                                ▼
                    Editable evidence map
                                │
                       Human confirmation gate
                                │
                                ▼
                  Deterministic comparison rules
                    │             │             │
                    ▼             ▼             ▼
                Supported       Refused      No ground
                    │
                    ▼
          Citizen PDF + JSON manifest
                    │
                    ▼
        Separate official-portal handoff
```

Scam Shield is a parallel, browser-only trust lane:

```text
Pasted message text
        │
        ▼
Inert URL parsing + advisory-pattern rules
        │
        ├──► Verify independently on exact official hostname
        ├──► Report attempted impersonation to I4C
        └──► If exposed: 1930 + bank/provider + NCRP
```

## Trust boundaries

### Extraction boundary

`app/api/analyze/route.ts` can send up to three selected images or PDFs to the OpenAI Responses API. The request uses structured JSON output and `store: false`. The model is instructed to return only observable fields and may not decide validity, guilt, fraud, cloning, appeal eligibility, or likely outcome.

The boundary rejects oversized, malformed, unsupported, or excess documents; applies an upstream timeout; and validates the structured result and calendar date again before returning it to the browser.

If the API key is absent, the endpoint returns an honest `503 LIVE_EXTRACTION_NOT_CONFIGURED`. The interface continues with manual verification. No synthetic demo depends on the route.

### Human boundary

Every decisive value must be confirmed. Editing a value removes its confirmation immediately. Until all decisive values are confirmed, `assessCase` returns a `review` state and produces no finding.

### Decision boundary

`lib/cases.ts` is the only decision layer. It currently implements:

- registration-mark conflict across challan, photo, and vehicle record;
- broad vehicle-family conflict;
- exact duplicate-event matching across distinct challan numbers;
- safe refusal for low-confidence or materially ambiguous plate characters;
- a 45-calendar-day Rule 167 safety-date calculation for the current rule pack.

Rules emit neutral claims, evidence anchor IDs, limitations, and packet eligibility. They never call a challan invalid.

### Persistence boundary

The MVP has no database, R2 bucket, analytics, account system, or application-owned document store. Selected files live in the current browser session. The generated packet excludes original uploads. A reset drops all application state; normal browser garbage collection releases object URLs.

The API route necessarily transmits selected files to OpenAI only when the user chooses live extraction and a server-side key is configured. Production deployments should add an explicit consent receipt, retention verification, rate limits, and abuse controls before accepting real documents.

### Scam-navigation boundary

`lib/scam-shield.ts` parses pasted text locally and never performs a fetch. User-supplied destinations are rendered as inert text. Only source-controlled government URLs are clickable. The checker can label a known exact host, a lookalike, or an unverified destination; it never labels a sender or message safe.

## UI state machine

`home → upload → processing → review → result → packet`

Parallel lane: `home → scam → verify | report-attempt | emergency`

- **Home:** synthetic cases, product evidence, and interactive outcome preview.
- **Upload:** drag/drop or file selection with local preview and size/type guidance.
- **Processing:** transparent extraction steps; no simulated official progress.
- **Review:** source inspector, character-level diff, rule clock, editing, and confirmation.
- **Result:** finding trace, adversarial counter-checks, deadline context, and refusal path.
- **Packet:** redacted/official-handoff views, attestation, PDF/JSON exports, and a separate official link.
- **Scam:** local message triage, inert URL inspection, exposure-aware response plan, and hard-coded official escape routes.

## Main technology choices

- React 19 and TypeScript for a typed client workflow.
- Vinext/Vite for Next-compatible routes and Cloudflare output.
- Tailwind CSS 4 plus a small global motion layer.
- OpenAI Responses API for optional multimodal extraction.
- Pure TypeScript scam rules for advisory patterns, URL classification, and exposure routing.
- jsPDF, Web Crypto, object URLs, and Web Speech APIs for local capabilities.
- OpenAI Sites for versioned hosting, with public access treated as a separate release decision.

## Production-hardening backlog

Before handling real citizen records at scale:

1. Commission an Indian privacy and legal review.
2. Add explicit consent and verifiable deletion semantics.
3. Add document malware scanning, per-user rate limits, and abuse monitoring.
4. Version rule packs by jurisdiction and effective date.
5. Validate official handoff requirements state by state.
6. Run accessibility testing with screen readers and Indian-language users.
7. Add fixture-based regression tests for every rule version.

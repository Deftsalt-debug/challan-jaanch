# Challan Jaanch

![Challan Jaanch social card](public/og.png)

An evidence-first preflight for potentially incorrect Indian eChallans. It brings a challan record, supplied enforcement evidence, and the citizen's vehicle record into one inspectable workspace. The product then reports a narrow observable contradiction—or explicitly refuses to conclude.

## What makes it different

- **Source-linked findings:** every claim points back to the exact confirmed fields that produced it.
- **A real refusal path:** ambiguous plate characters or unreadable vehicle classes stop the finding instead of becoming an allegation.
- **Model/code separation:** optional multimodal AI extracts observable fields; deterministic TypeScript rules choose the outcome.
- **Human verification gates:** editing a decisive field invalidates its confirmation and the prior result.
- **Portable evidence packet:** supported claims can be downloaded as a citizen-prepared PDF plus a machine-readable JSON manifest.
- **No government impersonation:** the app never asks for portal credentials, submits a grievance, or claims a government decision.

## Guided experience

1. Run one of three visibly synthetic cases or select your own records.
2. Inspect the sources in the evidence workbench.
3. Compare plate characters and review the Rule 167 clock.
4. Confirm each decisive fact against the source.
5. Run the deterministic comparison.
6. Inspect the finding map and adversarial counter-checks.
7. Build a redacted or official-handoff packet.
8. Continue separately on the official eChallan portal.

The synthetic demo is complete without an API key. Live file extraction is optional and fails safely into manual verification when it is not configured.

## Technology

| Layer | Choice | Role |
| --- | --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS 4 | Responsive state-machine journey and accessible interactions |
| App framework | Vinext, Vite 8, Next-compatible routing | Fast development and Cloudflare Worker output |
| Extraction | OpenAI Responses API, optional | Structured multimodal field extraction with `store: false` |
| Decision layer | Deterministic TypeScript | Plate, vehicle-family, duplicate-event, and deadline rules |
| Exports | jsPDF and browser Web APIs | Client-side PDF, JSON manifest, SHA-256 hashes, audio guidance |
| Hosting | OpenAI Sites | Versioned private deployment |
| Persistence | None by design | No application database, analytics, or persistent document store |

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For optional live extraction:

```bash
cp .env.example .env.local
```

Add `OPENAI_API_KEY` to `.env.local`. Never commit that file. The demo does not need it.

## Verify before pushing

```bash
npm run verify
```

This runs linting, TypeScript checks, deterministic-rule tests, and the production build.

## Repository map

```text
app/page.tsx                       Citizen journey and state machine
app/api/analyze/route.ts           Optional structured extraction endpoint
components/EvidenceWorkbench.tsx  Source inspector, character diff, rule clock
components/ProductGuide.tsx       Audio guide and in-product architecture drawer
lib/cases.ts                       Typed fixtures, comparison rules, date logic
tests/rules.test.mjs               Deterministic rule and API-boundary tests
docs/ARCHITECTURE.md               Trust boundaries and data flow
docs/LOCAL_DEVELOPMENT.md          Setup and troubleshooting
docs/DEMO_SCRIPT.md                A judge-ready 90-second walkthrough
```

## Product boundary

Challan Jaanch reports conflicts visible in supplied records. It does not declare a challan invalid, infer fraud or cloning, predict grievance success, provide legal advice, or perform an official submission. The Rule 167 source pack is dated and must be rechecked before production use.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete design.

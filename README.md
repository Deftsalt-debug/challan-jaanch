# Challan Jaanch

An evidence-first preflight for objectively mismatched Indian eChallans. The product compares the challan record, supplied enforcement evidence and the citizen's vehicle record, then either reports a narrow observable contradiction or refuses to conclude.

## Product boundary

- Reports record conflicts; never declares a challan invalid.
- Does not predict grievance success, infer fraud or provide legal advice.
- Does not collect official-portal credentials or submit a grievance.
- Uses visibly synthetic records for the deterministic hackathon demo.
- Requires human confirmation before consequential fields reach the rules engine.

## Architecture

- Vinext/React client journey with Sites-compatible Cloudflare output.
- Deterministic TypeScript comparison rules and versioned deadline calculation.
- Optional OpenAI Responses API route for multimodal field extraction.
- In-browser PDF and JSON evidence-packet generation.
- No database, persistent upload store, analytics or live government API.

The model may extract observable values. The citizen confirms them. Deterministic code chooses the outcome state. Government authorities decide the grievance.

## Local setup

Copy `.env.example` to `.env.local` only when live extraction is required. Without an API key, the complete synthetic demo and manual recovery path remain functional.

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The Rule 167 source pack is dated and must be rechecked before submission or production use.

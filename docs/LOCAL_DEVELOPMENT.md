# Local development

## Requirements

- Node.js 22.13 or newer
- npm
- An OpenAI API key only if you want live document extraction

## Start the app

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Choose **See a 90-second demo** for the complete keyless journey.

Choose **Scam check** for the second keyless journey. Pasted scam text is evaluated locally and does not require an API key.

## Configure live extraction

```bash
cp .env.example .env.local
```

Set these values locally:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.6-terra
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Do not commit `.env.local`. The key is read only by the server route. The browser never receives it.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Or run the full gate:

```bash
npm run verify
```

Before deployment, also run the network-backed production dependency audit:

```bash
npm run release:check
```

## Common issues

### Live extraction says it is not configured

This is the expected safe fallback when `OPENAI_API_KEY` is absent. Use the synthetic fixtures or fill the observable fields manually.

### A selected file is rejected

Use JPG, PNG, or PDF under 10 MB. The server also rejects malformed data URLs and oversized encoded payloads.

### The comparison button remains locked

Confirm every field tagged **Decisive**. Editing any decisive field intentionally removes its confirmation.

### The packet download button is disabled

Complete the final human attestation. Packets are only available for supported outcomes.

### Scam Shield found no obvious red flag

That does not authenticate the sender. Independently type the official eChallan address. User-supplied destinations are intentionally not clickable.

## Maintaining English and Hindi

Use `t(language, english, hindi)` for interface text and `Bilingual` values with `pick()` for rule output.
Keep vehicle-family and colour values canonical; translate display labels only. Never translate identifiers.
Run bilingual-completeness regressions for every new finding, scam signal or recovery step; have a fluent reader review safety copy.
The PDF is English-only; JSON preserves both claim languages. See [architecture](ARCHITECTURE.md).

## Production build and dependency review

`npm run build` writes Vinext/Cloudflare output; `npm start` runs the production server locally.
Keep `next.config.ts`, `vite.config.ts` and `.openai/hosting.json`: all participate in the build.
`npm audit` includes build dependencies; `release:check` only audits production dependencies after verification.
A development-only dependency may still participate in server build output.

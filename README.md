# Challan Jaanch

An independent, bilingual companion for understanding Indian eChallans: compare evidence, check suspicious messages, and navigate payment problems.

[Live application](https://challan-jaanch.deftsalt.chatgpt.site) · [Documentation](docs/README.md) · [Submission](SUBMISSION.md) · [Changelog](CHANGELOG.md)

[![Verify](https://github.com/Deftsalt-debug/challan-jaanch/actions/workflows/verify.yml/badge.svg)](https://github.com/Deftsalt-debug/challan-jaanch/actions/workflows/verify.yml)

![Challan Jaanch](public/og-release.png)

## What it does

| Citizen need | Product response |
| --- | --- |
| “The photo may show a different vehicle.” | Compare source-linked plate and vehicle fields, confirm evidence and export supported contradictions. |
| “Two challans may describe the same event.” | Compare distinct records with deterministic rules, without guessing missing values. |
| “Is this message suspicious?” | Inspect pasted text without opening its links; get exposure-specific recovery steps. |
| “I paid, but something is wrong.” | Follow service-specific receipt and payment guidance with a locally copied checklist. |

**Humans confirm the evidence. Code compares it. Official services make the decision.**

Unclear decisive evidence produces a refusal, not an allegation. The app does not authenticate senders, declare a challan invalid, verify payments, promise refunds or submit anything on your behalf.

## Try it

Open the [live app](https://challan-jaanch.deftsalt.chatgpt.site) and select **See a 90-second demo**. Synthetic cases, manual entry, Scam Shield and payment follow-up need no account, API key or personal documents. The header switches between English and Hindi.

For a real comparison, choose **Check my challan**. Files are optional; every decisive field still requires review against the original. Supported findings can become a PDF, JSON manifest or share-safe brief.

## Run locally

Requires **Node.js 22.13 or newer** and npm. The optional `.nvmrc` selects the Node 22 release line.

```bash
git clone https://github.com/Deftsalt-debug/challan-jaanch.git
cd challan-jaanch
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Already have the folder? Skip the first two commands.

### Optional AI extraction

Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`. Never commit this file. AI extracts observable document fields only, after explicit transmission consent; it does not decide the result. Without a key, use the complete manual-entry path.

See [local development](docs/LOCAL_DEVELOPMENT.md) for configuration and troubleshooting.

## Development checks

```bash
npm run verify
```

Runs ESLint, TypeScript checks, regression tests and the production build. [GitHub Actions](https://github.com/Deftsalt-debug/challan-jaanch/actions/workflows/verify.yml) runs the same gate on pushes to `main` and pull requests.

Use `npm run release:check` to additionally check production dependencies for published security advisories. Tests protect bilingual rules, privacy boundaries, official routing, submission limits and payment guidance.

## Architecture

| Layer | Implementation |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS 4; shared design tokens and screen components |
| Framework | Vinext / Vite with Next-compatible routing; Cloudflare Worker deployment through Sites |
| Decisions | Pure TypeScript evidence rules and local scam-pattern checks |
| Optional extraction | Server-side OpenAI Responses API; explicit consent and structured output |
| Exports | jsPDF, JSON, clipboard and browser SHA-256 APIs |
| Data | In-memory citizen workspace; no application database or persistent document store |

Comparison and message checks run locally. Optional AI processing sends selected files to the provider. `store: false` disables retrievable response storage, **not all provider retention**. Language preference is stored locally; citizen cases are not saved as accounts or cloud records.

```text
app/          Routes, page state, optional extraction endpoint
components/   Citizen screens and reusable interface components
lib/          Typed rules, bilingual copy and official route plans
tests/        Rule, privacy, routing and submission regressions
docs/         Architecture, research and development guides
submission/   Original demo video, captures and production sources
```

## Documentation and contribution

- [Documentation index](docs/README.md): choose the right guide.
- [System guide](SYSTEM_GUIDE.md): complete workflows, trust boundaries and design rationale.
- [Contributing](CONTRIBUTING.md): coding standards, source requirements and review checklist.
- [Submission pack](SUBMISSION.md): summary, live link and video. The recording predates the current UI; see [recording provenance](submission/README.md).

This is an independent civic-tech prototype, not a government service or legal adviser. Source-backed guidance is dated and must be rechecked as official services change. Do not put real citizen records, credentials or unredacted documents in GitHub issues or pull requests.

## License

[MIT](LICENSE).

# Contributing

1. Create a focused branch.
2. Keep government branding, portal credentials, and simulated submission out of the product.
3. Add or update a deterministic fixture for every rule change.
4. Document the rule source, jurisdiction, effective date, and limitations.
5. Run `npm run verify` before opening a pull request.

Do not commit API keys, real citizen records, or unredacted challan artifacts. Synthetic fixtures must remain visibly fictional.

## Development checks

Use Node.js 22.13 or newer. Install the lockfile versions with `npm ci`, then start with `npm run dev`. No API key is required for the local manual journey, synthetic cases, Scam Shield, or payment follow-up.

Before submitting a change, run `npm run verify`. It includes lint, types, tests and the production build. For a release, also run `npm audit --omit=dev`. Report failures rather than suppressing checks or weakening an assertion just to get a passing result.

## Product and coding standards

- Keep decision logic in pure TypeScript under `lib/`; keep display and interaction in `components/`.
- Supply reviewed English and Hindi for every new citizen-facing message. Do not translate registration identifiers or invent unavailable translations.
- Reuse the shared design tokens and controls. Preserve keyboard access, visible focus, small-screen wrapping and reduced-motion behavior.
- Keep user-provided links inert. New clickable destinations must be fixed, independently checked and documented with their scope.
- Do not infer fraud from a UPI address, guilt from a photograph, or settlement from a bank debit.
- Keep AI transmission opt-in and separate from local processing. Never commit `.env.local` or paste real documents into issues.
- Add regression coverage for changed behavior, including uncertainty and failure paths. Keep the submission summary and video within their checked limits.

## Pull requests

Explain the citizen problem, the change, the evidence behind any new guidance, and which checks actually ran. Update the relevant guide when a data boundary or user journey changes. Keep generated builds, local tooling and credentials out of the diff.

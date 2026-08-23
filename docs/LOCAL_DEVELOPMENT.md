# Local development

## Requirements

- Node.js 22.13 or newer
- npm
- An OpenAI API key only if you want live document extraction

## Start the app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Choose **Run the 90-second demo** for the complete keyless journey.

Choose **Scam check** for the second keyless journey. Pasted scam text is evaluated locally and does not require an API key.

## Configure live extraction

```bash
cp .env.example .env.local
```

Set these values locally:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4
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

## Push to a new repository

The folder is a complete Git repository. To point it at your own remote:

```bash
git remote -v
git remote set-url origin YOUR_REPOSITORY_URL
git push -u origin main
```

If you prefer to preserve the current deployment remote, add yours under another name:

```bash
git remote add personal YOUR_REPOSITORY_URL
git push -u personal main
```

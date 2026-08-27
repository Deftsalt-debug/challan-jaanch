# Challan Jaanch — submission pack

## Live project

**Public link:** https://challan-jaanch.deftsalt.chatgpt.site

The app has no consumer login. Reviewers can open it directly and run the complete synthetic evidence journey and Scam Shield without credentials or personal uploads. The language toggle in the header switches the entire journey between English and Hindi.

## Project summary

Challan Jaanch is an independent, privacy-first trust preflight for Indian eChallans. It handles two failures citizens face: a real challan whose evidence may be inconsistent, and a fake challan message designed to steal money or install malware.

For disputed records, citizens compare the challan, enforcement photo and vehicle record in a source-linked workbench. The app highlights plate and vehicle-class conflicts, requires confirmation of consequential fields, applies deterministic rules, exposes counter-explanations, and refuses to decide when evidence is ambiguous. Supported conflicts become a redacted or official-handoff PDF, JSON manifest or bilingual share-safe brief; nothing is automatically submitted.

Scam Shield analyses pasted messages and URLs as inert text, identifies APK lures, credential requests, urgency, lookalike domains and WhatsApp context, then routes citizens to independent verification, I4C reporting, or urgent 1930 and bank containment based on actual exposure. Its patterns match Hinglish and Devanagari messages, not only English ones.

Current portals mainly show status, accept payment or receive grievances. Challan Jaanch adds the missing reasoning layer before those steps. It is better because every finding is traceable, uncertainty is visible, ambiguous evidence produces a refusal rather than an allegation, suspicious links are never opened, every screen works fully in Hindi, and the complete demo runs without login or personal data.

**Word count:** 207

## Video

The ready-to-submit cut is [submission/challan-jaanch-submission.mp4](submission/challan-jaanch-submission.mp4): 1 minute 54 seconds, 1280×720, with synthetic English narration. Use [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the timed first-minute citizen demo and second-minute build explanation. [docs/VIDEO_NARRATION.txt](docs/VIDEO_NARRATION.txt) contains the clean narration track.

## How the OpenAI model is used

[docs/HOW_WE_BUILT_IT.md](docs/HOW_WE_BUILT_IT.md) records the single model call in the product, the strict JSON schema it must answer in, the two things it is forbidden from deciding, the three independent layers that enforce that boundary, and the eight failure states that return the citizen to manual entry instead of a fabricated field.

## Accessibility and reach

[docs/LOCALISATION.md](docs/LOCALISATION.md) explains why the Hindi coverage is complete rather than partial, which canonical values stay in English and why, and the four tests that fail the build if any rule-layer string loses its Hindi.

## Submission boundary

- Independent civic-tech prototype; not affiliated with a government authority.
- No login credentials are required.
- Use only the visibly synthetic fixtures in a public demonstration.
- Optional live document extraction requires a server-side API key; the submitted guided demo does not, and the public deployment runs without one so no reviewer's document is ever sent anywhere.

# Video deliverable

![Submission video cover](video-cover.png)

`challan-jaanch-submission.mp4` is a 1 minute 54 second, 1280×720 H.264/AAC submission cut built entirely from the public synthetic demo. It contains no real challan, vehicle registration, phone number, login or personal upload.

The first minute follows the citizen journey: source review, decisive plate mismatch, human confirmation, narrow result and Scam Shield. The second minute explains the React/TypeScript architecture, deterministic decision layer, honest-refusal path and no-database privacy model.

Narration uses the macOS Aman synthetic English voice and the exact copy in [`../docs/VIDEO_NARRATION.txt`](../docs/VIDEO_NARRATION.txt). The timed two-presenter alternative is in [`../docs/DEMO_SCRIPT.md`](../docs/DEMO_SCRIPT.md).

The spoken phrase “storage disabled” refers specifically to `store: false`, which disables retrievable response storage. It does not claim zero provider retention; OpenAI API data controls may still apply. The public submission deployment has no API key, so its reviewer journey never transmits a document to OpenAI.

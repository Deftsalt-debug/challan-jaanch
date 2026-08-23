export const runtime = 'edge';

interface UploadPayload {
  name: string;
  type: string;
  data: string;
}

interface AnalyzePayload {
  documents?: UploadPayload[];
}

const acceptedFileTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const vehicleFamilies = new Set(['Two-wheeler', 'Passenger car', 'Goods vehicle', 'Bus', 'Three-wheeler', 'Other', 'Unknown']);
const stringFields = ['challanNumber', 'issueDate', 'recordPlate', 'photoPlate', 'rcPlate', 'photoFamily', 'rcFamily', 'occurredAt', 'location', 'offence', 'amount'] as const;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validatedExtraction(value: unknown): Record<string, string | string[] | null> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const extraction: Record<string, string | string[] | null> = {};
  for (const field of stringFields) {
    const entry = record[field];
    if (entry !== null && (typeof entry !== 'string' || entry.length > 500)) return null;
    extraction[field] = entry as string | null;
  }
  if (typeof extraction.issueDate === 'string' && !validIsoDate(extraction.issueDate)) return null;
  if (typeof extraction.photoFamily === 'string' && !vehicleFamilies.has(extraction.photoFamily)) return null;
  if (typeof extraction.rcFamily === 'string' && !vehicleFamilies.has(extraction.rcFamily)) return null;
  if (!Array.isArray(record.notes) || record.notes.length > 6 || record.notes.some((note) => typeof note !== 'string' || note.length > 500)) return null;
  extraction.notes = record.notes as string[];
  return extraction;
}

const extractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    challanNumber: { type: ['string', 'null'] },
    issueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD when printed and unambiguous' },
    recordPlate: { type: ['string', 'null'] },
    photoPlate: { type: ['string', 'null'] },
    rcPlate: { type: ['string', 'null'] },
    photoFamily: { type: ['string', 'null'], enum: ['Two-wheeler', 'Passenger car', 'Goods vehicle', 'Bus', 'Three-wheeler', 'Other', 'Unknown', null] },
    rcFamily: { type: ['string', 'null'], enum: ['Two-wheeler', 'Passenger car', 'Goods vehicle', 'Bus', 'Three-wheeler', 'Other', 'Unknown', null] },
    occurredAt: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    offence: { type: ['string', 'null'] },
    amount: { type: ['string', 'null'] },
    notes: { type: 'array', items: { type: 'string' }, maxItems: 6 },
  },
  required: ['challanNumber', 'issueDate', 'recordPlate', 'photoPlate', 'rcPlate', 'photoFamily', 'rcFamily', 'occurredAt', 'location', 'offence', 'amount', 'notes'],
};

function outputText(response: Record<string, unknown>): string | null {
  if (typeof response.output_text === 'string') return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') return (part as { text: string }).text;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ code: 'LIVE_EXTRACTION_NOT_CONFIGURED', message: 'Live extraction is not configured. Continue with the deterministic synthetic demo or enter the fields manually.' }, 503);
  }

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send a JSON upload payload.' }, 415);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 44_000_000) return json({ code: 'PAYLOAD_TOO_LARGE', message: 'The combined upload payload is too large.' }, 413);

  let payload: AnalyzePayload | null;
  try {
    payload = await request.json() as AnalyzePayload;
  } catch {
    return json({ code: 'BAD_REQUEST', message: 'The upload payload could not be read.' }, 400);
  }

  const documents = payload && Array.isArray(payload.documents) ? payload.documents : [];
  if (documents.length < 2) return json({ code: 'MISSING_DOCUMENTS', message: 'Provide a challan and vehicle record.' }, 400);
  if (documents.length > 3) return json({ code: 'TOO_MANY_DOCUMENTS', message: 'Provide no more than three documents.' }, 400);
  if (documents.some((file) => !file || typeof file.name !== 'string' || file.name.length > 255 || !acceptedFileTypes.has(file.type) || typeof file.data !== 'string' || !file.data.startsWith(`data:${file.type};base64,`) || file.data.length > 14_000_000)) {
    return json({ code: 'UNSUPPORTED_DOCUMENT', message: 'Use clear JPG, PNG or PDF files under 10 MB each.' }, 413);
  }

  const fileParts = documents.map((file) => file.type === 'application/pdf'
    ? { type: 'input_file', filename: file.name, file_data: file.data }
    : { type: 'input_image', image_url: file.data, detail: 'high' });

  let openAIResponse: Response;
  try {
    openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4',
        store: false,
        instructions: [
          'You extract observable fields from Indian eChallan and vehicle-record documents.',
          'Do not decide validity, guilt, appeal eligibility, fraud, cloning, or legal outcome.',
          'Do not silently correct visually confusable plate characters. Use null when the field is unclear.',
          'Treat the first document as the challan/evidence bundle and the second as the citizen-supplied vehicle record.',
          'Return only the supplied JSON schema. Keep notes factual and short.',
        ].join(' '),
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: 'Extract only the observable comparison fields. The citizen will verify every consequential value before any deterministic comparison runs.' },
            ...fileParts,
          ],
        }],
        text: { format: { type: 'json_schema', name: 'challan_evidence_extraction', strict: true, schema: extractionSchema } },
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return json({ code: 'EXTRACTION_UNREACHABLE', message: 'The extraction service could not be reached. Continue with manual verification; no finding will be generated from blank values.' }, 502);
  }

  if (!openAIResponse.ok) {
    return json({ code: 'EXTRACTION_FAILED', message: 'The documents could not be extracted safely. Continue with manual verification.', upstreamStatus: openAIResponse.status }, 502);
  }

  let raw: Record<string, unknown>;
  try {
    raw = await openAIResponse.json() as Record<string, unknown>;
  } catch {
    return json({ code: 'INVALID_UPSTREAM_RESPONSE', message: 'The extraction service returned an unreadable response. Continue manually.' }, 502);
  }
  const text = outputText(raw);
  if (!text) return json({ code: 'EMPTY_EXTRACTION', message: 'No structured fields were returned. Continue manually.' }, 502);

  try {
    const extraction = validatedExtraction(JSON.parse(text));
    if (!extraction) return json({ code: 'INVALID_EXTRACTION', message: 'The extracted fields did not match the required safe structure.' }, 502);
    return json({ extraction, processing: 'OpenAI multimodal extraction', stored: false });
  } catch {
    return json({ code: 'INVALID_EXTRACTION', message: 'The extraction could not be verified as structured data.' }, 502);
  }
}

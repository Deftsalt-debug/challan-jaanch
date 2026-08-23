export const runtime = 'edge';

interface UploadPayload {
  name: string;
  type: string;
  data: string;
}

interface AnalyzePayload {
  documents?: UploadPayload[];
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
    return Response.json({ code: 'LIVE_EXTRACTION_NOT_CONFIGURED', message: 'Live extraction is not configured. Continue with the deterministic synthetic demo or enter the fields manually.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  let payload: AnalyzePayload;
  try {
    payload = await request.json() as AnalyzePayload;
  } catch {
    return Response.json({ code: 'BAD_REQUEST', message: 'The upload payload could not be read.' }, { status: 400 });
  }

  const documents = payload.documents?.slice(0, 3) ?? [];
  if (documents.length < 2) return Response.json({ code: 'MISSING_DOCUMENTS', message: 'Provide a challan and vehicle record.' }, { status: 400 });
  if (documents.some((file) => !file.data.startsWith('data:') || file.data.length > 14_000_000)) {
    return Response.json({ code: 'UNSUPPORTED_DOCUMENT', message: 'Use clear JPG, PNG or PDF files under 10 MB each.' }, { status: 413 });
  }

  const fileParts = documents.map((file) => file.type === 'application/pdf'
    ? { type: 'input_file', filename: file.name, file_data: file.data }
    : { type: 'input_image', image_url: file.data, detail: 'high' });

  const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
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
  });

  if (!openAIResponse.ok) {
    return Response.json({ code: 'EXTRACTION_FAILED', message: 'The documents could not be extracted safely. Continue with manual verification.', upstreamStatus: openAIResponse.status }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }

  const raw = await openAIResponse.json() as Record<string, unknown>;
  const text = outputText(raw);
  if (!text) return Response.json({ code: 'EMPTY_EXTRACTION', message: 'No structured fields were returned. Continue manually.' }, { status: 502 });

  try {
    return Response.json({ extraction: JSON.parse(text), processing: 'OpenAI multimodal extraction', stored: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ code: 'INVALID_EXTRACTION', message: 'The extraction could not be verified as structured data.' }, { status: 502 });
  }
}

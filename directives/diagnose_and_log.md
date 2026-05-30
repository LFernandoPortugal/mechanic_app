# Directive: Vehicle Symptom Analysis & AI Diagnosis

## Goal

Provide a structured AI-powered preliminary diagnosis for vehicle symptoms and log the job for the mechanic's records.

## Stack

- **AI Engine:** Google Gemini 2.0 Flash (via `@google/generative-ai`)
- **Entry Point:** `web/src/app/api/ai/diagnose/route.ts` (Next.js Server Route Handler)
- **Security:** API key is stored in `web/.env.local` as `GEMINI_API_KEY` (server-side only, no `NEXT_PUBLIC_` prefix)

## Inputs

- `symptoms` (string, required): Free-text or voice-transcribed description of what's wrong.
- `vehicleInfo` (string, optional): Make, Model, Year and plate of the vehicle.

## SOP (Standard Operating Procedure)

1. **Capture Symptoms:**
   - Technician types symptoms manually, OR
   - Technician uses the 🎙️ Voice button → `useSpeechRecognition` hook auto-fills the field.
2. **Send to AI Route:**
   - `POST /api/ai/diagnose` with `{ symptoms, vehicleInfo }`.
   - Route Handler calls Gemini with `generateContentStream`.
3. **Stream Response to UI:**
   - The technician sees tokens arriving in real time (typewriter effect).
   - Once stream ends, the client parses the accumulated JSON.
4. **Validate with Zod:**
   - Client validates the parsed JSON against `DiagnosisSchema` before saving.
5. **Save to Firestore:**
   - Validated result is appended to the Job's `inspectionItems` via `updateJob()`.

## AI Response Schema (JSON)

```json
{
  "diagnosis": "string — clear description of likely problem",
  "severity": "Crítico | Alto | Medio | Bajo",
  "confidence": "Alta | Media | Baja",
  "likelyCauses": ["string"],
  "recommendedParts": ["string"],
  "estimatedHours": 2.5,
  "safetyWarning": "string | null"
}
```

## Edge Cases

- **Vague symptoms** (e.g. "hace un ruido"): Gemini will return `confidence: "Baja"` and list multiple possible causes. The UI should prompt the technician to add more detail.
- **API Key missing:** Route returns HTTP 503 with a clear error message. UI shows a toast pointing to `.env.local`.
- **Gemini timeout / error:** The stream closes with `{ "error": "..." }`. UI shows an error state and allows retry.
- **Invalid JSON response:** Zod validation fails → UI shows raw text fallback (don't crash silently).
- **Safety critical issues** (brakes, steering): `safetyWarning` field will be non-null. UI should highlight it in red.

## Cost & Rate Limits

- Model: `gemini-2.0-flash` — low cost, fast, suitable for real-time streaming.
- Free tier: 15 RPM / 1M TPM. For a workshop doing ~20-50 diagnoses/day, free tier is sufficient.
- If hitting limits: consider request debouncing (min 500ms after user stops typing before calling API).

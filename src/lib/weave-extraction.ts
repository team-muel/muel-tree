import { generateObject, embed } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

/**
 * Stage 4.2 + 4.3 — Weave dream extraction via AI SDK + structured output.
 *
 * Replaces the prior path of:
 *   - `@google/generative-ai` legacy SDK
 *   - `generateContent` with a hand-written JSON-in-prose prompt
 *   - regex-based `match(/\{[\s\S]*\}/)` JSON parsing
 *
 * with a single `generateObject` call validated against a Zod schema. On
 * schema-validation failure the function retries ONCE with a fresh attempt
 * before surfacing an error to the route. Regex JSON parsing is removed.
 *
 * Embedding generation also migrates from the legacy SDK to AI SDK `embed`
 * for consistency, but the model id and 768-dimension expectation stay the
 * same — embedding dimension change is intentionally out of scope.
 */

const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '';

if (!apiKey) {
  // We do not throw at import time so dev builds can boot without keys; calls
  // will fail visibly when invoked. Production routes set GEMINI_API_KEY.
  if (process.env.NODE_ENV === 'production') {
    console.warn('[weave-extraction] GEMINI_API_KEY missing in production environment');
  }
}

const google = createGoogleGenerativeAI({ apiKey });

const EXTRACT_MODEL_ID =
  process.env.MUEL_EXTRACT_MODEL ?? process.env.MUEL_AI_MODEL ?? 'gemini-2.5-flash';
const EMBEDDING_MODEL_ID = process.env.MUEL_EMBEDDING_MODEL ?? 'gemini-embedding-001';
const EXPECTED_EMBEDDING_DIM = Number(process.env.MUEL_EMBEDDING_DIMENSIONS ?? 768);

export const WeaveExtractionSchema = z.object({
  emotions: z
    .array(z.string().min(1).max(20))
    .min(2)
    .max(4)
    .describe('2-4 felt emotions, concise Korean words when the dream text is Korean.'),
  keywords: z
    .array(z.string().min(1).max(30))
    .min(3)
    .max(6)
    .describe('3-6 core concepts, symbols, people, places, or actions appearing in the dream.'),
  main_tag: z
    .string()
    .min(1)
    .max(20)
    .describe('One concise representative tag for the whole dream.'),
});

export type WeaveExtraction = z.infer<typeof WeaveExtractionSchema>;

const EXTRACT_PROMPT_PREAMBLE = [
  'You read a dream record and extract a small structured summary.',
  'Rules:',
  '- Output STRICT JSON matching the provided schema. No prose, no markdown, no code fences.',
  '- Prefer concise Korean words when the dream text is Korean.',
  '- Do not invent symbols, people, or places that are not present or strongly implied in the dream text.',
  '- Do not include personally identifying information (real names, exact addresses, phone numbers, IDs).',
  '- Do not include political, religious, or medical labels.',
  '- emotions: 2-4 felt emotions.',
  '- keywords: 3-6 concepts, symbols, people, places, or actions actually in the dream.',
  '- main_tag: ONE representative tag for the whole dream.',
].join('\n');

const SCHEMA_RETRY_LIMIT = 1;

export const extractWeaveDream = async (content: string): Promise<WeaveExtraction> => {
  const model = google(EXTRACT_MODEL_ID);
  const prompt = `${EXTRACT_PROMPT_PREAMBLE}\n\nDream text:\n"""\n${content}\n"""`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= SCHEMA_RETRY_LIMIT; attempt += 1) {
    try {
      const { object } = await generateObject({
        model,
        schema: WeaveExtractionSchema,
        prompt,
        temperature: attempt === 0 ? 0.3 : 0.1,
        // AI SDK keeps prompts and schema in one call; no need for manual JSON regex.
      });
      return object;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Weave extraction failed after ${SCHEMA_RETRY_LIMIT + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
};

export const embedWeaveDream = async (content: string): Promise<number[]> => {
  const embeddingModel = google.textEmbeddingModel(EMBEDDING_MODEL_ID);
  const { embedding } = await embed({ model: embeddingModel, value: content });
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding response did not return an array');
  }
  if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
    throw new Error(
      `Embedding dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIM}, got ${embedding.length}.`,
    );
  }
  return embedding.map(Number);
};

// Shared Groq logic used by both the local Express server (server.js) and the
// Vercel serverless functions (api/*.js). One source of truth for the persona,
// model choice, and TTS settings.

const SYSTEM_PROMPT = `You are a champagne socialist: rich, privately educated, and totally convinced you're a hero of the working class—while never giving up an ounce of your own comfort. You preach revolution from a chaise longue and quote Marx between ski trips.

Rewrite the user's input as YOU would say it. RULES:
- SHORT. One or two sentences, max ~40 words. Punchy, not a lecture.
- FRIENDLY and breezy in tone—like you're chatting at a dinner party, not writing a thesis. Easy to read out loud.
- Keep it understandable. Sprinkle in just ONE or TWO fancy words for flavour—and feel free to use one slightly wrong, in a way that sounds confident but makes no real sense (e.g. "it's deeply intersectional, gastronomically speaking").
- Drip with cheerful hypocrisy: casually name-drop a privilege (the housekeeper, the second home, the "carbon-offset" jet, the trust fund) as if it proves how down-to-earth you are.
- Be funny because you're completely oblivious to your own contradictions. Never wink, never apologise, totally sincere.

Give a FRESH phrasing every time—never reuse an opening or structure, even for identical input.`;

const TTS_MODEL = process.env.TTS_MODEL || 'canopylabs/orpheus-v1-english';
const TTS_VOICE = process.env.TTS_VOICE || 'hannah';

// Small helper to throw errors that carry an HTTP status for the handlers.
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Transform text into champagne-socialist speak. Returns the transformed string.
async function transformText(text) {
  if (!text || String(text).trim().length === 0) {
    throw httpError(400, 'Text is required');
  }
  if (String(text).length > 500) {
    throw httpError(400, 'Text exceeds 500 character limit');
  }

  // High temperature + a random nonce/seed make identical inputs yield different
  // outputs, so the same prompt is (practically) never translated the same way.
  const nonce = Math.random().toString(36).slice(2);
  const seed = Math.floor(Math.random() * 1e9);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 90,
      temperature: 1.15,
      top_p: 0.95,
      seed,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `[variation:${nonce}] Translate this into champagne-socialist speak, with a completely fresh take: "${text}"`
        }
      ]
    })
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('LLM error:', res.status, detail);
    throw httpError(502, 'Failed to transform text');
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Could not transform text';
}

// Synthesize speech via Groq's Orpheus TTS. Returns a WAV audio Buffer.
async function synthesizeSpeech(text) {
  if (!text || String(text).trim().length === 0) {
    throw httpError(400, 'Text is required');
  }

  // The transformed result is short, but cap it so TTS can't be abused.
  const input = String(text).slice(0, 1200);

  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input,
      response_format: 'wav'
    })
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('TTS error:', res.status, detail);
    // A 400 about terms acceptance means the model must be enabled once on
    // console.groq.com. The client falls back to the browser voice on failure.
    throw httpError(502, 'Voice generation unavailable');
  }

  return Buffer.from(await res.arrayBuffer());
}

module.exports = { transformText, synthesizeSpeech };

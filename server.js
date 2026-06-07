require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/transform', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 500) {
      return res.status(400).json({ error: 'Text exceeds 500 character limit' });
    }

    const systemPrompt = `You are a champagne socialist: rich, privately educated, and totally convinced you're a hero of the working class—while never giving up an ounce of your own comfort. You preach revolution from a chaise longue and quote Marx between ski trips.

Rewrite the user's input as YOU would say it. RULES:
- SHORT. One or two sentences, max ~40 words. Punchy, not a lecture.
- FRIENDLY and breezy in tone—like you're chatting at a dinner party, not writing a thesis. Easy to read out loud.
- Keep it understandable. Sprinkle in just ONE or TWO fancy words for flavour—and feel free to use one slightly wrong, in a way that sounds confident but makes no real sense (e.g. "it's deeply intersectional, gastronomically speaking").
- Drip with cheerful hypocrisy: casually name-drop a privilege (the housekeeper, the second home, the "carbon-offset" jet, the trust fund) as if it proves how down-to-earth you are.
- Be funny because you're completely oblivious to your own contradictions. Never wink, never apologise, totally sincere.

Give a FRESH phrasing every time—never reuse an opening or structure, even for identical input.`;

    // High temperature + a random nonce make identical inputs yield different
    // outputs, so the same prompt is (practically) never translated the same way.
    const nonce = Math.random().toString(36).slice(2);
    const seed = Math.floor(Math.random() * 1e9);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 90,
      temperature: 1.15,
      top_p: 0.95,
      seed,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `[variation:${nonce}] Translate this into champagne-socialist speak, with a completely fresh take: "${text}"`
        }
      ]
    });

    const transformedText = completion.choices?.[0]?.message?.content?.trim()
      || 'Could not transform text';

    res.json({ transformed: transformedText });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to transform text' });
  }
});

// Text-to-speech via Groq's PlayAI neural voices (uses the same GROQ_API_KEY).
// Returns real WAV audio so the browser plays a human voice, not the robotic
// built-in speech synthesizer.
const TTS_MODEL = process.env.TTS_MODEL || 'canopylabs/orpheus-v1-english';
const TTS_VOICE = process.env.TTS_VOICE || 'hannah';

app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // The transformed result is short, but cap it so TTS can't be abused.
    const input = text.slice(0, 1200);

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/speech', {
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

    if (!groqRes.ok) {
      const detail = await groqRes.text();
      console.error('TTS error:', groqRes.status, detail);
      // 400 with "terms acceptance" means the model needs to be enabled once
      // on console.groq.com. Surface a clear message so the client can fall back.
      return res.status(502).json({ error: 'Voice generation unavailable', detail });
    }

    const audio = Buffer.from(await groqRes.arrayBuffer());
    res.set('Content-Type', 'audio/wav');
    res.send(audio);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

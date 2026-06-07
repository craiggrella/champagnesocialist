const { synthesizeSpeech } = require('../lib/groq');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const audio = await synthesizeSpeech(req.body?.text);
    res.setHeader('Content-Type', 'audio/wav');
    res.status(200).send(audio);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to generate speech' });
  }
};

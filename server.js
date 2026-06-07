require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { transformText, synthesizeSpeech } = require('./lib/groq');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/transform', async (req, res) => {
  try {
    const transformed = await transformText(req.body?.text);
    res.json({ transformed });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to transform text' });
  }
});

app.post('/api/speak', async (req, res) => {
  try {
    const audio = await synthesizeSpeech(req.body?.text);
    res.set('Content-Type', 'audio/wav');
    res.send(audio);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to generate speech' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const { transformText } = require('../lib/groq');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const transformed = await transformText(req.body?.text);
    res.status(200).json({ transformed });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to transform text' });
  }
};

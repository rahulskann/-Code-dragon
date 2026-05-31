// GET /api/voices-list
// Returns the account's ElevenLabs voices (used by the setup "TEST" button and
// the listVoices() console helper) without exposing the key to the browser.
module.exports = async (req, res) => {
  const key = process.env.ELEVEN_API_KEY;
  if (!key) { res.status(503).json({ error: 'ELEVEN_API_KEY not configured on the server' }); return; }

  try {
    const upstream = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': key },
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed', detail: String((e && e.message) || e) });
  }
};

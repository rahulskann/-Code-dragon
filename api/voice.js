// POST /api/voice
// Proxies an ElevenLabs text-to-speech call, injecting ELEVEN_API_KEY
// server-side, and streams the MP3 bytes back to the browser.
// Body: { voiceId, payload: { text, model_id, voice_settings } }
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = process.env.ELEVEN_API_KEY;
  if (!key) { res.status(503).json({ error: 'ELEVEN_API_KEY not configured on the server' }); return; }

  const body = await readJson(req);
  const voiceId = body && body.voiceId;
  if (!voiceId) { res.status(400).json({ error: 'voiceId required' }); return; }
  const ttsBody = (body && body.payload) || {};

  try {
    const upstream = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId),
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify(ttsBody),
      }
    );
    if (!upstream.ok) {
      const t = await upstream.text();
      res.status(upstream.status).json({ error: 'ElevenLabs HTTP ' + upstream.status, detail: t.slice(0, 500) });
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(200);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed', detail: String((e && e.message) || e) });
  }
};

function readJson(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') { try { resolve(JSON.parse(req.body)); } catch (e) { resolve({}); } }
      else resolve(req.body);
      return;
    }
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

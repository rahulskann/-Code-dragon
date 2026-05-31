// POST /api/gemini
// Proxies a Gemini generateContent call, injecting GEMINI_API_KEY server-side.
// The browser sends { model, payload } where `payload` is the exact Gemini
// request body (contents + generationConfig). We pass Gemini's JSON straight
// back, so the client parses it exactly as it would a direct call.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(503).json({ error: 'GEMINI_API_KEY not configured on the server' }); return; }

  const body = await readJson(req);
  const model = (body && body.model) || 'gemini-2.5-flash';
  const payload = (body && body.payload) || {};

  try {
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(model) + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload),
      }
    );
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed', detail: String((e && e.message) || e) });
  }
};

// Read + JSON-parse the request body across Vercel runtime variations.
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

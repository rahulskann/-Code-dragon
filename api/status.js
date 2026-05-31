// GET /api/status
// Lightweight probe so the front-end can detect that it's running on a server
// with keys configured (Vercel env vars). Never returns the keys themselves —
// only booleans saying whether each one is set.
module.exports = (req, res) => {
  res.status(200).json({
    backend: true,
    gemini: !!process.env.GEMINI_API_KEY,
    eleven: !!process.env.ELEVEN_API_KEY,
  });
};

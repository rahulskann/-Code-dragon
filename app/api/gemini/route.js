// app/api/gemini/route.js
// Proxies requests to Google Gemini using the server-side API key.
// The key in .env.local is NEVER sent to the browser.

export async function POST(req) {
  const { prompt, schema } = await req.json();

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.9,
        },
      }),
    }
  );

  const data = await res.json();
  return Response.json(data);
}

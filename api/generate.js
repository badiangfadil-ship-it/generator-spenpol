export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { systemPrompt, userQuery } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API Key belum dikonfigurasi di Vercel.' });

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(`Google API Error: ${response.status}`);
    
    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/```html/gi, '').replace(/```/g, '').trim();
    
    res.status(200).json({ result: text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
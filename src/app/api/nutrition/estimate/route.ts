import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash-lite';

export async function POST(req: NextRequest) {
  const { dishName } = await req.json();

  if (!dishName?.trim()) {
    return NextResponse.json({ error: 'dishName required' }, { status: 400 });
  }
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const prompt = `You are a certified nutritionist specializing in Indian cuisine. Estimate the nutritional value of "${dishName}" (Indian dish) per typical single serving, cooked at home with minimal oil and whole spices.

Return ONLY valid JSON — no markdown, no explanation, just the JSON object:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "fiber": number,
  "servingSize": "descriptive serving size string",
  "micros": [
    { "name": "string", "value": number, "unit": "mg or mcg or g", "rdv": number, "benefit": "one-line health benefit", "color": "#hexcolor" }
  ],
  "wholeSpices": ["spice name (indian name)", "..."],
  "benefits": ["health benefit string", "..."],
  "cookingTip": "one practical nutrition-maximizing cooking tip"
}

Rules:
- micros: include 3–5 key micronutrients most significant for this dish
- rdv: the full recommended daily value for that micronutrient (not percentage)
- wholeSpices: 3–5 whole spices (not powder), using both English and Hindi names
- benefits: 3–4 specific health benefits
- cookingTip: one actionable tip to maximize nutritional value
- colors for micros, choose from: #D67D61, #8BA88E, #A8C5DA, #C4A882, #F5C842`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!geminiRes.ok) {
    return NextResponse.json({ error: 'Gemini API error' }, { status: 502 });
  }

  const data = await geminiRes.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not parse nutrition data' }, { status: 500 });
  }

  try {
    const nutrition = JSON.parse(jsonMatch[0]);
    return NextResponse.json(nutrition);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from Gemini' }, { status: 500 });
  }
}

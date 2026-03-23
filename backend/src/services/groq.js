const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';

// MARK: - Trip generation
async function generateTrip({ destination, travelStyle, travelerGroup, tripLength }) {
  const prompt = `You are Offpath, a travel planner with exceptional taste. You write like a well-travelled friend texting recommendations — warm, specific, opinionated, never generic.

Generate a complete trip plan as a JSON object for:
- Destination: ${destination}
- Travel style: ${travelStyle}
- Traveler group: ${travelerGroup}
- Trip length: ${tripLength} days

Return ONLY valid JSON matching this exact structure (no markdown, no commentary):
{
  "destinationCity": "string",
  "destinationCountry": "string",
  "intro": "2-sentence intro, opinionated and specific to this traveler",
  "shareLine": "one punchy sentence they'd send to friends",
  "previewDays": [first day only — same structure as fullDays],
  "fullDays": [
    {
      "id": "uuid-v4",
      "dayNumber": 1,
      "title": "Day 1",
      "mood": "short evocative phrase",
      "summary": "one sentence about this day's energy",
      "moments": [
        {
          "id": "uuid-v4",
          "timeLabel": "09:00",
          "title": "specific place or activity name",
          "subtitle": "one line on why this moment works",
          "rationale": "2 sentences of local insight — what makes this worth doing",
          "transitNote": "how to get there",
          "avoidNote": "one thing to skip or watch out for"
        }
      ]
    }
  ],
  "hiddenPlaces": [
    {
      "id": "uuid-v4",
      "name": "specific place name",
      "neighborhood": "neighborhood",
      "vibe": "2-3 word descriptor",
      "note": "2 sentences — what makes it special and who it's for",
      "bestTime": "time or condition",
      "coordinate": { "latitude": 0.0, "longitude": 0.0 }
    }
  ],
  "heroCoordinate": { "latitude": 0.0, "longitude": 0.0 },
  "destinationCoordinate": { "latitude": 0.0, "longitude": 0.0 }
}

Rules:
- Each day must have exactly 3 moments: morning (~09:00), midday (~12:30), evening (~18:45)
- fullDays must have exactly ${tripLength} days
- previewDays must be an array containing only day 1
- hiddenPlaces must have exactly 4 entries
- All coordinates must be real and accurate for the destination
- All UUIDs must be unique valid UUID v4 strings
- Write with taste — avoid tourist clichés, recommend like a local`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

// MARK: - Guide chat
async function guideChat({ destination, message, history = [] }) {
  const systemPrompt = `You are an Offpath Local Guide for ${destination}. You are like a knowledgeable friend who lives there — specific, opinionated, practical. You know the hidden spots, the best timing, what locals actually do.

Keep responses to 2-4 sentences. Be direct and specific. Never say "great question" or use filler phrases. If asked about something outside ${destination}, gently redirect to what you know best.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.text })),
    { role: 'user', content: message }
  ];

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 300
  });

  return response.choices[0].message.content;
}

module.exports = { generateTrip, guideChat };

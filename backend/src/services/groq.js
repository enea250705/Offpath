const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// MARK: - Trip generation

async function generateTrip({ destination, travelStyle, travelerGroup, tripLength, venues }) {
  // Build a venue context block if Foursquare data is available.
  // This grounds Groq in real places instead of hallucinated ones.
  const venueBlock = buildVenueBlock(venues);

  const prompt = `You are Offpath — a travel planner with exceptional taste. You write like a well-travelled local friend texting recommendations: warm, specific, opinionated, never generic.

Generate a complete trip plan as a JSON object for:
- Destination: ${destination}
- Travel style: ${travelStyle}
- Traveler group: ${travelerGroup}
- Trip length: ${tripLength} days
${venueBlock}
Return ONLY valid JSON matching this exact structure (no markdown, no commentary):
{
  "destinationCity": "string — the city name only",
  "destinationCountry": "string — the country name only, e.g. Albania not Japan",
  "intro": "2-sentence intro, opinionated and specific to this city and traveler type",
  "shareLine": "one punchy sentence they would send to friends",
  "previewDays": [first day only — same structure as fullDays],
  "fullDays": [
    {
      "id": "uuid-v4",
      "dayNumber": 1,
      "title": "Day 1 — give it an evocative name, not just Day 1",
      "mood": "short evocative phrase capturing the day's feel",
      "summary": "one sentence about this day's energy",
      "moments": [
        {
          "id": "uuid-v4",
          "timeLabel": "09:00",
          "title": "REAL venue name from the list above (or a real known place if list is empty)",
          "subtitle": "one line on why this moment works",
          "rationale": "2 sentences of local insight — what makes this worth doing, told like a friend who knows",
          "transitNote": "how to get there from the previous stop",
          "avoidNote": "one specific thing to skip or watch out for at this place"
        }
      ]
    }
  ],
  "hiddenPlaces": [
    {
      "id": "uuid-v4",
      "name": "REAL venue name — ideally a cafe, bar, or viewpoint from the list",
      "neighborhood": "neighborhood name",
      "vibe": "2-3 word descriptor",
      "note": "2 sentences — what makes it special, written like insider knowledge",
      "bestTime": "specific time or condition",
      "coordinate": { "latitude": 0.0, "longitude": 0.0 }
    }
  ],
  "heroCoordinate": { "latitude": 0.0, "longitude": 0.0 },
  "destinationCoordinate": { "latitude": 0.0, "longitude": 0.0 }
}

Rules:
- destinationCountry MUST be the actual country for ${destination} — do not guess
- Each day must have exactly 3 moments: morning (~09:00), midday (~12:30), evening (~18:45)
- fullDays must have exactly ${tripLength} days
- previewDays must be an array containing only day 1
- hiddenPlaces must have exactly 4 entries
- All coordinates must be real GPS coordinates for ${destination}
- All UUIDs must be unique valid UUID v4 strings
- Prioritise the real venues provided above — write as if you personally know them
- Avoid tourist clichés, write with the confidence of someone who actually lives there`;

  const response = await groq.chat.completions.create({
    model:           MODEL,
    messages:        [{ role: 'user', content: prompt }],
    temperature:     0.75,
    max_tokens:      4096,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}

// Builds a formatted venue block to inject into the prompt.
// Only included when Foursquare returned results.
function buildVenueBlock(venues) {
  if (!venues) return '';

  const lines = [];

  const fmt = (list, label) => {
    if (!list || list.length === 0) return;
    lines.push(`\n${label}:`);
    list.forEach(v => {
      const loc = v.neighborhood ? ` (${v.neighborhood})` : '';
      lines.push(`  - ${v.name}${loc}`);
    });
  };

  fmt(venues.dining,    'RESTAURANTS & BARS — use for lunch and dinner moments');
  fmt(venues.cafes,     'CAFÉS — use for morning moments');
  fmt(venues.culture,   'CULTURE & ARTS — use for cultural moments');
  fmt(venues.landmarks, 'LANDMARKS & OUTDOORS — use for daytime exploration');
  fmt(venues.nightlife, 'NIGHTLIFE — use for evening moments');

  if (lines.length === 0) return '';

  return `
REAL VERIFIED VENUES FROM FOURSQUARE FOR ${venues.city || 'THIS DESTINATION'}:
Use these actual places in the itinerary. Write about them as if you know them personally.
${lines.join('\n')}

`;
}

// MARK: - Guide chat

async function guideChat({ destination, message, history = [] }) {
  const systemPrompt = `You are an Offpath Local Guide for ${destination}. You know the city like someone who has lived there for years — specific streets, real insider spots, best timing, what locals think about tourist traps.

Keep responses to 2-4 sentences. Be direct and specific. Never say "great question" or use filler phrases. If asked about something outside ${destination}, gently redirect to what you know best.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.text })),
    { role: 'user', content: message },
  ];

  const response = await groq.chat.completions.create({
    model:       MODEL,
    messages,
    temperature: 0.7,
    max_tokens:  300,
  });

  return response.choices[0].message.content;
}

module.exports = { generateTrip, guideChat };

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// MARK: - Trip generation (structure-first approach)
// The app pre-builds the itinerary skeleton with real Foursquare places.
// AI only writes the narrative text — it cannot change or hallucinate places.

async function generateTrip({ destination, travelStyle, travelerGroup, tripLength, organizedDays, hiddenPlaces, research }) {
  const skeletonBlock = buildSkeletonBlock(organizedDays);
  const hiddenBlock   = buildHiddenBlock(hiddenPlaces);
  const researchBlock = buildResearchBlock(research);

  const prompt = `You are Offpath — a travel planner with exceptional taste. You write like a well-travelled local friend texting recommendations: warm, specific, opinionated, never generic.

I have ALREADY chosen the real places for this trip using verified data. Your job is to write the TEXT FIELDS ONLY. Do NOT change any place names, coordinates, or structure.

Trip details:
- Destination: ${destination}
- Travel style: ${travelStyle}
- Traveler group: ${travelerGroup}
- Trip length: ${tripLength} days

HERE IS THE PRE-BUILT ITINERARY WITH REAL VERIFIED PLACES:
${skeletonBlock}
HERE ARE THE HIDDEN PLACES (also real, verified):
${hiddenBlock}
${researchBlock}
Return ONLY valid JSON matching this exact structure (no markdown, no commentary):
{
  "destinationCity": "${destination}",
  "destinationCountry": "REAL country name for ${destination}",
  "intro": "2-sentence intro, opinionated and specific to this city and traveler type",
  "shareLine": "one punchy sentence they would send to friends",
  "previewDays": [first day only — same structure as fullDays],
  "fullDays": [
    {
      "id": "uuid-v4",
      "dayNumber": 1,
      "title": "If dayNumber is 1, MUST be strictly 'Soft Landing at [Name of main airport for this city]'. For other days, give it an evocative name.",
      "mood": "short evocative phrase capturing the day's feel",
      "summary": "one sentence about this day's energy",
      "moments": [
        {
          "id": "uuid-v4",
          "timeLabel": "KEEP THE EXACT TIME FROM THE SKELETON",
          "title": "KEEP THE EXACT PLACE NAME FROM THE SKELETON — DO NOT CHANGE IT",
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
      "name": "KEEP THE EXACT NAME FROM HIDDEN PLACES LIST — DO NOT CHANGE IT",
      "neighborhood": "KEEP FROM THE LIST",
      "vibe": "2-3 word descriptor",
      "note": "2 sentences — what makes it special, written like insider knowledge",
      "bestTime": "specific time or condition",
      "coordinate": { "latitude": KEEP_FROM_LIST, "longitude": KEEP_FROM_LIST }
    }
  ],
  "heroCoordinate": { "latitude": 0.0, "longitude": 0.0 },
  "destinationCoordinate": { "latitude": 0.0, "longitude": 0.0 }
}

CRITICAL RULES:
- ALL place names in "title" fields MUST be EXACTLY the names from the skeleton above. Do NOT rename, rephrase, or substitute any place.
- ALL timeLabels MUST match the skeleton exactly.
- destinationCountry MUST be the actual country for ${destination}
- Each day must have exactly 3 moments matching the skeleton
- fullDays must have exactly ${tripLength} days
- previewDays must be an array containing only day 1
- hiddenPlaces must have exactly ${hiddenPlaces.length} entries with EXACT names from the list
- All coordinates for hidden places must use the EXACT values from the list
- heroCoordinate and destinationCoordinate must be real GPS coordinates for ${destination}
- All UUIDs must be unique valid UUID v4 strings`;

  const response = await groq.chat.completions.create({
    model:           MODEL,
    messages:        [{ role: 'user', content: prompt }],
    temperature:     0.65,
    max_tokens:      4096,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}

// Builds the skeleton block showing real places in their assigned slots
function buildSkeletonBlock(organizedDays) {
  const lines = [];
  organizedDays.forEach(day => {
    lines.push(`\nDAY ${day.dayNumber}:`);
    day.moments.forEach(m => {
      const p = m.place;
      const loc = p.neighborhood ? ` (${p.neighborhood})` : '';
      const cat = p.category ? ` [${p.category}]` : '';
      lines.push(`  ${m.timeLabel} — ${p.name}${loc}${cat}`);
      if (p.latitude && p.longitude) {
        lines.push(`    GPS: ${p.latitude}, ${p.longitude}`);
      }
    });
  });
  return lines.join('\n');
}

// Builds the hidden places block
function buildHiddenBlock(hiddenPlaces) {
  if (!hiddenPlaces || hiddenPlaces.length === 0) return '';
  const lines = ['\nHIDDEN PLACES (use EXACTLY these names and coordinates):'];
  hiddenPlaces.forEach(p => {
    const loc = p.neighborhood ? ` (${p.neighborhood})` : '';
    lines.push(`  - ${p.name}${loc} — GPS: ${p.latitude}, ${p.longitude}`);
  });
  return lines.join('\n');
}

// Formats Tavily research into a block the model can use to write
// specific, accurate rationale for each real place.
function buildResearchBlock(research) {
  if (!research || research.length === 0) return '';

  const lines = ['\nWEB RESEARCH ON THESE VENUES (use this to write the rationale):'];
  research.forEach(r => {
    lines.push(`\n"${r.venue}":`);
    lines.push(`  ${r.summary}`);
  });
  lines.push('\n');

  return lines.join('\n');
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

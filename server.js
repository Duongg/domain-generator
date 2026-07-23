// server.js
// Minimal Express backend for Phase 1: form -> AI name generation.
// No availability check, no affiliate redirect yet -- those come in Phase 2/3.

const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const DEMO_MODE = !ANTHROPIC_API_KEY;

if (DEMO_MODE) {
  console.warn('[demo mode] No ANTHROPIC_API_KEY found -- serving sample names instead of calling Claude.');
  console.warn('[demo mode] Copy .env.example to .env and add a real key to generate real names.');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Static sample pool used only when no API key is configured, so the UI/UX
// can be demoed without billing set up. Real usage always calls the API.
const MOCK_POOL = [
  { name: 'brightloop', style: 'brandable', suggested_tlds: ['com', 'io'], rationale: 'Evokes continuous positive momentum', insight: 'Perfect for subscription or SaaS products where recurring value and improvement cycles matter.', tags: ['Memorable', 'Tech-forward', 'Global-ready'] },
  { name: 'trailmarket', style: 'compound', suggested_tlds: ['com'], rationale: 'Literal, easy to remember for a marketplace', insight: 'Communicates discovery and commerce at once — ideal for niche or curated marketplaces.', tags: ['Easy to spell', 'Trustworthy', 'B2C fit'] },
  { name: 'nimbly', style: 'wordplay', suggested_tlds: ['com', 'co'], rationale: 'Plays on "nimble", suggests agility', insight: 'Signals speed and adaptability — resonates with teams or tools that cut through complexity.', tags: ['Memorable', 'B2B fit', 'Versatile'] },
  { name: 'corestack', style: 'compound', suggested_tlds: ['com', 'io'], rationale: 'Sounds technical and foundational', insight: 'Strong fit for infrastructure or developer tools where reliability is the core selling point.', tags: ['Tech-forward', 'B2B fit', 'Trustworthy'] },
  { name: 'vearo', style: 'brandable', suggested_tlds: ['com', 'io', 'co'], rationale: 'Short, invented, easy to say globally', insight: 'An invented name with no baggage — easy to trademark and builds brand recognition from zero.', tags: ['Global-ready', 'Unique', 'Memorable'] },
  { name: 'plainledger', style: 'literal', suggested_tlds: ['com'], rationale: 'Direct description, good for trust', insight: 'Signals radical transparency — great for fintech or accounting products targeting SMBs.', tags: ['Trustworthy', 'Easy to spell', 'B2B fit'] },
  { name: 'huddleup', style: 'wordplay', suggested_tlds: ['com', 'co'], rationale: 'Casual, team-oriented double meaning', insight: 'Works well for collaboration tools or team-building products where togetherness is the hook.', tags: ['Playful', 'Human-first', 'B2C fit'] },
  { name: 'fernway', style: 'brandable', suggested_tlds: ['com'], rationale: 'Natural, calm, evokes a path forward', insight: 'The organic feel suits wellness, sustainability, or lifestyle brands seeking a premium edge.', tags: ['Premium feel', 'Human-first', 'Memorable'] },
  { name: 'quicktally', style: 'compound', suggested_tlds: ['com', 'io'], rationale: 'Speed plus function, easy to parse', insight: 'Clearly positions a product that saves time — perfect for invoicing, scoring, or analytics tools.', tags: ['Easy to spell', 'B2B fit', 'Trustworthy'] },
  { name: 'oblio', style: 'brandable', suggested_tlds: ['com', 'io'], rationale: 'Short invented word, flexible branding', insight: 'Minimal and phonetically pleasing — adapts to any vertical while staying easy to remember.', tags: ['Global-ready', 'Unique', 'Versatile'] },
  { name: 'stackwell', style: 'compound', suggested_tlds: ['com'], rationale: 'Suggests solid, well-built infrastructure', insight: 'Appeals to builders and technical founders who want a name that signals craftsmanship.', tags: ['Tech-forward', 'B2B fit', 'Trustworthy'] },
  { name: 'tinkershop', style: 'literal', suggested_tlds: ['com', 'co'], rationale: 'Warm, maker-focused, easy to picture', insight: 'Evokes hands-on creativity — a natural fit for maker communities, DIY kits, or craft platforms.', tags: ['Playful', 'Human-first', 'B2C fit'] },
  { name: 'ravelin', style: 'brandable', suggested_tlds: ['com', 'io'], rationale: 'Invented, has a premium sound', insight: 'The sophisticated sound lends itself to fintech, security, or premium B2B software products.', tags: ['Premium feel', 'Unique', 'Global-ready'] },
  { name: 'clearpath360', style: 'wordplay', suggested_tlds: ['com'], rationale: 'Suggests full transparency and coverage', insight: 'Signals end-to-end visibility — ideal for analytics, compliance, or logistics platforms.', tags: ['Trustworthy', 'B2B fit', 'Easy to spell'] },
  { name: 'kindleworks', style: 'compound', suggested_tlds: ['com'], rationale: 'Warm verb plus function, approachable', insight: 'The warmth of "kindle" pairs well with education, non-profit, or community-driven platforms.', tags: ['Human-first', 'Memorable', 'B2C fit'] },
  { name: 'zolume', style: 'brandable', suggested_tlds: ['com', 'io'], rationale: 'Modern invented word, tech-friendly', insight: 'Feels native to the tech space — short, punchy, and easy to build a visual identity around.', tags: ['Tech-forward', 'Unique', 'Global-ready'] },
  { name: 'honestbatch', style: 'literal', suggested_tlds: ['com'], rationale: 'Trustworthy tone for a small-batch brand', insight: 'The "honest" modifier builds immediate trust — strong for food, cosmetics, or ethical sourcing brands.', tags: ['Trustworthy', 'B2C fit', 'Local feel'] },
  { name: 'pivotloft', style: 'compound', suggested_tlds: ['com', 'co'], rationale: 'Suggests flexible, creative workspace', insight: 'Resonates with startups or consultancies that position themselves as agile and idea-driven.', tags: ['Versatile', 'B2B fit', 'Memorable'] },
  { name: 'wrenfield', style: 'brandable', suggested_tlds: ['com'], rationale: 'Approachable, slightly rustic brand feel', insight: 'The countryside warmth works for farm-to-table, outdoor, or slow-living lifestyle products.', tags: ['Human-first', 'Local feel', 'Premium feel'] },
  { name: 'snaplane', style: 'wordplay', suggested_tlds: ['com', 'io'], rationale: 'Quick action plus a clear direction', insight: 'Implies decisiveness and momentum — a good fit for productivity apps or workflow automation tools.', tags: ['Tech-forward', 'Memorable', 'B2B fit'] },
];

function getMockCandidates(count) {
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const base = MOCK_POOL[i % MOCK_POOL.length];
    // Append a suffix on repeat cycles so names stay unique past 20 items.
    const cycle = Math.floor(i / MOCK_POOL.length);
    result.push({
      ...base,
      name: cycle === 0 ? base.name : `${base.name}${cycle + 1}`,
    });
  }
  return result;
}

const CATEGORY_SYSTEM_PROMPT = `You are a business analyst. Given a business idea or description, identify the 3 most relevant industry categories.
Return ONLY valid JSON — no markdown, no preamble, no code fences.
Return a JSON array of exactly 3 objects, each with:
- "name": concise category label (2–5 words), e.g. "B2B SaaS", "Consumer HealthTech", "EdTech Platform"
- "description": one sentence (max 15 words) explaining what kinds of businesses fit this category
- "icon": a single relevant emoji

Order by relevance, most relevant first.`;

const SYSTEM_PROMPT = `You are a domain naming expert. Given a business idea, generate name candidates with tailored insights. Return ONLY valid JSON — no markdown, no preamble, no code fences.

Return a JSON array. Each item has:
- "name": the base name (no TLD), lowercase, no spaces
- "style": one of "literal", "brandable", "compound", "wordplay"
- "suggested_tlds": array of 2-3 TLD strings ranked by fit, e.g. ["com", "io", "co"]
- "rationale": one sentence, max 12 words, describing the name's meaning
- "insight": one sentence (max 20 words) explaining specifically why this name fits the user's described business — reference their actual product or audience
- "tags": array of exactly 3 short labels characterising this name, chosen from: "Easy to spell", "Hard to spell", "Memorable", "Global-ready", "Local feel", "Tech-forward", "Human-first", "B2B fit", "B2C fit", "Premium feel", "Playful", "Trustworthy", "Unique", "Versatile"

Rules:
- No trademarked or real brand names
- No offensive, confusing, or hard-to-spell names
- Mix styles: at least 30% brandable/invented words
- Keep base names under 15 characters where possible
- Never invent names that are homophones of existing well-known brands
- Make "insight" specific to the business idea — do not write generic copy`;

app.post('/api/suggest-categories', async (req, res) => {
  const { description } = req.body || {};
  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    return res.status(400).json({ error: 'Please provide a business description.' });
  }

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 600));
    return res.json({
      categories: [
        { name: 'SaaS / Productivity', description: 'Software tools that help teams work more efficiently online.', icon: '💼' },
        { name: 'Consumer App', description: 'Mobile or web apps built for everyday end users.', icon: '📱' },
        { name: 'E-commerce', description: 'Online retail platforms for buying and selling products.', icon: '🛒' },
      ],
      demoMode: true,
    });
  }

  const userPrompt = `Business idea: ${description.trim()}\n\nSuggest the 3 best-fit industry categories as a JSON array.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: CATEGORY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error (categories):', response.status, errText);
      return res.status(502).json({ error: 'Category suggestion failed. Try again.' });
    }

    const data = await response.json();
    const textBlock = data.content.find((c) => c.type === 'text');
    if (!textBlock) return res.status(502).json({ error: 'Unexpected response from model.' });

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    let categories;
    try {
      categories = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: 'Could not parse category suggestions.' });
    }

    const safe = (Array.isArray(categories) ? categories : [])
      .filter((c) => c && typeof c.name === 'string' && c.name.length > 0)
      .slice(0, 3)
      .map((c) => ({
        name: String(c.name).slice(0, 60),
        description: typeof c.description === 'string' ? c.description.slice(0, 150) : '',
        icon: typeof c.icon === 'string' ? c.icon.slice(0, 4) : '🏢',
      }));

    res.json({ categories: safe });
  } catch (err) {
    console.error('Category suggestion error:', err);
    res.status(500).json({ error: 'Something went wrong suggesting categories.' });
  }
});

app.post('/api/generate-names', async (req, res) => {
  const { description, tone, exclude, count, category } = req.body || {};

  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    return res.status(400).json({ error: 'Please provide a business description (at least a few words).' });
  }

  const safeCount = Math.min(Math.max(parseInt(count, 10) || 50, 5), 60);

  if (DEMO_MODE) {
    // Simulate a little latency so the loading state in the UI still makes sense.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return res.json({ candidates: getMockCandidates(safeCount), demoMode: true });
  }

  const userPrompt = [
    `Business idea: ${description.trim()}`,
    category ? `Industry category: ${category}` : null,
    `Tone: ${tone || 'professional'}`,
    exclude ? `Must avoid words: ${exclude}` : null,
    `Generate ${safeCount} candidates as a JSON array.`,
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.min(8192, safeCount * 150 + 500),
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: 'Name generation service failed. Try again in a moment.' });
    }

    const data = await response.json();
    const textBlock = data.content.find((c) => c.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'Unexpected response from the model.' });
    }

    // Defensive cleanup in case the model wraps output in code fences despite instructions.
    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();

    let candidates;
    try {
      candidates = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse model output as JSON:', cleaned);
      return res.status(502).json({ error: 'Could not parse name suggestions. Try again.' });
    }

    // Basic shape validation -- don't trust the model blindly.
    const VALID_TAGS = new Set(['Easy to spell','Hard to spell','Memorable','Global-ready','Local feel','Tech-forward','Human-first','B2B fit','B2C fit','Premium feel','Playful','Trustworthy','Unique','Versatile']);
    const safeCandidates = (Array.isArray(candidates) ? candidates : [])
      .filter((c) => c && typeof c.name === 'string' && c.name.length > 0)
      .map((c) => ({
        name: c.name.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        style: ['literal', 'brandable', 'compound', 'wordplay'].includes(c.style) ? c.style : 'literal',
        suggested_tlds: Array.isArray(c.suggested_tlds) ? c.suggested_tlds.slice(0, 3) : ['com'],
        rationale: typeof c.rationale === 'string' ? c.rationale : '',
        insight: typeof c.insight === 'string' ? c.insight.slice(0, 200) : '',
        tags: Array.isArray(c.tags) ? c.tags.filter((t) => typeof t === 'string' && VALID_TAGS.has(t)).slice(0, 3) : [],
      }));

    res.json({ candidates: safeCandidates, demoMode: false });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong generating names.' });
  }
});

// --- Phase 2: domain availability check ---
// RDAP returns 404 when a domain is NOT registered (available),
// 200 when it IS registered (taken). Anything else is "unknown".
// TLDs without a known RDAP endpoint return null (unknown) immediately.
const RDAP_CONCURRENCY = 8;

const RDAP_SERVERS = {
  com: 'https://rdap.verisign.com/com/v1/domain/',
  net: 'https://rdap.verisign.com/net/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
  app: 'https://www.registry.google/rdap/domain/',
  dev: 'https://www.registry.google/rdap/domain/',
};

const ALLOWED_TLDS = new Set(['com', 'net', 'org', 'app', 'dev', 'io', 'co', 'ai']);

async function checkOneDomain(name, tld) {
  const base = RDAP_SERVERS[tld];
  if (!base) return { name, tld, available: null }; // no RDAP for this TLD

  const domain = `${name}.${tld}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(`${base}${domain}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.status === 404) return { name, tld, available: true };
    if (resp.status === 200) return { name, tld, available: false };
    return { name, tld, available: null };
  } catch {
    clearTimeout(timer);
    return { name, tld, available: null };
  }
}

async function checkDomainsBatched(names, tlds) {
  const tasks = names.flatMap((name) => tlds.map((tld) => ({ name, tld })));
  const results = [];
  for (let i = 0; i < tasks.length; i += RDAP_CONCURRENCY) {
    const batch = tasks.slice(i, i + RDAP_CONCURRENCY);
    const batchResults = await Promise.all(batch.map(({ name, tld }) => checkOneDomain(name, tld)));
    results.push(...batchResults);
  }
  return results;
}

app.post('/api/check-availability', async (req, res) => {
  const { names, tlds } = req.body || {};
  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: 'Provide a non-empty array of names.' });
  }
  const safeNames = names
    .filter((n) => typeof n === 'string')
    .map((n) => n.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 60);

  const safeTlds = (Array.isArray(tlds) ? tlds : ['com'])
    .filter((t) => typeof t === 'string' && ALLOWED_TLDS.has(t))
    .slice(0, 6);
  if (safeTlds.length === 0) safeTlds.push('com');

  try {
    const results = await checkDomainsBatched(safeNames, safeTlds);
    res.json({ results });
  } catch (err) {
    console.error('Availability check error:', err);
    res.status(500).json({ error: 'Availability check failed.' });
  }
});

// --- Phase 3 (partial): click logging ---
// Real CJ affiliate link IDs get wired in once the GoDaddy/CJ application is
// approved (see Phase 5 of the roadmap). Until then this logs intent locally
// so the click-tracking pipeline is already in place.
const fs = require('fs');
const CLICK_LOG_PATH = path.join(__dirname, 'clicks.log');

app.post('/api/log-click', (req, res) => {
  const { name, tld } = req.body || {};
  if (!name || !tld) {
    return res.status(400).json({ error: 'name and tld are required.' });
  }
  const entry = {
    name,
    tld,
    clicked_at: new Date().toISOString(),
  };
  fs.appendFile(CLICK_LOG_PATH, JSON.stringify(entry) + '\n', (err) => {
    if (err) console.error('Failed to write click log:', err);
  });
  res.json({ logged: true });
});

app.listen(PORT, () => {
  console.log(`Domain namer running at http://localhost:${PORT}`);
});

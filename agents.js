/**
 * agents.js
 * Defines the three autonomous agents and handles OpenRouter API calls.
 * Model: minimax/minimax-m1 via OpenRouter
 */

const MODEL   = 'minimax/minimax-m2.7';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ── Agent system prompts ──────────────────────────────────────────

const EDITOR_PLAN_PROMPT = `You are the Editor of an AI-powered news desk. Your job is to receive a topic and produce a structured editorial plan.

Respond in EXACTLY this format (no extra text before or after):

HEADLINE: <a compelling one-sentence headline for the article>
RESEARCH BRIEF:
- <specific fact, statistic, or angle to research — include scope and what to find>
- <another specific research point>
- <another specific research point>
- <another specific research point>
STYLE NOTE: <1-2 sentences on tone, structure, and voice for the Writer>

The headline should be punchy and journalistic. The research brief points should be concrete — not vague ("find facts about X") but specific ("find the most recent GDP growth figures and leading economists' forecasts for 2025").`;

const RESEARCHER_PROMPT = `You are the Researcher on an AI news desk. You receive an editorial research brief and produce a structured set of findings.

Your findings should be specific, factual, and directly useful to a journalist. Include numbers, percentages, dates, names, and places wherever possible. If you do not know a specific figure, provide the best relevant context you can.

Begin your response with the word FINDINGS: on its own line, then list each finding starting with a dash (-). Aim for 5-7 findings. Be concise but informative.`;

const WRITER_PROMPT = `You are the Writer on an AI news desk. You receive research findings and a style note from the Editor, and you write a polished 3-paragraph news article.

Structure:
- Paragraph 1 (Lede): Hook the reader with the most important or surprising angle. One strong, declarative opening sentence.
- Paragraph 2 (Body): Flesh out the story with supporting facts, context, and detail from the research.
- Paragraph 3 (Outlook): Broader implications, what comes next, or a closing perspective.

Write only the three paragraphs — no headline, no byline, no section labels. Separate paragraphs with a blank line. Write in a clear, authoritative, slightly literary journalistic voice.`;

// ── Core API call ─────────────────────────────────────────────────

async function callAgent(systemPrompt, userMessage, apiKey) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'AI News Desk Demo'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage   }
      ]
    })
  });

  if (!response.ok) {
    let errText = '';
    try { errText = await response.text(); } catch {}
    throw new Error(`API ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from model.');
  return content;
}

// ── Agent runners ─────────────────────────────────────────────────

async function runEditorPlan(topic, apiKey) {
  return callAgent(
    EDITOR_PLAN_PROMPT,
    `The topic is: ${topic}`
  , apiKey);
}

async function runResearcher(topic, researchBrief, apiKey) {
  return callAgent(
    RESEARCHER_PROMPT,
    `Topic: ${topic}\n\nResearch brief:\n${researchBrief}`
  , apiKey);
}

async function runWriter(headline, findings, styleNote, apiKey) {
  return callAgent(
    WRITER_PROMPT,
    `Headline: ${headline}\n\nResearch findings:\n${findings}\n\nStyle note: ${styleNote}`
  , apiKey);
}

// ── Plan parser ───────────────────────────────────────────────────

function parseEditorPlan(raw) {
  const headlineMatch = raw.match(/HEADLINE:\s*(.+)/i);
  const briefMatch    = raw.match(/RESEARCH BRIEF:([\s\S]*?)(?:STYLE NOTE:|$)/i);
  const styleMatch    = raw.match(/STYLE NOTE:\s*([\s\S]+)/i);

  return {
    headline:      headlineMatch ? headlineMatch[1].trim()  : 'Breaking News',
    researchBrief: briefMatch    ? briefMatch[1].trim()     : raw,
    styleNote:     styleMatch    ? styleMatch[1].trim()     : 'Clear, factual, and engaging.'
  };
}

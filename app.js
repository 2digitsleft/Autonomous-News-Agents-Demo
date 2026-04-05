/**
 * app.js
 * UI orchestration for the AI News Desk demo.
 * Controls agent card states, logging, and the full demo run flow.
 */

// ── UI helpers ────────────────────────────────────────────────────

function setLiveDate() {
  const el = document.getElementById('live-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function setTopic(t) {
  document.getElementById('topic-input').value = t;
}

function toggleKey() {
  const inp = document.getElementById('api-key');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function setStatus(msg, cls = '') {
  const el = document.getElementById('status-pill');
  el.textContent = msg;
  el.className = `status-pill ${cls}`;
}

function setDot(agent, state = '') {
  const dot  = document.getElementById(`dot-${agent}`);
  const card = document.getElementById(`card-${agent}`);
  dot.className  = `agent-indicator ${state}`;
  card.className = `agent-card ${state === 'active' ? 'active' : ''}`;
}

function clearLog(agent) {
  document.getElementById(`log-${agent}`).innerHTML = '';
}

function appendLog(agent, text, type = 'message') {
  const log   = document.getElementById(`log-${agent}`);
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = text;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function setRunning(isRunning) {
  const btn     = document.getElementById('run-btn');
  const label   = document.getElementById('run-label');
  const spinner = document.getElementById('run-spinner');
  btn.disabled = isRunning;
  label.textContent = isRunning ? 'Running...' : 'Run the Newsroom';
  spinner.classList.toggle('hidden', !isRunning);
}

function resetUI() {
  ['editor', 'researcher', 'writer'].forEach(a => {
    clearLog(a);
    setDot(a, '');
  });
  document.getElementById('output-article').classList.add('hidden');
  document.getElementById('output-headline').textContent = '';
  document.getElementById('output-body').textContent     = '';
}

function showArticle(headline, body) {
  const article = document.getElementById('output-article');
  document.getElementById('output-headline').textContent = headline;
  document.getElementById('output-body').textContent     = body;
  document.getElementById('output-time').textContent     = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit'
  });
  article.classList.remove('hidden');
  article.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Main demo flow ────────────────────────────────────────────────

async function runDemo() {
  const topic  = document.getElementById('topic-input').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();

  if (!apiKey) {
    setStatus('Please enter your OpenRouter API key.', 'error');
    return;
  }
  if (!topic) {
    setStatus('Please enter a topic.', 'error');
    return;
  }

  resetUI();
  setRunning(true);

  try {
    // ── Step 1: Editor plans ──────────────────────────────────────
    setStatus('Step 1 of 3 — Editor is planning the briefing...', 'running');
    setDot('editor', 'active');
    appendLog('editor', `Topic received: "${topic}"`, 'system');
    appendLog('editor', 'Analysing scope and writing editorial plan...', 'system');

    const rawPlan = await runEditorPlan(topic, apiKey);
    const { headline, researchBrief, styleNote } = parseEditorPlan(rawPlan);

    appendLog('editor', `Headline locked: "${headline}"`, 'success');
    appendLog('editor', 'Research brief:', 'task');
    researchBrief.split('\n')
      .map(l => l.trim()).filter(Boolean)
      .forEach(l => appendLog('editor', l, 'tool'));
    appendLog('editor', `Style note: ${styleNote}`, 'message');
    appendLog('editor', 'Delegating to Researcher...', 'system');
    setDot('editor', 'done');

    // ── Step 2: Researcher gathers ────────────────────────────────
    setStatus('Step 2 of 3 — Researcher is gathering information...', 'running');
    setDot('researcher', 'active');
    appendLog('researcher', 'Brief received from Editor.', 'system');
    appendLog('researcher', 'Compiling facts, figures, and context...', 'system');

    const rawFindings = await runResearcher(topic, researchBrief, apiKey);
    const findings = rawFindings.replace(/^FINDINGS:/im, '').trim();

    findings.split('\n')
      .map(l => l.trim()).filter(Boolean)
      .forEach(l => appendLog('researcher', l, 'message'));

    appendLog('researcher', 'Research complete. Handing to Writer.', 'success');
    setDot('researcher', 'done');

    // ── Step 3: Writer drafts article ─────────────────────────────
    setStatus('Step 3 of 3 — Writer is drafting the article...', 'running');
    setDot('writer', 'active');
    appendLog('writer', 'Research findings received.', 'system');
    appendLog('writer', `Style: ${styleNote}`, 'tool');
    appendLog('writer', 'Drafting article...', 'system');

    const article = await runWriter(headline, findings, styleNote, apiKey);

    appendLog('writer', 'Draft complete. Sending to Editor.', 'success');
    setDot('writer', 'done');

    // ── Step 4: Editor assembles ──────────────────────────────────
    setDot('editor', 'active');
    appendLog('editor', 'Article received from Writer.', 'system');
    appendLog('editor', 'Assembling final briefing...', 'system');
    appendLog('editor', 'Published.', 'success');
    setDot('editor', 'done');

    showArticle(headline, article.trim());
    setStatus('Briefing published — all three agents finished.', 'done');

  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`, 'error');
    ['editor', 'researcher', 'writer'].forEach(a => setDot(a, 'error'));
    appendLog('editor', `Error: ${err.message}`, 'task');
  }

  setRunning(false);
}

// ── Init ──────────────────────────────────────────────────────────
setLiveDate();

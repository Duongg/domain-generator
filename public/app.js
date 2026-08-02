// ---------- GoDaddy registrar ----------

const GODADDY = {
  searchUrl: (d) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(d)}`,
};

// ---------- Icons ----------

const ICONS = {
  edit: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  checkCircle: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  xCircle: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  helpCircle: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4"/><path d="M12 17h.01"/></svg>',
  externalLink: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>',
  alertCircle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
  close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  bookmarkOutline: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
  bookmarkFilled: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
  shield: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
};

// ---------- Wizard state ----------

const TOTAL_STEPS = 4;

const state = {
  description: '',
  tone: 'professional',
  exclude: '',
  category: '',
  selectedTlds: ['com'],
  candidates: [],
  availability: {},
  selectedName: null,
  selectedTld: 'com',
  savedDomains: [],
  sortMode: 'availability', // 'availability' | 'score'
  step: 1, // furthest step reached: 1 (describing) .. 4 (choosing)
};

// ---------- Wizard progress persistence (survives page refresh) ----------
// Session-scoped on purpose: this is an in-progress draft, not a permanent
// record like saved bookmarks (those use localStorage, see below), so it
// naturally clears when the browser tab/session ends.

const WIZARD_STATE_KEY = 'typingname_wizard_state';

function persistWizardState() {
  try {
    sessionStorage.setItem(WIZARD_STATE_KEY, JSON.stringify({
      description: state.description,
      tone: state.tone,
      exclude: state.exclude,
      category: state.category,
      selectedTlds: state.selectedTlds,
      candidates: state.candidates,
      availability: state.availability,
      sortMode: state.sortMode,
      step: state.step,
    }));
  } catch {}
}

function loadWizardState() {
  try {
    const raw = sessionStorage.getItem(WIZARD_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearWizardState() {
  try {
    sessionStorage.removeItem(WIZARD_STATE_KEY);
  } catch {}
}

// ---------- Saved domains (bookmark) ----------

const SAVED_DOMAINS_KEY = 'typingname_saved_domains';

function loadSavedDomains() {
  try {
    const raw = localStorage.getItem(SAVED_DOMAINS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedDomains() {
  try {
    localStorage.setItem(SAVED_DOMAINS_KEY, JSON.stringify(state.savedDomains));
  } catch {}
}

function isDomainSaved(name) {
  return state.savedDomains.some((d) => d.name === name);
}

function toggleSavedDomain(name, tld, brandScore) {
  const idx = state.savedDomains.findIndex((d) => d.name === name);
  if (idx >= 0) {
    state.savedDomains.splice(idx, 1);
  } else {
    state.savedDomains.push({ name, tld, brand_score: brandScore || null });
  }
  persistSavedDomains();
  updateSavedFab();
  renderSavedPanel();
  syncSaveButtons();
}

function removeSavedDomain(name) {
  const idx = state.savedDomains.findIndex((d) => d.name === name);
  if (idx < 0) return;
  state.savedDomains.splice(idx, 1);
  persistSavedDomains();
  updateSavedFab();
  renderSavedPanel();
  syncSaveButtons();
}

function syncSaveButtons() {
  document.querySelectorAll('.save-btn').forEach((btn) => {
    const saved = isDomainSaved(btn.dataset.name);
    btn.classList.toggle('is-saved', saved);
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    btn.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${btn.dataset.name}`);
    btn.innerHTML = saved ? ICONS.bookmarkFilled : ICONS.bookmarkOutline;
  });
}

function updateSavedFab() {
  const fab = document.getElementById('saved-fab');
  const badge = document.getElementById('saved-fab-badge');
  const count = state.savedDomains.length;
  fab.classList.toggle('has-items', count > 0);
  if (count > 0) {
    badge.hidden = false;
    badge.textContent = count > 99 ? '99+' : String(count);
  } else {
    badge.hidden = true;
  }
}

function renderSavedPanel() {
  const body = document.getElementById('saved-panel-body');
  body.innerHTML = '';

  if (state.savedDomains.length === 0) {
    body.innerHTML = `
      <div class="saved-panel-empty">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        <span>No domains saved yet.<br>Tap the bookmark on any name to save it here.</span>
      </div>
    `;
    return;
  }

  state.savedDomains.forEach((d) => {
    const domain = `${d.name}.${d.tld}`;
    const item = document.createElement('div');
    item.className = 'saved-item';
    item.innerHTML = `
      <div class="saved-item-row">
        <div class="saved-item-info">
          <span class="saved-item-name">${escapeHtml(d.name)}<span class="saved-item-tld">.${escapeHtml(d.tld)}</span></span>
        </div>
        <div class="saved-item-actions">
          ${renderScoreBadge(d.brand_score)}
          <a class="saved-item-register" href="${GODADDY.searchUrl(domain)}" target="_blank" rel="noopener noreferrer">Register ${ICONS.externalLink}</a>
          <button type="button" class="saved-item-remove" data-remove="${escapeHtml(d.name)}" aria-label="Remove ${escapeHtml(d.name)} from saved">${ICONS.close}</button>
        </div>
      </div>
      ${d.brand_score ? renderScoreBreakdown(d.brand_score) : ''}
    `;
    body.appendChild(item);
  });
}

function openSavedPanel() {
  renderSavedPanel();
  document.getElementById('saved-panel').hidden = false;
  document.getElementById('saved-panel-backdrop').hidden = false;
  document.getElementById('saved-fab').setAttribute('aria-expanded', 'true');
}

function closeSavedPanel() {
  document.getElementById('saved-panel').hidden = true;
  document.getElementById('saved-panel-backdrop').hidden = true;
  document.getElementById('saved-fab').setAttribute('aria-expanded', 'false');
}

state.savedDomains = loadSavedDomains();

document.getElementById('saved-fab').addEventListener('click', () => {
  if (document.getElementById('saved-panel').hidden) openSavedPanel();
  else closeSavedPanel();
});
document.getElementById('saved-panel-close').addEventListener('click', closeSavedPanel);
document.getElementById('saved-panel-backdrop').addEventListener('click', closeSavedPanel);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('saved-panel').hidden) closeSavedPanel();
  if (!document.getElementById('risk-panel').hidden) closeRiskPanel();
});
document.getElementById('saved-panel-body').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove]');
  if (btn) removeSavedDomain(btn.dataset.remove);
});

updateSavedFab();

// ---------- Brand risk check (trademark / social handle deep links) ----------
// Not a live check — USPTO doesn't offer a free API and scraping social
// platforms for handle availability would violate their ToS, so this just
// hands the user fast, correct links to check for themselves.

function riskLinksFor(name) {
  return [
    {
      title: 'Trademark search (USPTO)',
      sub: 'Opens the search tool — paste the name in',
      url: 'https://tmsearch.uspto.gov/search/search-information',
      copy: name,
    },
    { title: 'X / Twitter', sub: `x.com/${name}`, url: `https://x.com/${name}` },
    { title: 'Instagram', sub: `instagram.com/${name}`, url: `https://www.instagram.com/${name}/` },
    { title: 'TikTok', sub: `tiktok.com/@${name}`, url: `https://www.tiktok.com/@${name}` },
  ];
}

function openRiskPanel(name) {
  document.getElementById('risk-panel-name').textContent = `"${name}"`;

  const body = document.getElementById('risk-panel-body');
  body.innerHTML = riskLinksFor(name).map((link) => `
    <div class="risk-link-row">
      <div class="risk-link-info">
        <span class="risk-link-title">${escapeHtml(link.title)}</span>
        <span class="risk-link-sub">${escapeHtml(link.sub)}</span>
      </div>
      <div class="risk-link-actions">
        ${link.copy ? `<button type="button" class="risk-copy-btn" data-copy="${escapeHtml(link.copy)}">Copy name</button>` : ''}
        <a class="risk-link-open" href="${link.url}" target="_blank" rel="noopener noreferrer">Open ${ICONS.externalLink}</a>
      </div>
    </div>
  `).join('');

  document.getElementById('risk-panel-backdrop').hidden = false;
  document.getElementById('risk-panel').hidden = false;
}

function closeRiskPanel() {
  document.getElementById('risk-panel').hidden = true;
  document.getElementById('risk-panel-backdrop').hidden = true;
}

document.getElementById('risk-panel-close').addEventListener('click', closeRiskPanel);
document.getElementById('risk-panel-backdrop').addEventListener('click', closeRiskPanel);

document.getElementById('risk-panel-body').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    const original = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('is-copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-copied');
    }, 1500);
  } catch {}
});

// ---------- Step control helpers ----------

function setStepState(stepNum, status) {
  const step = document.querySelector(`.step[data-step="${stepNum}"]`);
  step.classList.remove('is-pending', 'is-active', 'is-done', 'is-editing');
  step.classList.add(`is-${status}`);
  if (status === 'active') updateOverallProgress(stepNum);
}

function setSummary(stepNum, html) {
  const step = document.querySelector(`.step[data-step="${stepNum}"]`);
  step.querySelector('.step-summary-text').innerHTML = html;
}

function updateOverallProgress(activeStep) {
  const pct = Math.round(((activeStep - 1) / TOTAL_STEPS) * 100);
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-label').textContent = `Step ${activeStep} of ${TOTAL_STEPS}`;
}

function markAllDoneProgress() {
  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('progress-label').textContent = 'Done';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function resetStepsFrom(n) {
  for (let i = n; i <= TOTAL_STEPS; i += 1) {
    setStepState(i, 'pending');
    setSummary(i, '');
    if (i === 2) {
      document.getElementById('generate-progress').classList.remove('is-error');
      document.getElementById('generate-progress').innerHTML =
        '<div class="spinner"></div><span class="progress-text">Crafting names around your idea…</span>';
    }
    if (i === 3) {
      const progress = document.getElementById('availability-progress');
      progress.hidden = true;
      progress.classList.remove('is-error');
      progress.innerHTML = '<div class="spinner"></div><span class="progress-text">Checking availability…</span>';
      document.querySelector('.step[data-step="3"] .step-help').textContent =
        'Select the extensions to check — .com is always included.';
    }
    if (i === 4) {
      document.getElementById('results').innerHTML = '';
    }
  }
}

function showBlockError(blockId, message, retryFn) {
  const block = document.getElementById(blockId);
  block.classList.add('is-error');
  block.innerHTML = `
    ${ICONS.alertCircle}
    <span class="progress-text">${escapeHtml(message)}</span>
    <button type="button" class="btn-secondary" id="${blockId}-retry">Retry</button>
  `;
  document.getElementById(`${blockId}-retry`).addEventListener('click', retryFn);
}

// ---------- Step 1: describe startup ----------

const descriptionInput = document.getElementById('description');
const describeSubmit = document.getElementById('describe-submit');
const describeError = document.getElementById('description-error');
const btnFindCategory = document.getElementById('btn-find-category');

function getSelectedTone() {
  const checked = document.querySelector('input[name="tone"]:checked');
  return checked ? checked.value : 'professional';
}

function getSelectedTlds() {
  const checked = Array.from(document.querySelectorAll('input[name="tld"]:checked'))
    .map((el) => el.value);
  return [...new Set(['com', ...checked])];
}

function validateDescription() {
  const valid = descriptionInput.value.trim().length >= 3;
  btnFindCategory.disabled = !valid;
  return valid;
}

function updateDescribeSubmit() {
  describeSubmit.disabled = state.category.trim().length === 0;
}

descriptionInput.addEventListener('input', () => {
  if (descriptionInput.classList.contains('is-invalid') && validateDescription()) {
    descriptionInput.classList.remove('is-invalid');
    describeError.hidden = true;
  } else {
    validateDescription();
  }
});

// Phase A → Phase B: fetch categories
btnFindCategory.addEventListener('click', () => {
  const desc = descriptionInput.value.trim();
  if (desc.length < 3) return;
  state.description = desc;
  enterPhaseB(desc, false);
});

// "Edit description" within Phase B → back to Phase A
document.getElementById('btn-edit-description').addEventListener('click', () => {
  enterPhaseA();
});

function enterPhaseA() {
  document.getElementById('step1-phase-a').style.display = 'block';
  document.getElementById('step1-phase-b').style.display = 'none';
  document.getElementById('step1-help').textContent = 'One or two sentences works best — specific beats long.';
  descriptionInput.value = state.description;
  validateDescription();
  setTimeout(() => descriptionInput.focus(), 50);
}

function enterPhaseB(description, isRestore) {
  document.getElementById('step1-phase-a').style.display = 'none';
  document.getElementById('step1-phase-b').style.display = 'block';
  document.getElementById('step1-help').textContent = 'Choose the industry category that fits your business.';
  document.getElementById('desc-preview-text').textContent = description;

  if (isRestore) {
    // Re-render cached categories and restore selection
    renderCategoryCards(state._cachedCategories || []);
    document.getElementById('category-loading').style.display = 'none';
    document.getElementById('category-options').style.display = 'block';

    // Restore category selection
    const customInput = document.getElementById('custom-category');
    const matchedCard = Array.from(document.querySelectorAll('.category-card'))
      .find((c) => c.dataset.category === state.category);
    if (matchedCard) {
      matchedCard.classList.add('is-selected');
      customInput.value = '';
    } else {
      customInput.value = state.category;
    }

    document.getElementById('exclude').value = state.exclude;
    const toneRadio = document.querySelector(`input[name="tone"][value="${state.tone}"]`);
    if (toneRadio) toneRadio.checked = true;

    updateDescribeSubmit();
  } else {
    // Fresh fetch
    state.category = '';
    state._cachedCategories = [];
    document.getElementById('custom-category').value = '';
    updateDescribeSubmit();
    fetchCategories(description);
  }
}

async function fetchCategories(description) {
  const loadingEl = document.getElementById('category-loading');
  const optionsEl = document.getElementById('category-options');

  loadingEl.className = 'progress-block';
  loadingEl.innerHTML = '<div class="spinner"></div><span class="progress-text">Finding the best categories for your business…</span>';
  loadingEl.style.display = 'flex';
  optionsEl.style.display = 'none';

  try {
    const res = await fetch('/api/suggest-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get categories.');

    state._cachedCategories = data.categories || [];
    renderCategoryCards(state._cachedCategories);

    loadingEl.style.display = 'none';
    optionsEl.style.display = 'block';
  } catch (err) {
    loadingEl.classList.add('is-error');
    loadingEl.innerHTML = `
      ${ICONS.alertCircle}
      <span class="progress-text">${escapeHtml(err.message)}</span>
      <button type="button" class="btn-secondary" id="category-retry-btn">Retry</button>
    `;
    document.getElementById('category-retry-btn').addEventListener('click', () => fetchCategories(description));
  }
}

function renderCategoryCards(categories) {
  const container = document.getElementById('category-cards');
  container.innerHTML = '';
  categories.forEach((cat) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'category-card';
    card.dataset.category = cat.name;
    card.innerHTML = `
      <span class="cat-icon">${escapeHtml(cat.icon)}</span>
      <span class="cat-name">${escapeHtml(cat.name)}</span>
      <span class="cat-desc">${escapeHtml(cat.description)}</span>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.category-card').forEach((c) => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      document.getElementById('custom-category').value = '';
      state.category = cat.name;
      updateDescribeSubmit();
    });
    container.appendChild(card);
  });
}

document.getElementById('custom-category').addEventListener('input', (e) => {
  const val = e.target.value.trim();
  if (val) {
    document.querySelectorAll('.category-card').forEach((c) => c.classList.remove('is-selected'));
    state.category = val;
  } else {
    const selected = document.querySelector('.category-card.is-selected');
    state.category = selected ? selected.dataset.category : '';
  }
  updateDescribeSubmit();
});

document.getElementById('edit-cancel-btn').addEventListener('click', leaveEditMode);

document.getElementById('describe-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const customCat = document.getElementById('custom-category').value.trim();
  if (customCat) state.category = customCat;

  if (!state.category) return;

  const wasEditing = document.querySelector('.step[data-step="1"]').classList.contains('is-editing');

  state.tone = getSelectedTone();
  state.exclude = document.getElementById('exclude').value.trim();

  if (wasEditing) {
    leaveEditMode();
    resetStepsFrom(2);
    state.candidates = [];
    state.availability = {};
  }

  setStepState(1, 'done');
  setSummary(1, `
    <span>"${escapeHtml(state.description)}" · ${escapeHtml(state.category)} · ${escapeHtml(state.tone)}</span>
    <button type="button" class="btn-edit" data-edit-step="1">${ICONS.edit} Edit</button>
  `);

  state.step = 2;
  persistWizardState();
  showStartOverButton();

  setStepState(2, 'active');
  generateNames();
});

// Single delegate on the stepper — handles all edit/change buttons
// regardless of when they are added or replaced in the DOM.
document.getElementById('stepper').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-edit-step]');
  if (!btn) return;
  handleEditStep(parseInt(btn.dataset.editStep, 10));
});

function handleEditStep(stepNum) {
  if (stepNum === 1) {
    const step1 = document.querySelector('.step[data-step="1"]');
    if (step1.classList.contains('is-editing')) {
      leaveEditMode();
      return;
    }

    // Restore Phase B with saved state
    enterPhaseB(state.description, true);

    step1.classList.add('is-editing');
    describeSubmit.innerHTML = 'Regenerate Names &rarr;';
    scrollToStep(1);
  }

  if (stepNum === 3) {
    const step3 = document.querySelector('.step[data-step="3"]');
    if (step3.classList.contains('is-editing')) {
      leaveEditModeStep3();
      return;
    }

    // Reflect the last-checked extensions back onto the chip inputs.
    document.querySelectorAll('input[name="tld"]').forEach((cb) => {
      if (!cb.disabled) cb.checked = state.selectedTlds.includes(cb.value);
    });

    step3.classList.add('is-editing');
    scrollToStep(3);
  }
}

function leaveEditMode() {
  const step1 = document.querySelector('.step[data-step="1"]');
  step1.classList.remove('is-editing');
  describeSubmit.innerHTML = 'Generate Names &rarr;';
}

function leaveEditModeStep3() {
  document.querySelector('.step[data-step="3"]').classList.remove('is-editing');
}

document.getElementById('step3-cancel-btn').addEventListener('click', leaveEditModeStep3);

document.getElementById('step3-recheck-btn').addEventListener('click', () => {
  state.selectedTlds = getSelectedTlds();

  const progress = document.getElementById('availability-progress');
  progress.hidden = false;
  progress.classList.remove('is-error');
  progress.innerHTML = '<div class="spinner"></div><span class="progress-text">Checking availability…</span>';

  checkAvailability();
});

function scrollToStep(n) {
  const el = document.querySelector(`.step[data-step="${n}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function attachEditHandler() { /* replaced by stepper delegate above */ }

// ---------- Step 2: generate names ----------

async function generateNames() {
  try {
    const res = await fetch('/api/generate-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: state.description,
        category: state.category,
        tone: state.tone,
        exclude: state.exclude,
        count: 50,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Name generation failed.');
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No names came back. Try editing your description.');
    }

    state.candidates = data.candidates;
    if (data.demoMode) document.getElementById('demo-banner').hidden = false;

    setStepState(2, 'done');
    setSummary(2, `<span>${data.candidates.length} names generated</span>`);

    state.step = 3;
    persistWizardState();

    setStepState(3, 'active');
    state.selectedTlds = getSelectedTlds();
    const extLine = state.selectedTlds
      .map((t, i) => (i === 0 ? `.${t} (default)` : `.${t}`))
      .join(' · ');
    document.querySelector('.step[data-step="3"] .step-help').textContent =
      `Checking ${extLine} — live registry data, no guessing.`;
    document.getElementById('availability-progress').hidden = false;
    checkAvailability();
  } catch (err) {
    showBlockError('generate-progress', err.message, generateNames);
  }
}

// ---------- Step 3: check domain availability ----------

async function checkAvailability() {
  try {
    const res = await fetch('/api/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: state.candidates.map((c) => c.name),
        tlds: state.selectedTlds,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Availability check failed.');

    const availability = {};
    data.results.forEach((r) => {
      if (!availability[r.name]) availability[r.name] = {};
      availability[r.name][r.tld] = r.available;
    });
    state.availability = availability;

    const availableCount = state.candidates.filter((c) => {
      const tldMap = state.availability[c.name] || {};
      return Object.values(tldMap).some((v) => v === true);
    }).length;

    const tldList = state.selectedTlds.map((t) => `.${t}`).join(' · ');

    leaveEditModeStep3();
    setStepState(3, 'done');
    setSummary(3, `
      <span>${availableCount} names available · checked ${tldList}</span>
      <button type="button" class="btn-edit" data-edit-step="3">${ICONS.edit} Change</button>
    `);

    state.step = 4;
    persistWizardState();
    showStartOverButton();

    setStepState(4, 'active');
    renderChooseStep();
  } catch (err) {
    showBlockError('availability-progress', err.message, checkAvailability);
  }
}

// ---------- Step 4: choose name ----------

const SCORE_BANDS = {
  good: { label: 'Strong', min: 80 },
  ok: { label: 'Fair', min: 55 },
  low: { label: 'Weak', min: 0 },
};

function scoreBand(total) {
  if (total >= SCORE_BANDS.good.min) return 'good';
  if (total >= SCORE_BANDS.ok.min) return 'ok';
  return 'low';
}

function renderScoreBadge(score) {
  if (!score || typeof score.total !== 'number') return '';
  const band = scoreBand(score.total);
  const breakdown = [
    `Short & catchy ${score.length}/100`,
    `Easy to say ${score.pronounceability}/100`,
    `Memorable ${score.memorability}/100`,
    `Distinct from other brands ${score.distinctiveness}/100`,
  ].join(' · ');
  // A real <button> here would nest inside the surrounding name-card
  // button (invalid HTML) and double-fire on click; role="button" keeps
  // it tappable/keyboard-accessible without nesting interactive controls.
  return `
    <span class="brand-score-badge ${band}" role="button" tabindex="0"
      data-total="${score.total}" data-length="${score.length}" data-pronounceability="${score.pronounceability}"
      data-memorability="${score.memorability}" data-distinctiveness="${score.distinctiveness}"
      aria-haspopup="dialog" aria-expanded="false"
      aria-label="Brand score: ${score.total} out of 100, ${SCORE_BANDS[band].label}. Tap for details."
      title="Brand Score ${score.total}/100 — ${breakdown}">
      <span class="brand-score-num">${score.total}<span class="brand-score-max">/100</span></span>
      <span class="brand-score-label">${SCORE_BANDS[band].label}</span>
      <span class="brand-score-info" aria-hidden="true">${ICONS.helpCircle}</span>
    </span>
  `;
}

// ---------- Score breakdown popover (click/tap-friendly, not hover-only) ----------

let activeScorePopover = null;

function closeScorePopover() {
  if (!activeScorePopover) return;
  const { el, badge, outsideHandler, escHandler, dismissHandler } = activeScorePopover;
  el.remove();
  document.removeEventListener('click', outsideHandler, true);
  document.removeEventListener('keydown', escHandler);
  window.removeEventListener('resize', dismissHandler);
  document.removeEventListener('scroll', dismissHandler, true);
  badge.setAttribute('aria-expanded', 'false');
  activeScorePopover = null;
}

function openScorePopover(badge) {
  const wasOpenOnThisBadge = activeScorePopover && activeScorePopover.badge === badge;
  closeScorePopover();
  if (wasOpenOnThisBadge) return;

  const score = {
    total: Number(badge.dataset.total),
    length: Number(badge.dataset.length),
    pronounceability: Number(badge.dataset.pronounceability),
    memorability: Number(badge.dataset.memorability),
    distinctiveness: Number(badge.dataset.distinctiveness),
  };
  const band = scoreBand(score.total);

  const pop = document.createElement('div');
  pop.className = 'score-popover';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Brand score breakdown');
  pop.innerHTML = `
    <div class="score-popover-head">
      <span class="score-popover-title">Brand score</span>
      <span class="score-popover-total ${band}">${score.total}<small>/100</small> · ${SCORE_BANDS[band].label}</span>
    </div>
    ${renderScoreBreakdown(score)}
  `;
  document.body.appendChild(pop);

  const rect = badge.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  const margin = 8;
  let top = rect.bottom + margin;
  let left = rect.left;
  if (left + popRect.width > window.innerWidth - margin) left = window.innerWidth - popRect.width - margin;
  left = Math.max(margin, left);
  if (top + popRect.height > window.innerHeight - margin) top = rect.top - popRect.height - margin;
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;

  badge.setAttribute('aria-expanded', 'true');

  const dismissHandler = () => closeScorePopover();
  const outsideHandler = (e) => {
    if (!pop.contains(e.target) && e.target !== badge && !badge.contains(e.target)) closeScorePopover();
  };
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeScorePopover();
      badge.focus();
    }
  };

  document.addEventListener('click', outsideHandler, true);
  document.addEventListener('keydown', escHandler);
  window.addEventListener('resize', dismissHandler);
  document.addEventListener('scroll', dismissHandler, true);

  activeScorePopover = { el: pop, badge, outsideHandler, escHandler, dismissHandler };
}

// Capture phase: the badge lives inside the name-card button, so we must
// intercept before the event bubbles up and triggers the card's own
// click handler (which opens the GoDaddy registration tab).
document.addEventListener('click', (e) => {
  const badge = e.target.closest('.brand-score-badge');
  if (!badge) return;
  e.stopPropagation();
  e.preventDefault();
  openScorePopover(badge);
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const badge = e.target.closest('.brand-score-badge');
  if (!badge) return;
  e.stopPropagation();
  e.preventDefault();
  openScorePopover(badge);
}, true);

// Compact bar-chart breakdown, used where there's room to explain the score
// (the saved-domains panel) rather than the dense 50-card results grid.
function renderScoreBreakdown(score) {
  if (!score || typeof score.total !== 'number') return '';
  const rows = [
    ['Short & catchy', score.length],
    ['Easy to say', score.pronounceability],
    ['Memorable', score.memorability],
    ['Distinct', score.distinctiveness],
  ];
  const bars = rows.map(([label, val]) => `
    <div class="score-bar-row">
      <span class="score-bar-label">${escapeHtml(label)}</span>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.max(0, Math.min(100, val))}%"></div></div>
      <span class="score-bar-val">${val}</span>
    </div>
  `).join('');
  return `<div class="score-breakdown">${bars}</div>`;
}

document.getElementById('sort-toggle').addEventListener('click', (e) => {
  const btn = e.target.closest('.sort-btn');
  if (!btn || btn.classList.contains('is-active')) return;
  state.sortMode = btn.dataset.sort;
  document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
  persistWizardState();
  if (state.candidates.length) renderChooseStep();
});

function renderChooseStep() {
  const grid = document.getElementById('results');
  grid.innerHTML = '';

  const sorted = [...state.candidates].sort((a, b) => {
    if (state.sortMode === 'score') {
      return (b.brand_score?.total || 0) - (a.brand_score?.total || 0);
    }
    const aAvail = state.selectedTlds.some((t) => (state.availability[a.name] || {})[t] === true);
    const bAvail = state.selectedTlds.some((t) => (state.availability[b.name] || {})[t] === true);
    return bAvail - aAvail;
  });

  sorted.forEach((c) => {
    const tldMap = state.availability[c.name] || {};
    const anyAvailable = state.selectedTlds.some((t) => tldMap[t] === true);
    const allTaken = state.selectedTlds.every((t) => tldMap[t] === false);
    const isTaken = allTaken && !anyAvailable;

    const available = state.selectedTlds.filter((t) => tldMap[t] === true);
    const bestTld = available.includes('com') ? 'com' : (available[0] || null);
    const domain = bestTld ? `${c.name}.${bestTld}` : c.name;
    const godaddyUrl = GODADDY.searchUrl(domain);

    const wrap = document.createElement('div');
    wrap.className = 'name-card-wrap';
    wrap.dataset.name = c.name;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'name-card' + (isTaken ? ' is-taken' : '');
    card.disabled = isTaken;

    const tldPills = state.selectedTlds.map((tld) => {
      const status = tldMap[tld];
      const cls = status === true ? 'available' : status === false ? 'taken' : 'unknown';
      return `<span class="tld-pill ${cls}">.${escapeHtml(tld)}</span>`;
    }).join('');

    const tagPills = (c.tags || []).map(
      (t) => `<span class="card-tag">${escapeHtml(t)}</span>`
    ).join('');

    const scoreBadge = renderScoreBadge(c.brand_score);

    card.innerHTML = `
      <div class="wordmark">
        <span class="style-dot ${c.style}" title="${c.style}"></span>
        <span class="wordmark-text">${escapeHtml(c.name)}</span>
        ${scoreBadge}
      </div>
      <div class="tld-status-row">${tldPills}</div>
      ${c.insight ? `<p class="card-insight">${escapeHtml(c.insight)}</p>` : ''}
      ${tagPills ? `<div class="card-tags">${tagPills}</div>` : ''}
      ${!isTaken ? `
        <div class="card-footer">
          <span class="card-register-cta">Register ${ICONS.externalLink}</span>
        </div>
      ` : ''}
    `;

    if (!isTaken) {
      card.addEventListener('click', async () => {
        markAllDoneProgress();
        try {
          await fetch('/api/log-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: c.name, tld: bestTld || 'com', registrar: 'godaddy' }),
          });
        } catch {}
        window.open(godaddyUrl, '_blank', 'noopener');
      });
    }

    wrap.appendChild(card);

    if (!isTaken) {
      const saved = isDomainSaved(c.name);
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'save-btn' + (saved ? ' is-saved' : '');
      saveBtn.dataset.name = c.name;
      saveBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      saveBtn.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${c.name}`);
      saveBtn.innerHTML = saved ? ICONS.bookmarkFilled : ICONS.bookmarkOutline;
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSavedDomain(c.name, bestTld || 'com', c.brand_score);
      });
      wrap.appendChild(saveBtn);

      const riskBtn = document.createElement('button');
      riskBtn.type = 'button';
      riskBtn.className = 'risk-btn';
      riskBtn.setAttribute('aria-label', `Check ${c.name} for trademark and handle conflicts`);
      riskBtn.innerHTML = ICONS.shield;
      riskBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRiskPanel(c.name);
      });
      wrap.appendChild(riskBtn);
    }

    grid.appendChild(wrap);
  });
}

// ---------- Hero typewriter ----------

(function () {
  const el = document.getElementById('hero-word');
  if (!el) return;

  const words = ['startup', 'SaaS product', 'marketplace', 'agency', 'mobile app', 'community', 'brand'];
  let wordIdx = 0;
  let charIdx = words[0].length; // start fully typed
  let deleting = false;

  function tick() {
    const word = words[wordIdx];
    if (deleting) {
      charIdx -= 1;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % words.length;
        setTimeout(tick, 340);
        return;
      }
      setTimeout(tick, 55);
    } else {
      charIdx += 1;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(tick, 2200);
        return;
      }
      setTimeout(tick, 95);
    }
  }

  setTimeout(tick, 2400); // wait before first deletion
}());

// ---------- Hero preview (AI-generated daily top domains by category) ----------

(function () {
  const grid = document.getElementById('hero-preview');
  const label = document.getElementById('hero-preview-label');
  const labelText = document.getElementById('hero-preview-label-text');
  if (!grid || !label || !labelText) return;

  const CARDS_SHOWN = 6;

  fetch('/api/daily-preview')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ category, domains }) => {
      if (!Array.isArray(domains) || domains.length === 0) return; // keep static fallback markup

      labelText.textContent = `Trending in ${category} today`;
      grid.innerHTML = domains
        .slice(0, CARDS_SHOWN)
        .map((d) => {
          const domain = `${d.name}.${d.tld}`;
          const inner = `
            <div class="hp-left">
              <span class="hp-name">${escapeHtml(d.name)}</span><span class="hp-tld">.${escapeHtml(d.tld)}</span>
            </div>
            <span class="hp-badge ${d.available ? 'avail' : 'taken'}">${d.available ? 'Available' : 'Taken'}</span>`;

          if (!d.available) return `<div class="hp-card hp-taken">${inner}</div>`;

          return `
            <a class="hp-card hp-avail" href="${GODADDY.searchUrl(domain)}" target="_blank" rel="noopener noreferrer" data-name="${escapeHtml(d.name)}" data-tld="${escapeHtml(d.tld)}" aria-label="Register ${escapeHtml(domain)} on GoDaddy">${inner}
            </a>`;
        })
        .join('');

      grid.querySelectorAll('a.hp-card.hp-avail').forEach((link) => {
        link.addEventListener('click', () => {
          fetch('/api/log-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: link.dataset.name, tld: link.dataset.tld, registrar: 'godaddy' }),
          }).catch(() => {});
        });
      });
    })
    .catch(() => {
      // Network/API failure — leave the static markup already in the page.
    });
}());

// ---------- Init ----------

const startOverBtn = document.getElementById('start-over-btn');
const startOverBtnLabel = document.getElementById('start-over-btn-label');
let startOverConfirmTimer = null;

function showStartOverButton() {
  startOverBtn.hidden = false;
}

function resetStartOverButton() {
  startOverBtnLabel.textContent = 'Start over';
  startOverBtn.classList.remove('is-confirming');
  clearTimeout(startOverConfirmTimer);
  startOverConfirmTimer = null;
}

// Two-stage confirm (click, then click again within a few seconds) instead
// of a native confirm() dialog, so clearing a draft feels like part of the
// app rather than a jarring browser popup.
startOverBtn.addEventListener('click', () => {
  if (!startOverBtn.classList.contains('is-confirming')) {
    startOverBtnLabel.textContent = 'Click to confirm';
    startOverBtn.classList.add('is-confirming');
    startOverConfirmTimer = setTimeout(resetStartOverButton, 4000);
    return;
  }
  clearWizardState();
  resetWizardToStart();
  resetStartOverButton();
});

function resetWizardToStart() {
  state.description = '';
  state.tone = 'professional';
  state.exclude = '';
  state.category = '';
  state._cachedCategories = [];
  state.selectedTlds = ['com'];
  state.candidates = [];
  state.availability = {};
  state.sortMode = 'availability';
  state.step = 1;

  leaveEditMode();
  leaveEditModeStep3();

  document.getElementById('step1-phase-a').style.display = 'block';
  document.getElementById('step1-phase-b').style.display = 'none';
  document.getElementById('step1-help').textContent = 'One or two sentences works best — specific beats long.';
  document.getElementById('category-cards').innerHTML = '';
  document.getElementById('custom-category').value = '';

  descriptionInput.value = '';
  descriptionInput.classList.remove('is-invalid');
  describeError.hidden = true;
  btnFindCategory.disabled = true;

  document.querySelector('input[name="tone"][value="professional"]').checked = true;
  document.getElementById('exclude').value = '';
  document.querySelectorAll('input[name="tld"]').forEach((cb) => {
    if (!cb.disabled) cb.checked = ['io', 'co', 'ai'].includes(cb.value);
  });
  document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.sort === 'availability'));

  setStepState(1, 'active');
  setSummary(1, '');
  resetStepsFrom(2);
  updateOverallProgress(1);

  document.getElementById('demo-banner').hidden = true;
  document.getElementById('resume-banner').hidden = true;
  startOverBtn.hidden = true;

  scrollToStep(1);
  setTimeout(() => descriptionInput.focus(), 100);
}

// Restore an in-progress draft after a page refresh, replaying the same
// step-completion UI the normal flow produces rather than re-fetching from
// the API (the whole point is to avoid losing/re-paying for a generation).
function restoreWizardState() {
  const saved = loadWizardState();
  if (!saved || !saved.description || !saved.category || saved.step < 2) return;

  state.description = saved.description;
  state.tone = saved.tone || 'professional';
  state.exclude = saved.exclude || '';
  state.category = saved.category;
  state.selectedTlds = Array.isArray(saved.selectedTlds) && saved.selectedTlds.length ? saved.selectedTlds : ['com'];
  state.candidates = Array.isArray(saved.candidates) ? saved.candidates : [];
  state.availability = saved.availability || {};
  state.sortMode = saved.sortMode === 'score' ? 'score' : 'availability';
  state.step = saved.step;

  setStepState(1, 'done');
  setSummary(1, `
    <span>"${escapeHtml(state.description)}" · ${escapeHtml(state.category)} · ${escapeHtml(state.tone)}</span>
    <button type="button" class="btn-edit" data-edit-step="1">${ICONS.edit} Edit</button>
  `);

  document.querySelectorAll('input[name="tld"]').forEach((cb) => {
    if (!cb.disabled) cb.checked = state.selectedTlds.includes(cb.value);
  });
  document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.sort === state.sortMode));

  if (state.step >= 3 && state.candidates.length > 0) {
    setStepState(2, 'done');
    setSummary(2, `<span>${state.candidates.length} names generated</span>`);
  }

  if (state.step >= 4 && Object.keys(state.availability).length > 0) {
    const availableCount = state.candidates.filter((c) => {
      const tldMap = state.availability[c.name] || {};
      return Object.values(tldMap).some((v) => v === true);
    }).length;
    const tldList = state.selectedTlds.map((t) => `.${t}`).join(' · ');

    setStepState(3, 'done');
    setSummary(3, `
      <span>${availableCount} names available · checked ${tldList}</span>
      <button type="button" class="btn-edit" data-edit-step="3">${ICONS.edit} Change</button>
    `);

    setStepState(4, 'active');
    renderChooseStep();
  } else if (state.candidates.length > 0) {
    // Refresh landed mid-availability-check — candidates are cached, just re-run that step.
    setStepState(2, 'done');
    setSummary(2, `<span>${state.candidates.length} names generated</span>`);
    setStepState(3, 'active');
    document.getElementById('availability-progress').hidden = false;
    checkAvailability();
  } else {
    // Refresh landed mid-generation — nothing cached yet, just re-run it.
    setStepState(2, 'active');
    generateNames();
  }

  showStartOverButton();

  const resumeBanner = document.getElementById('resume-banner');
  document.getElementById('resume-banner-step').textContent = String(Math.min(state.step, 4));
  resumeBanner.hidden = false;
}

restoreWizardState();

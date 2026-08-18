// ---------- Dynadot registrar ----------
// URL pattern is Dynadot's own published schema.org SearchAction template
// (https://www.dynadot.com/domain/search?domain={search_term_string}),
// confirmed live against dynadot.com.

const DYNADOT = {
  searchUrl: (d) => `https://www.dynadot.com/domain/search?domain=${encodeURIComponent(d)}`,
  // Separate from the registration search above -- this is Dynadot's
  // aftermarket/backorder tool (auctions, expired domains, listings),
  // confirmed live by querying it directly (not published via schema.org
  // like the registration search is, but verified to return real listing
  // results, not just a static page).
  marketSearchUrl: (d) => `https://www.dynadot.com/market/search?domain=${encodeURIComponent(d)}`,
};

// Manually-verified USD registration prices, checked directly against each
// TLD's dynadot.com page (not an API -- there's no Dynadot API key wired up
// yet). Showing a real number next to an available extension is meant to
// cut bounce-before-click: uncertainty about price is a classic reason
// people abandon an outbound click before landing on the registrar.
// .ai/.net/.org are deliberately omitted: unauthenticated fetches of those
// pages returned inconsistent currencies (EUR vs USD) across requests, so
// rather than guess or silently convert, no price is shown for them until
// there's a reliable USD source. Re-verify the rest periodically -- prices
// change and sales expire.
const TLD_PRICING = {
  com: { usd: 10.88, verified: '2026-08-09' },
  io:  { usd: 28.89, verified: '2026-08-09' },
  co:  { usd: 3.48,  verified: '2026-08-09' },
  app: { usd: 9.99,  verified: '2026-08-09' },
  dev: { usd: 8.00,  verified: '2026-08-09' },
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
  hideTaken: false,
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
      hideTaken: state.hideTaken,
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

// ---------- Funnel-stage event logging (roadmap Phase 0) ----------
// A random, non-identifying id groups every event from one visit into a
// single funnel, so drop-off between steps is visible server-side -- not
// just final registrar clicks. Session-scoped like the wizard draft above.

const SESSION_ID_KEY = 'typingname_session_id';

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return 'no-session-storage';
  }
}

// sendBeacon survives the page unloading (e.g. the click that navigates to
// Dynadot) far more reliably than a fetch() that gets cancelled mid-flight;
// fetch is only the fallback for browsers/contexts without it.
function logEvent(type, data) {
  const payload = JSON.stringify({ type, sessionId: getSessionId(), data: data || {} });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/log-event', blob)) return;
    }
  } catch {}
  fetch('/api/log-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
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
    logEvent('name_saved', { name, tld });
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

  document.getElementById('saved-panel-footer').hidden = state.savedDomains.length === 0;

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
          <a class="saved-item-register" href="${DYNADOT.searchUrl(domain)}" target="_blank" rel="noopener noreferrer">Register ${ICONS.externalLink}</a>
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

// Dynadot's bulk search has no documented/discoverable URL that pre-fills
// multiple domains (confirmed against their bulk-search tool and its page
// source) -- it only accepts pasted text or a CSV upload. So instead of
// guessing at a URL that doesn't exist, this copies a ready-to-paste list
// and opens their real bulk-search page for the user to paste into.
document.getElementById('saved-panel-bulk-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const list = state.savedDomains.map((d) => `${d.name}.${d.tld}`).join(', ');
  try {
    await navigator.clipboard.writeText(list);
    const original = btn.textContent;
    btn.textContent = 'Copied — paste it into Dynadot';
    btn.classList.add('is-copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-copied');
    }, 2000);
  } catch {}
  window.open('https://www.dynadot.com/domain/bulk-search', '_blank', 'noopener');
  logEvent('bulk_register_clicked', { count: state.savedDomains.length });
});

// ---------- Share a saved shortlist (no backend needed) ----------
// Domains are encoded straight into the URL query string -- no server
// storage required, so a shared link works today with zero new infra.

const MAX_SHARED_ITEMS = 30;

function encodeSharedList(domains) {
  return domains.slice(0, MAX_SHARED_ITEMS).map((d) => `${d.name}.${d.tld}`).join(',');
}

function decodeSharedList(raw) {
  if (!raw) return [];
  const seen = new Set();
  return raw.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .map((entry) => {
      const dot = entry.lastIndexOf('.');
      if (dot <= 0) return null;
      const name = entry.slice(0, dot).replace(/[^a-z0-9-]/g, '');
      const tld = entry.slice(dot + 1).replace(/[^a-z0-9-]/g, '');
      if (!name || !tld) return null;
      return { name, tld };
    })
    .filter((d) => d && !seen.has(`${d.name}.${d.tld}`) && seen.add(`${d.name}.${d.tld}`))
    .slice(0, MAX_SHARED_ITEMS);
}

document.getElementById('saved-panel-share-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const encoded = encodeSharedList(state.savedDomains);
  const shareUrl = `${location.origin}${location.pathname}?shared=${encodeURIComponent(encoded)}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    const original = btn.textContent;
    btn.textContent = 'Link copied';
    btn.classList.add('is-copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-copied');
    }, 2000);
  } catch {}
  logEvent('shared_list_created', { count: Math.min(state.savedDomains.length, MAX_SHARED_ITEMS) });
});

function renderSharedListPanel(items) {
  const itemsEl = document.getElementById('shared-list-items');
  document.getElementById('shared-list-count').textContent = `(${items.length})`;

  itemsEl.innerHTML = items.map((d) => {
    const domain = `${d.name}.${d.tld}`;
    const price = TLD_PRICING[d.tld];
    const priceHtml = price ? ` <span class="tld-pill-price">$${price.usd.toFixed(2)}</span>` : '';
    const saved = isDomainSaved(d.name);
    return `
      <div class="shared-list-item">
        <span class="shared-list-item-name">${escapeHtml(d.name)}<span class="shared-list-item-tld">.${escapeHtml(d.tld)}</span></span>
        <div class="shared-list-item-actions">
          <button type="button" class="shared-list-save-btn${saved ? ' is-saved' : ''}" data-shared-save="${escapeHtml(d.name)}" data-shared-tld="${escapeHtml(d.tld)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${escapeHtml(d.name)}">${saved ? ICONS.bookmarkFilled : ICONS.bookmarkOutline}</button>
          <a class="shared-list-register" href="${DYNADOT.searchUrl(domain)}" target="_blank" rel="noopener noreferrer">Register${priceHtml} ${ICONS.externalLink}</a>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('shared-list-items').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-shared-save]');
  if (!btn) return;
  toggleSavedDomain(btn.dataset.sharedSave, btn.dataset.sharedTld, null);
  const nowSaved = isDomainSaved(btn.dataset.sharedSave);
  btn.classList.toggle('is-saved', nowSaved);
  btn.setAttribute('aria-pressed', String(nowSaved));
  btn.innerHTML = nowSaved ? ICONS.bookmarkFilled : ICONS.bookmarkOutline;
});

document.getElementById('shared-list-dismiss').addEventListener('click', () => {
  document.getElementById('shared-list-panel').hidden = true;
  // Clean the URL so refreshing doesn't just bring the same list right back.
  history.replaceState({}, '', location.pathname);
});

function initSharedListFromUrl() {
  const raw = new URLSearchParams(location.search).get('shared');
  if (!raw) return;
  const items = decodeSharedList(raw);
  if (items.length === 0) return;
  renderSharedListPanel(items);
  document.getElementById('shared-list-panel').hidden = false;
  logEvent('shared_list_viewed', { count: items.length });
}

initSharedListFromUrl();

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
  // Divide by TOTAL_STEPS - 1 (not TOTAL_STEPS) so reaching the last step
  // itself reads as 100% -- otherwise "Choose your domain" (step 4 of 4)
  // would still show a 75%-full bar, implying an invisible 5th step.
  const pct = Math.round(((activeStep - 1) / (TOTAL_STEPS - 1)) * 100);
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-label').textContent = `Step ${activeStep} of ${TOTAL_STEPS}`;
}

function markAllDoneProgress() {
  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('progress-label').textContent = 'Done';
}

// Post-register upsell (roadmap Phase 1): shown once someone has actually
// clicked to register a domain, not before -- "I just picked a name" is
// the moment Website Builder / Email makes sense as a next step.
let upsellDismissed = false;

function showUpsellBanner() {
  if (upsellDismissed) return;
  document.getElementById('upsell-banner').hidden = false;
}

document.getElementById('upsell-banner-close').addEventListener('click', () => {
  upsellDismissed = true;
  document.getElementById('upsell-banner').hidden = true;
});

document.getElementById('upsell-banner').addEventListener('click', (e) => {
  const link = e.target.closest('[data-upsell]');
  if (link) logEvent('upsell_clicked', { product: link.dataset.upsell });
});

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
        '<div class="spinner"></div><div class="progress-block-text">'
        + '<span class="progress-text">Crafting names around your idea…</span>'
        + '<span class="progress-subtext">Usually 10-20s for 50 tailored names.</span></div>';
    }
    if (i === 3) {
      const progress = document.getElementById('availability-progress');
      progress.hidden = true;
      progress.classList.remove('is-error');
      progress.innerHTML = '<div class="spinner"></div><span class="progress-text">Checking availability…</span>';
      document.querySelector('.step[data-step="3"] .step-help').textContent =
        'Select the extensions to check — .com is always included.';
      // setStepState('pending') strips the is-editing class directly, which
      // would otherwise leave the TLD chips stuck enabled if step 3 happened
      // to be mid-edit when this reset was triggered (e.g. editing step 1).
      setTldChipsInteractive(false);
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
const descriptionCounter = document.getElementById('description-counter');
const DESCRIPTION_MAX_LEN = 500;
// Below this, the AI pipeline runs on too little signal to produce good
// names -- "app" or "my business" used to sail through at the old 3-char
// floor, burning a real API call on output that undersold the whole tool.
const DESCRIPTION_MIN_LEN = 10;
const DESCRIPTION_MIN_WORDS = 2;

// Rotated once per fresh visit (and again on "start over") so the blank
// textarea shows a concrete example instead of generic placeholder copy --
// a blank page with no example is a classic first-input drop-off point.
const DESCRIPTION_EXAMPLES = [
  'A subscription box that ships curated coffee beans from small roasters',
  'A mobile app that matches freelance designers with startups needing quick logo work',
  'An online marketplace for handmade furniture from independent woodworkers',
  'A SaaS tool that automates expense reports for small agencies',
  'A community platform for new parents to swap childcare tips and gear',
];

function setRandomDescriptionPlaceholder() {
  const example = DESCRIPTION_EXAMPLES[Math.floor(Math.random() * DESCRIPTION_EXAMPLES.length)];
  descriptionInput.placeholder = `e.g. ${example}`;
}

setRandomDescriptionPlaceholder();

function isDescriptionSubstantial(value) {
  const words = value.split(/\s+/).filter(Boolean);
  return value.length >= DESCRIPTION_MIN_LEN && words.length >= DESCRIPTION_MIN_WORDS;
}

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
  const value = descriptionInput.value.trim();
  const valid = isDescriptionSubstantial(value);
  btnFindCategory.disabled = !valid;

  // Only surface the error once the user has started typing but hasn't
  // reached the minimum yet -- a blank field on first load needs no nagging.
  const showError = value.length >= 3 && !valid;
  descriptionInput.classList.toggle('is-invalid', showError);
  describeError.hidden = !showError;

  const len = descriptionInput.value.length;
  descriptionCounter.textContent = `${len} / ${DESCRIPTION_MAX_LEN}`;
  descriptionCounter.classList.toggle('is-near-limit', len >= DESCRIPTION_MAX_LEN - 20);

  return valid;
}

function updateDescribeSubmit() {
  describeSubmit.disabled = state.category.trim().length === 0;
}

descriptionInput.addEventListener('input', validateDescription);

// ---------- Resuming a saved draft ----------
// Deliberately NOT auto-applied on page load: silently jumping straight to
// step 3/4 and re-firing API calls the instant the page opens is jarring,
// and re-spends real cost before the user has asked for anything. Instead
// the page always lands on Step 1 as normal (pre-filled with the saved
// description so it's not lost), and the offer to pick back up only
// surfaces once the user actually engages with that field -- see the
// 'input' listener below.
let pendingResumeDraft = null;
let resumeBannerOffered = false;

function truncateForBanner(text, max) {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function loadPendingResumeDraft() {
  const saved = loadWizardState();
  if (!saved || !saved.description || !saved.category || saved.step < 2) return;
  pendingResumeDraft = saved;
  descriptionInput.value = saved.description;
  validateDescription();
}

function offerResumeIfPending() {
  if (!pendingResumeDraft || resumeBannerOffered) return;
  resumeBannerOffered = true;
  document.getElementById('resume-banner-desc').textContent = truncateForBanner(pendingResumeDraft.description, 60);
  document.getElementById('resume-banner-offer-step').textContent = String(Math.min(pendingResumeDraft.step, 4));
  document.getElementById('resume-banner').hidden = false;
}

descriptionInput.addEventListener('input', offerResumeIfPending);

document.getElementById('resume-banner-continue').addEventListener('click', async () => {
  if (!pendingResumeDraft) return;
  const draft = pendingResumeDraft;
  pendingResumeDraft = null;
  document.getElementById('resume-banner-offer').hidden = true;
  document.getElementById('resume-banner-status').hidden = false;
  await applyResumeDraft(draft);
});

document.getElementById('resume-banner-dismiss').addEventListener('click', () => {
  pendingResumeDraft = null;
  document.getElementById('resume-banner').hidden = true;
});

// Phase A → Phase B: fetch categories
btnFindCategory.addEventListener('click', () => {
  const desc = descriptionInput.value.trim();
  if (!isDescriptionSubstantial(desc)) return;
  state.description = desc;
  enterPhaseB(desc, false);
});

// "Edit description" within Phase B → back to Phase A
document.getElementById('btn-edit-description').addEventListener('click', () => {
  enterPhaseA();
});

function enterPhaseA() {
  clearNamesPrefetch();
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
      matchedCard.setAttribute('aria-pressed', 'true');
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

    // Speculative prefetch (see definition below): most people keep the
    // AI's top-suggested category and the default tone, so start generating
    // for that combination now, while they're still reading the cards and
    // picking a tone -- that think time is where this wait gets absorbed.
    startNamesPrefetch(description, state._cachedCategories[0]);
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
    // The checkmark badge is aria-hidden (purely visual), so without this
    // a screen reader user has no way to tell which category is selected.
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML = `
      <span class="cat-check" aria-hidden="true">✓</span>
      <span class="cat-icon">${escapeHtml(cat.icon)}</span>
      <span class="cat-name">${escapeHtml(cat.name)}</span>
      <span class="cat-desc">${escapeHtml(cat.description)}</span>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.category-card').forEach((c) => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('is-selected');
      card.setAttribute('aria-pressed', 'true');
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
    document.querySelectorAll('.category-card').forEach((c) => {
      c.classList.remove('is-selected');
      c.setAttribute('aria-pressed', 'false');
    });
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

  logEvent('step1_completed', { category: state.category, tone: state.tone, wasEditing });

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

    setTldChipsInteractive(true);
    // Reflect the last-checked extensions back onto the chip inputs.
    document.querySelectorAll('input[name="tld"]').forEach((cb) => {
      if (cb.value !== 'com') cb.checked = state.selectedTlds.includes(cb.value);
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
  setTldChipsInteractive(false);
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

// The TLD chips only ever take effect via the "Change" > "Recheck" flow, so
// they stay disabled (and visually inert) outside of edit mode -- otherwise
// toggling one looks like it should do something on the very first,
// automatic check, when in fact nothing is listening yet.
function setTldChipsInteractive(enabled) {
  document.querySelectorAll('input[name="tld"]').forEach((cb) => {
    if (cb.value === 'com') return; // permanently locked/checked
    cb.disabled = !enabled;
  });
}

function scrollToStep(n) {
  const el = document.querySelector(`.step[data-step="${n}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function attachEditHandler() { /* replaced by stepper delegate above */ }

// ---------- Step 2: generate names ----------

// Speculative prefetch: the wizard's biggest dead-air stretch is the ~10-20s
// name-generation wait, which today only starts *after* the user has read
// the category cards, picked a tone, and clicked "Generate Names". Most
// people keep the AI's #1 suggested category and the default "professional"
// tone with no excludes, so as soon as categories come back, fire that exact
// request in the background. If the user submits with those same settings
// (the common case), generateNames() below just awaits the already-running
// request instead of starting a fresh one -- the wait overlaps with think
// time instead of stacking after it. Any other combination (different
// category, tone, or exclude words) simply falls through to a fresh call,
// so nothing here can ever serve the wrong result.
let namesPrefetch = { key: null, promise: null };
const PREFETCH_DEFAULT_TONE = 'professional';
const PREFETCH_DEFAULT_EXCLUDE = '';

function generateNamesKey({ description, category, tone, exclude }) {
  return JSON.stringify({ description, category, tone, exclude });
}

async function fetchGenerateNames({ description, category, tone, exclude }) {
  const res = await fetch('/api/generate-names', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, category, tone, exclude, count: 50 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Name generation failed.');
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No names came back. Try editing your description.');
  }
  return data;
}

function startNamesPrefetch(description, topCategory) {
  if (!topCategory || !topCategory.name) return;
  const params = { description, category: topCategory.name, tone: PREFETCH_DEFAULT_TONE, exclude: PREFETCH_DEFAULT_EXCLUDE };
  const key = generateNamesKey(params);
  if (namesPrefetch.key === key) return; // already in flight for this exact combination
  namesPrefetch = { key, promise: fetchGenerateNames(params).catch(() => null) };
}

function clearNamesPrefetch() {
  namesPrefetch = { key: null, promise: null };
}

async function generateNames() {
  // A real (non-demo) call for 50 names can run past the "usually 10-20s"
  // estimate shown up front -- if it does, swap in a message that confirms
  // the app is still working rather than leaving the original estimate
  // sitting there looking stale/wrong.
  const reassureTimer = setTimeout(() => {
    const text = document.querySelector('#generate-progress .progress-text');
    if (text) text.textContent = 'Still crafting your list — quality names take a little longer…';
  }, 15000);

  try {
    const params = { description: state.description, category: state.category, tone: state.tone, exclude: state.exclude };
    const key = generateNamesKey(params);
    // Reuse the in-flight/completed prefetch only on an exact settings match
    // -- a null result (prefetch failed or never ran) falls straight through
    // to a normal fresh request below.
    let data = namesPrefetch.key === key ? await namesPrefetch.promise : null;
    clearNamesPrefetch();
    if (!data) data = await fetchGenerateNames(params);

    state.candidates = data.candidates;
    if (data.demoMode) document.getElementById('demo-banner').hidden = false;

    setStepState(2, 'done');
    setSummary(2, `<span>${data.candidates.length} names generated</span>`);

    logEvent('names_generated', { count: data.candidates.length, demoMode: !!data.demoMode });

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
    // Awaited (not fire-and-forget) so callers that DO await generateNames()
    // -- restoreWizardState(), below -- see state.step reflect wherever the
    // full generate+check pipeline actually lands, not just the moment
    // generation finished. Callers that don't await (the normal describe-form
    // submit flow) are unaffected either way, since they never looked at the
    // returned promise to begin with.
    await checkAvailability();
  } catch (err) {
    showBlockError('generate-progress', err.message, generateNames);
  } finally {
    clearTimeout(reassureTimer);
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

    logEvent('availability_checked', { availableCount, tlds: state.selectedTlds });

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
  const pct = Math.max(0, Math.min(100, score.total));
  const breakdown = [
    `Short & catchy ${score.length}/100`,
    `Easy to say ${score.pronounceability}/100`,
    `Memorable ${score.memorability}/100`,
    `Distinct from other brands ${score.distinctiveness}/100`,
  ].join(' · ');
  // A real <button> here would nest inside the surrounding name-card
  // button (invalid HTML) and double-fire on click; role="button" keeps
  // it tappable/keyboard-accessible without nesting interactive controls.
  // A partial-ring gauge reads as glanceable at 50-card scale in a way a
  // text pill doesn't, and frees up horizontal space next to the name.
  return `
    <span class="brand-score-badge ${band}" role="button" tabindex="0" style="--pct:${pct}"
      data-total="${score.total}" data-length="${score.length}" data-pronounceability="${score.pronounceability}"
      data-memorability="${score.memorability}" data-distinctiveness="${score.distinctiveness}"
      aria-haspopup="dialog" aria-expanded="false"
      aria-label="Brand score: ${score.total} out of 100, ${SCORE_BANDS[band].label}. Tap for details."
      title="Brand Score ${score.total}/100 — ${breakdown}">
      <span class="brand-score-ring-inner">
        <b class="brand-score-num">${score.total}</b>
        <em class="brand-score-label">${SCORE_BANDS[band].label}</em>
      </span>
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
// click handler (which opens the Dynadot registration tab).
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

// Same nested-interactive-content problem as the score badge above: the
// "check on Dynadot" pill for unresolvable TLDs (.io/.co) sits inside the
// name-card button, so it's a role="link" span intercepted here rather
// than a real <a>.
function openUnknownTldCta(pill) {
  const { name, tld } = pill.dataset;
  if (!name || !tld) return;
  window.open(DYNADOT.searchUrl(`${name}.${tld}`), '_blank', 'noopener');
  markAllDoneProgress();
  showUpsellBanner();
  logEvent('unknown_tld_checked', { name, tld, registrar: 'dynadot' });
}

document.addEventListener('click', (e) => {
  const pill = e.target.closest('.tld-pill.unknown-cta');
  if (!pill) return;
  e.stopPropagation();
  e.preventDefault();
  openUnknownTldCta(pill);
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const pill = e.target.closest('.tld-pill.unknown-cta');
  if (!pill) return;
  e.stopPropagation();
  e.preventDefault();
  openUnknownTldCta(pill);
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
  document.querySelectorAll('.sort-btn').forEach((b) => {
    b.classList.toggle('is-active', b === btn);
    b.setAttribute('aria-pressed', String(b === btn));
  });
  persistWizardState();
  if (state.candidates.length) renderChooseStep();
});

document.getElementById('hide-taken-toggle').addEventListener('change', (e) => {
  state.hideTaken = e.target.checked;
  persistWizardState();
  if (state.candidates.length) renderChooseStep();
});

function isCandidateTaken(c) {
  const tldMap = state.availability[c.name] || {};
  return !state.selectedTlds.some((t) => tldMap[t] === true);
}

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

  const visible = state.hideTaken ? sorted.filter((c) => !isCandidateTaken(c)) : sorted;

  if (state.hideTaken && visible.length === 0 && sorted.length > 0) {
    grid.innerHTML = `
      <p class="results-empty-state">
        Every name in this batch is taken across the extensions you checked.
        Uncheck <strong>Hide taken</strong> above to see them anyway, or edit Step 1 to try a different angle.
      </p>
    `;
    return;
  }

  // The single highest-scoring name that's actually available -- not
  // everything in a 50-card grid should compete equally for attention, and
  // a real "best of this batch" beats decorating an arbitrary card.
  const topPickName = state.candidates
    .filter((c) => state.selectedTlds.some((t) => (state.availability[c.name] || {})[t] === true))
    .reduce((best, c) => {
      const score = c.brand_score?.total || 0;
      return !best || score > best.score ? { name: c.name, score } : best;
    }, null)?.name;

  visible.forEach((c) => {
    const tldMap = state.availability[c.name] || {};
    const anyAvailable = state.selectedTlds.some((t) => tldMap[t] === true);
    // "Taken" just means nothing came back available -- it used to also
    // require every selected TLD to individually resolve false, but .io/.co
    // have no public RDAP and can *only* ever resolve null, so that
    // requirement made isTaken nearly unreachable whenever they were part
    // of the selection (the default always includes them). .com is always
    // in the selection and always has real RDAP, so if nothing's available,
    // .com is necessarily a confirmed "false" -- !anyAvailable alone is
    // both sufficient and accurate.
    const isTaken = !anyAvailable;

    const available = state.selectedTlds.filter((t) => tldMap[t] === true);
    // Prefer a confirmed-available TLD (com first). Reachable here only
    // when isTaken is false (i.e. available.length >= 1), so this never
    // falls back to a TLD we've confirmed is taken.
    const bestTld = available.includes('com') ? 'com' : (available[0] || state.selectedTlds[0] || 'com');
    const domain = `${c.name}.${bestTld}`;
    const dynadotUrl = DYNADOT.searchUrl(domain);

    const wrap = document.createElement('div');
    wrap.className = 'name-card-wrap';
    wrap.dataset.name = c.name;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'name-card' + (isTaken ? ' is-taken' : '');
    // Not the native `disabled` attribute: real browsers refuse to dispatch
    // click events to ANY descendant of a disabled button (confirmed via a
    // real Chromium test), which would silently break the score-ring popover
    // and any unknown-TLD "check" pills nested inside a taken card. aria-disabled
    // + tabIndex=-1 keeps the card itself out of tab order and announced as
    // disabled to assistive tech, without killing its interactive children --
    // the card has no click listener attached below when taken anyway, so
    // nothing is lost by leaving it technically "enabled".
    if (isTaken) {
      card.setAttribute('aria-disabled', 'true');
      card.tabIndex = -1;
    }

    const tldPills = state.selectedTlds.map((tld) => {
      const status = tldMap[tld];
      const price = TLD_PRICING[tld];
      const priceHtml = price ? `<span class="tld-pill-price">$${price.usd.toFixed(2)}</span>` : '';
      const priceSpoken = price ? ` — $${price.usd.toFixed(2)}/yr` : '';

      if (status === true || status === false) {
        if (!status) return `<span class="tld-pill taken">.${escapeHtml(tld)}</span>`;
        return `<span class="tld-pill available">.${escapeHtml(tld)}${priceHtml}</span>`;
      }
      // No public registry publishes live availability for this extension
      // (e.g. .io/.co) -- a real click-out CTA instead of a dead "Unknown"
      // label, since these are often the highest-commission extensions.
      // role="link" (not a real <a>) because this sits inside the card's
      // own <button>; see the brand-score-badge pattern below for why.
      return `<span class="tld-pill unknown unknown-cta" role="link" tabindex="0"
        data-name="${escapeHtml(c.name)}" data-tld="${escapeHtml(tld)}"
        aria-label="Check ${escapeHtml(c.name)}.${escapeHtml(tld)} on Dynadot${priceSpoken} — no live availability data for this extension"
        title="No live registry data for .${escapeHtml(tld)} — check on Dynadot">.${escapeHtml(tld)}${priceHtml} ${ICONS.externalLink}</span>`;
    }).join('');

    const tagsLine = (c.tags || []).length
      ? `<p class="card-tags-line">${c.tags.map((t) => escapeHtml(t)).join(' · ')}</p>`
      : '';

    const scoreBadge = renderScoreBadge(c.brand_score);
    const isTopPick = !isTaken && c.name === topPickName;

    card.innerHTML = `
      <div class="card-top-row">
        <span class="card-style-tag ${c.style}">${escapeHtml(c.style)}</span>
      </div>
      <div class="card-name-row">
        <span class="card-name">${escapeHtml(c.name)}</span>
        ${scoreBadge}
      </div>
      ${c.insight ? `<p class="card-insight">${escapeHtml(c.insight)}</p>` : ''}
      ${tagsLine}
      <div class="tld-status-row">${tldPills}</div>
      ${!isTaken ? `
        <div class="card-footer">
          <span>Register ${escapeHtml(c.name)}.${escapeHtml(bestTld)}</span>
          <span class="card-footer-cta">on Dynadot ${ICONS.externalLink}</span>
        </div>
      ` : ''}
      ${isTopPick ? '<span class="card-ribbon">★ Top pick</span>' : ''}
    `;

    if (!isTaken) {
      card.addEventListener('click', () => {
        markAllDoneProgress();
        showUpsellBanner();
        // Open synchronously, in the same tick as the click -- awaiting the
        // log call first (the old behavior) risked browsers treating the
        // popup as not user-initiated and blocking it. logEvent uses
        // sendBeacon, so it doesn't need to be awaited at all.
        window.open(dynadotUrl, '_blank', 'noopener');
        logEvent('card_clicked', { name: c.name, tld: bestTld, wasUnverifiedTld: available.length === 0, registrar: 'dynadot' });
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
    } else {
      // The direct name is gone, but it may still be sitting in Dynadot's
      // aftermarket (expired/backorder/listed-for-sale) -- a second
      // monetizable path instead of a plain dead end. This is a sibling of
      // the card button, not a descendant -- an <a> nested inside a button
      // is invalid HTML regardless, same reasoning as the save/risk buttons
      // above. Styled to read as one seamless card with the button anyway.
      const marketDomain = `${c.name}.${bestTld}`;
      const footer = document.createElement('div');
      footer.className = 'card-taken-footer';
      footer.innerHTML = `
        <span class="card-taken-label">Nothing came back available</span>
        <a class="card-taken-footer-link" href="${DYNADOT.marketSearchUrl(marketDomain)}" target="_blank" rel="noopener noreferrer">Check aftermarket ${ICONS.externalLink}</a>
      `;
      footer.querySelector('.card-taken-footer-link').addEventListener('click', () => {
        // Same "leaving to Dynadot" milestone as the register click and the
        // unknown-TLD check CTA below -- all three exits deserve the same
        // progress/upsell treatment, not just the primary register path.
        markAllDoneProgress();
        showUpsellBanner();
        logEvent('aftermarket_checked', { name: c.name, tld: bestTld });
      });
      wrap.appendChild(footer);
    }

    grid.appendChild(wrap);
  });
}

// ---------- Hero typewriter ----------

(function () {
  const el = document.getElementById('hero-word');
  if (!el) return;
  // Respect the OS-level reduced-motion preference -- leave the word
  // (and cursor) static instead of continuously animating.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
            <a class="hp-card hp-avail" href="${DYNADOT.searchUrl(domain)}" target="_blank" rel="noopener noreferrer" data-name="${escapeHtml(d.name)}" data-tld="${escapeHtml(d.tld)}" aria-label="Register ${escapeHtml(domain)} on Dynadot">${inner}
            </a>`;
        })
        .join('');

      grid.querySelectorAll('a.hp-card.hp-avail').forEach((link) => {
        link.addEventListener('click', () => {
          logEvent('hero_preview_click', { name: link.dataset.name, tld: link.dataset.tld, registrar: 'dynadot' });
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
// app rather than a jarring browser popup. 6s (not the original 4s) gives
// enough breathing room that a brief distraction doesn't silently cancel
// the confirmation; clicking anywhere else cancels it immediately instead
// of leaving the button sitting in its alarming "confirm" state until the
// timeout catches up.
startOverBtn.addEventListener('click', () => {
  if (!startOverBtn.classList.contains('is-confirming')) {
    startOverBtnLabel.textContent = 'Click to confirm';
    startOverBtn.classList.add('is-confirming');
    startOverConfirmTimer = setTimeout(resetStartOverButton, 6000);
    return;
  }
  clearWizardState();
  resetWizardToStart();
  resetStartOverButton();
});

document.addEventListener('click', (e) => {
  if (!startOverBtn.classList.contains('is-confirming')) return;
  if (e.target === startOverBtn || startOverBtn.contains(e.target)) return;
  resetStartOverButton();
});

function resetWizardToStart() {
  clearNamesPrefetch();
  setRandomDescriptionPlaceholder();
  pendingResumeDraft = null;
  resumeBannerOffered = false;
  document.getElementById('resume-banner-offer').hidden = false;
  document.getElementById('resume-banner-status').hidden = true;
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
  validateDescription();

  document.querySelector('input[name="tone"][value="professional"]').checked = true;
  document.getElementById('exclude').value = '';
  document.querySelectorAll('input[name="tld"]').forEach((cb) => {
    if (cb.value !== 'com') cb.checked = ['io', 'co', 'ai'].includes(cb.value);
  });
  document.querySelectorAll('.sort-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.sort === 'availability');
    b.setAttribute('aria-pressed', String(b.dataset.sort === 'availability'));
  });
  state.hideTaken = false;
  document.getElementById('hide-taken-toggle').checked = false;

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

// Applies a previously-saved draft (see loadPendingResumeDraft() below for
// when this actually gets called) -- replays the same step-completion UI the
// normal flow produces rather than re-fetching from the API (the whole point
// is to avoid losing/re-paying for a generation), then falls through to
// whichever step was still in flight when the draft was saved.
async function applyResumeDraft(saved) {
  state.description = saved.description;
  state.tone = saved.tone || 'professional';
  state.exclude = saved.exclude || '';
  state.category = saved.category;
  state.selectedTlds = Array.isArray(saved.selectedTlds) && saved.selectedTlds.length ? saved.selectedTlds : ['com'];
  state.candidates = Array.isArray(saved.candidates) ? saved.candidates : [];
  state.availability = saved.availability || {};
  state.sortMode = saved.sortMode === 'score' ? 'score' : 'availability';
  state.hideTaken = !!saved.hideTaken;
  state.step = saved.step;

  setStepState(1, 'done');
  setSummary(1, `
    <span>"${escapeHtml(state.description)}" · ${escapeHtml(state.category)} · ${escapeHtml(state.tone)}</span>
    <button type="button" class="btn-edit" data-edit-step="1">${ICONS.edit} Edit</button>
  `);

  document.querySelectorAll('input[name="tld"]').forEach((cb) => {
    if (cb.value !== 'com') cb.checked = state.selectedTlds.includes(cb.value);
  });
  document.querySelectorAll('.sort-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.sort === state.sortMode);
    b.setAttribute('aria-pressed', String(b.dataset.sort === state.sortMode));
  });
  document.getElementById('hide-taken-toggle').checked = state.hideTaken;

  // Shown immediately, before the awaits below -- someone resuming mid-generation
  // or mid-availability-check should be able to bail out during that wait, same
  // as the normal (non-restore) flow already lets them.
  showStartOverButton();
  updateResumeBanner();

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
    // Awaited so the resume-banner text below reflects wherever this
    // actually lands (step 4 on success, still step 3 if it fails) instead
    // of freezing on the step number captured before it resolved.
    await checkAvailability();
  } else {
    // Refresh landed mid-generation — nothing cached yet, just re-run it.
    setStepState(2, 'active');
    // Also awaited, for the same reason -- generateNames() itself now awaits
    // its own trailing checkAvailability() call (see there), so this carries
    // state.step all the way to its real resting point before we read it.
    await generateNames();
  }

  // state.step may have moved on past what updateResumeBanner() showed
  // above (2→3→4 as generation/availability-checking finished in the
  // background) -- correct it to wherever things actually landed, success
  // or failure, instead of leaving the number shown pre-resume frozen.
  updateResumeBanner();
}

function updateResumeBanner() {
  document.getElementById('resume-banner-step').textContent = String(Math.min(state.step, 4));
  document.getElementById('resume-banner').hidden = false;
}

// Fire once per browser session (not on every refresh) -- getSessionId()
// creates and persists the id in sessionStorage the first time it's called,
// so its absence here means this is a genuinely new visit.
let isNewSession = false;
try {
  isNewSession = !sessionStorage.getItem(SESSION_ID_KEY);
} catch {}
if (isNewSession) logEvent('session_start', { path: location.pathname });

loadPendingResumeDraft();

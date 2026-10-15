(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const state = { source: [], synthetic: [], sourceName: 'Customer Records.csv', syntheticName: 'Synthetic v1.csv', results: null, features: [] };
  const viewNames = { overview: 'OVERVIEW', utility: 'UTILITY', privacy: 'PRIVACY RISK', coverage: 'SUBGROUP COVERAGE', data: 'DATASETS', method: 'METHOD & LIMITS' };
  const demoSource = [
    ['age','region','plan','monthly_spend','visits_30d','tenure_months','support_tickets','device'],
    [22,'North','Basic',420,8,4,3,'Android'],[29,'West','Plus',980,16,18,1,'iOS'],[35,'Central','Basic',640,11,30,2,'Android'],[41,'East','Premium',1850,23,48,0,'iOS'],[53,'West','Plus',1120,14,66,1,'Android'],[31,'South','Basic',540,9,22,4,'Web'],[27,'North','Plus',875,18,12,1,'Android'],[46,'Central','Premium',1640,21,57,0,'iOS'],[38,'East','Plus',1040,15,39,2,'Web'],[24,'South','Basic',390,7,7,3,'Android'],[58,'West','Premium',2100,24,84,0,'iOS'],[33,'North','Plus',920,17,27,1,'Web'],[44,'Central','Basic',720,10,53,2,'Android'],[26,'East','Basic',470,8,10,5,'Android'],[49,'South','Premium',1760,22,70,1,'iOS'],[37,'West','Plus',1190,19,35,2,'Web'],[61,'North','Premium',1980,20,93,0,'iOS'],[28,'Central','Basic',510,9,15,3,'Android'],[42,'East','Plus',1070,16,50,1,'Web'],[34,'South','Plus',940,15,29,2,'Android'],[56,'West','Premium',2240,25,78,0,'iOS'],[30,'North','Basic',590,12,20,4,'Web'],[47,'Central','Plus',1280,18,62,1,'Android'],[39,'East','Premium',1580,20,43,0,'iOS']
  ];
  const demoSynthetic = [
    ['age','region','plan','monthly_spend','visits_30d','tenure_months','support_tickets','device'],
    [23,'North','Basic',450,9,5,2,'Android'],[30,'West','Plus',940,15,19,1,'iOS'],[36,'Central','Basic',670,12,31,2,'Android'],[40,'East','Premium',1770,21,46,1,'iOS'],[51,'West','Plus',1080,14,64,2,'Android'],[32,'South','Basic',580,10,23,3,'Web'],[28,'North','Plus',900,17,13,2,'Android'],[45,'Central','Premium',1590,20,56,1,'iOS'],[39,'East','Plus',1110,16,40,2,'Web'],[25,'South','Basic',430,8,8,4,'Android'],[55,'West','Premium',1950,23,79,1,'iOS'],[34,'North','Plus',960,18,28,2,'Web'],[43,'Central','Basic',750,11,52,2,'Android'],[27,'East','Basic',490,9,11,4,'Android'],[48,'South','Premium',1690,21,69,2,'iOS'],[38,'West','Plus',1160,18,36,2,'Web'],[58,'North','Premium',1880,21,90,1,'iOS'],[29,'Central','Basic',550,10,16,3,'Android'],[41,'East','Plus',1130,17,51,2,'Web'],[35,'South','Plus',970,14,30,3,'Android'],[53,'West','Premium',2040,24,76,1,'iOS'],[31,'North','Basic',620,12,21,3,'Web'],[46,'Central','Plus',1250,19,61,2,'Android'],[40,'East','Premium',1530,19,44,1,'iOS']
  ];

  function rowsFromMatrix(matrix) {
    const headers = matrix[0];
    return matrix.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
  }
  function loadDemo() {
    state.source = rowsFromMatrix(demoSource);
    state.synthetic = rowsFromMatrix(demoSynthetic);
    state.sourceName = 'Customer Records.csv';
    state.syntheticName = 'Synthetic v1.csv';
    $('[data-file-name="source"]').textContent = `${state.sourceName} · demo`;
    $('[data-file-name="synthetic"]').textContent = `${state.syntheticName} · demo`;
    syncDatasetLabels();
    runAnalysis(true);
    notify('Sample datasets loaded. Try a view in the left rail.');
  }
  function syncDatasetLabels() {
    const shared = getSharedColumns();
    $('[data-source-name]').textContent = state.sourceName;
    $('[data-synthetic-name]').textContent = state.syntheticName;
    $('[data-source-meta]').textContent = `${state.source.length.toLocaleString()} rows · ${Object.keys(state.source[0] || {}).length} features`;
    $('[data-synthetic-meta]').textContent = `${state.synthetic.length.toLocaleString()} rows · ${Object.keys(state.synthetic[0] || {}).length} features`;
    $('[data-schema-state]').textContent = shared.length ? `${shared.length} SHARED` : 'NO MATCH';
    $('[data-schema-list]').innerHTML = shared.length ? shared.map(k => `<span class="schema-chip is-shared">✓ ${escapeHTML(k)}</span>`).join('') : '<span class="schema-chip is-missing">No shared column names found yet.</span>';
    const sourceKeys = new Set(Object.keys(state.source[0] || {}));
    Object.keys(state.synthetic[0] || {}).filter(k => !sourceKeys.has(k)).forEach(k => $('[data-schema-list]').insertAdjacentHTML('beforeend', `<span class="schema-chip is-missing">+ ${escapeHTML(k)} · synthetic only</span>`));
    populateFeatureControls();
  }
  function getSharedColumns() {
    const a = Object.keys(state.source[0] || {}), b = new Set(Object.keys(state.synthetic[0] || {}));
    return a.filter(k => b.has(k));
  }
  function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function parseCSV(text) {
    const input = text.replace(/^\uFEFF/, '');
    const matrix = []; let row = [], field = '', quoted = false;
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (quoted) {
        if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"' && field.length === 0) quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && input[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(v => String(v).trim() !== '')) matrix.push(row);
        row = [];
      } else field += c;
    }
    row.push(field); if (row.some(v => String(v).trim() !== '')) matrix.push(row);
    if (quoted) throw new Error('This CSV has an unclosed quoted value.');
    if (matrix.length < 2) throw new Error('This CSV needs a header row and at least one data row.');
    const headers = matrix[0].map((h, i) => String(h).trim() || `column_${i + 1}`);
    if (new Set(headers).size !== headers.length) throw new Error('Column names must be unique.');
    return matrix.slice(1).map(cells => Object.fromEntries(headers.map((h, i) => [h, parseCell(cells[i] ?? '')])));
  }
  function parseCell(value) {
    const v = String(value).trim(); if (!v) return null;
    const normalized = v.replace(/,/g, '');
    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return Number(normalized);
    return v;
  }
  function isNumericFeature(rows, key) {
    const values = rows.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== '');
    return values.length > 0 && values.filter(v => typeof v === 'number' && Number.isFinite(v)).length / values.length >= .8;
  }
  function featureType(key) { return isNumericFeature(state.source, key) && isNumericFeature(state.synthetic, key) ? 'numeric' : 'category'; }
  function mean(values) { return values.reduce((a, b) => a + b, 0) / (values.length || 1); }
  function deviation(values, avg = mean(values)) { return Math.sqrt(mean(values.map(v => (v - avg) ** 2))); }
  function frequencies(rows, key) {
    const counts = new Map(); let n = 0;
    rows.forEach(r => { const val = r[key]; if (val === null || val === undefined || val === '') return; const k = String(val); counts.set(k, (counts.get(k) || 0) + 1); n++; });
    return { counts, n, proportions: new Map([...counts].map(([k, v]) => [k, v / (n || 1)])) };
  }
  function compareFeature(key) {
    const type = featureType(key);
    if (type === 'numeric') {
      const a = state.source.map(r => r[key]).filter(Number.isFinite), b = state.synthetic.map(r => r[key]).filter(Number.isFinite);
      const ma = mean(a), mb = mean(b), sa = deviation(a, ma), sb = deviation(b, mb);
      const scale = Math.max(sa, Math.abs(ma) * .05, 1e-6);
      const meanDelta = Math.abs(ma - mb) / scale, spreadDelta = Math.abs(sa - sb) / Math.max(sa, Math.abs(ma) * .05, 1e-6);
      const match = clamp(1 - (.7 * Math.min(1, meanDelta) + .3 * Math.min(1, spreadDelta)), 0, 1);
      return { key, type, match, drift: 1 - match, sourceSummary: `${fmt(ma)} ± ${fmt(sa)}`, syntheticSummary: `${fmt(mb)} ± ${fmt(sb)}`, sourceValues: a, syntheticValues: b };
    }
    const a = frequencies(state.source, key), b = frequencies(state.synthetic, key), keys = new Set([...a.counts.keys(), ...b.counts.keys()]);
    const tvd = [...keys].reduce((sum, k) => sum + Math.abs((a.proportions.get(k) || 0) - (b.proportions.get(k) || 0)), 0) / 2;
    const sourceMode = [...a.counts].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '—';
    const synMode = [...b.counts].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '—';
    return { key, type, match: clamp(1 - tvd, 0, 1), drift: tvd, sourceSummary: sourceMode, syntheticSummary: synMode, sourceFreq: a.proportions, syntheticFreq: b.proportions, categories: [...keys] };
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function fmt(n) { return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
  function sampleRows(rows, max = 300) {
    if (rows.length <= max) return rows;
    const step = (rows.length - 1) / (max - 1); return Array.from({ length: max }, (_, i) => rows[Math.round(i * step)]);
  }
  function recordKey(row, cols) { return cols.map(k => String(row[k] ?? '').trim().toLowerCase()).join('\u001f'); }
  function privacyScreen(cols) {
    const source = sampleRows(state.source), synthetic = sampleRows(state.synthetic);
    const sourceKeys = new Set(source.map(r => recordKey(r, cols)));
    const exact = synthetic.filter(r => sourceKeys.has(recordKey(r, cols))).length;
    const numeric = cols.filter(k => featureType(k) === 'numeric');
    const ranges = Object.fromEntries(numeric.map(k => { const vals = state.source.map(r => r[k]).filter(Number.isFinite); return [k, Math.max(...vals) - Math.min(...vals) || 1]; }));
    const scores = synthetic.map(s => {
      let nearest = 0;
      source.forEach(o => {
        let distance = 0, dimensions = 0;
        cols.forEach(k => {
          const x = s[k], y = o[k]; if (x === null || y === null || x === undefined || y === undefined) return;
          dimensions++;
          distance += featureType(k) === 'numeric' ? Math.min(1, Math.abs(Number(x) - Number(y)) / ranges[k]) : (String(x).toLowerCase() === String(y).toLowerCase() ? 0 : 1);
        });
        if (dimensions) nearest = Math.max(nearest, 1 - distance / dimensions);
      });
      return nearest;
    });
    return { exact, screened: synthetic.length, sourceScreened: source.length, avgSimilarity: mean(scores), highSimilarity: scores.filter(s => s >= .85).length };
  }
  function runAnalysis(quiet = false) {
    if (!state.source.length || !state.synthetic.length) { notify('Add both datasets before running an analysis.'); return; }
    const shared = getSharedColumns();
    if (!shared.length) { notify('The two files need at least one column name in common.'); return; }
    const runState = $('[data-run-state]'); runState.classList.add('is-working'); runState.innerHTML = '<i></i> ANALYZING';
    requestAnimationFrame(() => {
      try {
        state.features = shared.map(compareFeature);
        const utility = mean(state.features.map(f => f.match));
        const privacy = privacyScreen(shared);
        const categorical = state.features.filter(f => f.type === 'category');
        const coverage = categorical.length ? mean(categorical.map(f => f.match)) : null;
        state.results = { utility, privacy, coverage, features: state.features, shared, sourceRows: state.source.length, syntheticRows: state.synthetic.length, timestamp: new Date().toISOString() };
        paintResults();
        runState.classList.remove('is-working'); runState.innerHTML = '<i></i> ANALYSIS READY';
        $('[data-stage-status]').textContent = `COMPARISON COMPLETE · ${shared.length} SHARED FEATURES`;
        if (!quiet) notify('Analysis complete. Explore utility, privacy, or coverage.');
      } catch (err) {
        console.error(err); runState.classList.remove('is-working'); runState.innerHTML = '<i></i> CHECK DATA'; notify(`Could not analyze these files: ${err.message}`);
      }
    });
  }
  function paintResults() {
    const r = state.results; if (!r) return;
    setScore('utility', r.utility, 'Pattern similarity');
    const privacyScore = clamp(r.privacy.avgSimilarity * .7 + (r.privacy.exact / Math.max(1, r.privacy.screened)) * .3, 0, 1);
    setScore('privacy', privacyScore, r.privacy.avgSimilarity > .85 ? 'High similarity · review' : 'Similarity screen only');
    if (r.coverage === null) { $('[data-score-coverage]').innerHTML = 'N/A'; $('[data-score-bar="coverage"]').style.width = '0'; $('[data-score-coverage-label]').textContent = 'No categorical fields detected'; }
    else setScore('coverage', r.coverage, 'Category proportion match');
    $('[data-mini-utility]').textContent = `${Math.round(r.utility * 100)}`;
    $('[data-mini-privacy]').textContent = `${Math.round(r.privacy.avgSimilarity * 100)}`;
    $('[data-mini-coverage]').textContent = r.coverage === null ? '—' : `${Math.round(r.coverage * 100)}`;
    window.updatePrismScores?.({ utility: r.utility, risk: r.privacy.avgSimilarity, coverage: r.coverage ?? .5 });
    $('[data-stage-status]').textContent = `ANALYSIS COMPLETE · ${r.shared.length} SHARED FEATURES`;
    $('[data-verdict-title]').textContent = r.privacy.avgSimilarity > .85 || r.privacy.exact ? 'Review close records.' : r.utility < .72 ? 'Look for lost patterns.' : 'Compare the trade-offs.';
    $('[data-verdict-copy]').textContent = `${r.shared.length} shared features were compared. Review the nearest-record screen and group distribution before using this synthetic dataset.`;
    $('[data-feature-snapshot]').innerHTML = r.features.slice(0, 6).map(f => `<div class="feature-row"><b title="${escapeHTML(f.key)}">${escapeHTML(f.key)}</b><span class="mini-bars"><i style="width:${f.match * 50}%"></i><em style="width:${f.match * 50}%"></em></span><span class="feature-drift">${Math.round(f.drift * 100)}% drift</span><span class="feature-drift">${Math.round(f.match * 100)}</span></div>`).join('');
    const privacyPct = Math.round(r.privacy.avgSimilarity * 100);
    $('[data-near-match]').innerHTML = `${privacyPct}<small>%</small>`;
    const level = $('[data-privacy-level]'); level.className = `pill ${privacyPct >= 85 ? 'is-high' : privacyPct >= 65 ? 'is-review' : 'is-low'}`; level.textContent = privacyPct >= 85 ? 'REVIEW CLOSE MATCHES' : privacyPct >= 65 ? 'MODERATE SIMILARITY' : 'LOWER SIMILARITY';
    $('[data-exact-matches]').textContent = `${r.privacy.exact} / ${r.privacy.screened}`;
    $('[data-screen-count]').textContent = `${r.privacy.sourceScreened} × ${r.privacy.screened}`;
    $('[data-screen-features]').textContent = r.shared.length;
    $('[data-privacy-list]').innerHTML = `<div class="privacy-result-row"><span>Exact source-row overlap</span><b>${(100 * r.privacy.exact / Math.max(1, r.privacy.screened)).toFixed(1)}%</b><b>${r.privacy.exact} sampled records</b></div><div class="privacy-result-row"><span>Rows with similarity ≥ 85%</span><b>${r.privacy.highSimilarity}</b><b>Review candidates</b></div><div class="privacy-result-row"><span>Mean closest-row similarity</span><b>${privacyPct}%</b><b>Higher means closer</b></div>`;
    populateFeatureControls(); renderUtility(); renderCoverage();
  }
  function setScore(key, value, label) {
    const n = Math.round(value * 100); $(`[data-score-${key}]`).innerHTML = `${n}<small>/100</small>`;
    $(`[data-score-bar="${key}"]`).style.width = `${n}%`; $(`[data-score-${key}-label]`).textContent = label;
  }
  function populateFeatureControls() {
    if (!state.source.length || !state.synthetic.length) return;
    const shared = getSharedColumns();
    const featureSelect = $('[data-feature-select]');
    if (featureSelect) {
      const prev = featureSelect.value; featureSelect.innerHTML = '<option value="">All features</option>' + shared.map(k => `<option value="${escapeHTML(k)}">${escapeHTML(k)}</option>`).join('');
      if (shared.includes(prev)) featureSelect.value = prev;
    }
    const groupSelect = $('[data-group-select]');
    if (groupSelect) {
      const categorical = shared.filter(k => featureType(k) === 'category'), prev = groupSelect.value;
      groupSelect.innerHTML = '<option value="">Choose a feature</option>' + categorical.map(k => `<option value="${escapeHTML(k)}">${escapeHTML(k)}</option>`).join('');
      groupSelect.value = categorical.includes(prev) ? prev : (categorical.includes('region') ? 'region' : categorical[0] || '');
    }
  }
  function renderUtility() {
    if (!state.results) return;
    const selected = $('[data-feature-select]')?.value;
    const features = selected ? state.features.filter(f => f.key === selected) : state.features;
    $('[data-utility-table]').innerHTML = features.map(f => `<tr><td>${escapeHTML(f.key)}</td><td>${f.type}</td><td>${escapeHTML(f.sourceSummary)}</td><td>${escapeHTML(f.syntheticSummary)}</td><td>${(f.drift * 100).toFixed(1)}%</td><td><span class="match-chip">${Math.round(f.match * 100)} / 100</span></td></tr>`).join('');
    renderDistribution(features[0]);
  }
  function renderDistribution(feature) {
    const root = $('[data-distribution-chart]'); if (!feature) { root.innerHTML = '<div class="empty-row">No comparable fields.</div>'; return; }
    let categories, a, b;
    if (feature.type === 'numeric') {
      const all = [...feature.sourceValues, ...feature.syntheticValues], min = Math.min(...all), max = Math.max(...all), span = max - min || 1, bins = 12;
      const counts = values => { const out = Array(bins).fill(0); values.forEach(v => out[Math.min(bins - 1, Math.floor((v - min) / span * bins))]++); return out.map(n => n / values.length); };
      a = counts(feature.sourceValues); b = counts(feature.syntheticValues); categories = Array.from({ length: bins }, (_, i) => fmt(min + (i / bins) * span));
    } else {
      const pairs = feature.categories.map(k => [k, feature.sourceFreq.get(k) || 0, feature.syntheticFreq.get(k) || 0]).sort((x, y) => y[1] - x[1]).slice(0, 12);
      categories = pairs.map(x => x[0]); a = pairs.map(x => x[1]); b = pairs.map(x => x[2]);
    }
    const max = Math.max(...a, ...b, .001);
    root.innerHTML = categories.map((name, i) => `<div class="bar-group"><div class="bar-pair"><i class="bar source" style="height:${Math.max(2, a[i] / max * 100)}%" data-value="${(a[i] * 100).toFixed(1)}%"></i><i class="bar synthetic" style="height:${Math.max(2, b[i] / max * 100)}%" data-value="${(b[i] * 100).toFixed(1)}%"></i></div><span class="bar-label" title="${escapeHTML(name)}">${escapeHTML(name)}</span></div>`).join('');
  }
  function renderCoverage() {
    const root = $('[data-coverage-bars]'), summary = $('[data-coverage-summary]'), key = $('[data-group-select]')?.value;
    if (!root || !summary) return;
    if (!key || !state.results) { root.innerHTML = ''; summary.innerHTML = '<div class="empty-row">Choose a categorical feature after loading data.</div>'; return; }
    const fa = frequencies(state.source, key), fb = frequencies(state.synthetic, key), cats = [...new Set([...fa.counts.keys(), ...fb.counts.keys()])].sort((x, y) => (fa.proportions.get(y) || 0) - (fa.proportions.get(x) || 0));
    const tvd = cats.reduce((sum, c) => sum + Math.abs((fa.proportions.get(c) || 0) - (fb.proportions.get(c) || 0)), 0) / 2;
    const missing = cats.filter(c => fa.counts.has(c) && !fb.counts.has(c));
    summary.innerHTML = `<b>${Math.round((1 - tvd) * 100)} / 100</b> proportion match across ${cats.length} observed groups.${missing.length ? ` Missing from synthetic data: <strong>${missing.map(escapeHTML).join(', ')}</strong>.` : ' No source categories are completely absent.'}`;
    root.innerHTML = cats.map(c => { const av = fa.proportions.get(c) || 0, bv = fb.proportions.get(c) || 0; return `<div class="coverage-row"><span title="${escapeHTML(c)}">${escapeHTML(c)}${fb.counts.has(c) ? '' : ' · missing'}</span><div class="compare-track ${fb.counts.has(c) ? '' : 'is-missing'}"><i style="width:${av * 100}%"></i><b style="width:${bv * 100}%"></b></div><span>${(av * 100).toFixed(0)}% → ${(bv * 100).toFixed(0)}%</span></div>`; }).join('');
  }
  function buildReport() {
    const r = state.results; if (!r) return null;
    const privacyScore = clamp(r.privacy.avgSimilarity * .7 + (r.privacy.exact / Math.max(1, r.privacy.screened)) * .3, 0, 1);
    return { product: 'Privacy Prism', createdAt: r.timestamp, source: { name: state.sourceName, rows: state.source.length }, synthetic: { name: state.syntheticName, rows: state.synthetic.length }, metrics: { utilityScore: Math.round(r.utility * 100), privacySimilaritySignal: Math.round(privacyScore * 100), meanNearestNeighborSimilarity: Number(r.privacy.avgSimilarity.toFixed(4)), exactSampledRecordMatches: r.privacy.exact, sampleRowsPerDataset: r.privacy.screened, subgroupCoverageScore: r.coverage === null ? null : Math.round(r.coverage * 100) }, features: r.features.map(f => ({ name: f.key, type: f.type, match: Number(f.match.toFixed(4)), drift: Number(f.drift.toFixed(4)), sourceSummary: f.sourceSummary, syntheticSummary: f.syntheticSummary })), limitations: ['Exploratory moment/proportion and sampled similarity metrics only.', 'Not differential privacy, a privacy guarantee, or a compliance certification.', 'CSV data is processed locally in the active browser tab; raw rows are not included in this report.'] };
  }
  function exportReport(type) {
    const report = buildReport(); if (!report) { notify('Run an analysis before exporting.'); return; }
    const stamp = new Date().toISOString().slice(0, 10);
    if (type === 'csv') {
      const rows = [['Feature','Type','Match score','Drift','Source summary','Synthetic summary'], ...report.features.map(f => [f.name, f.type, f.match, f.drift, f.sourceSummary, f.syntheticSummary])];
      const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
      download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `privacy-prism-summary-${stamp}.csv`);
    } else download(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `privacy-prism-report-${stamp}.json`);
    notify('Analysis summary downloaded. Raw rows are not included.');
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  function notify(message) { const el = $('[data-toast]'); el.textContent = message; el.classList.add('is-visible'); clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.remove('is-visible'), 2600); }
  function setView(view, updateHash = true) {
    if (!viewNames[view]) view = 'overview';
    $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
    $$('.view-panel').forEach(p => p.classList.toggle('is-visible', p.dataset.panel === view));
    $('[data-breadcrumb]').textContent = viewNames[view];
    if (updateHash && location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, 0); else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-view]'); if (nav) { setView(nav.dataset.view); return; }
    const viewLink = e.target.closest('[data-view-link]'); if (viewLink) { setView(viewLink.dataset.viewLink); return; }
    if (e.target.closest('[data-run]')) { runAnalysis(); return; }
    if (e.target.closest('[data-load-demo]')) { loadDemo(); return; }
    const exp = e.target.closest('[data-export]'); if (exp) { exportReport(exp.dataset.export); return; }
    if (e.target.closest('[data-theme-toggle]')) { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('privacy-prism-theme', theme); } catch {} $('.theme-toggle span').textContent = theme === 'dark' ? 'LIGHT' : 'DARK'; return; }
  });
  $('[data-feature-select]')?.addEventListener('change', renderUtility);
  $('[data-group-select]')?.addEventListener('change', renderCoverage);
  $$('[data-file]').forEach(input => input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error('CSV exceeds the 30 MB browser limit.');
      const rows = parseCSV(await file.text());
      if (input.dataset.file === 'source') { state.source = rows; state.sourceName = file.name; }
      else { state.synthetic = rows; state.syntheticName = file.name; }
      $(`[data-file-name="${input.dataset.file}"]`).textContent = `${file.name} · ${rows.length.toLocaleString()} rows`;
      syncDatasetLabels(); $('[data-stage-status]').textContent = 'DATASET CHANGED · RUN ANALYSIS';
      $('[data-run-state]').innerHTML = '<i></i> ANALYSIS OUT OF DATE';
      notify(`${file.name} loaded locally.`);
    } catch (err) { input.value = ''; notify(err.message); }
  }));
  let initialTheme = 'dark'; try { initialTheme = localStorage.getItem('privacy-prism-theme') || 'dark'; } catch {} document.documentElement.dataset.theme = initialTheme; $('.theme-toggle span').textContent = initialTheme === 'dark' ? 'LIGHT' : 'DARK';
  window.addEventListener('hashchange', () => setView(location.hash.slice(1), false));
  setView(location.hash.slice(1) || 'overview', false);
  loadDemo();
})();

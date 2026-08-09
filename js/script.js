// IXS single-page site — shared interactivity
// Sections carry stable IDs (#overview #credibility #timeline #how-it-works
// #buildout #partnerships #ecosystem #tokenomics #footer) for future
// menu/anchor wiring.

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initTabs();
  initThemeToggle();
  initBuybackBurnModel();
});

// ---------- Dark mode toggle ----------
// The initial theme is set synchronously in <head> (before first paint) to
// avoid a flash. This just wires up the button to flip + persist it.

function initThemeToggle() {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ixs-theme', next); } catch (e) {}
    document.dispatchEvent(new CustomEvent('ixs-themechange', { detail: { theme: next } }));
  });
}

// ---------- Scroll reveal ----------

function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }
}

// ---------- Tabs ----------

function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn[data-tab]');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      const target = document.getElementById(targetId);
      if (!target) return;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = true; });
      target.hidden = false;

      // Panels start hidden, so IntersectionObserver never saw their
      // .reveal children — reveal them immediately on first switch.
      target.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ---------- Buyback & Burn revenue-stream model ----------
//
// Default figures on this tab reproduce a public, independent back-of-
// envelope breakdown of five IXS distribution channels (BTC Real Yield,
// Institutional RWA Products, Exchange Integrations, Super-apps & Fintech,
// AI Agents) that together land around ~$1.8-2B in modeled RWA TVL. See
// the in-page disclaimer — these are illustrative, not official figures.

function initBuybackBurnModel() {
  const $ = (id) => document.getElementById(id);
  if (!$('tab-model')) return;

  const fmtUSD = (n) => {
    if (!isFinite(n)) n = 0;
    const abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(2);
  };
  const fmtPct = (n, digits = 3) => (isFinite(n) ? n.toFixed(digits) : '0') + '%';

  // Generic: volume -> (optional conversion-rate base) -> fee -> buyback/burn split
  function computeStream({ volumeUsd, basePct = 1, feePct, buybackPct, burnPct }) {
    const base = volumeUsd * basePct;
    const fee = base * feePct;
    const buybackUsd = fee * buybackPct;
    const burnUsd = fee * burnPct;
    return { volumeUsd, base, fee, buybackUsd, burnUsd };
  }

  function readGlobals() {
    return {
      ixsPrice: parseFloat($('ixsPrice').value) || 0.0000001,
      ixsSupply: parseFloat($('ixsSupply').value) || 0,
      buybackPct: (parseFloat($('buybackPct').value) || 0) / 100,
      burnPct: (parseFloat($('burnPct').value) || 0) / 100,
    };
  }

  // [sliderId, displayId, decimals] — reused for live updates and for
  // refreshing labels after a bulk reset.
  const RANGE_LABELS = [
    ['buybackPct', 'buybackPctVal', 0],
    ['burnPct', 'burnPctVal', 0],
    ['btc_adoptionPct', 'btc_adoptionPctVal', 2],
    ['btc_ltv', 'btc_ltvVal', 0],
    ['btc_feePct', 'btc_feePctVal', 2],
    ['vaults_feePct', 'vaults_feePctVal', 2],
    ['exch_feePct', 'exch_feePctVal', 2],
    ['line_adoptionPct', 'line_adoptionPctVal', 2],
    ['line_feePct', 'line_feePctVal', 2],
    ['agents_feePct', 'agents_feePctVal', 2],
  ];

  function refreshRangeLabel(sliderId, displayId, decimals) {
    const el = $(sliderId);
    if (!el || !$(displayId)) return;
    const val = decimals ? Number(el.value).toFixed(decimals) : el.value;
    $(displayId).textContent = val;
  }

  RANGE_LABELS.forEach(([sliderId, displayId, decimals]) => {
    const el = $(sliderId);
    if (!el) return;
    el.addEventListener('input', () => { refreshRangeLabel(sliderId, displayId, decimals); recalcAll(); });
    refreshRangeLabel(sliderId, displayId, decimals);
  });

  // Number inputs also trigger recalculation
  [
    'ixsPrice', 'ixsSupply',
    'btc_availablePool', 'vaults_tvl', 'exch_volume',
    'line_users', 'line_avgDeposit', 'agents_tvl',
  ].forEach(id => { if ($(id)) $(id).addEventListener('input', recalcAll); });

  // Thread-derived scenario defaults, keyed by input id — used by the
  // "Reset to thread scenario" button.
  const SCENARIO_DEFAULTS = {
    ixsPrice: '0.07', ixsSupply: '180000000', buybackPct: '20', burnPct: '10',
    btc_availablePool: '47000000000', btc_adoptionPct: '1.06', btc_ltv: '75', btc_feePct: '0.75',
    vaults_tvl: '500000000', vaults_feePct: '0.75',
    exch_volume: '500000000', exch_feePct: '0.75',
    line_users: '180000000', line_adoptionPct: '1.11', line_avgDeposit: '150', line_feePct: '0.75',
    agents_tvl: '100000000', agents_feePct: '0.75',
  };

  const resetBtn = $('resetScenarioBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Object.entries(SCENARIO_DEFAULTS).forEach(([id, val]) => { if ($(id)) $(id).value = val; });
      RANGE_LABELS.forEach(([sliderId, displayId, decimals]) => refreshRangeLabel(sliderId, displayId, decimals));
      recalcAll();
    });
  }

  let chart;

  function recalcAll() {
    const g = readGlobals();

    // Stream 1 — BTC Real Yield (via BitGo): BTC in custody -> adoption ->
    // collateral -> % converted to productive RWA exposure -> fee.
    const btc = computeStream({
      volumeUsd: (parseFloat($('btc_availablePool').value) || 0) * ((parseFloat($('btc_adoptionPct').value) || 0) / 100),
      basePct: (parseFloat($('btc_ltv').value) || 0) / 100,
      feePct: (parseFloat($('btc_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('btc_outVolume').textContent = fmtUSD(btc.volumeUsd);
    if ($('btc_outRwaExposure')) $('btc_outRwaExposure').textContent = fmtUSD(btc.base);
    $('btc_outFee').textContent = fmtUSD(btc.fee);
    $('btc_outBuyback').textContent = fmtUSD(btc.buybackUsd);
    $('btc_outBurn').textContent = fmtUSD(btc.burnUsd);

    // Stream 2 — Institutional RWA Products: TVL -> fee directly
    const vaults = computeStream({
      volumeUsd: parseFloat($('vaults_tvl').value) || 0,
      basePct: 1,
      feePct: (parseFloat($('vaults_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('vaults_outVolume').textContent = fmtUSD(vaults.base);
    $('vaults_outFee').textContent = fmtUSD(vaults.fee);
    $('vaults_outBuyback').textContent = fmtUSD(vaults.buybackUsd);
    $('vaults_outBurn').textContent = fmtUSD(vaults.burnUsd);

    // Stream 3 — Exchange integrations: deployed volume -> fee directly
    const exch = computeStream({
      volumeUsd: parseFloat($('exch_volume').value) || 0,
      basePct: 1,
      feePct: (parseFloat($('exch_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('exch_outVolume').textContent = fmtUSD(exch.base);
    $('exch_outFee').textContent = fmtUSD(exch.fee);
    $('exch_outBuyback').textContent = fmtUSD(exch.buybackUsd);
    $('exch_outBurn').textContent = fmtUSD(exch.burnUsd);

    // Stream 4 — Super-apps & Fintech (LINE + fintech/neobank/wallet/PayFi
    // reach): users x adoption x avg deposit -> fee.
    const lineUsers = parseFloat($('line_users').value) || 0;
    const lineAdoption = (parseFloat($('line_adoptionPct').value) || 0) / 100;
    const lineAvgDeposit = parseFloat($('line_avgDeposit').value) || 0;
    const line = computeStream({
      volumeUsd: lineUsers * lineAdoption * lineAvgDeposit,
      basePct: 1,
      feePct: (parseFloat($('line_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('line_outVolume').textContent = fmtUSD(line.base);
    $('line_outFee').textContent = fmtUSD(line.fee);
    $('line_outBuyback').textContent = fmtUSD(line.buybackUsd);
    $('line_outBurn').textContent = fmtUSD(line.burnUsd);

    // Stream 5 — AI Agents (agentic.market, circle.agent, Agentic Vaults):
    // deployed agent-vault TVL -> fee directly.
    const agents = computeStream({
      volumeUsd: parseFloat($('agents_tvl').value) || 0,
      basePct: 1,
      feePct: (parseFloat($('agents_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('agents_outVolume').textContent = fmtUSD(agents.base);
    $('agents_outFee').textContent = fmtUSD(agents.fee);
    $('agents_outBuyback').textContent = fmtUSD(agents.buybackUsd);
    $('agents_outBurn').textContent = fmtUSD(agents.burnUsd);

    // Aggregate — TVL is summed on `base` (the post-conversion RWA
    // exposure), not raw collateral, so the BTC channel's $ figure lines
    // up with how the source thread defines "RWA TVL" for that channel.
    const streams = [btc, vaults, exch, line, agents];
    const aggTVL = streams.reduce((s, x) => s + x.base, 0);
    const aggFee = streams.reduce((s, x) => s + x.fee, 0);
    const aggBuyback = streams.reduce((s, x) => s + x.buybackUsd, 0);
    const aggBurn = streams.reduce((s, x) => s + x.burnUsd, 0);
    const totalIxsRemoved = (aggBuyback + aggBurn) / g.ixsPrice;
    const supplyPct = g.ixsSupply > 0 ? (Math.min(totalIxsRemoved, g.ixsSupply) / g.ixsSupply) * 100 : 0;

    $('aggTVL').textContent = fmtUSD(aggTVL);
    $('aggFee').textContent = fmtUSD(aggFee);
    $('aggBuyback').textContent = fmtUSD(aggBuyback);
    $('aggBurn').textContent = fmtUSD(aggBurn);
    $('aggSupplyPct').textContent = fmtPct(supplyPct);

    updateChart(streams);
  }

  // Read live CSS custom properties so the chart follows the current
  // light/dark theme instead of baking in fixed hex colors.
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function updateChart(streams) {
    const canvas = $('streamChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const labels = ['BTC Real Yield', 'Institutional', 'Exchanges', 'Super-apps & Fintech', 'AI Agents'];
    const buybackData = streams.map(s => Math.round(s.buybackUsd));
    const burnData = streams.map(s => Math.round(s.burnUsd));

    const data = {
      labels,
      datasets: [
        {
          label: 'Buyback (USD)',
          data: buybackData,
          backgroundColor: cssVar('--purple') || '#8b7bff',
          borderRadius: 6,
        },
        {
          label: 'Burn (USD)',
          data: burnData,
          backgroundColor: cssVar('--orange') || '#d9600f',
          borderRadius: 6,
        },
      ],
    };

    const inkColor = cssVar('--ink') || '#14141c';
    const dimColor = cssVar('--dim') || '#52525f';
    const gridColor = cssVar('--border-soft') || '#dedee8';

    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: inkColor, font: { size: 11 } } },
      },
      scales: {
        x: { stacked: true, ticks: { color: dimColor, font: { size: 11 } }, grid: { display: false } },
        y: { stacked: true, ticks: { color: dimColor }, grid: { color: gridColor } },
      },
    };

    if (chart) {
      chart.data = data;
      chart.options = options;
      chart.update();
    } else {
      chart = new Chart(ctx, { type: 'bar', data, options });
    }
  }

  // Repaint the chart (and re-read every color) whenever the theme flips.
  document.addEventListener('ixs-themechange', recalcAll);

  recalcAll();
}

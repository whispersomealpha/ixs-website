// IXS single-page site — shared interactivity
// Sections carry stable IDs (#overview #credibility #timeline #how-it-works
// #buildout #partnerships #ecosystem #tokenomics #footer) for future
// menu/anchor wiring.

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initTabs();
  initThemeToggle();
  initBuybackBurnModel();
  initMcComparison();
  initIxsThesisChart();
  initLastUpdated();
  initContractCopy();
});

// ---------- Topbar: click-to-copy $IXS contract address ----------
function initContractCopy() {
  const btn = document.getElementById('contractCopyBtn');
  if (!btn) return;
  const address = btn.dataset.contract;

  function showCopied() {
    btn.classList.add('copied');
    btn.setAttribute('title', 'Copied!');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.setAttribute('title', 'Click to copy the $IXS token contract address');
    }, 1500);
  }

  // Fallback for browsers/contexts without the async Clipboard API
  // (e.g. non-HTTPS previews) — a temporary offscreen textarea + execCommand.
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
  }

  btn.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(address).then(showCopied, () => {
        fallbackCopy(address);
        showCopied();
      });
    } else {
      fallbackCopy(address);
      showCopied();
    }
  });
}

// Compact currency formatter shared by cross-tab widgets (e.g. the MC
// Comparison tab) — top-level so it isn't locked inside another
// function's closure.
function formatUsdCompact(n) {
  if (!isFinite(n)) n = 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

// ---------- Last updated ----------
// No backend here, so relying on the static host's Last-Modified header
// (document.lastModified) proved unreliable across GitHub Pages/Railway.
// Instead, ask GitHub directly for the latest commit on this repo, which
// is a true source of "when was this actually last deployed."
const GITHUB_REPO = 'whispersomealpha/ixs-website';

function initLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (!el) return;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const format = (d) => {
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    return `Last updated ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
  };

  fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((commits) => {
      const dateStr = commits && commits[0] && commits[0].commit && commits[0].commit.committer
        ? commits[0].commit.committer.date
        : null;
      const d = dateStr ? new Date(dateStr) : null;
      el.textContent = d && !isNaN(d.getTime()) ? format(d) : 'Last updated recently';
    })
    .catch((err) => {
      // GitHub API unreachable/rate-limited — fall back to the page's own
      // Last-Modified date rather than showing nothing.
      console.warn('IXS: GitHub last-commit lookup failed, falling back.', err);
      const d = new Date(document.lastModified);
      el.textContent = !isNaN(d.getTime()) ? format(d) : 'Last updated recently';
    });
}

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

      // Charts rendered while their panel was display:none get a 0x0
      // canvas and never fix themselves, so tell any listeners this
      // panel just became visible and needs a resize/redraw.
      document.dispatchEvent(new CustomEvent('ixs-tabshown', { detail: { id: targetId } }));

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ---------- Buyback & Burn revenue-stream model ----------
//
// Default figures on this tab are illustrative starting assumptions across
// five IXS distribution channels (BTC Real Yield, Institutional RWA
// Products, Exchange Integrations, Super-apps & Fintech, IXS Agentic API).
// See the in-page disclaimer — these are placeholders, not official figures.

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
  // Plain-integer fields (pool sizes, user counts) are entered as text so
  // they can show thousands separators — parse by stripping commas first.
  const readNum = (id) => parseFloat(String($(id).value || '').replace(/,/g, '')) || 0;

  // Live comma-formatting for a text input: reformats as the user types
  // while keeping the cursor in a sensible spot.
  function attachThousandsFormatting(id) {
    const el = $(id);
    if (!el) return;
    const format = (raw) => {
      const clean = String(raw).replace(/,/g, '').replace(/[^0-9.]/g, '');
      if (clean === '') return '';
      const [intPart, ...rest] = clean.split('.');
      const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return rest.length ? withCommas + '.' + rest.join('') : withCommas;
    };
    el.value = format(el.value);
    el.addEventListener('input', () => {
      const before = el.value;
      const cursorFromEnd = before.length - (el.selectionStart ?? before.length);
      const formatted = format(before);
      el.value = formatted;
      const pos = Math.max(0, formatted.length - cursorFromEnd);
      el.setSelectionRange(pos, pos);
    });
  }

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
      ixsSupply: readNum('ixsSupply'),
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

  // These fields show thousands separators as you type (390,000 instead
  // of 390000) — attach before the recalc listener below so formatting
  // happens first on every keystroke.
  [
    'ixsSupply', 'btc_availablePool', 'vaults_tvl',
    'exch_volume', 'line_users', 'line_avgDeposit', 'agents_tvl',
  ].forEach(attachThousandsFormatting);

  // Number inputs also trigger recalculation
  [
    'ixsPrice', 'ixsSupply',
    'btc_availablePool', 'vaults_tvl', 'exch_volume',
    'line_users', 'line_avgDeposit', 'agents_tvl',
  ].forEach(id => { if ($(id)) $(id).addEventListener('input', recalcAll); });

  // Thread-derived scenario defaults, keyed by input id — used by the
  // "Reset to thread scenario" button.
  const SCENARIO_DEFAULTS = {
    ixsPrice: '0.07', ixsSupply: '180,000,000', buybackPct: '20', burnPct: '10',
    btc_availablePool: '390,000', btc_adoptionPct: '0.50', btc_ltv: '75', btc_feePct: '0.75',
    vaults_tvl: '1,000', vaults_feePct: '0.75',
    exch_volume: '2,000', exch_feePct: '0.75',
    line_users: '750,000,000', line_adoptionPct: '1.00', line_avgDeposit: '150', line_feePct: '0.75',
    agents_tvl: '5,000', agents_feePct: '0.75',
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

  // Several pool/TVL fields are entered in millions of USD (so users don't
  // have to type out 9-12 digit dollar figures) — convert to raw USD here.
  const readMillions = (id) => readNum(id) * 1e6;

  function recalcAll() {
    const g = readGlobals();

    // Stream 1 — BTC Real Yield (via BitGo): BTC in custody -> adoption ->
    // collateral -> % converted to productive RWA exposure -> fee.
    const btc = computeStream({
      volumeUsd: readMillions('btc_availablePool') * ((parseFloat($('btc_adoptionPct').value) || 0) / 100),
      basePct: (parseFloat($('btc_ltv').value) || 0) / 100,
      feePct: (parseFloat($('btc_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('btc_outVolume').textContent = fmtUSD(btc.volumeUsd);
    if ($('btc_outRwaExposure')) $('btc_outRwaExposure').textContent = fmtUSD(btc.base);
    $('btc_outFee').textContent = fmtUSD(btc.fee);
    $('btc_outBuyback').textContent = fmtUSD(btc.buybackUsd);

    // Stream 2 — Institutional RWA Products: TVL -> fee directly
    const vaults = computeStream({
      volumeUsd: readMillions('vaults_tvl'),
      basePct: 1,
      feePct: (parseFloat($('vaults_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('vaults_outVolume').textContent = fmtUSD(vaults.base);
    $('vaults_outFee').textContent = fmtUSD(vaults.fee);
    $('vaults_outBuyback').textContent = fmtUSD(vaults.buybackUsd);

    // Stream 3 — Exchange integrations: deployed volume -> fee directly
    const exch = computeStream({
      volumeUsd: readMillions('exch_volume'),
      basePct: 1,
      feePct: (parseFloat($('exch_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('exch_outVolume').textContent = fmtUSD(exch.base);
    $('exch_outFee').textContent = fmtUSD(exch.fee);
    $('exch_outBuyback').textContent = fmtUSD(exch.buybackUsd);

    // Stream 4 — Super-apps & Fintech (LINE + fintech/neobank/wallet/PayFi
    // reach): users x adoption x avg deposit -> fee.
    const lineUsers = readNum('line_users');
    const lineAdoption = (parseFloat($('line_adoptionPct').value) || 0) / 100;
    const lineAvgDeposit = readNum('line_avgDeposit');
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

    // Stream 5 — AI Agents (agentic.market, circle.agent, Agentic Vaults):
    // deployed agent-vault TVL -> fee directly.
    const agents = computeStream({
      volumeUsd: readMillions('agents_tvl'),
      basePct: 1,
      feePct: (parseFloat($('agents_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('agents_outVolume').textContent = fmtUSD(agents.base);
    $('agents_outFee').textContent = fmtUSD(agents.fee);
    $('agents_outBuyback').textContent = fmtUSD(agents.buybackUsd);

    // Aggregate — TVL is summed on `base` (the post-conversion RWA
    // exposure), not raw collateral, so the BTC channel's $ figure lines
    // up with how the source thread defines "RWA TVL" for that channel.
    const streams = [btc, vaults, exch, line, agents];
    const aggTVL = streams.reduce((s, x) => s + x.base, 0);
    const aggFee = streams.reduce((s, x) => s + x.fee, 0);
    const aggBuyback = streams.reduce((s, x) => s + x.buybackUsd, 0);
    $('aggTVL').textContent = fmtUSD(aggTVL);
    $('aggFee').textContent = fmtUSD(aggFee);
    $('aggBuyback').textContent = fmtUSD(aggBuyback);

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

    // Don't construct the chart while its tab is hidden — Chart.js
    // measures the canvas at creation time, and a display:none ancestor
    // means a 0x0 canvas that never recovers on its own. Skip until the
    // tab is actually shown (see the ixs-tabshown handler below), which
    // calls this again once the canvas has real dimensions.
    if (!chart && canvas.offsetParent === null) return;

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
          label: 'Buyback & Burn (USD)',
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
      maintainAspectRatio: false,
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

  // The chart is first created while this tab is hidden (display:none),
  // so Chart.js measures a 0x0 canvas and never draws anything. Force a
  // resize once the tab is actually shown so it picks up real dimensions.
  document.addEventListener('ixs-tabshown', (e) => {
    if (e.detail && e.detail.id === 'tab-model') {
      requestAnimationFrame(() => {
        // If it already exists, force it to remeasure in case the window
        // was resized while this tab was hidden; either way, recalcAll()
        // re-runs updateChart(), which creates the chart for the first
        // time now that the canvas is actually visible.
        if (chart) chart.resize();
        recalcAll();
      });
    }
  });

  recalcAll();
}

// ---------- MC / FDV / TVL Comparison ----------
//
// Snapshot data (CoinGecko for MC/FDV, DefiLlama for competitor TVL, IXS's
// own reported figure for its TVL — see the in-page disclaimer for why).
// Pulled Aug 10, 2026 — a snapshot, not a live feed.

// ATH MC/FDV are approximations: ATH price × today's circulating/total
// supply (not the actual supply on the historical ATH date, which isn't
// reliably available for all five). This overstates the real historical
// figure for any token whose supply has grown since its ATH, most notably
// Ondo (circulating supply has roughly tripled since its Dec 2024 ATH) and
// Stellar (XLM's supply was cut roughly in half by a 2019 burn, so its Jan
// 2018 ATH circulated far fewer tokens than exist today) — see the
// in-page methodology note.
//
// XLM's "TVL" here is Stellar's own reported RWA footprint (~$1.4B tokenized
// real-world assets, March 2026 institutional report — see the Market Size
// Thesis tab), not a general DeFi-TVL figure, to stay consistent with what
// TVL means for the other three platforms in this comparison.
const MC_COMPARE_DATA = [
  { name: 'IXS', url: 'https://www.coingecko.com/en/coins/ixs', color: 'var(--purple)', mc: 11.61e6, fdv: 11.61e6, tvl: 88.45e6, athPrice: 0.8310, athDate: 'Mar 2024', athMc: 149.58e6, athFdv: 149.58e6, baseline: true },
  { name: 'Stellar', url: 'https://www.coingecko.com/en/coins/stellar', color: '#F5A623', mc: 5599.44e6, fdv: 8135.90e6, tvl: 1400e6, athPrice: 0.9381, athDate: 'Jan 2018', athMc: 31895.4e6, athFdv: 46905e6 },
  { name: 'Ondo', url: 'https://www.coingecko.com/en/coins/ondo', color: '#1b6fd6', mc: 1699.18e6, fdv: 3489.55e6, tvl: 3484e6, athPrice: 2.14, athDate: 'Dec 2024', athMc: 10486e6, athFdv: 21400e6 },
  { name: 'Centrifuge', url: 'https://www.coingecko.com/en/coins/centrifuge', color: '#0d9488', mc: 60.93e6, fdv: 109.22e6, tvl: 1628e6, athPrice: 2.52, athDate: 'Oct 2021', athMc: 957.6e6, athFdv: 1718.64e6 },
  { name: 'Syrup', url: 'https://www.coingecko.com/en/coins/maple-finance', color: '#e0507a', mc: 180.48e6, fdv: 192.46e6, tvl: 2476e6, athPrice: 0.6557, athDate: 'Jun 2025', athMc: 786.84e6, athFdv: 839.3e6 },
];

function initMcComparison() {
  const grid = document.getElementById('mcCompareGrid');
  const canvas = document.getElementById('mcCompareChart');
  if (!grid && !canvas) return;

  const baseline = MC_COMPARE_DATA.find(p => p.baseline);

  function formatMultiple(x) {
    if (x >= 100) return Math.round(x) + 'x';
    if (x >= 10) return x.toFixed(0) + 'x';
    return x.toFixed(1) + 'x';
  }

  function renderCards() {
    if (!grid) return;
    grid.innerHTML = MC_COMPARE_DATA.map((p) => {
      const badge = p.baseline
        ? '<div class="mc-card-tag">IXS today</div>'
        : `<div class="mc-card-tag">${formatMultiple(p.fdv / baseline.fdv)} FDV · ${formatMultiple(p.tvl / baseline.tvl)} TVL</div>`;
      return `
        <a class="mc-card${p.baseline ? ' mc-card-baseline' : ''} reveal in" href="${p.url}" target="_blank" rel="noopener" style="--proj-color:${p.color}">
          <div class="mc-card-head">
            <span class="mc-dot"></span>
            <h3>${p.name} <span class="x-icon" aria-hidden="true">↗</span></h3>
          </div>
          ${badge}
          <div class="mc-card-rows">
            <div class="mc-card-row"><span>Market Cap</span><strong>${formatUsdCompact(p.mc)}</strong></div>
            <div class="mc-card-row"><span>FDV</span><strong>${formatUsdCompact(p.fdv)}</strong></div>
            <div class="mc-card-row"><span>TVL</span><strong>${formatUsdCompact(p.tvl)}</strong></div>
          </div>
          <div class="mc-card-divider">All-Time High <span>${p.athDate}</span></div>
          <div class="mc-card-rows">
            <div class="mc-card-row"><span>ATH Market Cap</span><strong>${formatUsdCompact(p.athMc)}</strong></div>
            <div class="mc-card-row"><span>ATH FDV</span><strong>${formatUsdCompact(p.athFdv)}</strong></div>
          </div>
        </a>`;
    }).join('');
  }

  renderCards();

  let chart;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function resolveColor(c) {
    if (c.startsWith('var(')) return cssVar(c.slice(4, -1)) || '#8b7bff';
    return c;
  }

  function buildChart() {
    if (!canvas || typeof Chart === 'undefined') return;

    // Same lazy-construction guard as the buyback/burn chart: don't build
    // it while the tab is hidden, or Chart.js measures a 0x0 canvas.
    if (!chart && canvas.offsetParent === null) return;

    const ctx = canvas.getContext('2d');
    const labels = MC_COMPARE_DATA.map(p => p.name);
    const projectColors = MC_COMPARE_DATA.map(p => resolveColor(p.color));

    // Three grouped bars per project (Market Cap, FDV, TVL). MC and FDV
    // are each built from two stacked segments sharing a `stack` id: the
    // current value on the bottom, then a second-color segment on top
    // that closes the gap up to the ATH figure — so the full bar height
    // reads as "today, continuing up to all-time high." TVL has no ATH
    // figure, so it stays a single solid bar.
    const athMcGap = MC_COMPARE_DATA.map(p => Math.max(0, p.athMc - p.mc));
    const athFdvGap = MC_COMPARE_DATA.map(p => Math.max(0, p.athFdv - p.fdv));

    // Fixed (theme-independent) high-contrast palette: MC and ATH-MC share
    // a blue family but at very different luminosity, same for FDV/ATH-FDV
    // in the orange/yellow family, so the "today vs ATH" split reads
    // clearly at a glance rather than blending together.
    const COLOR_MC = '#1D4ED8';
    const COLOR_MC_ATH = '#26F7FD';
    const COLOR_FDV = '#FF6600';
    const COLOR_FDV_ATH = '#FFEB00';

    const data = {
      labels,
      datasets: [
        { label: 'Market Cap', data: MC_COMPARE_DATA.map(p => p.mc), backgroundColor: COLOR_MC, stack: 'mc', borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 } },
        { label: 'ATH Market Cap', data: athMcGap, backgroundColor: COLOR_MC_ATH, stack: 'mc', borderRadius: 6 },
        { label: 'FDV', data: MC_COMPARE_DATA.map(p => p.fdv), backgroundColor: COLOR_FDV, stack: 'fdv', borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 } },
        { label: 'ATH FDV', data: athFdvGap, backgroundColor: COLOR_FDV_ATH, stack: 'fdv', borderRadius: 6 },
        { label: 'TVL', data: MC_COMPARE_DATA.map(p => p.tvl), backgroundColor: cssVar('--green') || '#16915c', stack: 'tvl', borderRadius: 6 },
      ],
    };

    const inkColor = cssVar('--ink') || '#14141c';
    const dimColor = cssVar('--dim') || '#52525f';
    const gridColor = cssVar('--border-soft') || '#dedee8';

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: inkColor, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            // The "ATH" datasets plot the gap (ATH minus current), not the
            // ATH figure itself, so show the real ATH total in the tooltip
            // instead of that raw gap value.
            label: (ctx) => {
              const p = MC_COMPARE_DATA[ctx.dataIndex];
              if (ctx.dataset.label === 'ATH Market Cap') return `ATH Market Cap: ${formatUsdCompact(p.athMc)}`;
              if (ctx.dataset.label === 'ATH FDV') return `ATH FDV: ${formatUsdCompact(p.athFdv)}`;
              return `${ctx.dataset.label}: ${formatUsdCompact(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: (ctx) => projectColors[ctx.index] || dimColor,
            font: { size: 11, weight: '700' },
          },
          grid: { display: false },
        },
        y: {
          stacked: true,
          type: 'logarithmic',
          ticks: { color: dimColor, callback: (val) => formatUsdCompact(val) },
          grid: { color: gridColor },
        },
      },
      onHover: (evt, elements) => {
        if (evt.native && evt.native.target) evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
      },
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const proj = MC_COMPARE_DATA[elements[0].index];
        if (proj) window.open(proj.url, '_blank', 'noopener');
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

  buildChart();

  document.addEventListener('ixs-themechange', buildChart);
  document.addEventListener('ixs-tabshown', (e) => {
    if (e.detail && e.detail.id === 'tab-comparison') {
      requestAnimationFrame(() => {
        if (chart) chart.resize();
        buildChart();
      });
    }
  });
}

// ---------- IXS Thesis — 2027-2031 model chart ----------
//
// Illustrative scenario model from the community "IXS Thesis" write-up,
// rebuilt to land on the same TVL scenarios used in the "TVL scenarios"
// section: roughly the Buyback & Burn Calculator's default scenario
// ($10B) by 2028 and the 5x-scaled scenario (~$50B) by 2030. RWA-market
// figures (2030's ~$9.4T anchored to BCG/Ripple, other years scenario-
// modeled) are unchanged from before, only IXS's assumed share of that
// market was raised, so 2030's share is now ~0.53% rather than 0.10%.
// Not a forecast, see the in-page disclaimer for sourcing.
function initIxsThesisChart() {
  const canvas = document.getElementById('ixsThesisChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const YEARS = [2027, 2028, 2029, 2030, 2031];
  const TVL_B = [2, 10, 25, 50, 90];
  const MC_B = [1, 5, 12.5, 25, 45];
  const AGENTIC_B = [0.14, 1.0, 3.75, 10.0, 27.0];

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  let chart;

  function buildChart() {
    // Same lazy-construction guard used by the other charts on this site:
    // don't measure/build a canvas that's still inside a hidden tab.
    if (!chart && canvas.offsetParent === null) return;

    const ctx = canvas.getContext('2d');
    const inkColor = cssVar('--ink') || '#14141c';
    const dimColor = cssVar('--dim') || '#52525f';
    const gridColor = cssVar('--border-soft') || '#dedee8';
    const greenColor = cssVar('--green') || '#16915c';

    const data = {
      labels: YEARS,
      datasets: [
        {
          label: 'Modeled IXS TVL',
          data: TVL_B,
          borderColor: '#1D4ED8',
          backgroundColor: '#1D4ED8',
          pointBackgroundColor: '#1D4ED8',
          pointRadius: 4,
          tension: 0.25,
          borderWidth: 2.5,
        },
        {
          label: 'Illustrative MC @ 0.5x TVL',
          data: MC_B,
          borderColor: '#FF6600',
          backgroundColor: '#FF6600',
          pointBackgroundColor: '#FF6600',
          pointRadius: 4,
          tension: 0.25,
          borderWidth: 2.5,
        },
        {
          label: 'Agentic TVL within IXS',
          data: AGENTIC_B,
          borderColor: greenColor,
          backgroundColor: greenColor,
          pointBackgroundColor: greenColor,
          pointRadius: 4,
          tension: 0.25,
          borderWidth: 2.5,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: inkColor, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label}: $${c.parsed.y.toFixed(2)}B`,
          },
        },
      },
      scales: {
        x: { ticks: { color: dimColor, font: { size: 11 } }, grid: { display: false } },
        y: {
          ticks: { color: dimColor, callback: (val) => '$' + val + 'B' },
          grid: { color: gridColor },
          title: { display: true, text: '$ billions', color: dimColor, font: { size: 11 } },
        },
      },
    };

    if (chart) {
      chart.data = data;
      chart.options = options;
      chart.update();
    } else {
      chart = new Chart(ctx, { type: 'line', data, options });
    }
  }

  buildChart();

  document.addEventListener('ixs-themechange', buildChart);
  document.addEventListener('ixs-tabshown', (e) => {
    if (e.detail && e.detail.id === 'tab-ixs-thesis') {
      requestAnimationFrame(() => {
        if (chart) chart.resize();
        buildChart();
      });
    }
  });
}

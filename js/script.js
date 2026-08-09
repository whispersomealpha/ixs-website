// IXS single-page site — shared interactivity
// Sections carry stable IDs (#overview #credibility #timeline #how-it-works
// #buildout #partnerships #ecosystem #tokenomics #footer) for future
// menu/anchor wiring.

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initTabs();
  initBuybackBurnModel();
});

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

  // Generic: volume -> (optional LTV base) -> fee -> buyback/burn split
  function computeStream({ volumeUsd, basePct = 1, feePct, buybackPct, burnPct }) {
    const base = volumeUsd * basePct;
    const fee = base * feePct;
    const buybackUsd = fee * buybackPct;
    const burnUsd = fee * burnPct;
    return { volumeUsd, fee, buybackUsd, burnUsd };
  }

  function readGlobals() {
    return {
      ixsPrice: parseFloat($('ixsPrice').value) || 0.0000001,
      ixsSupply: parseFloat($('ixsSupply').value) || 0,
      buybackPct: (parseFloat($('buybackPct').value) || 0) / 100,
      burnPct: (parseFloat($('burnPct').value) || 0) / 100,
    };
  }

  function bindRangeDisplay(sliderId, displayId, decimals = 0) {
    const el = $(sliderId);
    if (!el) return;
    const update = () => {
      const val = decimals ? Number(el.value).toFixed(decimals) : el.value;
      if ($(displayId)) $(displayId).textContent = val;
    };
    el.addEventListener('input', () => { update(); recalcAll(); });
    update();
  }

  // Wire up all the little "value next to slider" labels
  bindRangeDisplay('buybackPct', 'buybackPctVal', 0);
  bindRangeDisplay('burnPct', 'burnPctVal', 0);
  bindRangeDisplay('btc_adoptionPct', 'btc_adoptionPctVal', 1);
  bindRangeDisplay('btc_ltv', 'btc_ltvVal', 0);
  bindRangeDisplay('btc_feePct', 'btc_feePctVal', 2);
  bindRangeDisplay('vaults_feePct', 'vaults_feePctVal', 2);
  bindRangeDisplay('exch_feePct', 'exch_feePctVal', 2);
  bindRangeDisplay('line_adoptionPct', 'line_adoptionPctVal', 2);
  bindRangeDisplay('line_feePct', 'line_feePctVal', 2);

  // Number inputs also trigger recalculation
  [
    'ixsPrice', 'ixsSupply',
    'btc_availablePool', 'vaults_tvl', 'exch_volume',
    'line_users', 'line_avgDeposit',
  ].forEach(id => { if ($(id)) $(id).addEventListener('input', recalcAll); });

  let chart;

  function recalcAll() {
    const g = readGlobals();

    // Stream 1 — BTC RWA Yield (via BitGo): pool -> adoption -> loan (LTV) -> fee
    const btc = computeStream({
      volumeUsd: (parseFloat($('btc_availablePool').value) || 0) * ((parseFloat($('btc_adoptionPct').value) || 0) / 100),
      basePct: (parseFloat($('btc_ltv').value) || 0) / 100,
      feePct: (parseFloat($('btc_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('btc_outVolume').textContent = fmtUSD(btc.volumeUsd);
    $('btc_outFee').textContent = fmtUSD(btc.fee);
    $('btc_outBuyback').textContent = fmtUSD(btc.buybackUsd);
    $('btc_outBurn').textContent = fmtUSD(btc.burnUsd);

    // Stream 2 — RWA Agentic Vaults: TVL -> fee directly
    const vaults = computeStream({
      volumeUsd: parseFloat($('vaults_tvl').value) || 0,
      basePct: 1,
      feePct: (parseFloat($('vaults_feePct').value) || 0) / 100,
      buybackPct: g.buybackPct,
      burnPct: g.burnPct,
    });
    $('vaults_outVolume').textContent = fmtUSD(vaults.volumeUsd);
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
    $('exch_outVolume').textContent = fmtUSD(exch.volumeUsd);
    $('exch_outFee').textContent = fmtUSD(exch.fee);
    $('exch_outBuyback').textContent = fmtUSD(exch.buybackUsd);
    $('exch_outBurn').textContent = fmtUSD(exch.burnUsd);

    // Stream 4 — LINE integration: users x adoption x avg deposit -> fee
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
    $('line_outVolume').textContent = fmtUSD(line.volumeUsd);
    $('line_outFee').textContent = fmtUSD(line.fee);
    $('line_outBuyback').textContent = fmtUSD(line.buybackUsd);
    $('line_outBurn').textContent = fmtUSD(line.burnUsd);

    // Aggregate
    const streams = [btc, vaults, exch, line];
    const aggTVL = streams.reduce((s, x) => s + x.volumeUsd, 0);
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

  function updateChart(streams) {
    const canvas = $('streamChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const labels = ['BTC RWA Yield', 'RWA Agentic Vaults', 'Exchange Integrations', 'LINE Phase 2'];
    const buybackData = streams.map(s => Math.round(s.buybackUsd));
    const burnData = streams.map(s => Math.round(s.burnUsd));

    const data = {
      labels,
      datasets: [
        {
          label: 'Buyback (USD)',
          data: buybackData,
          backgroundColor: '#8b7bff',
          borderRadius: 6,
        },
        {
          label: 'Burn (USD)',
          data: burnData,
          backgroundColor: '#d9600f',
          borderRadius: 6,
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#14141c', font: { size: 11 } } },
      },
      scales: {
        x: { stacked: true, ticks: { color: '#52525f', font: { size: 11 } }, grid: { display: false } },
        y: { stacked: true, ticks: { color: '#52525f' }, grid: { color: '#dedee8' } },
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

  recalcAll();
}

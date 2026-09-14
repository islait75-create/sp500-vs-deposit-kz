(function () {
  "use strict";
  const D = window.RESEARCH;
  const $ = (s) => document.querySelector(s);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const COST = D.meta.cost, CGT = D.meta.cgt;

  /* ---------- formatting ---------- */
  const nf = (x, d = 1) => x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const minus = (s) => s.replace("-", "−");
  const pct = (x, d = 1, sign = false) => (x == null ? "—" : minus((sign && x > 0 ? "+" : "") + nf(x * 100, d) + "%"));
  const pp = (x, d = 1) => minus((x > 0 ? "+" : "") + nf(x * 100, d) + " pp");
  const money = (x) => {
    const a = Math.abs(x);
    if (a >= 1e9) return nf(x / 1e9, 2) + "B ₸";
    if (a >= 1e6) return nf(x / 1e6, 1) + "M ₸";
    return Math.round(x).toLocaleString("en-US") + " ₸";
  };
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mName = (p) => { const [y, m] = p.split("-"); return MON[+m - 1] + " " + y; };
  const yrs = (h) => h + (h === 1 ? " year" : " years");
  const hexA = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

  const S = Object.fromEntries(D.summary.map((s) => [s.key, s]));
  const RS = Object.fromEntries(D.rolling_summary.map((s) => [s.horizon, s]));
  const BS = Object.fromEntries(D.bootstrap.map((s) => [s.horizon, s]));
  const W = D.wealth;
  const liq = (v) => { const x = v * (1 - COST); return x - CGT * Math.max(x - 1e6, 0); };
  const spLiq = W.sp_net_kzt.map(liq);

  /* ---------- static content ---------- */
  $("#findings").innerHTML = [
    [pct(RS[1].win_net, 0), "chance the S&amp;P 500 beat the deposit over a one-year holding period"],
    [pct(RS[20].win_net, 0), "chance over twenty years, falling to " + pct(BS[20].p_win, 0) + " under bootstrap resampling"],
    [minus("+" + nf((S.sp_net_kzt.cagr - S.dep_kzt.cagr) * 100, 1)) + "<small>pp/yr</small>", "after-tax edge of equities over 26.7 years: " + pct(S.sp_net_kzt.cagr) + " vs " + pct(S.dep_kzt.cagr)],
    ["−2.8<small>pp/yr</small>", "equities versus the deposit once the 2009, 2014 and 2015 devaluation years are removed"],
  ].map(([v, k]) => `<div><span class="v">${v}</span><span class="k">${k}</span></div>`).join("");

  const hyp = [
    ["H1", "Over the full sample, the S&amp;P 500 in tenge outperforms a tenge deposit after tax.", `${pct(S.sp_net_kzt.cagr)} vs ${pct(S.dep_kzt.cagr)} a year`, "ok", "Supported"],
    ["H2", "The outperformance is consistent (≥80% of windows) at horizons of five years or less.", `Observed: ${pct(RS[1].win_net, 0)}–${pct(RS[5].win_net, 0)} of windows`, "no", "Rejected"],
    ["H3", "At horizons of 15 years or more, the outperformance is robust.", `${pct(RS[15].win_net, 0)}–${pct(RS[20].win_net, 0)} historically, ${pct(BS[15].p_win, 0)}–${pct(BS[20].p_win, 0)} in the bootstrap`, "mid", "Partly supported"],
    ["H4", "Currency depreciation, not equity returns, is the main source of the advantage.", `S&amp;P 500 in USD: ${pct(D.meta.spusd_cagr)} a year, below the deposit rate`, "ok", "Supported"],
  ];
  $("#hyp").innerHTML = hyp.map(([h, t, s, c, v]) => `<div><span class="h">${h}</span><span class="t">${t}<small>${s}</small></span><span class="pill ${c}">${v}</span></div>`).join("");
  $("#corr").textContent = minus(nf(D.meta.corr_m, 2));

  const NAMES = { dep_kzt: "Tenge deposit", dep_usd_kzt: "US-dollar deposit", sp_kzt: "S&amp;P 500, before tax", sp_net_kzt: "S&amp;P 500, after tax", mix_50: "50% deposit + 50% S&amp;P 500" };
  const SW = { dep_kzt: "--s-dep", dep_usd_kzt: "--s-usd", sp_kzt: "--s-sp", sp_net_kzt: "--s-sp", mix_50: "--s-cpi" };
  const sw = (v, o = 1) => `<i class="sw" style="background:var(${v});opacity:${o}"></i>`;
  const cls = (x) => (x < 0 ? "neg" : "");

  $("#t-summary").innerHTML = `<thead><tr><th>Strategy</th><th>1M ₸ became</th><th>Annual return</th><th>Real annual</th><th>Volatility</th><th>Max drawdown</th><th>Worst 12 months</th></tr></thead><tbody>` +
    ["dep_kzt", "dep_usd_kzt", "sp_kzt", "sp_net_kzt", "mix_50"].map((k) => { const s = S[k]; return `<tr><td>${sw(SW[k], k === "sp_kzt" ? 0.4 : 1)}${NAMES[k]}</td><td>${money(s.multiple * 1e6)}</td><td>${pct(s.cagr)}</td><td>${pct(s.real_cagr)}</td><td>${pct(s.vol)}</td><td class="${cls(s.max_dd < -1e-6 ? -1 : 0)}">${pct(s.max_dd)}</td><td class="${cls(s.worst_12m)}">${pct(s.worst_12m)}</td></tr>`; }).join("") + `</tbody>`;

  $("#t-annual").innerHTML = `<thead><tr><th>Year</th><th>S&amp;P 500 (USD)</th><th>USD/KZT change</th><th>USD/KZT, Dec</th><th>S&amp;P 500 (₸)</th><th>Tenge deposit</th><th>USD deposit (₸)</th><th>Inflation</th><th>Difference</th><th>Winner</th></tr></thead><tbody>` +
    D.annual.map((a) => `<tr class="${a.partial ? "partial" : ""}"><td>${a.year}${a.partial ? " (Jan–Aug)" : ""}</td><td class="${cls(a.sp_usd)}">${pct(a.sp_usd)}</td><td>${pct(a.fx, 1, true)}</td><td>${nf(a.usdkzt_end, 2)}</td><td class="${cls(a.sp_kzt)}">${pct(a.sp_kzt)}</td><td>${pct(a.dep_kzt)}</td><td class="${cls(a.dep_usd_kzt)}">${pct(a.dep_usd_kzt)}</td><td>${pct(a.cpi)}</td><td class="${a.excess < 0 ? "neg" : "pos"}">${pp(a.excess)}</td><td><span class="pill ${a.winner === "S&P 500" ? "sp" : "dep"}">${a.winner === "S&P 500" ? "S&amp;P 500" : "Deposit"}</span></td></tr>`).join("") + `</tbody>`;

  $("#t-roll").innerHTML = `<thead><tr><th>Horizon</th><th>Windows</th><th>Beat tenge deposit</th><th>Before tax</th><th>Beat USD deposit</th><th>Median excess</th><th>10th percentile</th><th>Worst window</th><th>Worst entry</th></tr></thead><tbody>` +
    D.rolling_summary.map((r) => `<tr><td>${yrs(r.horizon)}</td><td>${r.windows}</td><td><b>${pct(r.win_net, 0)}</b></td><td>${pct(r.win_gross, 0)}</td><td>${pct(r.win_vs_usd_dep, 0)}</td><td class="${r.median_excess_net < 0 ? "neg" : "pos"}">${pp(r.median_excess_net)}</td><td class="${r.p10_excess_net < 0 ? "neg" : "pos"}">${pp(r.p10_excess_net)}</td><td class="neg">${pp(r.worst_excess_net)}</td><td>${mName(r.worst_start)}</td></tr>`).join("") + `</tbody>`;

  const EVENTS_EN = ["2008 global financial crisis", "February 2014 devaluation", "2015 move to a floating tenge", "COVID-19 crash", "2022 Fed tightening"];
  $("#t-crisis").innerHTML = `<thead><tr><th>Episode</th><th>Period</th><th>S&amp;P 500 (USD)</th><th>USD/KZT</th><th>S&amp;P 500 (₸)</th><th>Tenge deposit</th></tr></thead><tbody>` +
    D.crisis.map((c, i) => `<tr><td>${EVENTS_EN[i]}</td><td>${c.period.split(" — ").map(mName).join(" – ")}</td><td class="${c.sp_usd < 0 ? "neg" : "pos"}">${pct(c.sp_usd, 1, true)}</td><td>${pct(c.fx, 1, true)}</td><td class="${c.sp_kzt < 0 ? "neg" : "pos"}">${pct(c.sp_kzt, 1, true)}</td><td>${pct(c.dep_kzt, 1, true)}</td></tr>`).join("") + `</tbody>`;

  const F = D.dca_full;
  $("#dca-tiles").innerHTML = `
    <div class="tile"><span class="k">Contributed over ${D.meta.months} months</span><span class="v">${money(F.paid)}</span></div>
    <div class="tile"><span class="k">${sw("--s-dep")}Tenge deposit</span><span class="v">${money(F.dep)}</span></div>
    <div class="tile"><span class="k">${sw("--s-sp")}S&amp;P 500, after tax</span><span class="v">${money(F.sp)}</span></div>`;
  $("#t-dca").innerHTML = `<thead><tr><th>Saving period</th><th>Windows</th><th>S&amp;P 500 ahead</th><th>Median ratio</th><th>Worst ratio</th><th>Best ratio</th></tr></thead><tbody>` +
    D.dca.map((r) => `<tr><td>${yrs(r.horizon)}</td><td>${r.windows}</td><td><b>${pct(r.win, 0)}</b></td><td>×${nf(r.median_ratio, 2)}</td><td class="${r.worst_ratio < 1 ? "neg" : ""}">×${nf(r.worst_ratio, 2)}</td><td>×${nf(r.best_ratio, 2)}</td></tr>`).join("") + `</tbody>`;

  const deps = [...new Set(D.breakeven.map((b) => b.dep))].sort((a, b) => a - b);
  const sps = [...new Set(D.breakeven.map((b) => b.sp_usd))];
  $("#t-breakeven").innerHTML = `<thead><tr><th>Deposit rate ↓ &nbsp; S&amp;P 500 USD return →</th>${sps.map((s) => `<th>${pct(s, 0)}</th>`).join("")}</tr></thead><tbody>` +
    deps.map((d) => { const now = Math.abs(d - D.meta.dep_now) < 1e-6; return `<tr style="${now ? "font-weight:600" : ""}"><td>${pct(d, 1)}${now ? ' <span class="pill mid">today</span>' : ""}</td>${sps.map((s) => { const b = D.breakeven.find((x) => x.dep === d && x.sp_usd === s); return `<td>${pct(b.fx_needed, 1, true)}</td>`; }).join("")}</tr>`; }).join("") + `</tbody>`;

  /* ---------- chart plumbing ---------- */
  const charts = {};
  const make = (id, cfg) => { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fam = (v) => css(v).split(",")[0].replace(/"/g, "");

  // Annotation plugin: event lines, point callouts, end-of-line labels
  const notes = {
    id: "notes",
    afterDatasetsDraw(chart) {
      const o = chart.config.options.plugins && chart.config.options.plugins.notes; if (!o) return;
      const { ctx, chartArea: a, scales } = chart;
      const narrow = chart.width < 640;
      const labels = chart.data.labels;
      ctx.save();
      (o.events || []).forEach((e) => {
        const i = labels.indexOf(e.x); if (i < 0) return;
        const x = scales.x.getPixelForValue(i);
        ctx.strokeStyle = o.ruleColor; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, a.top + (e.dy || 0) + 14); ctx.lineTo(x, a.bottom); ctx.stroke();
        if (narrow) return;
        ctx.fillStyle = o.textColor; ctx.font = `500 11px ${fam("--sans")}`;
        ctx.textAlign = e.align || "left";
        ctx.fillText(e.label, x + (e.align === "right" ? -6 : 6), a.top + (e.dy || 0) + 10);
      });
      (narrow ? [] : o.points || []).forEach((p) => {
        const ds = chart.data.datasets[p.ds]; const i = labels.indexOf(p.x); if (!ds || i < 0) return;
        const meta = chart.getDatasetMeta(p.ds); if (meta.hidden) return;
        const pt = meta.data[i]; if (!pt) return;
        ctx.fillStyle = ds.borderColor; ctx.strokeStyle = o.ring; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = `500 12px ${fam("--sans")}`; ctx.fillStyle = o.textStrong; ctx.textAlign = p.align || "left";
        const lines = p.label.split("\n");
        lines.forEach((ln, k) => ctx.fillText(ln, pt.x + (p.dx || 10), pt.y + (p.dy || 0) + k * 15));
      });
      if (o.endLabels && !narrow) {
        const placed = [];
        chart.data.datasets.forEach((ds, di) => {
          const meta = chart.getDatasetMeta(di); if (meta.hidden || ds.noEnd) return;
          const pt = meta.data[meta.data.length - 1]; if (!pt) return;
          let y = pt.y; placed.forEach((py) => { if (Math.abs(py - y) < 30) y = py + (y >= py ? 30 : -30); }); placed.push(y);
          ctx.textAlign = "left"; ctx.fillStyle = ds.borderColor; ctx.font = `600 13px ${fam("--mono")}`;
          ctx.fillText(o.endFmt(ds.data[ds.data.length - 1]), pt.x + 10, y + 1);
          ctx.fillStyle = o.textColor; ctx.font = `400 11px ${fam("--sans")}`;
          ctx.fillText(ds.short || ds.label, pt.x + 10, y + 15);
        });
      }
      ctx.restore();
    },
  };
  Chart.register(notes);

  function theme(scope) {
    const H = scope === "hero";
    return {
      text: H ? css("--hero-ink-2") : css("--muted"), strong: H ? css("--hero-ink") : css("--ink"),
      grid: H ? css("--hero-rule") : css("--grid"), axis: H ? css("--hero-rule") : css("--rule"),
      ring: H ? css("--hero-bg") : css("--paper"), zero: H ? css("--hero-ink-2") : css("--muted"),
    };
  }
  const tooltip = () => ({
    backgroundColor: css("--ink"), titleColor: css("--paper"), bodyColor: css("--paper"), footerColor: css("--paper"),
    padding: 12, cornerRadius: 8, boxPadding: 5, usePointStyle: true, borderWidth: 0,
    titleFont: { family: fam("--sans"), weight: "600", size: 12 }, bodyFont: { family: fam("--mono"), size: 12 }, footerFont: { family: fam("--sans"), size: 11, weight: "400" },
  });
  const yearTicks = (labels, every = innerWidth < 640 ? 10 : 5) => ({
    autoSkip: false, maxRotation: 0, padding: 8,
    callback: (v, i) => { const p = labels[i]; return p && p.endsWith("-01") && +p.slice(0, 4) % every === 0 ? p.slice(0, 4) : null; },
  });
  const lineDs = (label, data, color, w = 2.25, extra = {}) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: w, pointRadius: 0, pointHoverRadius: 5, pointHoverBorderWidth: 2, tension: 0, ...extra });
  const wide = (id) => document.getElementById(id).parentElement.clientWidth >= 640;
  const anim = (ms = 900) => (reduced || ms < 1000 ? false : { duration: ms, easing: "easeOutQuart" });

  let growthReal = false, rollH = 10;

  function draw() {
    Chart.defaults.font.family = fam("--sans");
    Chart.defaults.font.size = 12;
    const T = theme(), TH = theme("hero");
    Chart.defaults.color = T.text;

    /* Figure 1: hero */
    const lastBehind = (() => { let k = -1; spLiq.forEach((v, i) => { if (v < W.dep_kzt[i]) k = i; }); return k; })();
    const trough = W.t.indexOf("2009-01");
    make("c-hero", {
      type: "line",
      data: { labels: W.t, datasets: [
        lineDs("S&P 500 after tax", spLiq, css("--hero-sp"), 2.5, { short: "S&P 500, after tax" }),
        lineDs("Tenge deposit", W.dep_kzt, css("--hero-dep"), 2.5, { short: "Tenge deposit" }),
        lineDs("Consumer prices", W.cpi, css("--hero-cpi"), 1.5, { short: "Prices (CPI)" }),
      ] },
      options: {
        maintainAspectRatio: false, animation: anim(1400), interaction: { mode: "index", intersect: false },
        layout: { padding: { right: wide("c-hero") ? 128 : 4, top: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltip(), itemSort: (a, b) => b.parsed.y - a.parsed.y, callbacks: { title: (i) => mName(i[0].label), label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } },
          notes: {
            ruleColor: TH.grid, textColor: TH.text, textStrong: TH.strong, ring: TH.ring, endLabels: true, endFmt: (v) => money(v),
            events: [{ x: "2009-02", label: "2009 devaluation", align: "right" }, { x: "2014-02", label: "2014 devaluation", align: "right", dy: 16 }, { x: "2015-08", label: "2015: tenge floated" }],
            points: [
              { ds: 0, x: "2009-01", label: `Jan 2009 trough: ${nf(spLiq[trough] / 1e6, 2)}M ₸\nvs ${nf(W.dep_kzt[trough] / 1e6, 2)}M ₸ on deposit`, dx: -14, dy: -2, align: "right" },
              { ds: 0, x: W.t[lastBehind + 1], label: `${mName(W.t[lastBehind + 1])}: ahead for good,\nafter 20 years behind`, dx: -12, dy: -30, align: "right" },
            ],
          },
        },
        scales: {
          x: { grid: { display: false }, border: { color: TH.axis }, ticks: { ...yearTicks(W.t, wide("c-hero") ? 5 : 10), color: TH.text } },
          y: { type: "logarithmic", min: 5e5, max: 3.2e7, grid: { color: TH.grid, drawTicks: false }, border: { display: false },
               ticks: { color: TH.text, padding: 10, callback: (v) => ([5e5, 1e6, 2e6, 5e6, 1e7, 2e7].includes(v) ? money(v).replace(".0", "") : null) } },
        },
      },
    });

    /* Figure 2 & 3 */
    const L = D.levels;
    make("c-fx", {
      type: "line",
      data: { labels: L.t, datasets: [lineDs("USD/KZT", L.usdkzt, css("--s-fx"), 2)] },
      options: {
        maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { title: (i) => mName(i[0].label), label: (c) => ` ${nf(c.parsed.y, 2)} ₸ per $1` } },
          notes: { ruleColor: T.grid, textColor: T.text, textStrong: T.strong, ring: T.ring, events: [{ x: "2009-02", label: "2009" }, { x: "2014-02", label: "2014", align: "right" }, { x: "2015-08", label: "2015" }] } },
        scales: { x: { grid: { display: false }, border: { color: T.axis }, ticks: yearTicks(L.t) }, y: { min: 0, grid: { color: T.grid, drawTicks: false }, border: { display: false }, ticks: { padding: 8 } } },
      },
    });
    make("c-rates", {
      type: "line",
      data: { labels: L.t, datasets: [lineDs("Tenge", L.dep_kzt, css("--s-dep"), 2), lineDs("Foreign currency", L.dep_usd, css("--s-usd"), 2)] },
      options: {
        maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { title: (i) => mName(i[0].label), label: (c) => ` ${c.dataset.label}: ${nf(c.parsed.y, 1)}%` } } },
        scales: { x: { grid: { display: false }, border: { color: T.axis }, ticks: yearTicks(L.t) }, y: { min: 0, grid: { color: T.grid, drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => v + "%" } } },
      },
    });

    /* Figure 4 */
    const defl = (arr) => arr.map((v, i) => (growthReal ? (v / W.cpi[i]) * 1e6 : v));
    const gs = [
      { label: "S&P 500, before tax", short: "S&P 500 pre-tax", data: W.sp_kzt, color: hexA(css("--s-sp"), 0.4), w: 1.5, sw: ["--s-sp", 0.4] },
      { label: "S&P 500, after tax", short: "S&P 500 after tax", data: spLiq, color: css("--s-sp"), w: 2.5, sw: ["--s-sp", 1] },
      { label: "Tenge deposit", short: "Tenge deposit", data: W.dep_kzt, color: css("--s-dep"), w: 2.5, sw: ["--s-dep", 1] },
      { label: "US-dollar deposit", short: "USD deposit", data: W.dep_usd_kzt, color: css("--s-usd"), w: 2, sw: ["--s-usd", 1] },
    ];
    if (!growthReal) gs.push({ label: "Consumer prices", short: "Prices (CPI)", data: W.cpi, color: css("--s-cpi"), w: 1.5, sw: ["--s-cpi", 1] });
    $("#growth-legend").innerHTML = gs.map((g) => `<span>${sw(g.sw[0], g.sw[1])}${g.label}</span>`).join("");
    make("c-growth", {
      type: "line",
      data: { labels: W.t, datasets: gs.map((g) => lineDs(g.label, defl(g.data), g.color, g.w, { short: g.short })) },
      options: {
        maintainAspectRatio: false, animation: anim(), interaction: { mode: "index", intersect: false }, layout: { padding: { right: wide("c-growth") ? 118 : 4 } },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), itemSort: (a, b) => b.parsed.y - a.parsed.y, callbacks: { title: (i) => mName(i[0].label) + (growthReal ? " · in Dec-1999 tenge" : ""), label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } },
          notes: { ruleColor: T.grid, textColor: T.text, textStrong: T.strong, ring: T.ring, endLabels: true, endFmt: money, events: [{ x: "2009-02", label: "2009" }, { x: "2014-02", label: "2014", align: "right" }, { x: "2015-08", label: "2015" }] } },
        scales: {
          x: { grid: { display: false }, border: { color: T.axis }, ticks: yearTicks(W.t) },
          y: { type: "logarithmic", grid: { color: T.grid, drawTicks: false }, border: { display: false },
               ticks: { padding: 10, callback: (v) => ([2.5e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7].includes(v) ? money(v).replace(".0", "") : null) } },
        },
      },
    });

    /* Figure 5 */
    const A = D.annual;
    make("c-annual", {
      type: "bar",
      data: { labels: A.map((a) => (a.partial ? "2026*" : String(a.year))), datasets: [{ data: A.map((a) => a.excess * 100), backgroundColor: A.map((a) => (a.excess >= 0 ? css("--s-sp") : css("--s-dep"))), borderRadius: 4, borderSkipped: "start", barPercentage: 0.8, categoryPercentage: 0.9 }] },
      options: {
        maintainAspectRatio: false, animation: anim(),
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: {
          title: (i) => { const a = A[i[0].dataIndex]; return a.year + (a.partial ? " (Jan–Aug)" : ""); },
          label: (c) => { const a = A[c.dataIndex]; return [` S&P 500 in tenge: ${pct(a.sp_kzt)}`, ` Tenge deposit: ${pct(a.dep_kzt)}`, ` USD/KZT: ${pct(a.fx, 1, true)}`, ` Difference: ${pp(a.excess)}`]; },
        } } },
        scales: { x: { grid: { display: false }, border: { color: T.axis }, ticks: { maxRotation: 0, autoSkipPadding: 8 } },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? T.zero : T.grid), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => (v > 0 ? "+" : "") + v } } },
      },
    });

    /* Figure 6 */
    const R = D.rolling_summary;
    make("c-win", {
      type: "bar",
      data: { labels: R.map((r) => yrs(r.horizon)), datasets: [
        { label: "After tax", data: R.map((r) => r.win_net * 100), backgroundColor: css("--s-sp"), borderRadius: 4, borderSkipped: "start", categoryPercentage: 0.7 },
        { label: "Before tax", data: R.map((r) => r.win_gross * 100), backgroundColor: hexA(css("--s-sp"), 0.35), borderRadius: 4, borderSkipped: "start", categoryPercentage: 0.7 },
      ] },
      options: {
        maintainAspectRatio: false, animation: anim(),
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { label: (c) => ` ${c.dataset.label}: ${nf(c.parsed.y, 0)}% of ${R[c.dataIndex].windows} windows` } },
          notes: { ruleColor: T.grid, textColor: T.text, textStrong: T.strong, ring: T.ring } },
        scales: { x: { grid: { display: false }, border: { color: T.axis } },
                  y: { min: 0, max: 100, grid: { color: (c) => (c.tick.value === 50 ? T.zero : T.grid), drawTicks: false }, border: { display: false }, ticks: { padding: 8, stepSize: 25, callback: (v) => v + "%" } } },
      },
      plugins: [{ id: "vals", afterDatasetsDraw(ch) { const { ctx } = ch; const m = ch.getDatasetMeta(0); ctx.save(); ctx.font = `600 12px ${fam("--mono")}`; ctx.fillStyle = T.strong; ctx.textAlign = "center"; m.data.forEach((b, i) => ctx.fillText(nf(R[i].win_net * 100, 0) + "%", b.x, b.y - 7)); ctx.restore(); } }],
    });

    drawRoll();

    /* Figure 9 */
    const C = D.carry;
    make("c-carry", {
      type: "bar",
      data: { labels: C.map((c) => String(c.year)), datasets: [
        { label: "Tenge rate minus FX rate", data: C.map((c) => c.rate_diff * 100), backgroundColor: css("--s-dep"), borderRadius: 3, borderSkipped: "start" },
        { label: "Change in USD/KZT", data: C.map((c) => c.fx * 100), backgroundColor: css("--s-fx"), borderRadius: 3, borderSkipped: "start" },
      ] },
      options: {
        maintainAspectRatio: false, animation: anim(), interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { label: (c) => ` ${c.dataset.label}: ${pct(c.parsed.y / 100, 1, true)}`, footer: (i) => { const c = C[i[0].dataIndex]; return c.fx > c.rate_diff ? "Holding dollars paid more" : "Holding tenge paid more"; } } } },
        scales: { x: { grid: { display: false }, border: { color: T.axis }, ticks: { maxRotation: 0, autoSkipPadding: 8 } },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? T.zero : T.grid), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => v + "%" } } },
      },
    });

    /* Figure 10 */
    const dd = (arr) => { let pk = -Infinity; return arr.map((v) => { pk = Math.max(pk, v); return (v / pk - 1) * 100; }); };
    const dds = [["sp_net_kzt", "S&P 500 in tenge", "--s-sp"], ["dep_usd_kzt", "US-dollar deposit", "--s-usd"], ["mix_50", "50/50 mix", "--s-cpi"], ["dep_kzt", "Tenge deposit", "--s-dep"]];
    $("#dd-legend").innerHTML = dds.map(([, l, c]) => `<span>${sw(c)}${l}</span>`).join("");
    make("c-dd", {
      type: "line",
      data: { labels: W.t, datasets: dds.map(([k, l, c]) => lineDs(l, dd(W[k]), css(c), 2)) },
      options: {
        maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { title: (i) => mName(i[0].label), label: (c) => ` ${c.dataset.label}: ${minus(nf(c.parsed.y, 1))}%` } },
          notes: { ruleColor: T.grid, textColor: T.text, textStrong: T.strong, ring: T.ring, points: [{ ds: 0, x: "2009-01", label: `${pct(S.sp_net_kzt.max_dd, 0)} at the trough`, dx: 10, dy: 4 }] } },
        scales: { x: { grid: { display: false }, border: { color: T.axis }, ticks: yearTicks(W.t) }, y: { max: 0, grid: { color: T.grid, drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => v + "%" } } },
      },
    });

    /* Figure 11 */
    const B = D.bootstrap;
    make("c-boot", {
      type: "bar",
      data: { labels: B.map((b) => yrs(b.horizon)), datasets: [
        { type: "line", label: "Median", data: B.map((b) => b.median * 100), showLine: false, pointRadius: 6, pointHoverRadius: 8, pointBackgroundColor: T.strong, pointBorderColor: T.ring, pointBorderWidth: 2, order: 0 },
        { label: "25th–75th percentile", data: B.map((b) => [b.p25 * 100, b.p75 * 100]), backgroundColor: css("--s-sp"), borderRadius: 4, borderSkipped: false, barPercentage: 0.3, grouped: false, order: 1 },
        { label: "5th–95th percentile", data: B.map((b) => [b.p5 * 100, b.p95 * 100]), backgroundColor: hexA(css("--s-sp"), 0.25), borderRadius: 4, borderSkipped: false, barPercentage: 0.3, grouped: false, order: 2 },
      ] },
      options: {
        maintainAspectRatio: false, animation: anim(), interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: {
          label: (c) => (Array.isArray(c.raw) ? ` ${c.dataset.label}: ${pct(c.raw[0] / 100, 1, true)} to ${pct(c.raw[1] / 100, 1, true)}` : ` Median: ${pct(c.raw / 100, 1, true)}`),
          footer: (i) => `Probability of beating the deposit: ${pct(B[i[0].dataIndex].p_win, 0)}`,
        } } },
        scales: { x: { grid: { display: false }, border: { color: T.axis } },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? T.zero : T.grid), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => (v > 0 ? "+" : "") + v + "%" } } },
      },
      plugins: [{ id: "pwin", afterDatasetsDraw(ch) { const { ctx, chartArea: a } = ch; const m = ch.getDatasetMeta(0); ctx.save(); ctx.textAlign = "center"; m.data.forEach((p, i) => { ctx.font = `600 12px ${fam("--mono")}`; ctx.fillStyle = T.strong; ctx.fillText(pct(B[i].p_win, 0), p.x, a.top + 12); ctx.font = `400 10.5px ${fam("--sans")}`; ctx.fillStyle = T.text; ctx.fillText("win odds", p.x, a.top + 26); }); ctx.restore(); } }],
    });

    drawHeat();
  }

  function drawRoll() {
    const T = theme();
    const R = D.rolling[String(rollH)], rs = RS[rollH];
    make("c-roll", {
      type: "line",
      data: { labels: R.start, datasets: [lineDs("After tax", R.excess_net.map((v) => v * 100), css("--s-sp"), 2, { fill: { target: { value: 0 }, above: hexA(css("--s-sp"), 0.16), below: hexA(css("--s-dep"), 0.22) } })] },
      options: {
        maintainAspectRatio: false, animation: anim(600), interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { title: (i) => `Bought in ${mName(i[0].label)}, held ${yrs(rollH)}`, label: (c) => ` ${c.parsed.y >= 0 ? "S&P 500" : "Deposit"} ahead by ${nf(Math.abs(c.parsed.y), 1)} pp a year` } } },
        scales: { x: { grid: { display: false }, border: { color: T.axis }, ticks: yearTicks(R.start, innerWidth < 640 ? (rollH >= 10 ? 4 : 10) : (rollH >= 10 ? 2 : 5)) },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? T.zero : T.grid), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => (v > 0 ? "+" : "") + v + " pp" } } },
      },
    });
    $("#roll-readout").innerHTML = `<b>${yrs(rollH)}:</b> the S&amp;P 500 won in <b>${pct(rs.win_net, 0)}</b> of ${rs.windows} windows · median excess <b>${pp(rs.median_excess_net)}</b> a year · worst entry ${mName(rs.worst_start)} at <b>${pp(rs.worst_excess_net)}</b> a year`;
  }

  const rgb = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`; };
  function drawHeat() {
    const H = D.heat, ys = H.years, n = ys.length;
    const mid = css("--div-mid"), pos = css("--s-sp"), neg = css("--s-dep");
    const col = (v) => (v >= 0 ? mix(mid, pos, Math.min(v / 0.15, 1) ** 0.8) : mix(mid, neg, Math.min(-v / 0.15, 1) ** 0.8));
    $("#heat-bar").style.background = `linear-gradient(90deg, ${neg}, ${mid}, ${pos})`;
    const g = $("#heat-grid");
    g.style.gridTemplateColumns = `40px repeat(${n}, auto)`;
    let html = `<div></div>` + ys.map((y) => `<div class="lx">${y}</div>`).join("");
    ys.forEach((a, i) => {
      html += `<div class="ly">${a}</div>`;
      ys.forEach((b, j) => {
        const v = H.values[i][j];
        html += v == null ? `<div></div>` : `<div class="c" tabindex="0" data-a="${a}" data-b="${b}" data-v="${v}" style="background:${col(v)}" aria-label="Bought ${a}, sold ${b}: ${pp(v)} a year"></div>`;
      });
    });
    g.innerHTML = html;
  }
  const heatShow = (e) => {
    const c = e.target.closest(".c"); if (!c) return;
    const v = +c.dataset.v, a = +c.dataset.a, b = +c.dataset.b, n = b - a + 1;
    $("#heat-readout").innerHTML = `Bought at the start of <b>${a}</b>, sold at the end of <b>${b}</b> (${yrs(n)}): ${v >= 0 ? "S&amp;P 500" : "deposit"} ahead by <b>${nf(Math.abs(v * 100), 1)} pp</b> a year`;
  };
  $("#heat-grid").addEventListener("mouseover", heatShow);
  $("#heat-grid").addEventListener("focusin", heatShow);

  /* ---------- controls ---------- */
  const press = (on, off) => { on.setAttribute("aria-pressed", "true"); off.setAttribute("aria-pressed", "false"); };
  $("#g-nom").addEventListener("click", () => { growthReal = false; press($("#g-nom"), $("#g-real")); draw(); });
  $("#g-real").addEventListener("click", () => { growthReal = true; press($("#g-real"), $("#g-nom")); draw(); });

  const seg = $("#roll-seg");
  seg.innerHTML = Object.keys(D.rolling).map((h) => `<button type="button" data-h="${h}" aria-pressed="${+h === rollH}">${yrs(+h)}</button>`).join("");
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    rollH = +b.dataset.h;
    seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    drawRoll();
  });

  let tax = CGT;
  function calc() {
    const s = +$("#in-sp").value / 100, f = +$("#in-fx").value / 100, d = +$("#in-dep").value / 100, h = +$("#in-h").value, sum = +$("#in-sum").value;
    $("#o-sp").textContent = pct(s); $("#o-fx").textContent = pct(f); $("#o-dep").textContent = pct(d);
    $("#o-h").textContent = yrs(h); $("#o-sum").textContent = money(sum);
    let sp = Math.pow((1 + s - 0.0035) * (1 + f), h) * (1 - COST);
    sp -= tax * Math.max(sp - 1, 0);
    const dp = Math.pow(1 + d / 12, 12 * h);
    $("#r-sp").textContent = money(sp * sum); $("#r-dep").textContent = money(dp * sum);
    const mx = Math.max(sp, dp);
    $("#m-sp").style.width = (sp / mx) * 100 + "%"; $("#m-dep").style.width = (dp / mx) * 100 + "%";
    const ex = Math.pow(sp / dp, 1 / h) - 1;
    $("#r-verdict").textContent = sp >= dp ? `The S&P 500 finishes ${money((sp - dp) * sum)} ahead` : `The deposit finishes ${money((dp - sp) * sum)} ahead`;
    const need = Math.pow(1 + d / 12, 12) / (1 + s - 0.0035) - 1;
    $("#r-be").textContent = `${pp(ex)} a year versus the deposit. Break-even requires the tenge to weaken by ${pct(need)} a year, before exit costs and tax.`;
  }
  ["#in-sp", "#in-fx", "#in-dep", "#in-h", "#in-sum"].forEach((id) => $(id).addEventListener("input", calc));
  $("#tax-10").addEventListener("click", () => { tax = CGT; press($("#tax-10"), $("#tax-0")); calc(); });
  $("#tax-0").addEventListener("click", () => { tax = 0; press($("#tax-0"), $("#tax-10")); calc(); });
  calc();

  // citation
  const toast = (msg) => { const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };
  $("#cite-btn").addEventListener("click", async () => {
    const txt = $("#cite-text").textContent;
    try { await navigator.clipboard.writeText(txt); toast("Citation copied"); }
    catch { $("#cite-text").scrollIntoView({ block: "center" }); toast("Select the citation text below to copy it"); }
  });

  // theme toggle
  $("#theme-btn").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
  });

  // nav highlight + progress
  const links = [...document.querySelectorAll(".topnav a")];
  const targets = links.map((l) => document.querySelector(l.getAttribute("href")));
  const bar = $("#progress");
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
    let cur = -1; targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < 140) cur = i; });
    links.forEach((l, i) => l.classList.toggle("on", i === cur));
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const redraw = () => requestAnimationFrame(draw);
  let rt; let lastW = innerWidth; addEventListener("resize", () => { if ((innerWidth < 640) === (lastW < 640)) return; lastW = innerWidth; clearTimeout(rt); rt = setTimeout(draw, 150); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
})();

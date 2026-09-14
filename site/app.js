(function () {
  "use strict";
  const D = window.RESEARCH;
  const $ = (s) => document.querySelector(s);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const nf = (x, d = 1) => x.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (x, d = 1, sign = false) => (x == null ? "—" : (sign && x > 0 ? "+" : "") + nf(x * 100, d).replace("-", "−") + "%");
  const money = (x) => {
    const a = Math.abs(x);
    if (a >= 1e9) return nf(x / 1e9, 2) + " млрд ₸";
    if (a >= 1e6) return nf(x / 1e6, 1) + " млн ₸";
    return Math.round(x).toLocaleString("ru-RU") + " ₸";
  };
  const monthName = (p) => {
    const m = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    const [y, mm] = p.split("-");
    return m[+mm - 1] + " " + y;
  };
  const S = Object.fromEntries(D.summary.map((s) => [s.key, s]));
  const RS = Object.fromEntries(D.rolling_summary.map((s) => [s.horizon, s]));

  /* ---------- static content ---------- */
  const tone = (sel) => `<i class="swatch" style="background:var(${sel})"></i>`;
  $("#board").innerHTML = `
    <div><span class="k">Курс USD/KZT, НБРК</span><span class="v">${nf(D.meta.usdkzt_start, 0)} → ${nf(D.meta.usdkzt_end, 0)} <small>₸</small></span><span class="d">31.12.1999 → 31.08.2026, ${pct(D.meta.fx_cagr, 2)} в год</span></div>
    <div><span class="k">${tone("--s-dep")}1 млн ₸ на депозите в тенге</span><span class="v">${nf(S.dep_kzt.multiple, 1)} <small>млн ₸</small></span><span class="d">${pct(S.dep_kzt.cagr)} в год · ни одного убыточного месяца</span></div>
    <div><span class="k">${tone("--s-sp")}1 млн ₸ в S&amp;P 500, после налогов</span><span class="v">${nf(S.sp_net_kzt.multiple, 1)} <small>млн ₸</small></span><span class="d">${pct(S.sp_net_kzt.cagr)} в год · просадка до ${pct(S.sp_net_kzt.max_dd, 0)}</span></div>
    <div><span class="k">Шанс обогнать депозит</span><span class="v">${pct(RS[1].win_net, 0)} → ${pct(RS[20].win_net, 0)}</span><span class="d">горизонт 1 год → 20 лет, все даты входа</span></div>`;

  const hyp = [
    ["ok", "Подтверждена", `<b>H1.</b> За весь период S&amp;P 500 в тенге после налогов обгоняет тенговый депозит: ${pct(S.sp_net_kzt.cagr)} против ${pct(S.dep_kzt.cagr)} в год.`],
    ["no", "Отвергнута", `<b>H2.</b> S&amp;P 500 стабильно (в ≥80% случаев) обгоняет депозит на горизонте до 5 лет. Факт: ${pct(RS[1].win_net, 0)}–${pct(RS[5].win_net, 0)} окон.`],
    ["mid", "Частично", `<b>H3.</b> На горизонте 15+ лет преимущество устойчиво: ${pct(RS[15].win_net, 0)}–${pct(RS[20].win_net, 0)} исторических окон, но только ${pct(D.bootstrap.find((b) => b.horizon === 20).p_win, 0)} в бутстрепе.`],
    ["ok", "Подтверждена", `<b>H4.</b> Главный источник преимущества — ослабление тенге: в долларах S&amp;P 500 дал ${pct(D.meta.spusd_cagr)} в год, меньше ставки депозита.`],
  ];
  $("#hyp").innerHTML = hyp.map(([c, t, x]) => `<div><span class="tag ${c}">${t}</span><span>${x}</span></div>`).join("");
  $("#corr").textContent = nf(D.meta.corr_m, 2).replace("-", "−");

  // summary table
  const order = ["dep_kzt", "dep_usd_kzt", "sp_kzt", "sp_net_kzt", "mix_50"];
  const sw = { dep_kzt: "--s-dep", dep_usd_kzt: "--s-usd", sp_kzt: "--s-sp", sp_net_kzt: "--s-sp", mix_50: "--s-cpi" };
  $("#t-summary").innerHTML = `<thead><tr><th>Стратегия, 12.1999–08.2026</th><th>Итог из 1 млн ₸</th><th>В год</th><th>Реально в год</th><th>Волатильность</th><th>Макс. просадка</th><th>Худшие 12 мес.</th></tr></thead><tbody>` +
    order.map((k) => { const s = S[k]; return `<tr><td>${tone(sw[k])}${s.name}</td><td>${money(s.multiple * 1e6)}</td><td>${pct(s.cagr)}</td><td>${pct(s.real_cagr)}</td><td>${pct(s.vol)}</td><td>${pct(s.max_dd)}</td><td class="${s.worst_12m < 0 ? "neg" : ""}">${pct(s.worst_12m)}</td></tr>`; }).join("") + `</tbody>`;

  // annual table
  $("#t-annual").innerHTML = `<thead><tr><th>Год</th><th>S&amp;P 500, USD</th><th>USD/KZT</th><th>Курс на конец</th><th>S&amp;P 500, ₸</th><th>Депозит ₸</th><th>Депозит USD, ₸</th><th>Инфляция</th><th>Разница</th><th>Победитель</th></tr></thead><tbody>` +
    D.annual.map((a) => `<tr class="${a.partial ? "partial" : ""}"><td>${a.year}${a.partial ? "*" : ""}</td><td class="${a.sp_usd < 0 ? "neg" : ""}">${pct(a.sp_usd)}</td><td>${pct(a.fx, 1, true)}</td><td>${nf(a.usdkzt_end, 2)}</td><td class="${a.sp_kzt < 0 ? "neg" : ""}">${pct(a.sp_kzt)}</td><td>${pct(a.dep_kzt)}</td><td class="${a.dep_usd_kzt < 0 ? "neg" : ""}">${pct(a.dep_usd_kzt)}</td><td>${pct(a.cpi)}</td><td class="${a.excess < 0 ? "neg" : "pos"}">${pct(a.excess, 1, true)}</td><td><span class="chip ${a.winner === "S&P 500" ? "sp" : "dep"}">${a.winner}</span></td></tr>`).join("") +
    `</tbody>`;

  $("#t-roll").innerHTML = `<thead><tr><th>Горизонт</th><th>Окон</th><th>S&amp;P &gt; депозит ₸ (нетто)</th><th>Брутто</th><th>S&amp;P &gt; депозит USD</th><th>Медиана превышения</th><th>10% худших</th><th>Худшее окно</th><th>Вход в худшее</th></tr></thead><tbody>` +
    D.rolling_summary.map((r) => `<tr><td>${r.horizon} ${r.horizon === 1 ? "год" : r.horizon < 5 ? "года" : "лет"}</td><td>${r.windows}</td><td><b>${pct(r.win_net, 0)}</b></td><td>${pct(r.win_gross, 0)}</td><td>${pct(r.win_vs_usd_dep, 0)}</td><td class="${r.median_excess_net < 0 ? "neg" : "pos"}">${pct(r.median_excess_net, 1, true)}</td><td class="${r.p10_excess_net < 0 ? "neg" : "pos"}">${pct(r.p10_excess_net, 1, true)}</td><td class="neg">${pct(r.worst_excess_net, 1, true)}</td><td>${monthName(r.worst_start)}</td></tr>`).join("") + `</tbody>`;

  $("#t-crisis").innerHTML = `<thead><tr><th>Событие</th><th>Период</th><th>S&amp;P 500, USD</th><th>USD/KZT</th><th>S&amp;P 500, ₸</th><th>Депозит ₸</th></tr></thead><tbody>` +
    D.crisis.map((c) => `<tr><td>${c.event}</td><td>${c.period.split(" — ").map(monthName).join(" — ")}</td><td class="${c.sp_usd < 0 ? "neg" : "pos"}">${pct(c.sp_usd, 1, true)}</td><td>${pct(c.fx, 1, true)}</td><td class="${c.sp_kzt < 0 ? "neg" : "pos"}">${pct(c.sp_kzt, 1, true)}</td><td>${pct(c.dep_kzt, 1, true)}</td></tr>`).join("") + `</tbody>`;

  const F = D.dca_full;
  $("#dca-stats").innerHTML = `
    <div class="stat"><span class="k">Внесено за ${D.meta.months} мес.</span><span class="v">${money(F.paid)}</span></div>
    <div class="stat"><span class="k">${tone("--s-dep")}Депозит в тенге</span><span class="v">${money(F.dep)}</span></div>
    <div class="stat"><span class="k">${tone("--s-sp")}S&amp;P 500 после налогов</span><span class="v">${money(F.sp)}</span></div>`;
  $("#t-dca").innerHTML = `<thead><tr><th>Горизонт взносов</th><th>Окон</th><th>S&amp;P 500 впереди</th><th>Медиана: S&amp;P / депозит</th><th>Худший случай</th><th>Лучший случай</th></tr></thead><tbody>` +
    D.dca.map((r) => `<tr><td>${r.horizon} ${r.horizon < 5 ? "года" : "лет"}</td><td>${r.windows}</td><td><b>${pct(r.win, 0)}</b></td><td>×${nf(r.median_ratio, 2)}</td><td>×${nf(r.worst_ratio, 2)}</td><td>×${nf(r.best_ratio, 2)}</td></tr>`).join("") + `</tbody>`;

  const deps = [...new Set(D.breakeven.map((b) => b.dep))].sort((a, b) => a - b);
  const sps = [...new Set(D.breakeven.map((b) => b.sp_usd))];
  $("#t-breakeven").innerHTML = `<thead><tr><th>Ставка депозита ↓ / S&amp;P 500 в USD →</th>${sps.map((s) => `<th>${pct(s, 0)}</th>`).join("")}</tr></thead><tbody>` +
    deps.map((d) => `<tr><td>${pct(d, 1)}${Math.abs(d - D.meta.dep_now) < 1e-6 ? " — сейчас" : ""}</td>${sps.map((s) => { const b = D.breakeven.find((x) => x.dep === d && x.sp_usd === s); return `<td>${pct(b.fx_needed, 1, true)}</td>`; }).join("")}</tr>`).join("") +
    `</tbody>`;

  $("#refs").innerHTML = D.sources.map((s) => `<li><b>${s["Источник"]}</b> — ${s["Показатель"]} (${s["Период"]}). <a href="${s["Ссылка"]}" target="_blank" rel="noopener">${s["Ссылка"].replace(/^https?:\/\//, "").slice(0, 60)}${s["Ссылка"].length > 68 ? "…" : ""}</a></li>`).join("");

  /* ---------- charts ---------- */
  const charts = {};
  let growthReal = false;
  let rollH = 10;

  function base() {
    Chart.defaults.font.family = css("--body").split(",")[0].replace(/"/g, "") + ", system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = css("--muted");
    Chart.defaults.borderColor = css("--grid");
  }
  const tooltip = () => ({
    backgroundColor: css("--ink"), titleColor: css("--ground"), bodyColor: css("--ground"),
    borderWidth: 0, padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
    titleFont: { weight: "600" }, bodyFont: { family: css("--mono").split(",")[0].replace(/"/g, "") },
  });
  const grid = () => ({ color: css("--grid"), drawTicks: false });
  const axis = () => ({ display: true, color: css("--rule") });
  const yearTicks = (labels) => ({
    autoSkip: false, maxRotation: 0,
    callback: (v, i) => { const p = labels[i]; return p && p.endsWith("-12") && +p.slice(0, 4) % 5 === 4 ? String(+p.slice(0, 4) + 1) : null; },
  });

  function make(id, cfg) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), cfg);
  }

  function drawAll() {
    base();
    const L = D.levels;
    // FX
    make("c-fx", {
      type: "line",
      data: { labels: L.t, datasets: [{ data: L.usdkzt, borderColor: css("--s-fx"), borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0, label: "USD/KZT" }] },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { title: (i) => monthName(i[0].label), label: (c) => ` ${nf(c.parsed.y, 2)} ₸ за $1` } } },
        scales: { x: { grid: { display: false }, border: axis(), ticks: yearTicks(L.t) }, y: { grid: grid(), border: { display: false }, ticks: { padding: 8 } } },
      },
    });
    make("c-rates", {
      type: "line",
      data: { labels: L.t, datasets: [
        { label: "в тенге", data: L.dep_kzt, borderColor: css("--s-dep"), borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0 },
        { label: "в валюте", data: L.dep_usd, borderColor: css("--s-usd"), borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0 },
      ] },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { title: (i) => monthName(i[0].label), label: (c) => ` ${c.dataset.label}: ${nf(c.parsed.y, 1)}%` } } },
        scales: { x: { grid: { display: false }, border: axis(), ticks: yearTicks(L.t) }, y: { min: 0, grid: grid(), border: { display: false }, ticks: { padding: 8, callback: (v) => v + "%" } } },
      },
    });

    // growth
    const W = D.wealth;
    const defl = (arr) => arr.map((v, i) => (growthReal ? (v / W.cpi[i]) * 1e6 : v));
    const gs = [
      { k: "sp_kzt", label: "S&P 500, брутто", color: css("--s-sp"), w: 1.5, alpha: 0.45 },
      { k: "sp_net_kzt", label: "S&P 500, нетто (без налога на выходе)", color: css("--s-sp"), w: 2.25 },
      { k: "dep_kzt", label: "Депозит в тенге", color: css("--s-dep"), w: 2.25 },
      { k: "dep_usd_kzt", label: "Депозит в USD", color: css("--s-usd"), w: 2 },
    ];
    if (!growthReal) gs.push({ k: "cpi", label: "Инфляция (цены)", color: css("--s-cpi"), w: 1.5 });
    const withAlpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, "0");
    $("#growth-legend").innerHTML = gs.map((g) => `<span><i class="swatch" style="background:${g.color};opacity:${g.alpha || 1}"></i>${g.label}</span>`).join("");
    make("c-growth", {
      type: "line",
      data: { labels: W.t, datasets: gs.map((g) => ({ label: g.label, data: defl(W[g.k]), borderColor: g.alpha ? withAlpha(g.color, g.alpha) : g.color, borderWidth: g.w, pointRadius: 0, pointHoverRadius: 5, tension: 0 })) },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), itemSort: (a, b) => b.parsed.y - a.parsed.y, callbacks: { title: (i) => monthName(i[0].label), label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } } },
        scales: {
          x: { grid: { display: false }, border: axis(), ticks: yearTicks(W.t) },
          y: { type: "logarithmic", grid: grid(), border: { display: false },
               ticks: { padding: 8, callback: (v) => ([0.5e6, 1e6, 2e6, 5e6, 1e7, 2e7, 3e7].includes(v) ? money(v).replace(",0", "") : null) } },
        },
      },
    });

    // annual excess
    const A = D.annual;
    make("c-annual", {
      type: "bar",
      data: { labels: A.map((a) => (a.partial ? a.year + "*" : String(a.year))), datasets: [{
        data: A.map((a) => a.excess * 100),
        backgroundColor: A.map((a) => (a.excess >= 0 ? css("--s-sp") : css("--s-dep"))),
        borderRadius: 4, borderSkipped: "start", barPercentage: 0.78, categoryPercentage: 0.9,
      }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: {
          title: (i) => { const a = A[i[0].dataIndex]; return a.year + (a.partial ? " (янв–авг)" : ""); },
          label: (c) => { const a = A[c.dataIndex]; return [` S&P 500 в ₸: ${pct(a.sp_kzt)}`, ` Депозит ₸: ${pct(a.dep_kzt)}`, ` Курс USD/KZT: ${pct(a.fx, 1, true)}`, ` Разница: ${pct(a.excess, 1, true)}`]; },
        } } },
        scales: { x: { grid: { display: false }, border: axis(), ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 6 } },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? css("--muted") : css("--grid")), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => (v > 0 ? "+" : "") + v + "%" } } },
      },
    });

    // win rate by horizon
    const R = D.rolling_summary;
    make("c-win", {
      type: "bar",
      data: { labels: R.map((r) => r.horizon + (r.horizon === 1 ? " год" : r.horizon < 5 ? " года" : " лет")), datasets: [
        { label: "нетто", data: R.map((r) => r.win_net * 100), backgroundColor: css("--s-sp"), borderRadius: 4, borderSkipped: "start" },
        { label: "брутто", data: R.map((r) => r.win_gross * 100), backgroundColor: withAlpha(css("--s-sp"), 0.4), borderRadius: 4, borderSkipped: "start" },
      ] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { label: (c) => ` ${c.dataset.label}: ${nf(c.parsed.y, 0)}% окон (${R[c.dataIndex].windows})` } } },
        scales: { x: { grid: { display: false }, border: axis() },
                  y: { min: 0, max: 100, grid: { color: (c) => (c.tick.value === 50 ? css("--muted") : css("--grid")), drawTicks: false }, border: { display: false }, ticks: { padding: 8, stepSize: 25, callback: (v) => v + "%" } } },
      },
    });

    drawRoll();

    // carry
    const C = D.carry;
    make("c-carry", {
      type: "bar",
      data: { labels: C.map((c) => c.year), datasets: [
        { label: "ставка KZT − ставка USD", data: C.map((c) => c.rate_diff * 100), backgroundColor: css("--s-dep"), borderRadius: 3, borderSkipped: "start" },
        { label: "изменение USD/KZT", data: C.map((c) => c.fx * 100), backgroundColor: css("--s-fx"), borderRadius: 3, borderSkipped: "start" },
      ] },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { label: (c) => ` ${c.dataset.label}: ${pct(c.parsed.y / 100, 1, true)}` } } },
        scales: { x: { grid: { display: false }, border: axis(), ticks: { maxRotation: 0, autoSkipPadding: 6 } },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? css("--muted") : css("--grid")), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => v + "%" } } },
      },
    });

    // drawdown
    const dd = (arr) => { let pk = -Infinity; return arr.map((v) => { pk = Math.max(pk, v); return (v / pk - 1) * 100; }); };
    const dds = [
      { k: "sp_net_kzt", label: "S&P 500 в ₸", color: css("--s-sp") },
      { k: "dep_usd_kzt", label: "Депозит в USD", color: css("--s-usd") },
      { k: "mix_50", label: "50/50", color: css("--s-cpi") },
      { k: "dep_kzt", label: "Депозит в ₸", color: css("--s-dep") },
    ];
    $("#dd-legend").innerHTML = dds.map((g) => `<span><i class="swatch" style="background:${g.color}"></i>${g.label}</span>`).join("");
    make("c-dd", {
      type: "line",
      data: { labels: W.t, datasets: dds.map((g) => ({ label: g.label, data: dd(W[g.k]), borderColor: g.color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0, fill: false })) },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: { title: (i) => monthName(i[0].label), label: (c) => ` ${c.dataset.label}: ${nf(c.parsed.y, 1).replace("-", "−")}%` } } },
        scales: { x: { grid: { display: false }, border: axis(), ticks: yearTicks(W.t) }, y: { max: 0, grid: grid(), border: { display: false }, ticks: { padding: 8, callback: (v) => v + "%" } } },
      },
    });

    // bootstrap
    const B = D.bootstrap;
    const lbl = B.map((b) => b.horizon + (b.horizon === 1 ? " год" : b.horizon < 5 ? " года" : " лет"));
    make("c-boot", {
      type: "bar",
      data: { labels: lbl, datasets: [
        { type: "line", label: "медиана", data: B.map((b) => b.median * 100), showLine: false, pointRadius: 6, pointHoverRadius: 8, pointBackgroundColor: css("--ink"), pointBorderColor: css("--surface"), pointBorderWidth: 2, order: 0 },
        { label: "25–75%", data: B.map((b) => [b.p25 * 100, b.p75 * 100]), backgroundColor: css("--s-sp"), borderRadius: 4, borderSkipped: false, barPercentage: 0.34, grouped: false, order: 1 },
        { label: "5–95%", data: B.map((b) => [b.p5 * 100, b.p95 * 100]), backgroundColor: withAlpha(css("--s-sp"), 0.28), borderRadius: 4, borderSkipped: false, barPercentage: 0.34, grouped: false, order: 2 },
      ] },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: {
          label: (c) => (Array.isArray(c.raw) ? ` ${c.dataset.label}: ${pct(c.raw[0] / 100, 1, true)} … ${pct(c.raw[1] / 100, 1, true)}` : ` медиана: ${pct(c.raw / 100, 1, true)}`),
          afterBody: (i) => ` вероятность обогнать: ${pct(B[i[0].dataIndex].p_win, 0)}`,
        } } },
        scales: { x: { grid: { display: false }, border: axis() },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? css("--muted") : css("--grid")), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => (v > 0 ? "+" : "") + v + "%" } } },
      },
    });

    drawHeat();
  }

  function drawRoll() {
    const R = D.rolling[String(rollH)];
    const rs = RS[rollH];
    make("c-roll", {
      type: "line",
      data: { labels: R.start, datasets: [
        { label: "нетто", data: R.excess_net.map((v) => v * 100), borderColor: css("--s-sp"), borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0,
          fill: { target: { value: 0 }, above: withAlphaCss("--s-sp", 0.16), below: withAlphaCss("--s-dep", 0.22) } },
      ] },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip(), callbacks: {
          title: (i) => `Вход: ${monthName(i[0].label)}`,
          label: (c) => ` ${c.parsed.y >= 0 ? "S&P 500 впереди" : "депозит впереди"} на ${nf(Math.abs(c.parsed.y), 1)} п.п. в год`,
        } } },
        scales: { x: { grid: { display: false }, border: axis(), ticks: { autoSkip: false, maxRotation: 0, callback: (v, i) => (R.start[i].endsWith("-01") && +R.start[i].slice(0, 4) % 5 === 0 ? R.start[i].slice(0, 4) : null) } },
                  y: { grid: { color: (c) => (c.tick.value === 0 ? css("--muted") : css("--grid")), drawTicks: false }, border: { display: false }, ticks: { padding: 8, callback: (v) => (v > 0 ? "+" : "") + v + "%" } } },
      },
    });
    const word = rollH === 1 ? "год" : rollH < 5 ? "года" : "лет";
    $("#roll-readout").innerHTML = `Горизонт ${rollH} ${word}: S&amp;P 500 впереди в <b>${pct(rs.win_net, 0)}</b> из ${rs.windows} окон · медиана <b>${pct(rs.median_excess_net, 1, true)}</b> в год · худший вход — ${monthName(rs.worst_start)} (<b>${pct(rs.worst_excess_net, 1, true)}</b>)`;
  }

  function withAlpha(hex, a) { return hex + Math.round(a * 255).toString(16).padStart(2, "0"); }
  function withAlphaCss(v, a) { return withAlpha(css(v), a); }

  function hexRgb(h) { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`; }

  function drawHeat() {
    const H = D.heat, yrs = H.years, n = yrs.length;
    const mid = css("--div-mid"), pos = css("--s-sp"), neg = css("--s-dep");
    const color = (v) => (v == null ? "transparent" : v >= 0 ? mix(mid, pos, Math.min(v / 0.15, 1)) : mix(mid, neg, Math.min(-v / 0.15, 1)));
    $("#heat-bar").style.background = `linear-gradient(90deg, ${neg}, ${mid}, ${pos})`;
    const g = $("#heat-grid");
    g.style.gridTemplateColumns = `38px repeat(${n}, 22px)`;
    let html = `<div></div>` + yrs.map((y) => `<div class="top">${y}</div>`).join("");
    yrs.forEach((a, i) => {
      html += `<div class="lab">${a}</div>`;
      yrs.forEach((b, j) => {
        const v = H.values[i][j];
        html += v == null ? `<div></div>` : `<div class="c" tabindex="0" data-a="${a}" data-b="${b}" data-v="${v}" style="background:${color(v)}" aria-label="Вход ${a}, выход ${b}: ${pct(v, 1, true)} в год"></div>`;
      });
    });
    g.innerHTML = html;
  }
  const heatShow = (e) => {
    const c = e.target.closest(".c"); if (!c) return;
    const v = +c.dataset.v, a = c.dataset.a, b = c.dataset.b, n = b - a + 1;
    $("#heat-readout").innerHTML = `Вход в начале <b>${a}</b>, выход в конце <b>${b}</b> (${n} ${n === 1 ? "год" : n < 5 ? "года" : "лет"}): ${v >= 0 ? "S&amp;P 500 впереди" : "депозит впереди"} на <b>${nf(Math.abs(v * 100), 1)} п.п.</b> в год`;
  };
  $("#heat-grid").addEventListener("mouseover", heatShow);
  $("#heat-grid").addEventListener("focusin", heatShow);

  /* ---------- controls ---------- */
  const setPressed = (on, off) => { on.setAttribute("aria-pressed", "true"); off.setAttribute("aria-pressed", "false"); };
  $("#g-nom").addEventListener("click", () => { growthReal = false; setPressed($("#g-nom"), $("#g-real")); drawAll(); });
  $("#g-real").addEventListener("click", () => { growthReal = true; setPressed($("#g-real"), $("#g-nom")); drawAll(); });

  const seg = $("#roll-seg");
  seg.innerHTML = Object.keys(D.rolling).map((h) => `<button type="button" data-h="${h}" aria-pressed="${+h === rollH}">${h} ${+h === 1 ? "год" : +h < 5 ? "года" : "лет"}</button>`).join("");
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    rollH = +b.dataset.h;
    seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    drawRoll();
  });

  // calculator
  let tax = 0.1;
  function calc() {
    const s = +$("#in-sp").value / 100, f = +$("#in-fx").value / 100, d = +$("#in-dep").value / 100, h = +$("#in-h").value, sum = +$("#in-sum").value;
    $("#o-sp").textContent = nf(s * 100, 1) + "%"; $("#o-fx").textContent = nf(f * 100, 1) + "%";
    $("#o-dep").textContent = nf(d * 100, 1) + "%"; $("#o-h").textContent = h; $("#o-sum").textContent = money(sum);
    let sp = Math.pow((1 + s - 0.0035) * (1 + f), h) * (1 - D.meta.cost);
    sp -= tax * Math.max(sp - 1, 0);
    const dp = Math.pow(1 + d / 12, 12 * h);
    $("#r-sp").textContent = money(sp * sum); $("#r-dep").textContent = money(dp * sum);
    const mx = Math.max(sp, dp);
    $("#m-sp").style.width = (sp / mx) * 100 + "%"; $("#m-dep").style.width = (dp / mx) * 100 + "%";
    const ex = Math.pow(sp / dp, 1 / h) - 1;
    $("#r-verdict").textContent = sp > dp ? `S&P 500 впереди на ${money((sp - dp) * sum)}` : `Депозит впереди на ${money((dp - sp) * sum)}`;
    const need = Math.pow(1 + d / 12, 12) / (1 + s - 0.0035) - 1;
    $("#r-be").textContent = `${pct(ex, 1, true)} в год к депозиту · для паритета без учёта налога на выходе тенге должен слабеть на ${pct(need, 1)} в год`;
  }
  ["#in-sp", "#in-fx", "#in-dep", "#in-h", "#in-sum"].forEach((id) => $(id).addEventListener("input", calc));
  $("#tax-10").addEventListener("click", () => { tax = 0.1; setPressed($("#tax-10"), $("#tax-0")); calc(); });
  $("#tax-0").addEventListener("click", () => { tax = 0; setPressed($("#tax-0"), $("#tax-10")); calc(); });
  $("#in-dep").value = (D.meta.dep_now * 100).toFixed(1);
  calc();

  // toc highlight
  const links = [...document.querySelectorAll("nav.toc a")];
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((l) => l.classList.toggle("on", l.getAttribute("href") === "#" + e.target.id)); }), { rootMargin: "-20% 0px -70% 0px" });
  document.querySelectorAll("main section").forEach((s) => io.observe(s));

  // theme changes → redraw with new tokens
  const redraw = () => requestAnimationFrame(drawAll);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  if (window.Chart) drawAll();
  else window.addEventListener("load", drawAll);
})();

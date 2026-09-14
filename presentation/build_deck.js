// Сборка презентации: node presentation/build_deck.js
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "site", "data.js"), "utf8");
const D = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
const S = Object.fromEntries(D.summary.map((s) => [s.key, s]));
const RS = Object.fromEntries(D.rolling_summary.map((s) => [s.horizon, s]));

// ---------- палитра и типографика ----------
const C = {
  ink: "101A19", ink2: "46524F", muted: "7A8582", rule: "D9DFDC", grid: "E4E8E6", ground: "F4F6F5", white: "FFFFFF",
  accent: "0B6468", accentSoft: "D7EBEB", sp: "2A78D6", spLight: "86B6EF", dep: "EB6834", usd: "1BAF7A", fx: "4A3AA7", cpi: "898781",
  good: "006300", bad: "B3261E", darkText: "C9D3D0",
};
const HEAD = "Arial";
const BODY = "Calibri";

const nf = (x, d = 1) => x.toFixed(d).replace(".", ",").replace("-", "−");
const pct = (x, d = 1, sign = false) => (sign && x > 0 ? "+" : "") + nf(x * 100, d) + "%";
const yrWord = (h) => (h === 1 ? "год" : h < 5 ? "года" : "лет");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 × 7.5
pres.title = "Может ли S&P 500 стабильно обгонять депозит в тенге?";
pres.lang = "ru-RU";
const W = 13.333, M = 0.6;

function eyebrow(slide, n, text, dark = false) {
  slide.addText(`${String(n).padStart(2, "0")}  ·  ${text.toUpperCase()}`, {
    x: M, y: 0.42, w: 9, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, bold: true, charSpacing: 2,
    color: dark ? "5CBCBF" : C.accent, isTextBox: true,
  });
}
function title(slide, text, opts = {}) {
  slide.addText(text, { x: M, y: 0.78, w: opts.w || W - 2 * M, h: opts.h || 0.95, margin: 0, fontFace: HEAD, fontSize: opts.size || 30, bold: true, color: opts.color || C.ink, valign: "top", isTextBox: true });
}
function source(slide, text, dark = false) {
  slide.addText(text, { x: M, y: 7.02, w: W - 2 * M, h: 0.28, margin: 0, fontFace: BODY, fontSize: 9.5, color: dark ? "87918E" : C.muted, isTextBox: true });
}
function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: C.white };
  return s;
}
function card(slide, x, y, w, h, fill = C.ground) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12 });
}
function bigStat(slide, x, y, w, value, label, color = C.ink, fill = C.ground) {
  card(slide, x, y, w, 1.35, fill);
  slide.addText(value, { x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.62, margin: 0, fontFace: HEAD, fontSize: 30, bold: true, color, isTextBox: true });
  slide.addText(label, { x: x + 0.25, y: y + 0.8, w: w - 0.5, h: 0.45, margin: 0, fontFace: BODY, fontSize: 12, color: C.ink2, valign: "top", isTextBox: true });
}
const axisBase = () => ({
  catAxisLabelColor: C.muted, valAxisLabelColor: C.muted, catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
  catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valGridLine: { color: C.grid, size: 0.75 }, catGridLine: { style: "none" },
  catAxisLineShow: true, catAxisLineColor: C.rule, valAxisLineShow: false, legendFontFace: BODY, legendFontSize: 11, legendColor: C.ink2,
});
function legendRow(slide, x, y, items) {
  let cx = x;
  items.forEach(([color, label]) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: y + 0.07, w: 0.16, h: 0.16, fill: { color }, line: { color }, rectRadius: 0.03 });
    const w = 0.35 + label.length * 0.085;
    slide.addText(label, { x: cx + 0.24, y, w, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, color: C.ink2, isTextBox: true });
    cx += 0.24 + w + 0.2;
  });
}

// ---------- 1. титул ----------
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  s.addText("ИССЛЕДОВАТЕЛЬСКИЙ ПРОЕКТ  ·  ДАННЫЕ НБРК, S&P DOW JONES, IMF", { x: M, y: 0.7, w: 11, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12, bold: true, charSpacing: 2, color: "5CBCBF", isTextBox: true });
  s.addText([
    { text: "Может ли ", options: { color: C.white } },
    { text: "S&P 500", options: { color: "5A9BE8" } },
    { text: " стабильно обгонять депозит в ", options: { color: C.white } },
    { text: "тенге", options: { color: "F08A5D" } },
    { text: "?", options: { color: C.white } },
  ], { x: M, y: 1.35, w: 10.5, h: 2.6, margin: 0, fontFace: HEAD, fontSize: 50, bold: true, valign: "top", isTextBox: true });
  s.addText("320 месяцев реальных данных: декабрь 1999 — август 2026. Доходности в тенге, с налогами и комиссиями, для каждого момента входа.", {
    x: M, y: 4.15, w: 8.6, h: 0.9, margin: 0, fontFace: BODY, fontSize: 18, color: C.darkText, valign: "top", isTextBox: true,
  });
  const tiles = [
    [`${nf(D.meta.usdkzt_start, 0)} → ${nf(D.meta.usdkzt_end, 0)}`, "курс USD/KZT, НБРК"],
    [`${nf(S.dep_kzt.multiple, 1)} млн ₸`, "из 1 млн на депозите"],
    [`${nf(S.sp_net_kzt.multiple, 1)} млн ₸`, "из 1 млн в S&P 500, нетто"],
  ];
  tiles.forEach(([v, l], i) => {
    const x = M + i * 4.05;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.45, w: 3.8, h: 1.25, fill: { color: "1C2826" }, line: { color: "1C2826" }, rectRadius: 0.12 });
    s.addText(v, { x: x + 0.25, y: 5.6, w: 3.3, h: 0.6, margin: 0, fontFace: HEAD, fontSize: 26, bold: true, color: C.white, isTextBox: true });
    s.addText(l, { x: x + 0.25, y: 6.2, w: 3.3, h: 0.35, margin: 0, fontFace: BODY, fontSize: 13, color: C.darkText, isTextBox: true });
  });
  s.addNotes("Тема: сравнение двух способов сбережения для жителя Казахстана — срочного депозита в тенге и инвестиций в индекс S&P 500. Все расчёты сделаны на официальных данных за 26,7 лет.");
}

// ---------- 2. вопрос и гипотезы ----------
{
  const s = lightSlide();
  eyebrow(s, 1, "Вопрос и гипотезы");
  title(s, "Что именно мы проверяем");
  s.addText([
    { text: "Депозит в тенге: ", options: { bold: true, color: C.dep } },
    { text: "высокая ставка, гарантия КФГД, 0% ИПН — но валюта подешевела к доллару в 3,4 раза.", options: { breakLine: true } },
    { text: "S&P 500: ", options: { bold: true, color: C.sp } },
    { text: "500 крупнейших компаний США — доходный, но волатильный, долларовый и облагаемый налогами.", options: { breakLine: true } },
    { text: "Вопрос: ", options: { bold: true } },
    { text: "обгоняет ли S&P 500 в тенге депозит — и насколько стабильно, при каком горизонте и с какой вероятностью?" },
  ], { x: M, y: 1.85, w: 5.2, h: 4.5, margin: 0, fontFace: BODY, fontSize: 17, color: C.ink, valign: "top", paraSpaceAfter: 14, isTextBox: true });

  const hyp = [
    ["H1", "За весь период S&P 500 после налогов обгоняет депозит", `Подтверждена: ${pct(S.sp_net_kzt.cagr)} против ${pct(S.dep_kzt.cagr)} в год`, C.good],
    ["H2", "Стабильно (≥80% случаев) — уже на горизонте до 5 лет", `Отвергнута: лишь ${pct(RS[1].win_net, 0)}–${pct(RS[5].win_net, 0)} окон`, C.bad],
    ["H3", "На горизонте 15+ лет преимущество устойчиво", `Частично: ${pct(RS[15].win_net, 0)}–${pct(RS[20].win_net, 0)} окон, но 64–67% в бутстрепе`, C.accent],
    ["H4", "Главный источник преимущества — ослабление тенге", `Подтверждена: в USD S&P 500 дал ${pct(D.meta.spusd_cagr)} в год`, C.good],
  ];
  hyp.forEach(([k, h, r, col], i) => {
    const y = 1.85 + i * 1.22;
    card(s, 6.3, y, 6.43, 1.06);
    s.addShape(pres.shapes.OVAL, { x: 6.5, y: y + 0.25, w: 0.56, h: 0.56, fill: { color: col }, line: { color: col } });
    s.addText(k, { x: 6.5, y: y + 0.25, w: 0.56, h: 0.56, margin: 0, align: "center", valign: "middle", fontFace: HEAD, fontSize: 13, bold: true, color: C.white, isTextBox: true });
    s.addText(h, { x: 7.25, y: y + 0.14, w: 5.3, h: 0.42, margin: 0, fontFace: BODY, fontSize: 15, bold: true, color: C.ink, valign: "top", isTextBox: true });
    s.addText(r, { x: 7.25, y: y + 0.56, w: 5.3, h: 0.36, margin: 0, fontFace: BODY, fontSize: 13, color: col, valign: "top", isTextBox: true });
  });
  s.addNotes("Сформулированы четыре гипотезы. Результаты проверки показаны сразу, дальше — доказательства по каждой.");
}

// ---------- 3. данные и методология ----------
{
  const s = lightSlide();
  eyebrow(s, 2, "Данные и методология");
  title(s, "Только первичные источники, месячная частота");
  const rows = [
    ["Ряд", "Источник", "Период"],
    ["S&P 500 Total Return (^SP500TR), SPY", "S&P Dow Jones Indices / Yahoo Finance", "12.1999–08.2026"],
    ["Официальный курс USD/KZT, конец месяца", "Национальный Банк РК", "12.1999–08.2026"],
    ["Ставки по срочным депозитам физлиц, KZT и валюта", "Национальный Банк РК", "12.1999–07.2026"],
    ["Индекс потребительских цен", "IMF IFS; БНС АСПиР РК", "12.1999–08.2026"],
  ];
  s.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? C.muted : C.ink, fontSize: i === 0 ? 11 : 13, fill: { color: C.white } } }))), {
    x: M, y: 1.9, w: 7.1, colW: [3.1, 2.55, 1.45], fontFace: BODY, border: { type: "solid", pt: 0.75, color: C.rule }, rowH: 0.52, valign: "middle", margin: 0.08,
  });
  s.addText("Контроль качества: доходность ETF SPY отличается от индекса на −0,08% в год — ровно на комиссию фонда.", { x: M, y: 4.8, w: 7.1, h: 0.6, margin: 0, fontFace: BODY, fontSize: 13, italic: true, color: C.ink2, isTextBox: true });

  card(s, 8.1, 1.9, 4.63, 4.8);
  s.addText("Модель «нетто» для S&P 500", { x: 8.35, y: 2.08, w: 4.2, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: C.ink, isTextBox: true });
  s.addText([
    { text: "15% налог в США на дивиденды (W-8BEN)", options: { bullet: true, breakLine: true } },
    { text: "0,10% в год: комиссия ETF и брокера", options: { bullet: true, breakLine: true } },
    { text: "0,5% на конвертацию при входе и выходе", options: { bullet: true, breakLine: true } },
    { text: "10% ИПН с прироста в тенге при продаже (вне KASE/AIX)", options: { bullet: true } },
  ], { x: 8.35, y: 2.55, w: 4.2, h: 2.0, margin: 0, fontFace: BODY, fontSize: 13.5, color: C.ink, paraSpaceAfter: 6, valign: "top", isTextBox: true });
  s.addText("Депозит", { x: 8.35, y: 4.6, w: 4.2, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: C.ink, isTextBox: true });
  s.addText("Средневзвешенная ставка НБРК по новым срочным вкладам, ежемесячная капитализация, без ИПН.", { x: 8.35, y: 5.02, w: 4.2, h: 1.2, margin: 0, fontFace: BODY, fontSize: 13.5, color: C.ink, valign: "top", isTextBox: true });
  source(s, "Методы: скользящие окна по всем месяцам входа (1–20 лет), тепловая карта «год входа × год выхода», блочный бутстреп 10 000 траекторий, сценарный анализ.");
  s.addNotes("Важно подчеркнуть: все данные официальные и проверяемые, код анализа приложен.");
}

// ---------- 4. курс и ставки ----------
{
  const s = lightSlide();
  eyebrow(s, 3, "Контекст");
  title(s, "Тенге ослаб в 3,4 раза, а ставки остались высокими");
  const L = D.levels;
  const idx = L.t.map((t, i) => i).filter((i) => i % 3 === 2);
  const labels = idx.map((i) => L.t[i].slice(0, 4));
  s.addText("Официальный курс USD/KZT, тенге за доллар", { x: M, y: 1.85, w: 6, h: 0.35, margin: 0, fontFace: BODY, fontSize: 14, bold: true, color: C.ink, isTextBox: true });
  s.addChart(pres.charts.LINE, [{ name: "USD/KZT", labels, values: idx.map((i) => L.usdkzt[i]) }], {
    x: M - 0.1, y: 2.2, w: 6.1, h: 4.1, ...axisBase(), chartColors: [C.fx], lineSize: 2, lineDataSymbol: "none", showLegend: false,
    catAxisLabelFrequency: 20, valAxisMinVal: 0,
  });
  s.addText("Ставки по срочным депозитам физлиц, % годовых", { x: 6.9, y: 1.85, w: 6, h: 0.35, margin: 0, fontFace: BODY, fontSize: 14, bold: true, color: C.ink, isTextBox: true });
  legendRow(s, 6.9, 2.2, [[C.dep, "в тенге"], [C.usd, "в иностранной валюте"]]);
  s.addChart(pres.charts.LINE, [
    { name: "в тенге", labels, values: idx.map((i) => L.dep_kzt[i]) },
    { name: "в валюте", labels, values: idx.map((i) => L.dep_usd[i]) },
  ], { x: 6.8, y: 2.5, w: 6.1, h: 3.8, ...axisBase(), chartColors: [C.dep, C.usd], lineSize: 2, lineDataSymbol: "none", showLegend: false, catAxisLabelFrequency: 20, valAxisMinVal: 0 });
  source(s, "Источник: Национальный Банк РК. Ослабление тенге за год: 2009 (+23%), 2014 (+19%), 2015 — переход к плавающему курсу (+86%).");
  s.addNotes("Два ключевых фактора: девальвации 2009, 2014 и 2015 годов и то, что тенговые ставки всегда были заметно выше валютных — после 2015 года ставки по валютным вкладам ограничены около 1%.");
}

// ---------- 5. рост капитала ----------
{
  const s = lightSlide();
  eyebrow(s, 4, "Результат за весь период");
  title(s, "1 000 000 ₸, вложенный в конце 1999 года");
  const Wt = D.wealth;
  const idx = Wt.t.map((t, i) => i).filter((i) => Wt.t[i].endsWith("-12") || i === Wt.t.length - 1);
  const labels = idx.map((i) => (Wt.t[i].endsWith("-12") ? Wt.t[i].slice(0, 4) : "08.26"));
  const ser = (k, name) => ({ name, labels, values: idx.map((i) => +(Wt[k][i] / 1e6).toFixed(2)) });
  legendRow(s, M, 1.8, [[C.sp, "S&P 500 в ₸ (нетто)"], [C.dep, "Депозит в тенге"], [C.usd, "Депозит в USD"], [C.cpi, "Инфляция"]]);
  s.addChart(pres.charts.LINE, [ser("sp_net_kzt", "S&P 500 нетто"), ser("dep_kzt", "Депозит ₸"), ser("dep_usd_kzt", "Депозит USD"), ser("cpi", "Инфляция")], {
    x: M - 0.1, y: 2.15, w: 8.4, h: 4.75, ...axisBase(), chartColors: [C.sp, C.dep, C.usd, C.cpi], lineSize: 2.25, lineDataSymbol: "none", showLegend: false,
    valAxisLogScaleBase: 10, valAxisMinVal: 0.5, valAxisMaxVal: 50, catAxisLabelFrequency: 5, valAxisTitle: "млн ₸, логарифмическая шкала", showValAxisTitle: true, valAxisTitleFontSize: 10, valAxisTitleColor: C.muted,
  });
  bigStat(s, 9.1, 1.85, 3.63, `${nf(S.sp_net_kzt.multiple, 1)} млн ₸`, `S&P 500 после всех налогов · ${pct(S.sp_net_kzt.cagr)} в год`, C.sp);
  bigStat(s, 9.1, 3.35, 3.63, `${nf(S.dep_kzt.multiple, 1)} млн ₸`, `Депозит в тенге · ${pct(S.dep_kzt.cagr)} в год`, C.dep);
  bigStat(s, 9.1, 4.85, 3.63, `+${nf((S.sp_net_kzt.cagr - S.dep_kzt.cagr) * 100, 1)} п.п.`, `преимущество S&P 500 в год; реально: ${pct(S.sp_net_kzt.real_cagr)} против ${pct(S.dep_kzt.real_cagr)}`, C.ink);
  source(s, "Нетто-кривая на графике — до налога 10% при продаже; итоговые цифры справа — после него. Инфляция 8,75% в год.");
  s.addNotes("За 26,7 лет S&P 500 выиграл, но разрыв небольшой — около 1,2 процентного пункта в год. Видно, что до 2009 года акции долго были ниже депозита.");
}

// ---------- 6. год за годом ----------
{
  const s = lightSlide();
  eyebrow(s, 5, "Год за годом");
  title(s, "S&P 500 выиграл 14 лет из 26 — редко, но крупно");
  const A = D.annual;
  const labels = A.map((a) => (a.partial ? "2026*" : String(a.year)));
  s.addChart(pres.charts.BAR, [
    { name: "S&P 500 впереди", labels, values: A.map((a) => (a.excess >= 0 ? +(a.excess * 100).toFixed(1) : 0)) },
    { name: "Депозит впереди", labels, values: A.map((a) => (a.excess < 0 ? +(a.excess * 100).toFixed(1) : 0)) },
  ], {
    x: M - 0.1, y: 2.15, w: 8.6, h: 4.75, ...axisBase(), barDir: "col", barGrouping: "stacked", chartColors: [C.sp, C.dep], barGapWidthPct: 35,
    showLegend: false, catAxisLabelFrequency: 2, valAxisLabelFormatCode: '+0"%";−0"%";0"%"',
  });
  legendRow(s, M, 1.8, [[C.sp, "S&P 500 впереди"], [C.dep, "Депозит впереди"]]);
  card(s, 9.2, 1.85, 3.53, 4.95);
  s.addText("Асимметрия", { x: 9.45, y: 2.05, w: 3.1, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: C.ink, isTextBox: true });
  s.addText([
    { text: "Депозит впереди в 12 годах — сильнее всего в 2000–2002 и 2008, когда рынок падал.", options: { breakLine: true } },
    { text: "S&P 500 выигрывает рывками: 2009 (+41%), 2015 (+74%), 2024 (+26%).", options: { breakLine: true } },
    { text: "2015 год: S&P 500 в долларах +1,4%, но курс +86%, и в тенге вышло +89%." },
  ], { x: 9.45, y: 2.5, w: 3.1, h: 4.1, margin: 0, fontFace: BODY, fontSize: 14, color: C.ink, paraSpaceAfter: 12, valign: "top", isTextBox: true });
  source(s, "Разница доходностей в тенге, брутто, % за календарный год. * 2026 — январь–август.");
  s.addNotes("Показать, что результат сильно зависит от конкретного года: большие плюсы S&P 500 совпадают с девальвациями.");
}

// ---------- 7. стабильность ----------
{
  const s = lightSlide();
  eyebrow(s, 6, "Главный тест — стабильность");
  title(s, "Шанс обогнать депозит растёт с горизонтом");
  const R = D.rolling_summary;
  s.addChart(pres.charts.BAR, [
    { name: "Нетто", labels: R.map((r) => `${r.horizon} ${yrWord(r.horizon)}`), values: R.map((r) => +(r.win_net * 100).toFixed(0)) },
  ], {
    x: M - 0.1, y: 1.95, w: 7.6, h: 4.9, ...axisBase(), barDir: "col", chartColors: [C.sp], barGapWidthPct: 45, showLegend: false,
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25, valAxisLabelFormatCode: '0"%"',
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0"%"', dataLabelColor: C.ink, dataLabelFontSize: 12, dataLabelFontFace: BODY, dataLabelFontBold: true,
  });
  bigStat(s, 8.3, 1.95, 4.43, `${pct(RS[1].win_net, 0)} – ${pct(RS[5].win_net, 0)}`, "горизонт 1–5 лет: почти подбрасывание монеты", C.dep);
  bigStat(s, 8.3, 3.45, 4.43, pct(RS[10].win_net, 0), `горизонт 10 лет · медиана ${pct(RS[10].median_excess_net, 1, true)} в год`, C.ink);
  bigStat(s, 8.3, 4.95, 4.43, `${pct(RS[15].win_net, 0)} – ${pct(RS[20].win_net, 0)}`, "горизонт 15–20 лет: устойчивое преимущество", C.sp);
  source(s, `Доля окон, где S&P 500 (нетто, после налога на выходе) принёс больше депозита в тенге. Окон: ${R.map((r) => r.windows).join(" / ")} для горизонтов ${R.map((r) => r.horizon).join(" / ")} лет.`);
  s.addNotes("Перебраны все месяцы входа. Худшее 10-летнее окно — вход в сентябре 2000 года: −11,9 п.п. в год к депозиту.");
}

// ---------- 8. тепловая карта ----------
{
  const s = lightSlide();
  eyebrow(s, 7, "Момент входа");
  title(s, "Момент покупки важнее срока владения");
  const H = D.heat, yrs = H.years, n = yrs.length;
  const cell = 0.172, gx = 1.05, gy = 2.25;
  const mixc = (a, b, t) => { const p = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("").toUpperCase(); };
  const col = (v) => (v >= 0 ? mixc("F0EFEC", C.sp, Math.min(v / 0.15, 1)) : mixc("F0EFEC", C.dep, Math.min(-v / 0.15, 1)));
  yrs.forEach((a, i) => {
    if (i % 2 === 0) s.addText(String(a), { x: gx - 0.55, y: gy + i * cell - 0.02, w: 0.5, h: cell + 0.04, margin: 0, align: "right", valign: "middle", fontFace: BODY, fontSize: 8, color: C.muted, isTextBox: true });
    if (i % 5 === 0) s.addText(String(a), { x: gx + i * cell - 0.2, y: gy - 0.3, w: 0.6, h: 0.25, margin: 0, align: "left", fontFace: BODY, fontSize: 8, color: C.muted, isTextBox: true });
    yrs.forEach((b, j) => {
      const v = H.values[i][j];
      if (v == null) return;
      s.addShape(pres.shapes.RECTANGLE, { x: gx + j * cell, y: gy + i * cell, w: cell - 0.02, h: cell - 0.02, fill: { color: col(v) }, line: { color: col(v), width: 0 } });
    });
  });
  s.addText("строка — год входа, столбец — год выхода", { x: gx - 0.55, y: gy - 0.58, w: 4.5, h: 0.25, margin: 0, fontFace: BODY, fontSize: 9, color: C.muted, isTextBox: true });

  const tx = 6.6;
  legendRow(s, tx, 2.0, [[C.dep, "депозит впереди"], [C.sp, "S&P 500 впереди"]]);
  s.addText("Цвет — среднегодовое превышение S&P 500 (нетто) над депозитом, шкала ±15 п.п.", { x: tx, y: 2.4, w: 6.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12, color: C.muted, isTextBox: true });
  const pts = [
    ["2000 → 2019", `${pct(H.values[0][19], 1, true)} в год`, "Вход на пике доткомов проигрывал депозиту при любом выходе 20 лет"],
    ["2008 → 2025", `${pct(H.values[8][25], 1, true)} в год`, "Вход перед кризисом отставал до 2013 года, но к 2025-му выиграл"],
    ["2009 → 2025", `${pct(H.values[9][25], 1, true)} в год`, "Вход после обвала — лучшие результаты периода"],
  ];
  pts.forEach(([a, v, t], i) => {
    const y = 3.1 + i * 1.22;
    card(s, tx, y, 6.13, 1.06);
    s.addText(a, { x: tx + 0.25, y: y + 0.14, w: 2.2, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: C.ink, isTextBox: true });
    s.addText(v, { x: tx + 0.25, y: y + 0.55, w: 2.2, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: H.values[[0, 8, 9][i]][[19, 25, 25][i]] >= 0 ? C.sp : C.dep, isTextBox: true });
    s.addText(t, { x: tx + 2.55, y: y + 0.1, w: 3.4, h: 0.86, margin: 0, fontFace: BODY, fontSize: 13, color: C.ink2, valign: "middle", isTextBox: true });
  });
  source(s, "Каждая клетка: покупка в начале года входа, продажа в конце года выхода, с учётом налогов и комиссий.");
  s.addNotes("Тепловая карта показывает риск момента входа: всё, что начиналось в 2000–2002 годах, долго проигрывало.");
}

// ---------- 9. девальвация ----------
{
  const s = lightSlide();
  eyebrow(s, 8, "Механизм");
  title(s, "Двигатель победы — курс, а не рынок");
  const Cy = D.carry;
  legendRow(s, M, 1.8, [[C.dep, "ставка KZT − ставка USD"], [C.fx, "изменение курса USD/KZT"]]);
  s.addChart(pres.charts.BAR, [
    { name: "Надбавка ставки тенге", labels: Cy.map((c) => String(c.year)), values: Cy.map((c) => +(c.rate_diff * 100).toFixed(1)) },
    { name: "Ослабление тенге", labels: Cy.map((c) => String(c.year)), values: Cy.map((c) => +(c.fx * 100).toFixed(1)) },
  ], { x: M - 0.1, y: 2.15, w: 8.4, h: 4.75, ...axisBase(), barDir: "col", barGrouping: "clustered", chartColors: [C.dep, C.fx], barGapWidthPct: 40, showLegend: false, catAxisLabelFrequency: 2, valAxisLabelFormatCode: '0"%"' });
  bigStat(s, 9.1, 1.85, 3.63, pct(D.meta.spusd_cagr), `S&P 500 в долларах в год — ниже ставки депозита в тенге (${pct(S.dep_kzt.cagr)})`, C.ink);
  bigStat(s, 9.1, 3.35, 3.63, "20 из 26", "лет надбавка по ставке тенге перекрывала ослабление курса", C.dep);
  bigStat(s, 9.1, 4.85, 3.63, "−2,8 п.п.", "отставание S&P 500 от депозита в год, если убрать 2009, 2014 и 2015 годы", C.fx);
  source(s, "Карри-трейд: банки платили по тенге в среднем на 6,6 п.п. больше, чем по валюте. Корреляция месячных доходностей S&P 500 и USD/KZT: −0,23 (курс смягчает кризисы).");
  s.addNotes("Главный содержательный вывод. Акции обгоняют депозит в тенге благодаря редким, но большим девальвациям.");
}

// ---------- 10. риск ----------
{
  const s = lightSlide();
  eyebrow(s, 9, "Цена преимущества");
  title(s, "+1,2 п.п. в год оплачены просадкой до −48%");
  const order = ["dep_kzt", "dep_usd_kzt", "sp_kzt", "sp_net_kzt", "mix_50"];
  const hdr = ["Стратегия", "В год", "Реально", "Волатильность", "Макс. просадка", "Худшие 12 мес."].map((t) => ({ text: t, options: { bold: true, color: C.muted, fontSize: 11 } }));
  const body = order.map((k) => {
    const x = S[k];
    return [x.name, pct(x.cagr), pct(x.real_cagr), pct(x.vol), pct(x.max_dd), pct(x.worst_12m)].map((t, i) => ({
      text: t, options: { fontSize: 13.5, color: i === 5 && x.worst_12m < 0 ? C.bad : C.ink, align: i === 0 ? "left" : "right", bold: k === "mix_50" && i === 0 },
    }));
  });
  s.addTable([hdr, ...body], { x: M, y: 1.95, w: 12.13, colW: [3.33, 1.6, 1.6, 1.8, 1.9, 1.9], fontFace: BODY, border: { type: "solid", pt: 0.75, color: C.rule }, rowH: 0.5, valign: "middle", margin: 0.1, fill: { color: C.white } });
  const tips = [
    ["Депозит в тенге", "Ни одного убыточного месяца за 26 лет. Худшие 12 месяцев: +7,5%.", C.dep],
    ["S&P 500 в тенге", "Кризис 2008: −38% в тенге при −50% в долларах — девальвация 2009 года смягчила удар.", C.sp],
    ["Портфель 50/50", "12,0% в год при просадке всего −8%: большая часть премии при малой доле риска.", C.ink],
  ];
  tips.forEach(([h, t, c], i) => {
    const x = M + i * 4.1;
    card(s, x, 5.1, 3.9, 1.7);
    s.addText(h, { x: x + 0.25, y: 5.25, w: 3.4, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: c, isTextBox: true });
    s.addText(t, { x: x + 0.25, y: 5.68, w: 3.4, h: 1.0, margin: 0, fontFace: BODY, fontSize: 13, color: C.ink2, valign: "top", isTextBox: true });
  });
  source(s, "Реально — за вычетом инфляции в Казахстане. Волатильность — годовое стандартное отклонение месячных доходностей в тенге.");
  s.addNotes("Риск: депозит почти безрисковый в тенге, S&P 500 — нет. Портфель 50/50 — компромисс.");
}

// ---------- 11. регулярные взносы ----------
{
  const s = lightSlide();
  eyebrow(s, 10, "Как копят реальные люди");
  title(s, "100 000 ₸ каждый месяц: регулярность снижает риск");
  const F = D.dca_full;
  const mln = (x) => nf(x / 1e6, 0) + " млн ₸";
  bigStat(s, M, 1.95, 3.9, mln(F.paid), `внесено за ${D.meta.months} месяцев (2000–2026)`, C.ink);
  bigStat(s, M + 4.12, 1.95, 3.9, mln(F.dep), "накоплено на депозите в тенге", C.dep);
  bigStat(s, M + 8.24, 1.95, 3.9, mln(F.sp), "накоплено в S&P 500 после налогов", C.sp);
  const dca = D.dca;
  s.addText("Доля окон, где регулярные взносы в S&P 500 дали больше депозита", { x: M, y: 3.6, w: 7, h: 0.4, margin: 0, fontFace: BODY, fontSize: 14, bold: true, color: C.ink, isTextBox: true });
  s.addChart(pres.charts.BAR, [{ name: "S&P 500 впереди", labels: dca.map((d) => `${d.horizon} ${yrWord(d.horizon)}`), values: dca.map((d) => +(d.win * 100).toFixed(0)) }], {
    x: M - 0.1, y: 4.0, w: 7.2, h: 2.9, ...axisBase(), barDir: "bar", chartColors: [C.sp], barGapWidthPct: 40, showLegend: false,
    valAxisMinVal: 0, valAxisMaxVal: 115, valAxisMajorUnit: 25, valAxisLabelFormatCode: '0"%"', catAxisOrientation: "maxMin",
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0"%"', dataLabelColor: C.ink, dataLabelFontSize: 12, dataLabelFontBold: true,
  });
  card(s, 7.9, 3.65, 4.83, 3.15);
  s.addText([
    { text: "Почему так: ", options: { bold: true } },
    { text: "взносы размазывают вход по времени, и неудачный старт (2000, 2008) перекрывается дешёвыми покупками после обвалов.", options: { breakLine: true } },
    { text: "На горизонте 15 лет S&P 500 выиграл во всех 141 окне; ", options: { bold: true } },
    { text: `медианный результат — в ${nf(dca.find((d) => d.horizon === 15).median_ratio, 1)} раза больше депозита.` },
  ], { x: 8.15, y: 3.85, w: 4.35, h: 2.8, margin: 0, fontFace: BODY, fontSize: 14, color: C.ink, paraSpaceAfter: 12, valign: "top", isTextBox: true });
  source(s, "Взнос в начале каждого месяца; для S&P 500 — налоги и комиссии, 10% ИПН с прироста при продаже в конце окна.");
  s.addNotes("Для обычного человека, откладывающего часть зарплаты, это самый реалистичный сценарий.");
}

// ---------- 12. бутстреп и безубыточность ----------
{
  const s = lightSlide();
  eyebrow(s, 11, "Взгляд вперёд");
  title(s, "Вперёд: шансы скромнее, а порог сегодня высокий");
  const B = D.bootstrap;
  s.addText("Бутстреп: вероятность обогнать депозит", { x: M, y: 1.85, w: 6, h: 0.35, margin: 0, fontFace: BODY, fontSize: 14, bold: true, color: C.ink, isTextBox: true });
  s.addChart(pres.charts.BAR, [
    { name: "История", labels: B.map((b) => `${b.horizon} ${yrWord(b.horizon)}`), values: B.map((b) => +((RS[b.horizon] ? RS[b.horizon].win_net : 0) * 100).toFixed(0)) },
    { name: "Бутстреп", labels: B.map((b) => `${b.horizon} ${yrWord(b.horizon)}`), values: B.map((b) => +(b.p_win * 100).toFixed(0)) },
  ], {
    x: M - 0.1, y: 2.5, w: 6.2, h: 4.4, ...axisBase(), barDir: "col", barGrouping: "clustered", chartColors: [C.spLight, C.sp], barGapWidthPct: 45, showLegend: false,
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25, valAxisLabelFormatCode: '0"%"',
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0"%"', dataLabelColor: C.ink2, dataLabelFontSize: 10,
  });
  legendRow(s, M, 2.18, [[C.spLight, "исторические окна"], [C.sp, "бутстреп, 10 000 траекторий"]]);

  s.addText("Какое ослабление тенге в год нужно для паритета", { x: 6.9, y: 1.85, w: 5.9, h: 0.35, margin: 0, fontFace: BODY, fontSize: 14, bold: true, color: C.ink, isTextBox: true });
  const deps = [...new Set(D.breakeven.map((b) => b.dep))].sort((a, b) => a - b);
  const sps = [...new Set(D.breakeven.map((b) => b.sp_usd))];
  const hdr = [{ text: "Депозит \\ S&P в USD", options: { bold: true, color: C.muted, fontSize: 11 } }, ...sps.map((x) => ({ text: pct(x, 0), options: { bold: true, color: C.muted, fontSize: 11, align: "right" } }))];
  const rows = deps.map((d) => {
    const now = Math.abs(d - D.meta.dep_now) < 1e-6;
    return [{ text: pct(d, 1) + (now ? " (сейчас)" : ""), options: { bold: now, fontSize: 13, color: C.ink, fill: { color: now ? C.accentSoft : C.white } } },
      ...sps.map((x) => { const b = D.breakeven.find((y) => y.dep === d && y.sp_usd === x); return { text: pct(b.fx_needed, 1, true), options: { fontSize: 13, align: "right", bold: now, color: C.ink, fill: { color: now ? C.accentSoft : C.white } } }; })];
  });
  s.addTable([hdr, ...rows], { x: 6.9, y: 2.3, w: 5.83, colW: [1.95, 0.97, 0.97, 0.97, 0.97], fontFace: BODY, border: { type: "solid", pt: 0.75, color: C.rule }, rowH: 0.46, valign: "middle", margin: 0.08, fill: { color: C.white } });
  card(s, 6.9, 5.0, 5.83, 1.85);
  s.addText([
    { text: "Сегодня ставка 14,7%. ", options: { bold: true } },
    { text: "Если S&P 500 даст 8% в долларах, тенге должен слабеть на 7,5% в год, чтобы акции лишь догнали депозит. При ставке 10% порог — всего 2,6%." },
  ], { x: 7.15, y: 5.15, w: 5.35, h: 1.55, margin: 0, fontFace: BODY, fontSize: 14, color: C.ink, valign: "top", isTextBox: true });
  source(s, "Бутстреп: случайные 24-месячные блоки совместной истории S&P 500, курса и ставок. Паритет учитывает налог на дивиденды и комиссии (≈0,35% в год).");
  s.addNotes("26 лет — это всего 2–3 независимых десятилетия, поэтому исторические 93% завышены. Бутстреп даёт 67% на 20 лет.");
}

// ---------- 13. выводы ----------
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  eyebrow(s, 12, "Выводы", true);
  title(s, "Обгоняет — но не стабильно, а на длинной дистанции", { color: C.white, size: 32 });
  const items = [
    ["За весь период — да", `${pct(S.sp_net_kzt.cagr)} против ${pct(S.dep_kzt.cagr)} в год после налогов: 23,3 млн ₸ против 17,5 млн ₸ из 1 млн.`],
    ["До 5 лет — лотерея", `S&P 500 впереди лишь в ${pct(RS[1].win_net, 0)}–${pct(RS[5].win_net, 0)} случаев. Для коротких целей депозит надёжнее.`],
    ["15+ лет — почти всегда", `${pct(RS[15].win_net, 0)}–${pct(RS[20].win_net, 0)} исторических окон; при регулярных взносах — 100% уже на 15 лет.`],
    ["Решает курс тенге", "Преимущество создали девальвации 2009, 2014, 2015. Без них депозит был бы впереди."],
    ["Сейчас порог высокий", "При ставке 14,7% акциям нужна девальвация ≈7,5% в год, чтобы только сравняться."],
    ["Лучше «и», чем «или»", "Депозит — подушка и короткие цели, S&P 500 — цели от 15 лет. Портфель 50/50: 12,0% в год, просадка −8%."],
  ];
  items.forEach(([h, t], i) => {
    const x = M + (i % 3) * 4.1, y = 2.0 + Math.floor(i / 2 * 0) + (i >= 3 ? 2.45 : 0);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.9, h: 2.2, fill: { color: "1C2826" }, line: { color: "1C2826" }, rectRadius: 0.12 });
    s.addText(h, { x: x + 0.25, y: y + 0.2, w: 3.4, h: 0.5, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: C.white, isTextBox: true });
    s.addText(t, { x: x + 0.25, y: y + 0.75, w: 3.4, h: 1.3, margin: 0, fontFace: BODY, fontSize: 14, color: C.darkText, valign: "top", isTextBox: true });
  });
  source(s, "Учебное исследование, не является индивидуальной инвестиционной рекомендацией. Прошлая доходность не гарантирует будущую.", true);
  s.addNotes("Итоговый ответ на вопрос исследования.");
}

// ---------- 14. ограничения и источники ----------
{
  const s = lightSlide();
  eyebrow(s, 13, "Ограничения и источники");
  title(s, "Что стоит помнить, читая эти цифры");
  s.addText([
    { text: "Средневзвешенная ставка ≠ лучшая ставка конкретного банка", options: { bullet: true, breakLine: true } },
    { text: "Перекрывающиеся окна не независимы: 81 двадцатилетнее окно — это не 81 эксперимент", options: { bullet: true, breakLine: true } },
    { text: "Ошибка выжившего: США — самый успешный рынок столетия", options: { bullet: true, breakLine: true } },
    { text: "С 2026 года действует новый Налоговый кодекс РК; модель налогов упрощена", options: { bullet: true, breakLine: true } },
    { text: "Не учтено поведение: продажа в панике фиксирует убыток", options: { bullet: true, breakLine: true } },
    { text: "Депозиты гарантирует КФГД в пределах лимитов, акции — нет", options: { bullet: true } },
  ], { x: M, y: 1.9, w: 6.2, h: 4.8, margin: 0, fontFace: BODY, fontSize: 15.5, color: C.ink, paraSpaceAfter: 10, valign: "top", isTextBox: true });
  card(s, 7.2, 1.9, 5.53, 4.9);
  s.addText("Источники данных", { x: 7.45, y: 2.08, w: 5, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: C.ink, isTextBox: true });
  s.addText(D.sources.map((x, i, a) => ({ text: `${x["Источник"]} — ${x["Показатель"]}`, options: { bullet: true, breakLine: i < a.length - 1 } })), {
    x: 7.45, y: 2.55, w: 5.05, h: 3.2, margin: 0, fontFace: BODY, fontSize: 12.5, color: C.ink, paraSpaceAfter: 6, valign: "top", isTextBox: true,
  });
  s.addText("Код, датасет и таблицы: analysis/, data/research_data.xlsx, сайт site/index.html", { x: 7.45, y: 5.9, w: 5.05, h: 0.7, margin: 0, fontFace: BODY, fontSize: 12, italic: true, color: C.ink2, valign: "top", isTextBox: true });
  s.addNotes("Честно обозначить ограничения — признак сильного исследования.");
}

const out = path.join(__dirname, "SP500_vs_deposit_KZ.pptx");
pres.writeFile({ fileName: out }).then(() => console.log("OK", out));

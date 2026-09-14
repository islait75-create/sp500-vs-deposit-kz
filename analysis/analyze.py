"""
Шаг 2. Исследовательский анализ: может ли S&P 500 стабильно обгонять депозиты в Казахстане.

Результаты: data/processed/*.csv, data/research_data.xlsx, site/data.js (JSON для сайта).
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed"
SITE = ROOT / "site"
SITE.mkdir(exist_ok=True)

ROUND_TRIP_COST = 0.005   # спред конвертации + комиссии на вход/выход
CGT = 0.10                # ИПН 10% с прироста стоимости иностранных бумаг вне KASE/AIX
HORIZONS = [1, 3, 5, 7, 10, 15, 20]
rng = np.random.default_rng(42)

lv = pd.read_csv(PROC / "monthly_levels.csv", index_col=0)
lv.index = pd.PeriodIndex(lv.index, freq="M")
r = pd.read_csv(PROC / "monthly_returns.csv", index_col=0)
r.index = pd.PeriodIndex(r.index, freq="M")
N = len(r)
YEARS = N / 12

STRATS = {
    "dep_kzt": "Депозит в тенге",
    "dep_usd_kzt": "Депозит в USD",
    "sp_kzt": "S&P 500 (брутто)",
    "sp_net_kzt": "S&P 500 (нетто)",
}


def ann(total, years):
    return (1 + total) ** (1 / years) - 1


def max_dd(wealth):
    peak = wealth.cummax()
    return (wealth / peak - 1).min()


# ---------------------------------------------------------------- 1. годовая таблица
g = r.groupby(r.index.year)
annual = pd.DataFrame({
    "months": g.size(),
    "sp_usd": g["sp_usd"].apply(lambda x: (1 + x).prod() - 1),
    "fx": g["fx"].apply(lambda x: (1 + x).prod() - 1),
    "sp_kzt": g["sp_kzt"].apply(lambda x: (1 + x).prod() - 1),
    "sp_net_kzt": g["sp_net_kzt"].apply(lambda x: (1 + x).prod() - 1),
    "dep_kzt": g["dep_kzt"].apply(lambda x: (1 + x).prod() - 1),
    "dep_usd_kzt": g["dep_usd_kzt"].apply(lambda x: (1 + x).prod() - 1),
    "cpi": g["cpi"].apply(lambda x: (1 + x).prod() - 1),
})
annual["usdkzt_end"] = lv["usdkzt"].groupby(lv.index.year).last().reindex(annual.index)
annual["dep_rate_dec"] = lv["dep_kzt_rate"].groupby(lv.index.year).last().reindex(annual.index)
annual["excess"] = (1 + annual["sp_kzt"]) / (1 + annual["dep_kzt"]) - 1
annual["sp_real"] = (1 + annual["sp_kzt"]) / (1 + annual["cpi"]) - 1
annual["dep_real"] = (1 + annual["dep_kzt"]) / (1 + annual["cpi"]) - 1
annual["winner"] = np.where(annual["sp_kzt"] > annual["dep_kzt"], "S&P 500", "Депозит")
annual.index.name = "year"
full = annual[annual["months"] == 12]

# ---------------------------------------------------------------- 2. итог за весь период
wealth = (1 + r[list(STRATS) + ["sp_usd", "cpi"]]).cumprod()
wealth.loc[r.index[0] - 1] = 1.0
wealth = wealth.sort_index()
wealth_net_final = wealth["sp_net_kzt"].iloc[-1] * (1 - ROUND_TRIP_COST)
wealth_net_final -= CGT * max(wealth_net_final - 1, 0)

summary = []
for k, name in STRATS.items():
    w = wealth[k]
    total = w.iloc[-1] - 1
    if k == "sp_net_kzt":
        total = wealth_net_final - 1
    real = (1 + total) / wealth["cpi"].iloc[-1] - 1
    m = r[k]
    summary.append({
        "key": k, "name": name,
        "cagr": ann(total, YEARS),
        "real_cagr": ann(real, YEARS),
        "multiple": 1 + total,
        "vol": m.std() * np.sqrt(12),
        "max_dd": max_dd(w),
        "worst_12m": ((1 + m).rolling(12).apply(np.prod, raw=True) - 1).min(),
        "pos_months": (m > 0).mean(),
    })
summary = pd.DataFrame(summary).set_index("key")
cpi_cagr = ann(wealth["cpi"].iloc[-1] - 1, YEARS)
fx_cagr = ann(lv["usdkzt"].iloc[-1] / lv["usdkzt"].iloc[0] - 1, YEARS)
spusd_cagr = ann(wealth["sp_usd"].iloc[-1] - 1, YEARS)

# ---------------------------------------------------------------- 3. скользящие окна
def window_stats(h_years, cost_tax=True):
    h = h_years * 12
    rows = []
    cs = {k: np.concatenate([[1.0], np.cumprod(1 + r[k].values)]) for k in ["sp_kzt", "sp_net_kzt", "dep_kzt", "dep_usd_kzt", "cpi"]}
    for s in range(0, N - h + 1):
        e = s + h
        g_sp = cs["sp_kzt"][e] / cs["sp_kzt"][s]
        n_sp = cs["sp_net_kzt"][e] / cs["sp_net_kzt"][s] * (1 - ROUND_TRIP_COST)
        n_sp -= CGT * max(n_sp - 1, 0)
        d = cs["dep_kzt"][e] / cs["dep_kzt"][s]
        du = cs["dep_usd_kzt"][e] / cs["dep_usd_kzt"][s]
        c = cs["cpi"][e] / cs["cpi"][s]
        rows.append({
            "start": str(r.index[s]), "end": str(r.index[e - 1]),
            "sp_gross": g_sp ** (1 / h_years) - 1, "sp_net": n_sp ** (1 / h_years) - 1,
            "dep": d ** (1 / h_years) - 1, "dep_usd": du ** (1 / h_years) - 1,
            "cpi": c ** (1 / h_years) - 1,
            "excess_gross": (g_sp / d) ** (1 / h_years) - 1,
            "excess_net": (n_sp / d) ** (1 / h_years) - 1,
        })
    return pd.DataFrame(rows)


rolling = {}
roll_summary = []
for h in HORIZONS:
    w = window_stats(h)
    rolling[h] = w
    roll_summary.append({
        "horizon": h, "windows": len(w),
        "win_gross": (w["excess_gross"] > 0).mean(),
        "win_net": (w["excess_net"] > 0).mean(),
        "win_vs_usd_dep": (w["sp_net"] > w["dep_usd"]).mean(),
        "dep_beats_cpi": (w["dep"] > w["cpi"]).mean(),
        "sp_beats_cpi": (w["sp_net"] > w["cpi"]).mean(),
        "median_excess_net": w["excess_net"].median(),
        "p10_excess_net": w["excess_net"].quantile(0.10),
        "p90_excess_net": w["excess_net"].quantile(0.90),
        "worst_excess_net": w["excess_net"].min(),
        "best_excess_net": w["excess_net"].max(),
        "worst_start": w.loc[w["excess_net"].idxmin(), "start"],
        "best_start": w.loc[w["excess_net"].idxmax(), "start"],
    })
roll_summary = pd.DataFrame(roll_summary).set_index("horizon")

# ---------------------------------------------------------------- 3b. портфель 50/50 (купил и держи)
w_mix = 0.5 * wealth["dep_kzt"] + 0.5 * wealth["sp_net_kzt"]
sp_leg = 0.5 * wealth["sp_net_kzt"].iloc[-1] * (1 - ROUND_TRIP_COST)
sp_leg -= CGT * max(sp_leg - 0.5, 0)
mix_total = 0.5 * wealth["dep_kzt"].iloc[-1] + sp_leg - 1
mix_m = w_mix.pct_change().dropna()
summary.loc["mix_50"] = {
    "name": "50% депозит + 50% S&P", "cagr": ann(mix_total, YEARS),
    "real_cagr": ann((1 + mix_total) / wealth["cpi"].iloc[-1] - 1, YEARS),
    "multiple": 1 + mix_total, "vol": mix_m.std() * np.sqrt(12), "max_dd": max_dd(w_mix),
    "worst_12m": ((1 + mix_m).rolling(12).apply(np.prod, raw=True) - 1).min(),
    "pos_months": (mix_m > 0).mean(),
}
summary["return_per_risk"] = (summary["cagr"] - summary.loc["dep_kzt", "cagr"]) / summary["vol"]
wealth["mix_50"] = w_mix
STRATS["mix_50"] = "50% депозит + 50% S&P"

# ---------------------------------------------------------------- 3c. регулярные взносы (DCA) по 100 000 ₸/мес
def dca_stats(h_years):
    h = h_years * 12
    cs_sp = np.concatenate([[1.0], np.cumprod(1 + r["sp_net_kzt"].values)])
    cs_dp = np.concatenate([[1.0], np.cumprod(1 + r["dep_kzt"].values)])
    rows = []
    for s in range(0, N - h + 1):
        e = s + h
        v_sp = (cs_sp[e] / cs_sp[s:e]).sum() * (1 - ROUND_TRIP_COST)
        v_sp -= CGT * max(v_sp - h, 0)
        v_dp = (cs_dp[e] / cs_dp[s:e]).sum()
        rows.append({"start": str(r.index[s]), "sp": v_sp * 1e5, "dep": v_dp * 1e5, "paid": h * 1e5})
    d = pd.DataFrame(rows)
    return {"horizon": h_years, "windows": len(d), "win": (d["sp"] > d["dep"]).mean(),
            "median_ratio": (d["sp"] / d["dep"]).median(), "worst_ratio": (d["sp"] / d["dep"]).min(),
            "best_ratio": (d["sp"] / d["dep"]).max()}


dca = pd.DataFrame([dca_stats(h) for h in [3, 5, 10, 15, 20]]).set_index("horizon")
dca_full_paid = N * 1e5
_v = (wealth["sp_net_kzt"].iloc[-1] / wealth["sp_net_kzt"].iloc[:-1]).sum() * 1e5 * (1 - ROUND_TRIP_COST)
dca_full = {"paid": dca_full_paid, "sp": _v - CGT * max(_v - dca_full_paid, 0),
            "dep": (wealth["dep_kzt"].iloc[-1] / wealth["dep_kzt"].iloc[:-1]).sum() * 1e5}

# ---------------------------------------------------------------- 4. тепловая карта «год входа × год выхода»
yrs = list(full.index)
heat = pd.DataFrame(index=yrs, columns=yrs, dtype=float)
cum = (1 + full[["sp_net_kzt", "dep_kzt"]]).cumprod()
for i, a in enumerate(yrs):
    for b in yrs[i:]:
        n = b - a + 1
        sp = (1 + full.loc[a:b, "sp_net_kzt"]).prod() * (1 - ROUND_TRIP_COST)
        sp -= CGT * max(sp - 1, 0)
        dp = (1 + full.loc[a:b, "dep_kzt"]).prod()
        heat.loc[a, b] = (sp / dp) ** (1 / n) - 1
heat.index.name = "start_year"

# ---------------------------------------------------------------- 5. декомпозиция и корреляция
corr_m = r["sp_usd"].corr(r["fx"])
corr_y = full["sp_usd"].corr(full["fx"])
crisis = []
for label, a, b in [("Кризис 2008", "2007-10", "2009-02"), ("Девальвация 2014", "2014-01", "2014-02"),
                    ("Девальвация 2015", "2015-07", "2016-01"), ("COVID-19", "2020-01", "2020-03"),
                    ("2022: ставки ФРС", "2021-12", "2022-12")]:
    seg = r.loc[a:b]
    crisis.append({
        "event": label, "period": f"{a} — {b}",
        "sp_usd": (1 + seg["sp_usd"]).prod() - 1, "fx": (1 + seg["fx"]).prod() - 1,
        "sp_kzt": (1 + seg["sp_kzt"]).prod() - 1, "dep_kzt": (1 + seg["dep_kzt"]).prod() - 1,
    })
crisis = pd.DataFrame(crisis)

# «депозитный спред» против девальвации: ставка тенге − ставка USD vs фактическое ослабление тенге
carry = pd.DataFrame({
    "rate_diff": (full["dep_kzt"] - (1 + full["dep_usd_kzt"]) / (1 + full["fx"]) + 1),
    "fx": full["fx"],
})

# ---------------------------------------------------------------- 6. бутстреп (блоками по 24 мес.)
def bootstrap(n_paths=10000, block=24, horizons=(1, 3, 5, 10, 15, 20)):
    X = r[["sp_net_kzt", "dep_kzt"]].values
    hmax = max(horizons) * 12
    out = {h: [] for h in horizons}
    ends = {}
    for _ in range(n_paths):
        path = []
        while len(path) < hmax:
            s = rng.integers(0, N - block)
            path.extend(range(s, s + block))
        seg = X[path[:hmax]]
        csp = np.cumprod(1 + seg[:, 0])
        cdp = np.cumprod(1 + seg[:, 1])
        for h in horizons:
            sp = csp[h * 12 - 1] * (1 - ROUND_TRIP_COST)
            sp -= CGT * max(sp - 1, 0)
            out[h].append((sp / cdp[h * 12 - 1]) ** (1 / h) - 1)
    rows = []
    for h in horizons:
        a = np.array(out[h])
        rows.append({"horizon": h, "p_win": (a > 0).mean(), "p5": np.quantile(a, .05),
                     "p25": np.quantile(a, .25), "median": np.median(a),
                     "p75": np.quantile(a, .75), "p95": np.quantile(a, .95)})
    return pd.DataFrame(rows).set_index("horizon")


boot = bootstrap()

# ---------------------------------------------------------------- 7. сценарии «от сегодня»
dep_now = lv["dep_kzt_rate"].iloc[-1] / 100
scen_sp = [0.04, 0.06, 0.08, 0.10]
scen_fx = [0.00, 0.02, 0.04, 0.06, 0.08]
scen_dep = [0.10, dep_now, 0.12]
scenarios = []
for dep in sorted(set([0.10, 0.12, round(dep_now, 3)])):
    for s in scen_sp:
        for f in scen_fx:
            sp = ((1 + s - 0.0035) * (1 + f)) ** 10 * (1 - ROUND_TRIP_COST)   # 0,35% = налог на див. + комиссии
            sp -= CGT * max(sp - 1, 0)
            dp = (1 + dep / 12) ** 120
            scenarios.append({"dep": dep, "sp_usd": s, "fx": f,
                              "excess_10y": (sp / dp) ** 0.1 - 1})
scenarios = pd.DataFrame(scenarios)
breakeven = []
for dep in [0.08, 0.10, 0.12, round(dep_now, 3)]:
    for s in scen_sp:
        need = (1 + dep / 12) ** 12 / (1 + s - 0.0035) - 1
        breakeven.append({"dep": dep, "sp_usd": s, "fx_needed": need})
breakeven = pd.DataFrame(breakeven)

# ---------------------------------------------------------------- сохранение
annual.to_csv(PROC / "annual.csv")
summary.to_csv(PROC / "summary.csv")
roll_summary.to_csv(PROC / "rolling_summary.csv")
heat.to_csv(PROC / "heatmap_excess_net.csv")
boot.to_csv(PROC / "bootstrap.csv")
scenarios.to_csv(PROC / "scenarios.csv", index=False)
breakeven.to_csv(PROC / "breakeven.csv", index=False)
crisis.to_csv(PROC / "crisis.csv", index=False)
dca.to_csv(PROC / "dca.csv")
for h, w in rolling.items():
    w.to_csv(PROC / f"rolling_{h}y.csv", index=False)

sources = pd.DataFrame([
    ["S&P 500 Total Return (^SP500TR), S&P 500 (^GSPC), SPY", "Yahoo Finance", "1999-12 — 2026-08, месячные закрытия", "https://finance.yahoo.com/quote/%5ESP500TR/"],
    ["Официальный курс USD/KZT на конец месяца", "Национальный Банк РК", "1999-12 — 2026-08", "https://nationalbank.kz/ru/exchangerates/ezhednevnye-oficialnye-rynochnye-kursy-valyut"],
    ["Средневзвешенные ставки по срочным депозитам физлиц (KZT и ин. валюта)", "Национальный Банк РК", "1999-12 — 2026-07", "https://nationalbank.kz/ru/interestratesofbanksonat/stavki-voznagrazhdeniya-bankov-po-privlechennym-depozitampo-srokam-i-vidam-valyut"],
    ["Индекс потребительских цен Казахстана", "IMF International Financial Statistics (DBnomics)", "1999-12 — 2025-05", "https://db.nomics.world/IMF/IFS/M.KZ.PCPI_IX"],
    ["Годовая инфляция (продление ИПЦ)", "Бюро национальной статистики АСПиР РК", "2025-01 — 2026-08", "https://stat.gov.kz/ru/industries/economy/prices/"],
    ["Инфляция (среднегодовая, сверка)", "World Bank WDI FP.CPI.TOTL.ZG", "2000 — 2025", "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=KZ"],
], columns=["Показатель", "Источник", "Период", "Ссылка"])

with pd.ExcelWriter(ROOT / "data" / "research_data.xlsx", engine="openpyxl") as xw:
    lv.to_timestamp().to_excel(xw, sheet_name="Уровни (месяц)")
    r.to_timestamp().to_excel(xw, sheet_name="Доходности (месяц)")
    annual.to_excel(xw, sheet_name="По годам")
    summary.to_excel(xw, sheet_name="Итог 1999-2026")
    roll_summary.to_excel(xw, sheet_name="Скользящие окна")
    heat.to_excel(xw, sheet_name="Тепловая карта")
    boot.to_excel(xw, sheet_name="Бутстреп")
    scenarios.to_excel(xw, sheet_name="Сценарии 10 лет", index=False)
    breakeven.to_excel(xw, sheet_name="Точка безубыточности", index=False)
    crisis.to_excel(xw, sheet_name="Кризисы", index=False)
    dca.to_excel(xw, sheet_name="Регулярные взносы")
    sources.to_excel(xw, sheet_name="Источники", index=False)


def rnd(x, n=4):
    return None if pd.isna(x) else round(float(x), n)


# прорежённые ряды для сайта
wm = wealth.copy()
site = {
    "meta": {"start": str(r.index[0] - 1), "end": str(r.index[-1]), "years": round(YEARS, 2),
             "months": N, "dep_now": rnd(dep_now), "usdkzt_start": lv["usdkzt"].iloc[0],
             "usdkzt_end": lv["usdkzt"].iloc[-1], "cpi_cagr": rnd(cpi_cagr), "fx_cagr": rnd(fx_cagr),
             "spusd_cagr": rnd(spusd_cagr), "corr_m": rnd(corr_m, 3), "corr_y": rnd(corr_y, 3),
             "cost": ROUND_TRIP_COST, "cgt": CGT},
    "wealth": {"t": [str(p) for p in wm.index],
               **{k: [rnd(v * 1e6, 0) for v in wm[k]] for k in list(STRATS) + ["cpi", "sp_usd"]}},
    "levels": {"t": [str(p) for p in lv.index], "usdkzt": list(lv["usdkzt"]),
               "dep_kzt": list(lv["dep_kzt_rate"]), "dep_usd": list(lv["dep_usd_rate"])},
    "annual": [{"year": int(y), "partial": int(row.months) < 12, **{c: rnd(row[c]) for c in
               ["sp_usd", "fx", "sp_kzt", "sp_net_kzt", "dep_kzt", "dep_usd_kzt", "cpi", "excess", "sp_real", "dep_real"]},
                "usdkzt_end": row.usdkzt_end, "dep_rate_dec": row.dep_rate_dec, "winner": row.winner}
               for y, row in annual.iterrows()],
    "summary": [{"key": k, **{c: (rnd(v) if not isinstance(v, str) else v) for c, v in row.items()}} for k, row in summary.iterrows()],
    "rolling_summary": [{"horizon": int(h), **{c: (rnd(v) if not isinstance(v, str) else v) for c, v in row.items()}} for h, row in roll_summary.iterrows()],
    "rolling": {str(h): {"start": list(rolling[h]["start"]), "excess_net": [rnd(v) for v in rolling[h]["excess_net"]],
                         "excess_gross": [rnd(v) for v in rolling[h]["excess_gross"]]} for h in [1, 3, 5, 10, 15]},
    "heat": {"years": yrs, "values": [[rnd(heat.loc[a, b]) for b in yrs] for a in yrs]},
    "bootstrap": [{"horizon": int(h), **{c: rnd(v) for c, v in row.items()}} for h, row in boot.iterrows()],
    "scenarios": [{k: rnd(v) for k, v in row.items()} for _, row in scenarios.iterrows()],
    "breakeven": [{k: rnd(v) for k, v in row.items()} for _, row in breakeven.iterrows()],
    "crisis": [{k: (rnd(v) if not isinstance(v, str) else v) for k, v in row.items()} for _, row in crisis.iterrows()],
    "sources": sources.to_dict(orient="records"),
    "dca": [{"horizon": int(h), **{c: rnd(v) for c, v in row.items()}} for h, row in dca.iterrows()],
    "dca_full": {k: rnd(v, 0) for k, v in dca_full.items()},
    "carry": [{"year": int(y), "rate_diff": rnd(row.rate_diff), "fx": rnd(row.fx)} for y, row in carry.iterrows()],
}
(SITE / "data.js").write_text("window.RESEARCH = " + json.dumps(site, ensure_ascii=False) + ";\n", encoding="utf-8")

pd.set_option("display.width", 200, "display.max_columns", 30)
print(f"Период: {site['meta']['start']} — {site['meta']['end']} ({YEARS:.1f} лет)")
print(f"USD/KZT {lv['usdkzt'].iloc[0]} → {lv['usdkzt'].iloc[-1]}  ({fx_cagr:.2%}/год); ИПЦ {cpi_cagr:.2%}/год; S&P USD {spusd_cagr:.2%}/год")
print(f"corr(S&P USD, USD/KZT): месяц {corr_m:.2f}, год {corr_y:.2f}")
print(summary.round(4))
print(annual.round(3))
print(roll_summary.round(3))
print(boot.round(3))
print(crisis.round(3))
print(breakeven.round(3))
print(dca.round(3)); print(dca_full)
print(f"S&P выиграл лет: {(full['winner']=='S&P 500').sum()} из {len(full)}")

"""
Шаг 1. Сборка единого помесячного датасета из первичных источников.

Источники (data/raw):
  SP500TR_daily.csv       — S&P 500 Total Return (^SP500TR), Yahoo Finance, USD
  GSPC_daily.csv          — S&P 500 ценовой индекс (^GSPC), Yahoo Finance, USD
  SPY_daily.csv           — ETF SPY (контроль качества данных)
  nbk_usdkzt_monthend.csv — официальный курс USD/KZT НБРК на конец месяца
  nbk_deposit_rates.json  — средневзвешенные ставки по привлечённым депозитам НБРК
  imf_ifs_cpi_kz.json     — ИПЦ Казахстана (IMF IFS через DBnomics), индекс
  cpi_yoy_bns.csv         — годовая инфляция БНС АСПиР РК (для продления ИПЦ после 2025-05)
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

START = "1999-12"   # первая точка с официальным курсом НБРК на конец месяца
END = "2026-08"     # последний полный месяц


def yahoo_monthly(fname):
    df = pd.read_csv(RAW / fname, skiprows=[1, 2], index_col=0, parse_dates=True)
    s = df["Close"].astype(float)
    return s.resample("ME").last().to_period("M")


def main():
    sp_tr = yahoo_monthly("SP500TR_daily.csv")
    sp_px = yahoo_monthly("GSPC_daily.csv")
    spy = pd.read_csv(RAW / "SPY_daily.csv", skiprows=[1, 2], index_col=0, parse_dates=True)
    spy_adj = spy["Adj Close"].astype(float).resample("ME").last().to_period("M")

    fx = pd.read_csv(RAW / "nbk_usdkzt_monthend.csv", parse_dates=["date"]).dropna()
    fx = fx.set_index(fx["date"].dt.to_period("M"))["usdkzt"].astype(float)

    dep = pd.DataFrame(json.load(open(RAW / "nbk_deposit_rates.json")))
    dep["m"] = pd.to_datetime(dep["reporting_date"]).dt.to_period("M")
    dep = dep.groupby("m").last()
    dep_kzt = dep["d_o_i_p_r_u_t_kzt"].astype(float)   # физлица, срочные, тенге
    dep_fx = dep["d_o_i_p_r_u_t_hc"].astype(float)     # физлица, срочные, ин. валюта

    # ИПЦ: IMF IFS, со склейкой смены базы в 2020-01 по официальной инфляции 2020 г. (7,5% дек/дек)
    cpi_doc = json.load(open(RAW / "imf_ifs_cpi_kz.json"))["series"]["docs"][0]
    cpi = pd.Series(cpi_doc["value"], index=pd.PeriodIndex(cpi_doc["period"], freq="M"), dtype=float)
    new_base = cpi.index >= pd.Period("2020-01", "M")
    k = cpi[pd.Period("2019-12", "M")] * 1.075 / cpi[pd.Period("2020-12", "M")]
    cpi[new_base] = cpi[new_base] * k
    yoy = pd.read_csv(RAW / "cpi_yoy_bns.csv")
    yoy = pd.Series(yoy["yoy_pct"].values, index=pd.PeriodIndex(yoy["month"], freq="M"))
    for p, v in yoy.items():
        if p not in cpi.index or p > pd.Period("2025-05", "M"):
            cpi.loc[p] = cpi[p - 12] * (1 + v / 100)
    cpi = cpi.sort_index()
    cpi = cpi / cpi[pd.Period(START, "M")] * 100

    idx = pd.period_range(START, END, freq="M")
    df = pd.DataFrame(index=idx)
    df["sp500_tr_usd"] = sp_tr.reindex(idx)
    df["sp500_price_usd"] = sp_px.reindex(idx)
    df["spy_adj_usd"] = spy_adj.reindex(idx)
    df["usdkzt"] = fx.reindex(idx)
    df["dep_kzt_rate"] = dep_kzt.reindex(idx).ffill()   # 2026-08 — перенос июльской ставки
    df["dep_usd_rate"] = dep_fx.reindex(idx).ffill()
    df["cpi_kz"] = cpi.reindex(idx)
    df.index.name = "month"
    assert df.notna().all().all(), df[df.isna().any(axis=1)]

    # --- помесячные доходности (ставка месяца t-1 начисляется в месяце t) ---
    r = pd.DataFrame(index=idx)
    r["sp_usd"] = df["sp500_tr_usd"].pct_change()
    r["sp_px_usd"] = df["sp500_price_usd"].pct_change()
    r["div_usd"] = r["sp_usd"] - r["sp_px_usd"]                    # дивидендная часть
    r["fx"] = df["usdkzt"].pct_change()                             # >0 = тенге ослаб
    r["sp_kzt"] = (1 + r["sp_usd"]) * (1 + r["fx"]) - 1
    r["dep_kzt"] = df["dep_kzt_rate"].shift(1) / 100 / 12
    r["dep_usd_kzt"] = (1 + df["dep_usd_rate"].shift(1) / 100 / 12) * (1 + r["fx"]) - 1
    r["cpi"] = df["cpi_kz"].pct_change()
    # S&P 500 «нетто»: 15% налог у источника в США на дивиденды (W-8BEN) + 0,10% в год (TER ETF + брокер)
    r["sp_net_usd"] = r["sp_usd"] - 0.15 * r["div_usd"] - 0.0010 / 12
    r["sp_net_kzt"] = (1 + r["sp_net_usd"]) * (1 + r["fx"]) - 1
    r = r.iloc[1:]

    # контроль качества: индекс vs ETF SPY
    spy_r = df["spy_adj_usd"].pct_change().iloc[1:]
    te = (spy_r - r["sp_usd"]).std() * np.sqrt(12)
    ann_gap = ((1 + spy_r).prod() / (1 + r["sp_usd"]).prod()) ** (12 / len(r)) - 1
    print(f"QC: tracking error SPY vs ^SP500TR = {te:.2%}/год, разница доходности = {ann_gap:.2%}/год")

    df.to_csv(OUT / "monthly_levels.csv")
    r.to_csv(OUT / "monthly_returns.csv", index_label="month")
    print("OK", df.shape, r.shape, df.index[0], df.index[-1])
    print(df.tail(3).T)


if __name__ == "__main__":
    main()

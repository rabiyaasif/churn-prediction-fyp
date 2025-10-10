# app/ml.py
from pathlib import Path
import joblib, json
import pandas as pd
import numpy as np
import asyncio

import os

from .processing import feature_engineering   # 👈 import your feature engineering


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PIPELINE_PATH = os.path.join(BASE_DIR, "..", "models", "pipeline_xgb.pkl")
FEATURE_ORDER_PATH = os.path.join(BASE_DIR, "..", "models", "feature_order.json")


pipeline = None
FEATURE_ORDER = []

def load_pipeline():
    global pipeline, FEATURE_ORDER
    if pipeline is None:
        pipeline = joblib.load(PIPELINE_PATH)
        with open(FEATURE_ORDER_PATH, "r", encoding="utf-8") as f:
            FEATURE_ORDER = json.load(f)
    return pipeline, FEATURE_ORDER

def build_dataframe(instances: list[dict]) -> pd.DataFrame:
    _, FEATURE_ORDER = load_pipeline()
    rows = []
    for inst in instances:
        row = {col: inst.get(col, np.nan) for col in FEATURE_ORDER}
        rows.append(row)
    return pd.DataFrame(rows, columns=FEATURE_ORDER)

async def predict_churn(instances: list[dict]):
    pipe, _ = load_pipeline()
    df = build_dataframe(instances)

    preds = await asyncio.to_thread(pipe.predict, df)
    try:
        probas = await asyncio.to_thread(pipe.predict_proba, df)
    except Exception:
        probas = None

    results = []
    for i in range(len(df)):
        results.append({
            "index": i,
            "prediction": int(preds[i]),
            "probability": float(probas[i][1]) if probas is not None else None
        })
    return results

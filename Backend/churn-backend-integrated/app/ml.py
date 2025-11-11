# app/ml.py
from __future__ import annotations
import os
from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np
import asyncio

def _names_from_model(model) -> list[str] | None:
    # 1) scikit-learn convention
    names = getattr(model, "feature_names_in_", None)
    if isinstance(names, np.ndarray):
        names = names.tolist()
    if isinstance(names, (list, tuple)) and all(isinstance(x, str) for x in names):
        return list(names)

    # 2) XGBoost booster (handles one-hot/expanded frames)
    try:
        booster = getattr(model, "get_booster", lambda: None)()
        if booster is not None:
            bn = getattr(booster, "feature_names", None)
            if isinstance(bn, (list, tuple)) and all(isinstance(x, str) for x in bn):
                return list(bn)
    except Exception:
        pass
    return None

def _n_features_from_model(model) -> int | None:
    try:
        n = getattr(model, "n_features_in_", None)
        if isinstance(n, (int, np.integer)):
            return int(n)
    except Exception:
        pass
    # XGBoost booster may have feature_names but no n_features_in_
    try:
        booster = getattr(model, "get_booster", lambda: None)()
        if booster is not None and getattr(booster, "feature_names", None):
            return len(booster.feature_names)
    except Exception:
        pass
    return None

# Optional: feature engineering step if your backend defines it
try:
    from .processing import feature_engineering  # type: ignore
    _HAS_FE = True
except Exception:
    _HAS_FE = False

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR.parent / "models"

# Prefer externally provided model; fall back to bundled pipeline
PRIMARY_MODEL = MODELS_DIR / "churn_prediction_model.pkl"
FALLBACK_MODEL = MODELS_DIR / "pipeline_xgb.pkl"
FEATURE_ORDER_PATH = MODELS_DIR / "feature_order.json"

_model = None
_feature_order: list[str] | None = None
_bundled_meta_loaded = False  # NEW: helps us not to clobber a later JSON file load



# app/ml.py (only the load helpers shown here)

def _load_model():
    """Load estimator from either a direct pickle or a bundled dict."""
    global _model, _feature_order, _bundled_meta_loaded

    if _model is not None:
        return _model

    path = PRIMARY_MODEL if PRIMARY_MODEL.exists() else FALLBACK_MODEL
    if not path.exists():
        raise FileNotFoundError(f"No model artifact found at {PRIMARY_MODEL} or {FALLBACK_MODEL}")

    obj = joblib.load(path)

    if isinstance(obj, dict):
        m = obj.get("model") or obj.get("pipeline") or obj.get("estimator")
        if m is None:
            raise TypeError(f"Artifact at {path} is a dict without model/pipeline/estimator. Keys={list(obj.keys())}")
        _model = m
        fo = obj.get("feature_order") or obj.get("features") or obj.get("feature_names")
        if fo and not _bundled_meta_loaded:
            _feature_order = list(fo)
            _bundled_meta_loaded = True
    else:
        _model = obj

    # Guardrail: fail early if still not a predictor
    if not hasattr(_model, "predict"):
        raise TypeError(f"Loaded model has no .predict (type={type(_model)})")
    return _model

def _load_feature_order():
    """Prefer already-cached (maybe from bundle), else feature_order.json."""
    global _feature_order
    if _feature_order is not None:
        return _feature_order
    if FEATURE_ORDER_PATH.exists():
        import json
        with open(FEATURE_ORDER_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "features" in data:
            _feature_order = list(data["features"])
        elif isinstance(data, list):
            _feature_order = list(data)
    return _feature_order




    """
    Align inference df to match training features.
    Priority:
      1) If both feature_order.json and model names exist and lengths differ,
         use model names (json likely stale).
      2) Else if feature_order.json exists, use it.
      3) Else if model provides names, use them.
      4) Else pass through as-is.
    Missing columns are zero-filled; extra columns are dropped.
    """
    order_json = _load_feature_order()
    order_model = _names_from_model(model)

    # If both exist and disagree, trust the model
    if order_json and order_model and len(order_json) != len(order_model):
        names = order_model
    else:
        names = order_json or order_model

    if isinstance(names, (list, tuple)):
        names = list(names)
        # add any missing columns with neutral defaults
        for col in names:
            if col not in df.columns:
                df[col] = 0
        # drop extras not seen in training
        df = df[names]
        return df

    # Last resort: no names available; just return as-is
    return df

def _align_columns(df: pd.DataFrame, model) -> tuple[np.ndarray | pd.DataFrame, bool]:
    """
    Return (X, as_numpy).
    - Prefer model feature names (or feature_order.json if it matches).
    - If the model has no names, pad/truncate to n_features_in_ and return NumPy.
    """
    order_json = _load_feature_order()
    order_model = _names_from_model(model)
    n_expected = _n_features_from_model(model)

    # If names exist and conflict, trust the model
    if order_json and order_model and len(order_json) != len(order_model):
        names = order_model
    else:
        names = order_json or order_model

    if isinstance(names, (list, tuple)):
        names = list(names)
        # add missings with zeros
        for col in names:
            if col not in df.columns:
                df[col] = 0
        # drop extras
        df = df[names]
        return df, False  # keep as DataFrame (names provided)

    # No names – fall back to pure shape logic
    if n_expected is not None:
        if df.shape[1] < n_expected:
            # pad zeros to the right
            pad = n_expected - df.shape[1]
            for i in range(pad):
                df[f"_pad_{i}"] = 0
        elif df.shape[1] > n_expected:
            df = df.iloc[:, :n_expected]
        return df.values, True  # send NumPy to XGB to avoid name checks

    # Last resort: send as-is (might still fail)
    return df.values, True


# app/ml.py
async def predict_churn(instances: list[dict]) -> list[dict]:
    """Predict churn for a batch of instances."""
    if not isinstance(instances, (list, tuple)) or len(instances) == 0:
        return []

    df = pd.DataFrame(instances)

    print(">> DEBUG model_type:", type(_load_model()))
    print(">> DEBUG df.columns:", list(df.columns))


    # Optional feature engineering
    if _HAS_FE:
        try:
            df = feature_engineering(df)
        except Exception:
            pass

    model = _load_model()

      

    # Guardrail
    if not hasattr(model, "predict"):
        raise TypeError(f"Model object has no .predict: {type(model)}")
    

    X, as_numpy = _align_columns(df, model)

     # --- DEBUG: show how many unique values per engineered feature ---
    try:
        # If X is numpy (as_numpy == True), wrap to DataFrame just for inspection
        _dbg_df = pd.DataFrame(X, columns=get_expected_features() or df.columns) if as_numpy else X
        nunique = _dbg_df.nunique()
        print(">> DEBUG nunique per column (first 15):", nunique.head(15).to_dict())
        print(">> DEBUG nunique nonzero cols:",
              {c: int(v) for c, v in nunique[nunique > 1].sort_values(ascending=False).head(15).to_dict().items()})
        print(">> DEBUG example row:", _dbg_df.head(1).to_dict(orient="records")[0])
    except Exception as _e:
        print(">> DEBUG failed to inspect X:", _e)
    
    # Inference (when passing NumPy, XGBoost ignores column names)

    preds = await asyncio.to_thread(model.predict, X)

    probas = None
    if hasattr(model, "predict_proba"):
        try:
            probas = await asyncio.to_thread(model.predict_proba, X)
        except Exception:
            probas = None

    results: list[dict] = []
    for i in range(len(df)):
        prob1 = float(probas[i][1]) if probas is not None else None
        results.append({
            "index": i,
            "prediction": int(preds[i]),
            "probability": prob1
        })
    return results



# def get_expected_features() -> list[str] | None:
#     """Return the expected feature order if known (from feature_order.json or model metadata)."""
#     model = _load_model()
#     order = _load_feature_order()
#     if order:
#         return list(order)
#     names = getattr(model, "feature_names_in_", None)
#     if isinstance(names, np.ndarray):
#         return names.tolist()
#     try:
#         pre = getattr(model, "named_steps", {}).get("preprocessor")
#         names = getattr(pre, "get_feature_names_out", lambda: None)()
#         if names is not None:
#             return list(names)
#     except Exception:
#         pass
#     return None

def get_expected_features() -> list[str] | None:
    model = _load_model()
    order = _load_feature_order()
    if order:
        return list(order)

    names = getattr(model, "feature_names_in_", None)
    if isinstance(names, np.ndarray):
        return names.tolist()

    try:
        pre = getattr(model, "named_steps", {}).get("preprocessor")
        names = getattr(pre, "get_feature_names_out", lambda: None)()
        if names is not None:
            return list(names)
    except Exception:
        pass

    return None

# -----------------------------
# Backward-compat for old code:
# -----------------------------

def load_pipeline():
    """Preload the model into memory at startup."""
    _load_model()
    _load_feature_order()



def get_pipeline():
    """
    Backward-compat: return the loaded model object if older code expects it.
    """
    return _load_model()


def pipeline_ready() -> bool:
    """
    Backward-compat: indicate if model is already loaded.
    """
    return _model is not None

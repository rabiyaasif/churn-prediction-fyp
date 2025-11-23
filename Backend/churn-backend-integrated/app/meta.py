# app/meta.py
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path

# Bump this when you retrain or change feature engineering
MODEL_VERSION = "1.0.0"

# Try to infer last trained time from your model file's mtime; fallback to a static ISO
def _infer_trained_at() -> str:
    try:
        # Adjust these paths if your model artifact is named differently
        base = Path(__file__).resolve().parent
        models_dir = base.parent / "models"
        for fname in ("churn_prediction_model.pkl", "pipeline_xgb.pkl"):
            p = models_dir / fname
            if p.exists():
                ts = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)
                return ts.isoformat()
    except Exception:
        pass
    # fallback
    return "2025-01-01T00:00:00+00:00"

LAST_TRAINED_AT = _infer_trained_at()

def iso_utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()

def stamp_meta(payload: dict | list) -> dict:
    """Wrap any payload with model_version + generated_at (useful for UI)."""
    return {
        "data": payload,
        "model_version": MODEL_VERSION,
        "generated_at": iso_utcnow(),
    }

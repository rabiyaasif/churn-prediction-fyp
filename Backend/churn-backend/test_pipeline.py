import joblib, json
import pandas as pd
import numpy as np

from app.processing import feature_engineering   # 👈 import FE

# Paths
PIPELINE_PATH = "models/pipeline_xgb.pkl"
FEATURE_ORDER_PATH = "models/feature_order.json"

# Load
pipeline = joblib.load(PIPELINE_PATH)
with open(FEATURE_ORDER_PATH, "r") as f:
    FEATURE_ORDER = json.load(f)

print("✅ Pipeline and features loaded")
print("Features:", FEATURE_ORDER[:10], "...")  # show first 10

# ---- Make a fake sample ----
# Fill some sensible defaults (not just all "1"s)
sample = {
    "Tenure": 12,
    "HourSpendOnApp": 5,
    "DaySinceLastOrder": 10,
    "OrderCount": 3,
    "CashbackAmount": 200,
    "OrderAmountHikeFromlastYear": 50,
    "SatisfactionScore": 4,
    "Complain": 0,
    "NumberOfDeviceRegistered": 2,
    "CouponUsed": 1,
    "WarehouseToHome": 15,
    "NumberOfAddress": 1
}

# Fill missing features with 0/NaN
for feat in FEATURE_ORDER:
    if feat not in sample:
        sample[feat] = np.nan

# ---- Apply feature engineering ----
df = pd.DataFrame([sample])
df = feature_engineering(df)

# Align with FEATURE_ORDER
for col in FEATURE_ORDER:
    if col not in df.columns:
        df[col] = np.nan
df = df[FEATURE_ORDER]

# ---- Predict ----
pred = pipeline.predict(df)[0]
try:
    prob = pipeline.predict_proba(df)[0, 1]
except Exception:
    prob = None

print("Prediction:", int(pred))
print("Churn probability:", float(prob) if prob is not None else "N/A")

import pandas as pd
import json

EXCEL_PATH = r"C:\Users\HP\Desktop\E Commerce Dataset.xlsx"
OUTPUT_PATH = r"C:\Users\HP\Desktop\Churn-prediction-tool\Backend\churn-backend\models\feature_order.json"

def main():
    df = pd.read_excel(EXCEL_PATH, header=1)

    feature_order = df["Variable"].dropna().tolist()

    # Remove ID and target column
    for col in ["CustomerID", "Churn"]:
        if col in feature_order:
            feature_order.remove(col)

    print("✅ Final feature list (first 10):", feature_order[:10])
    print(f"Total features used for model: {len(feature_order)}")

    with open(OUTPUT_PATH, "w") as f:
        json.dump(feature_order, f, indent=4)

    print(f"✅ Saved cleaned feature order to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

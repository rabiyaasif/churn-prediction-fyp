# app/processing.py

import numpy as np
import pandas as pd

def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Handle missing values
    df['Tenure'] = df['Tenure'].fillna(0)
    df['HourSpendOnApp'] = df['HourSpendOnApp'].fillna(df['HourSpendOnApp'].median())

    # RFM Features
    df['Recency'] = df['DaySinceLastOrder']
    df['Frequency'] = df['OrderCount']
    df['Monetary'] = df['CashbackAmount'] + df['OrderAmountHikeFromlastYear']

    # Engagement Features
    df['AvgSpendPerOrder'] = np.where(df['OrderCount'] > 0,
                                      df['CashbackAmount'] / df['OrderCount'], 0)
    df['ActivityRate'] = df['HourSpendOnApp'] / (df['Tenure'] + 1)
    df['DeviceDiversity'] = df['NumberOfDeviceRegistered']

    # Proactive Churn Signals
    df['order_per_tenure'] = np.where(df['Tenure'] > 0,
                                      df['OrderCount'] / df['Tenure'], df['OrderCount'])
    df['coupon_usage_rate'] = np.where(df['OrderCount'] > 0,
                                       df['CouponUsed'] / df['OrderCount'], 0)
    df['cashback_per_order'] = np.where(df['OrderCount'] > 0,
                                        df['CashbackAmount'] / df['OrderCount'], 0)
    df['inactive_flag'] = (df['DaySinceLastOrder'] > 30).astype(int)
    df['recency_tenure_ratio'] = np.where(df['Tenure'] > 0,
                                          df['DaySinceLastOrder'] / df['Tenure'], 0)
    df['order_amount_growth_rate'] = np.where(df['Tenure'] > 0,
                                              df['OrderAmountHikeFromlastYear'] / (df['Tenure'] + 1), 0)
    df['engagement_score'] = df['HourSpendOnApp'] * df['SatisfactionScore']
    df['multi_device_flag'] = (df['NumberOfDeviceRegistered'] > 2).astype(int)

    # Satisfaction & Risk
    df['ComplaintRate'] = df['Complain'] / (df['OrderCount'] + 1)
    df['complaint_risk'] = df['Complain'] * (6 - df['SatisfactionScore'])
    df['address_to_tenure'] = np.where(df['Tenure'] > 0,
                                       df['NumberOfAddress'] / df['Tenure'],
                                       df['NumberOfAddress'])

    # Drop ID if present
    if 'CustomerID' in df.columns:
        df = df.drop(columns=['CustomerID'])

    return df

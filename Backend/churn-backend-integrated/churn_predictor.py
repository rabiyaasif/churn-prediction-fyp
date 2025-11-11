"""
Churn Prediction Model with Temporal Feature Engineering
A comprehensive e-commerce churn prediction system with proper temporal handling.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
from typing import Tuple, Dict, List, Optional
from dataclasses import dataclass
import joblib

# ML libraries
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_recall_curve, classification_report
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

@dataclass
class TemporalConfig:
    """Configuration for temporal parameters"""
    observation_days: int = 90
    gap_days: int = 10
    label_days: int = 45
    step_days: int = 14
    
class ChurnPredictor:
    """
    A comprehensive churn prediction model with temporal feature engineering.
    
    This class implements the complete pipeline for:
    - Temporal data handling with proper leakage prevention
    - Feature engineering (RFM, behavioral patterns, trends)
    - Model training and evaluation
    - Diagnostic capabilities
    """
    
    def __init__(self, config: TemporalConfig = None):
        self.config = config or TemporalConfig()
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = None
        self.feature_importance_ = None
        
    def build_training_table(self, data: pd.DataFrame, 
                           cutoff_date: datetime) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Build training table with proper temporal isolation.
        
        Args:
            data: Raw event data with columns [timestamp, customer_id, event_type, value, product_category]
            cutoff_date: The cutoff date for feature extraction
            
        Returns:
            Tuple of (features_df, labels_series)
        """
        # Define temporal boundaries
        observation_start = cutoff_date - timedelta(days=self.config.observation_days)
        observation_end = cutoff_date
        label_start = cutoff_date + timedelta(days=self.config.gap_days)
        label_end = label_start + timedelta(days=self.config.label_days)
        
        print(f"Building training table for cutoff: {cutoff_date.date()}")
        print(f"Observation window: {observation_start.date()} to {observation_end.date()}")
        print(f"Label window: {label_start.date()} to {label_end.date()}")
        
        # Extract observation data (for features)
        obs_data = data[
            (data['timestamp'] >= observation_start) & 
            (data['timestamp'] < observation_end)
        ].copy()
        
        # Extract label data (for churn labels)
        label_data = data[
            (data['timestamp'] >= label_start) & 
            (data['timestamp'] < label_end)
        ].copy()
        
        # Get all customers from observation period
        customers = obs_data['customer_id'].unique()
        
        # Build features for each customer
        features_list = []
        for customer_id in customers:
            customer_obs = obs_data[obs_data['customer_id'] == customer_id]
            features = self._extract_customer_features(customer_obs, observation_start, observation_end)
            features['customer_id'] = customer_id
            features_list.append(features)
        
        features_df = pd.DataFrame(features_list)
        
        # Build labels (1 = churned, 0 = active)
        active_customers = set(label_data['customer_id'].unique())
        features_df['churn_label'] = features_df['customer_id'].apply(
            lambda x: 0 if x in active_customers else 1
        )
        
        # Separate features and labels
        labels = features_df['churn_label']
        features = features_df.drop(['churn_label', 'customer_id'], axis=1)
        
        return features, labels
    
    def _extract_customer_features(self, customer_data: pd.DataFrame, 
                                 start_date: datetime, end_date: datetime) -> Dict:
        """
        Extract comprehensive features for a single customer.
        
        Features include:
        - RFM (Recency, Frequency, Monetary)
        - Behavioral patterns
        - Trend analysis
        - Product engagement
        """
        features = {}
        
        if len(customer_data) == 0:
            return self._get_default_features()
        
        # Separate by event types
        purchases = customer_data[customer_data['event_type'] == 'purchase']
        views = customer_data[customer_data['event_type'] == 'view']
        cart_adds = customer_data[customer_data['event_type'] == 'add_to_cart']
        refunds = customer_data[customer_data['event_type'] == 'refund']
        support = customer_data[customer_data['event_type'] == 'support_ticket']
        wishlist_adds = customer_data[customer_data['event_type'] == 'added_to_wishlist']
        cart_removes = customer_data[customer_data['event_type'] == 'removed_from_cart']
        wishlist_removes = customer_data[customer_data['event_type'] == 'removed_from_wishlist']
        cart_updates = customer_data[customer_data['event_type'] == 'cart_quantity_updated']
        
        # === RFM Features ===
        if len(purchases) > 0:
            # Recency (days since last purchase)
            last_purchase = purchases['timestamp'].max()
            features['recency_days'] = (end_date - last_purchase).days
            
            # Frequency (number of purchases)
            features['frequency'] = len(purchases)
            
            # Monetary (total purchase value)
            features['monetary'] = purchases['value'].sum()
            features['avg_order_value'] = purchases['value'].mean()
            features['max_order_value'] = purchases['value'].max()
        else:
            features['recency_days'] = self.config.observation_days
            features['frequency'] = 0
            features['monetary'] = 0.0
            features['avg_order_value'] = 0.0
            features['max_order_value'] = 0.0
        
        # === Behavioral Features ===
        features['total_events'] = len(customer_data)
        features['view_count'] = len(views)
        features['cart_add_count'] = len(cart_adds)
        features['refund_count'] = len(refunds)
        features['support_ticket_count'] = len(support)
        features['wishlist_add_count'] = len(wishlist_adds)
        features['cart_remove_count'] = len(cart_removes)
        features['wishlist_remove_count'] = len(wishlist_removes)
        features['cart_update_count'] = len(cart_updates)
        
        # Conversion rates
        features['view_to_cart_rate'] = (len(cart_adds) / len(views)) if len(views) > 0 else 0
        features['cart_to_purchase_rate'] = (len(purchases) / len(cart_adds)) if len(cart_adds) > 0 else 0
        features['overall_conversion_rate'] = (len(purchases) / len(views)) if len(views) > 0 else 0
        features['wishlist_to_purchase_rate'] = (len(purchases) / len(wishlist_adds)) if len(wishlist_adds) > 0 else 0
        
        # Cart and wishlist behavior patterns
        features['cart_abandon_rate'] = (len(cart_removes) / len(cart_adds)) if len(cart_adds) > 0 else 0
        features['wishlist_abandon_rate'] = (len(wishlist_removes) / len(wishlist_adds)) if len(wishlist_adds) > 0 else 0
        features['cart_engagement_ratio'] = (len(cart_updates) / len(cart_adds)) if len(cart_adds) > 0 else 0
        
        # === Product Engagement ===
        unique_categories = customer_data['product_category'].nunique()
        features['category_diversity'] = unique_categories
        
        # Category preferences
        if len(customer_data) > 0:
            category_counts = customer_data['product_category'].value_counts()
            features['dominant_category_ratio'] = category_counts.iloc[0] / len(customer_data)
        else:
            features['dominant_category_ratio'] = 0.0
        
        # === Temporal Patterns ===
        if len(customer_data) > 0:
            # Activity distribution over time
            customer_data_sorted = customer_data.sort_values('timestamp')
            
            # Days active
            active_dates = customer_data['timestamp'].dt.date.nunique()
            features['days_active'] = active_dates
            features['activity_intensity'] = len(customer_data) / max(active_dates, 1)
            
            # Trend analysis (comparing first vs second half of observation period)
            mid_date = start_date + timedelta(days=self.config.observation_days // 2)
            first_half = customer_data[customer_data['timestamp'] < mid_date]
            second_half = customer_data[customer_data['timestamp'] >= mid_date]
            
            features['activity_trend'] = len(second_half) - len(first_half)
            
            # Purchase trend
            first_half_purchases = len(first_half[first_half['event_type'] == 'purchase'])
            second_half_purchases = len(second_half[second_half['event_type'] == 'purchase'])
            features['purchase_trend'] = second_half_purchases - first_half_purchases
            
        else:
            features['days_active'] = 0
            features['activity_intensity'] = 0.0
            features['activity_trend'] = 0
            features['purchase_trend'] = 0
        
        # === Risk Indicators ===
        features['refund_rate'] = len(refunds) / max(len(purchases), 1)
        features['support_intensity'] = len(support) / max(len(customer_data), 1)
        
        return features
    
    def _get_default_features(self) -> Dict:
        """Return default feature values for customers with no data"""
        return {
            'recency_days': self.config.observation_days,
            'frequency': 0,
            'monetary': 0.0,
            'avg_order_value': 0.0,
            'max_order_value': 0.0,
            'total_events': 0,
            'view_count': 0,
            'cart_add_count': 0,
            'refund_count': 0,
            'support_ticket_count': 0,
            'wishlist_add_count': 0,
            'cart_remove_count': 0,
            'wishlist_remove_count': 0,
            'cart_update_count': 0,
            'view_to_cart_rate': 0.0,
            'cart_to_purchase_rate': 0.0,
            'overall_conversion_rate': 0.0,
            'wishlist_to_purchase_rate': 0.0,
            'cart_abandon_rate': 0.0,
            'wishlist_abandon_rate': 0.0,
            'cart_engagement_ratio': 0.0,
            'category_diversity': 0,
            'dominant_category_ratio': 0.0,
            'days_active': 0,
            'activity_intensity': 0.0,
            'activity_trend': 0,
            'purchase_trend': 0,
            'refund_rate': 0.0,
            'support_intensity': 0.0
        }
    
    def create_multiple_snapshots(self, data: pd.DataFrame, 
                                start_date: datetime, end_date: datetime) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Create multiple training snapshots using the step_days parameter.
        
        This generates multiple temporal snapshots for robust model training.
        """
        all_features = []
        all_labels = []
        
        current_date = start_date
        snapshot_count = 0
        
        while current_date <= end_date:
            try:
                features, labels = self.build_training_table(data, current_date)
                
                if len(features) > 0:  # Only add if we have data
                    # Add snapshot identifier
                    features['snapshot_date'] = current_date
                    all_features.append(features)
                    all_labels.append(labels)
                    snapshot_count += 1
                    print(f"Snapshot {snapshot_count}: {len(features)} customers, churn rate: {labels.mean():.3f}")
                
            except Exception as e:
                print(f"Error processing snapshot for {current_date}: {e}")
            
            current_date += timedelta(days=self.config.step_days)
        
        if not all_features:
            raise ValueError("No valid snapshots generated")
        
        # Combine all snapshots
        combined_features = pd.concat(all_features, ignore_index=True)
        combined_labels = pd.concat(all_labels, ignore_index=True)
        
        print(f"\nTotal snapshots created: {snapshot_count}")
        print(f"Total training samples: {len(combined_features)}")
        print(f"Overall churn rate: {combined_labels.mean():.3f}")
        
        return combined_features, combined_labels
    
    def train_model(self, features: pd.DataFrame, labels: pd.Series, 
                   test_size: float = 0.2, random_state: int = 42) -> Dict:
        """
        Train the churn prediction model.
        
        Returns:
            Dictionary with training metrics and diagnostics
        """
        print("\n=== Training Churn Prediction Model ===")
        
        # Remove snapshot_date if present (used for tracking only)
        if 'snapshot_date' in features.columns:
            features = features.drop('snapshot_date', axis=1)
        
        # Store feature columns
        self.feature_columns = features.columns.tolist()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            features, labels, test_size=test_size, random_state=random_state, 
            stratify=labels
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train XGBoost model
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=random_state,
            eval_metric='logloss'
        )
        
        # Fit model
        self.model.fit(X_train_scaled, y_train)
        
        # Predictions
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        y_pred = self.model.predict(X_test_scaled)
        
        # Calculate metrics
        auc_score = roc_auc_score(y_test, y_pred_proba)
        
        # Feature importance
        self.feature_importance_ = pd.DataFrame({
            'feature': self.feature_columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        # Calculate precision at different thresholds
        precision_scores = []
        for threshold in [0.1, 0.2, 0.3, 0.4, 0.5]:
            y_pred_thresh = (y_pred_proba >= threshold).astype(int)
            if y_pred_thresh.sum() > 0:
                precision = (y_test[y_pred_thresh == 1] == 1).mean()
                precision_scores.append(f"P@{threshold}: {precision:.3f}")
        
        results = {
            'auc_score': auc_score,
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'churn_rate': y_train.mean(),
            'precision_scores': precision_scores,
            'classification_report': classification_report(y_test, y_pred)
        }
        
        print(f"Model Training Complete!")
        print(f"AUC Score: {auc_score:.4f}")
        print(f"Training samples: {len(X_train)}")
        print(f"Test samples: {len(X_test)}")
        print(f"Churn rate: {y_train.mean():.3f}")
        
        return results
    
    def predict_churn_probability(self, features: pd.DataFrame) -> np.ndarray:
        """
        Predict churn probabilities for new customers.
        
        Args:
            features: Customer features in the same format as training data
            
        Returns:
            Array of churn probabilities (0.0 to 1.0)
        """
        if self.model is None:
            raise ValueError("Model must be trained before making predictions")
        
        # Ensure feature order matches training
        features_ordered = features[self.feature_columns]
        
        # Scale features
        features_scaled = self.scaler.transform(features_ordered)
        
        # Predict probabilities
        probabilities = self.model.predict_proba(features_scaled)[:, 1]
        
        return probabilities
    
    def get_feature_importance(self, top_n: int = 10) -> pd.DataFrame:
        """
        Get top N most important features.
        
        This provides actionable insights for retention strategy design.
        """
        if self.feature_importance_ is None:
            raise ValueError("Model must be trained before accessing feature importance")
        
        return self.feature_importance_.head(top_n)
    
    def diagnose_model_health(self, features: pd.DataFrame, labels: pd.Series) -> Dict:
        """
        Diagnostic checks for model health and data quality.
        
        This implements the diagnostic capabilities mentioned in the requirements.
        """
        diagnostics = {}
        
        # Class imbalance ratio
        churn_rate = labels.mean()
        imbalance_ratio = churn_rate / (1 - churn_rate) if churn_rate < 1.0 else float('inf')
        diagnostics['churn_rate'] = churn_rate
        diagnostics['imbalance_ratio'] = imbalance_ratio
        
        # Feature statistics
        diagnostics['total_features'] = len(features.columns)
        diagnostics['total_samples'] = len(features)
        
        # Check for data quality issues
        missing_data = features.isnull().sum().sum()
        diagnostics['missing_values'] = missing_data
        
        # Feature variance (low variance might indicate poor predictive power)
        numeric_features = features.select_dtypes(include=[np.number])
        low_variance_features = (numeric_features.var() < 0.01).sum()
        diagnostics['low_variance_features'] = low_variance_features
        
        # Snapshot distribution (if snapshot_date exists)
        if 'snapshot_date' in features.columns:
            snapshot_counts = features['snapshot_date'].value_counts()
            diagnostics['avg_snapshots'] = snapshot_counts.mean()
            diagnostics['snapshot_count'] = len(snapshot_counts)
        
        return diagnostics
    
    def save_model(self, filepath: str):
        """Save the trained model and scaler"""
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'config': self.config,
            'feature_importance': self.feature_importance_
        }
        
        joblib.dump(model_data, filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load a trained model"""
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_columns = model_data['feature_columns']
        self.config = model_data['config']
        self.feature_importance_ = model_data['feature_importance']
        
        print(f"Model loaded from {filepath}")
